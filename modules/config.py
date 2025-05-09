import os
import json
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

class ConfigManager:
    """
    Handles configuration loading, saving, and management.
    """
    def __init__(self, app=None):
        self.app = app
        self.config_file = Path(__file__).parent.parent / "data" / "config.json"
        self.scan_results_file = Path(__file__).parent.parent / "data" / "git_repos_scan.json"
        self.config = {}
    
    def init_config(self):
        """Initialize configuration with defaults if not exists"""
        if not os.path.exists(self.config_file):
            default_config = {
                "scan_directory": os.path.expanduser("~/code"),
                "max_depth": 10,
                "verbose": False,
                "excluded_dirs": [
                    "node_modules", ".git", "venv", "__pycache__", "dist", "build",
                    ".terraform", "modules", ".venv", "env"
                ],
                "high_level_dirs": [],
                "repositories_file": "data/repositories.json",
                "browseable_base_paths": [str(Path.home())] # Default to user's home directory
            }
            self.save_config(default_config)
            logger.info(f"Created default configuration at {self.config_file}")
            return default_config
        else:
            return self.get_config()
    
    def load_config(self):
        """Load configuration from file"""
        try:
            if not os.path.exists(self.config_file):
                return self.init_config()
                
            with open(self.config_file, 'r') as f:
                self.config = json.load(f)
            
            # Ensure browseable_base_paths exists, provide default if not
            if "browseable_base_paths" not in self.config:
                self.config["browseable_base_paths"] = [str(Path.home())]
                logger.warning("'browseable_base_paths' not found in config, defaulting to home directory.")
                
            return self.config
        except Exception as e:
            logger.error(f"Error loading config: {e}")
            return {}
    
    def get_config(self):
        """Get the current configuration"""
        if not self.config:
            self.load_config()
        return self.config

    def save_config(self, config):
        """Save configuration to file"""
        try:
            os.makedirs(os.path.dirname(self.config_file), exist_ok=True)
            with open(self.config_file, 'w') as f:
                json.dump(config, f, indent=2)
            self.config = config
            return True
        except Exception as e:
            logger.error(f"Error saving config: {e}")
            return False
    
    def update_config(self, new_config):
        """Update specific configuration values"""
        config = self.get_config()
        config.update(new_config)
        return self.save_config(config)
    
    def get_scan_results(self):
        """Get the latest scan results"""
        try:
            if not os.path.exists(self.scan_results_file):
                return {"git_repositories": [], "non_git_directories": []}
                
            with open(self.scan_results_file, 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading scan results: {e}")
            return {"git_repositories": [], "non_git_directories": []}
    
    def save_scan_results(self, results):
        """Save scan results to file"""
        try:
            os.makedirs(os.path.dirname(self.scan_results_file), exist_ok=True)
            with open(self.scan_results_file, 'w') as f:
                json.dump(results, f, indent=2)
            return True
        except Exception as e:
            logger.error(f"Error saving scan results: {e}")
            return False
    
    def get_browseable_base_paths(self):
        """Get the list of base paths allowed for browsing."""
        if self.config is None:
            self.load_config()
        return self.config.get("browseable_base_paths", [str(Path.home())])

    def is_path_within_browseable_bases(self, path_to_check_str):
        """
        Check if the given path_to_check is within one of the browseable_base_paths.
        Resolves paths to deal with '..' etc.
        """
        if not path_to_check_str: # If path_to_check_str is empty or None, it's not valid for this check.
            return False
            
        base_paths = self.get_browseable_base_paths()
        try:
            # Resolve the path to check to its absolute form to prevent traversal issues
            # and handle symbolic links consistently.
            path_to_check = Path(path_to_check_str).resolve(strict=False) # strict=False if path might not exist yet for listing
        except Exception as e: # Could be FileNotFoundError if strict=True and path doesn't exist, or other OS errors
            logger.warning(f"Could not resolve path '{path_to_check_str}': {e}")
            return False

        for base_path_str in base_paths:
            try:
                base_path = Path(base_path_str).resolve(strict=False)
                # Check if path_to_check is equal to or a sub-path of base_path
                if path_to_check == base_path or base_path in path_to_check.parents:
                    return True
            except Exception as e: # Could be FileNotFoundError if strict=True and base_path_str is invalid
                logger.warning(f"Could not resolve base_path '{base_path_str}': {e}")
                continue # Try next base_path
        return False
