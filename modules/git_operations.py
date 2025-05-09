import os
import logging
from pathlib import Path
import git
from git import Repo
from datetime import datetime

logger = logging.getLogger(__name__)

class GitOperations:
    """
    Handles Git operations for repositories.
    """
    
    def get_repository_info(self, repo_path):
        """
        Get detailed Git information about a repository
        
        Args:
            repo_path (str): Path to the repository
            
        Returns:
            dict: Repository information including branches, remotes, etc.
        """
        try:
            repo = Repo(repo_path)
            
            # Get current branch
            try:
                current_branch = repo.active_branch.name
            except TypeError:
                # Detached HEAD state
                current_branch = "DETACHED HEAD"
            
            # Get remotes
            remotes = []
            for remote in repo.remotes:
                remotes.append({
                    "name": remote.name,
                    "url": next(remote.urls, "")
                })
            
            # Get recent commits
            commits = []
            for commit in repo.iter_commits(max_count=5):
                commits.append({
                    "hash": commit.hexsha,
                    "short_hash": commit.hexsha[:7],
                    "message": commit.message.strip(),
                    "author": commit.author.name,
                    "author_email": commit.author.email,
                    "date": datetime.fromtimestamp(commit.committed_date).isoformat()
                })
            
            # Check if there are changes
            changed_files = []
            for item in repo.index.diff(None):
                changed_files.append(item.a_path)
            
            # Check commits ahead/behind (if remote exists)
            ahead = 0
            behind = 0
            if remotes and not repo.bare:
                try:
                    # Get the tracking branch if it exists
                    tracking_branch = repo.active_branch.tracking_branch()
                    if tracking_branch:
                        ahead_commit = repo.iter_commits(f'{tracking_branch}..{current_branch}')
                        ahead = sum(1 for _ in ahead_commit)
                        
                        behind_commit = repo.iter_commits(f'{current_branch}..{tracking_branch}')
                        behind = sum(1 for _ in behind_commit)
                except Exception as e:
                    logger.warning(f"Error getting ahead/behind counts: {e}")
            
            return {
                "current_branch": current_branch,
                "remotes": remotes,
                "recent_commits": commits,
                "has_changes": len(changed_files) > 0,
                "changed_files": changed_files,
                "ahead": ahead,
                "behind": behind,
                "status": self._get_repo_status(repo, ahead, behind, changed_files)
            }
        except Exception as e:
            logger.error(f"Error getting repository info: {e}")
            return {
                "error": str(e),
                "current_branch": "Unknown",
                "remotes": [],
                "recent_commits": [],
                "has_changes": False,
                "changed_files": [],
                "ahead": 0,
                "behind": 0,
                "status": "Error"
            }
    
    def _get_repo_status(self, repo, ahead, behind, changed_files):
        """Determine the status of the repository based on its state"""
        if len(changed_files) > 0:
            return "Changed"
        elif ahead > 0 and behind > 0:
            return "Diverged"
        elif ahead > 0:
            return "Ahead"
        elif behind > 0:
            return "Behind"
        else:
            return "Clean"
    
    def get_git_status(self, repo_path):
        """
        Get the output of 'git status --porcelain' for a repository.

        Args:
            repo_path (str): Path to the repository.

        Returns:
            str: The output of 'git status --porcelain', or None if an error occurs.
        """
        try:
            repo = Repo(repo_path)
            # Ensure it's a valid git repo and not bare
            if repo.bare:
                logger.warning(f"Cannot get status for bare repository: {repo_path}")
                return "Bare repository, cannot display status."
            
            # Using repo.git.status(porcelain=True) is a direct way with gitpython
            status_output = repo.git.status(porcelain=True)
            if not status_output: # If status is clean, porcelain output is empty
                return "Clean"
            return status_output
        except git.InvalidGitRepositoryError:
            logger.error(f"Not a git repository: {repo_path}")
            return None # Or a specific error message string
        except Exception as e:
            logger.error(f"Error getting git status for {repo_path}: {e}")
            return None # Or a specific error message string

    def discard_local_changes(self, repo_path):
        """
        Discard all local changes in the repository.
        This executes 'git reset --hard HEAD' and 'git clean -fd'.

        Args:
            repo_path (str): Path to the repository.

        Returns:
            tuple: (bool, str) indicating success status and a message.
        """
        try:
            repo = Repo(repo_path)
            if repo.bare:
                msg = "Cannot discard changes in a bare repository."
                logger.warning(msg)
                return False, msg

            # Reset any staged or uncommitted changes in tracked files
            logger.info(f"Running 'git reset --hard HEAD' in {repo_path}")
            repo.git.reset('--hard', 'HEAD')
            
            # Remove untracked files and directories
            # -d: remove untracked directories in addition to untracked files
            # -f: force (required if clean.requireForce is not set to false)
            logger.info(f"Running 'git clean -fd' in {repo_path}")
            repo.git.clean('-fd')
            
            msg = "Local changes discarded successfully."
            logger.info(msg + f" in {repo_path}")
            return True, msg
        except git.InvalidGitRepositoryError:
            msg = f"Not a git repository: {repo_path}"
            logger.error(msg)
            return False, msg
        except Exception as e:
            msg = f"Error discarding local changes for {repo_path}: {e}"
            logger.error(msg)
            return False, msg

    def pull_repository(self, repo_path, progress_callback=None):
        """
        Pull the latest changes for a repository
        
        Args:
            repo_path (str): Path to the repository
            progress_callback (function, optional): Callback function to report progress
            
        Returns:
            dict: Result of the pull operation
        """
        try:
            if progress_callback:
                progress_callback({"message": f"Opening repository at {repo_path}"})
                
            repo = Repo(repo_path)
            
            # Check if repo has remotes
            if not repo.remotes:
                if progress_callback:
                    progress_callback({"message": "Repository has no remotes", "status": "error"})
                return {
                    "success": False,
                    "message": "Repository has no remotes"
                }
            
            # Check for local changes
            if progress_callback:
                progress_callback({"message": "Checking for local changes"})
                
            changed_files = []
            for item in repo.index.diff(None):
                changed_files.append(item.a_path)
            
            if changed_files:
                change_message = f"Repository has local changes: {', '.join(changed_files[:5])}" + \
                    (f" and {len(changed_files) - 5} more" if len(changed_files) > 5 else "")
                
                if progress_callback:
                    progress_callback({"message": change_message, "status": "error"})
                
                return {
                    "success": False,
                    "message": change_message
                }
            
            # Get the default remote (usually 'origin')
            remote = repo.remotes[0]
            
            if progress_callback:
                progress_callback({"message": f"Fetching from remote '{remote.name}'", "status": "running"})
            
            # Fetch first to report remote changes
            fetch_info = remote.fetch()
            fetch_results = []
            for info in fetch_info:
                fetch_results.append({
                    "ref": str(info.ref),
                    "flags": info.flags,
                    "note": info.note
                })
                
                # Report each fetched ref
                if progress_callback:
                    progress_callback({
                        "message": f"Fetched {info.ref} ({info.note})", 
                        "status": "running",
                        "detail": str(info.ref)
                    })
            
            # Perform the pull
            if progress_callback:
                progress_callback({"message": f"Pulling from remote '{remote.name}'", "status": "running"})
                
            pull_info = remote.pull(progress=self._get_progress_handler(progress_callback))
            
            # Process pull results
            results = []
            for info in pull_info:
                results.append({
                    "ref": str(info.ref),
                    "flags": info.flags,
                    "note": info.note
                })
                
                # Report each pulled ref
                if progress_callback:
                    progress_callback({
                        "message": f"Pulled {info.ref} ({info.note})", 
                        "status": "success",
                        "detail": str(info.ref)
                    })
            
            success_message = f"Successfully pulled from {remote.name}"
            if progress_callback:
                progress_callback({
                    "message": success_message, 
                    "status": "completed",
                    "details": results
                })
            
            return {
                "success": True,
                "message": success_message,
                "details": results
            }
        except Exception as e:
            logger.error(f"Error pulling repository: {e}")
            error_message = f"Error: {str(e)}"
            
            if progress_callback:
                progress_callback({
                    "message": error_message, 
                    "status": "error"
                })
                
            return {
                "success": False,
                "message": error_message
            }
    
    def _get_progress_handler(self, progress_callback):
        """Create a progress handler function for Git operations"""
        if not progress_callback:
            return None
            
        def progress_handler(op_code, cur_count, max_count=None, message=''):
            """Internal progress handler for Git operations"""
            operation = self._get_operation_name(op_code)
            if max_count:
                percent = (cur_count / max_count) * 100
                progress_message = f"{operation}: {percent:.0f}% ({cur_count}/{max_count})"
            else:
                progress_message = f"{operation}: {cur_count}"
                
            if message:
                progress_message += f" - {message}"
                
            progress_callback({
                "message": progress_message,
                "status": "running",
                "operation": operation,
                "current": cur_count,
                "maximum": max_count
            })
            
        return progress_handler
    
    def _get_operation_name(self, op_code):
        """Convert Git operation codes to readable names"""
        from git import RemoteProgress as RP
        
        operations = {
            RP.COUNTING: "Counting objects",
            RP.COMPRESSING: "Compressing objects",
            RP.WRITING: "Writing objects",
            RP.RECEIVING: "Receiving objects",
            RP.RESOLVING: "Resolving deltas",
            RP.FINDING_SOURCES: "Finding sources",
            RP.CHECKING_OUT: "Checking out files"
        }
        
        # Extract the stage from op_code
        stage = op_code & RP.STAGE_MASK
        return operations.get(stage, "Processing")
