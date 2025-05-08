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
                "high_level_dirs": []
            }
            self.save_config(default_config)
            logger.info(f"Created default configuration at {self.config_file}")
            return default_config
        else:
            return self.get_config()
    
    def get_config(self):
        """Load configuration from file"""
        try:
            if not os.path.exists(self.config_file):
                return self.init_config()
                
            with open(self.config_file, 'r') as f:
                self.config = json.load(f)
            return self.config
        except Exception as e:
            logger.error(f"Error loading config: {e}")
            return {}
    
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
