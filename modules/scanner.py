import os
import logging
from pathlib import Path
from datetime import datetime
import hashlib
import concurrent.futures
import gitignore_parser
from .git_operations import GitOperations # Ensure GitOperations is imported

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
    
    def _get_repo_description(self, repo_path_obj: Path):
        """
        Attempts to read the repository description from .git/description.
        
        Args:
            repo_path_obj (Path): Path object to the repository.
            
        Returns:
            str or None: The repository description if found, otherwise None.
        """
        try:
            description_file = repo_path_obj / ".git" / "description"
            if description_file.is_file():
                with open(description_file, 'r', encoding='utf-8', errors='ignore') as f:
                    description = f.readline().strip()
                    # Default description is often "Unnamed repository; edit this file 'description' to name the repository."
                    # We might want to return None if it's the default, or just return it as is.
                    if "Unnamed repository" in description:
                        return None # Or return the default string if you prefer
                    return description
        except Exception as e:
            logger.warning(f"Could not read .git/description for {repo_path_obj}: {e}")
        return None

    def _extract_basic_repo_info(self, repo_path_obj: Path):
        """
        Extract basic and detailed information about a Git repository.
        
        Args:
            repo_path_obj (Path): Path object to the repository.
            
        Returns:
            dict: Dictionary containing repository information.
        """
        repo_path_str = str(repo_path_obj)
        repo_name = repo_path_obj.name
        
        # Generate a unique ID based on the path
        # Using a more robust method like hashing the absolute path
        try:
            abs_path = str(repo_path_obj.resolve())
        except Exception: # Handle potential errors like non-existent symlink targets
            abs_path = repo_path_str
        repo_id = hashlib.md5(abs_path.encode('utf-8')).hexdigest()

        # Get last modified time of the .git directory as an indicator
        git_dir = repo_path_obj / ".git"
        last_modified_timestamp = datetime.now().timestamp() # Default to now
        if git_dir.exists() and git_dir.is_dir():
            last_modified_timestamp = git_dir.stat().st_mtime
        
        last_modified_iso = datetime.fromtimestamp(last_modified_timestamp).isoformat()

        # Basic info
        basic_info = {
            "id": repo_id,
            "name": repo_name,
            "path": repo_path_str,
            "description": self._get_repo_description(repo_path_obj),
            "last_modified": last_modified_iso,
            "type": "git_repository" 
        }

        # Get detailed Git information using GitOperations
        git_ops = GitOperations()
        detailed_git_info = git_ops.get_repository_info(repo_path_str)

        # Merge basic info with detailed Git info
        # Basic info takes precedence for id, name, path, description, last_modified
        # as they are derived by the scanner itself.
        # Detailed info adds/overwrites git-specific fields like branch, remotes, commits, status.
        combined_info = {**detailed_git_info, **basic_info}
        # Ensure 'remotes' from detailed_git_info is preserved if it exists
        if 'remotes' in detailed_git_info:
            combined_info['remotes'] = detailed_git_info['remotes']
        else:
            combined_info['remotes'] = [] # Ensure remotes key exists

        return combined_info

    def get_repositories_info(self, repos):
        """Get information for a list of repositories"""
        # Changed to use _extract_basic_repo_info to get detailed data
        return [self._extract_basic_repo_info(Path(repo)) for repo in repos]
    
    def get_directories_info(self, dirs):
        """Get information for a list of directories"""
        return [self.get_dir_info(dir_path) for dir_path in dirs]
