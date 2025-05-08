import os
import logging
from pathlib import Path
from datetime import datetime
import concurrent.futures
import gitignore_parser

logger = logging.getLogger(__name__)

class RepositoryScanner:
    """
    Handles scanning directories for git repositories.
    Refactored from scan_git_repos.py to be more modular.
    """
    def __init__(self, config):
        """Initialize scanner with configuration"""
        self.config = config
    
    def get_gitignore_matcher(self, directory):
        """Creates a gitignore_parser matcher for a given directory, if .gitignore exists."""
        gitignore_path = Path(directory) / ".gitignore"
        if gitignore_path.is_file():
            try:
                return gitignore_parser.parse_gitignore(gitignore_path)
            except Exception as e:
                logger.warning(f"Could not parse .gitignore file at {gitignore_path}: {e}")
        return None
    
    def is_ignored(self, path_to_check, parent_gitignore_matcher, current_gitignore_matcher):
        """Check if a path should be ignored based on gitignore and exclusions"""
        path_obj = Path(path_to_check) if isinstance(path_to_check, str) else path_to_check
        
        # Check gitignore matchers
        if parent_gitignore_matcher and parent_gitignore_matcher(str(path_obj)):
            return True
        if current_gitignore_matcher and current_gitignore_matcher(str(path_obj)):
            return True
        
        # Check config exclusions
        if path_obj.name in self.config.get("excluded_dirs", []):
            return True
            
        return False
    
    def scan_directory(self, dir_path, max_depth=None, current_depth=0, parent_gitignore_matcher=None, progress_callback=None):
        """
        Scan a directory and its subdirectories for git repositories.
        
        Args:
            dir_path (Path): The directory to scan
            max_depth (int, optional): Maximum directory depth to scan. Defaults to config value.
            current_depth (int, optional): Current scan depth. Defaults to 0.
            parent_gitignore_matcher (function, optional): Parent directory's gitignore matcher.
            progress_callback (function, optional): Callback function to report progress.
            
        Returns:
            tuple: Lists of (git_repos_found, non_git_dirs_found)
        """
        # Use max_depth from parameters or config
        if max_depth is None:
            max_depth = self.config.get("max_depth", 10)
            
        logger.info(f"Scanning directory: {dir_path} (depth: {current_depth})")
        
        # Report progress if callback provided
        if progress_callback and current_depth <= 2:  # Only report progress for top-level dirs to avoid too many messages
            progress_callback({
                "message": f"Scanning: {dir_path}",
                "path": str(dir_path),
                "depth": current_depth
            })
        
        # Check max depth
        if current_depth > max_depth:
            logger.info(f"Max depth reached for {dir_path}")
            return [], []
        
        git_repos_found = []
        non_git_dirs_found = []
        
        # Get gitignore matcher for current directory
        current_gitignore_matcher = self.get_gitignore_matcher(dir_path)
        
        # Check if directory exists and is accessible
        try:
            if not dir_path.exists():
                logger.warning(f"Directory does not exist: {dir_path}")
                return [], []
            if not dir_path.is_dir():
                logger.warning(f"Not a directory: {dir_path}")
                return [], []
        except Exception as e:
            logger.error(f"Error checking directory {dir_path}: {e}")
            return [], []
        
        # Check if current directory is a git repo
        is_git_repo = (dir_path / ".git").is_dir()
        parent_scan_dir = Path(self.config.get("scan_directory", ""))
        is_top_level_scan = dir_path.parent == parent_scan_dir
        
        if is_git_repo:
            logger.debug(f"Found Git repository: {dir_path}")
            git_repos_found.append(dir_path)
            
            # Report finding a git repo
            if progress_callback:
                progress_callback({
                    "message": f"Found Git repository: {dir_path}",
                    "path": str(dir_path),
                    "type": "git_repo"
                })
                
            # Don't scan further into a git repo
            return git_repos_found, non_git_dirs_found
        elif is_top_level_scan and dir_path != parent_scan_dir:
            # Only add non-git dirs directly under the main scan_directory
            # Exclude high_level_dirs if specified
            if dir_path.name not in self.config.get("high_level_dirs", []):
                logger.debug(f"Found non-Git directory: {dir_path}")
                non_git_dirs_found.append(dir_path)
                
                # Report finding a non-git directory
                if progress_callback:
                    progress_callback({
                        "message": f"Found non-Git directory: {dir_path}",
                        "path": str(dir_path),
                        "type": "non_git_dir"
                    })
            else:
                logger.debug(f"Skipping high-level directory: {dir_path}")
        
        # Collect subdirectories to scan
        subdirs_to_scan = []
        try:
            for item in dir_path.iterdir():
                if item.is_dir():
                    # Check if this subdir should be ignored
                    if self.is_ignored(item, parent_gitignore_matcher, current_gitignore_matcher):
                        logger.debug(f"Ignoring directory due to exclusion or .gitignore: {item}")
                        continue
                    subdirs_to_scan.append(item)
        except PermissionError:
            logger.warning(f"Permission denied accessing: {dir_path}")
            return git_repos_found, non_git_dirs_found
        except FileNotFoundError:
            logger.warning(f"Directory not found (possibly removed during scan): {dir_path}")
            return git_repos_found, non_git_dirs_found
        
        # Pass the combined matcher (parent + current) to children
        effective_matcher = current_gitignore_matcher or parent_gitignore_matcher
        
        # Use ThreadPoolExecutor for parallel scanning
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future_to_subdir = {
                executor.submit(
                    self.scan_directory, 
                    subdir, 
                    max_depth, 
                    current_depth + 1, 
                    effective_matcher,
                    progress_callback  # Pass the progress callback to child scans
                ): subdir
                for subdir in subdirs_to_scan
            }
            for future in concurrent.futures.as_completed(future_to_subdir):
                subdir = future_to_subdir[future]
                try:
                    sub_git_repos, sub_non_git_dirs = future.result()
                    git_repos_found.extend(sub_git_repos)
                    # We only collect non_git_dirs at the top level
                except Exception as exc:
                    logger.error(f"Subdirectory scan {subdir} generated an exception: {exc}")
                    if progress_callback:
                        progress_callback({
                            "message": f"Error scanning {subdir}: {exc}",
                            "path": str(subdir),
                            "type": "error"
                        })
        
        return git_repos_found, non_git_dirs_found
    
    def get_repo_info(self, repo_path):
        """Get basic information about a git repository"""
        path_obj = Path(repo_path)
        try:
            last_modified_time = path_obj.stat().st_mtime
            last_modified_iso = datetime.fromtimestamp(last_modified_time).isoformat()
        except OSError as e:
            logger.warning(f"Could not get stats for {repo_path}: {e}")
            last_modified_iso = "N/A"
        
        # Generate a unique ID based on the path
        repo_id = str(path_obj).replace("/", "_").replace("\\", "_").replace(":", "")
        
        info = {
            "id": repo_id,
            "path": str(path_obj.resolve()),
            "name": path_obj.name,
            "last_modified": last_modified_iso,
        }
        return info
    
    def get_dir_info(self, dir_path):
        """Get basic information about a non-git directory"""
        path_obj = Path(dir_path)
        try:
            last_modified_time = path_obj.stat().st_mtime
            last_modified_iso = datetime.fromtimestamp(last_modified_time).isoformat()
        except OSError as e:
            logger.warning(f"Could not get stats for {dir_path}: {e}")
            last_modified_iso = "N/A"
        
        # Generate a unique ID based on the path
        dir_id = str(path_obj).replace("/", "_").replace("\\", "_").replace(":", "")
        
        info = {
            "id": dir_id,
            "path": str(path_obj.resolve()),
            "name": path_obj.name,
            "last_modified": last_modified_iso,
        }
        return info
    
    def get_repositories_info(self, repos):
        """Get information for a list of repositories"""
        return [self.get_repo_info(repo) for repo in repos]
    
    def get_directories_info(self, dirs):
        """Get information for a list of directories"""
        return [self.get_dir_info(dir_path) for dir_path in dirs]
