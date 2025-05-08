#!/usr/bin/env python3
import os
import json
from datetime import datetime
from pathlib import Path
import logging
import concurrent.futures
import gitignore_parser # Correct import
from tabulate import tabulate

# --- Logging Setup ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- Constants ---
DATA_DIR = Path(__file__).parent / "data"
CONFIG_FILE = DATA_DIR / "config.json"
SCAN_RESULTS_FILE = DATA_DIR / "git_repos_scan.json"
GITIGNORE_PATTERNS_FILE = DATA_DIR / "gitignore_patterns.json" # Keep for potential future use or reference

# --- Configuration Loading ---
def load_config():
    """Load configuration from JSON file or create default if not exists"""
    DATA_DIR.mkdir(exist_ok=True) # Ensure data directory exists
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, 'r') as f:
                config = json.load(f)
                logger.info(f"Loaded configuration from {CONFIG_FILE}")
                # Ensure essential keys exist
                config.setdefault("scan_directory", os.path.expanduser("~/code"))
                config.setdefault("max_depth", 10)
                config.setdefault("verbose", False)
                config.setdefault("excluded_dirs", [
                    "node_modules", ".git", "venv", "__pycache__", "dist", "build",
                    ".terraform", "modules", ".venv", "env" # Added common ones
                ])
                config.setdefault("high_level_dirs", []) # Keep if needed for other logic
                return config
        except json.JSONDecodeError:
            logger.error(f"Error decoding JSON from {CONFIG_FILE}. Using default config.")
        except Exception as e:
            logger.error(f"Error loading config: {e}. Using default config.")

    # Default configuration if file doesn't exist or is invalid
    default_config = {
        "scan_directory": os.path.expanduser("~/code"),
        "max_depth": 10,
        "verbose": False,
        "excluded_dirs": [
            "node_modules", ".git", "venv", "__pycache__", "dist", "build",
            ".terraform", "modules", ".venv", "env"
        ],
        "high_level_dirs": [ # Example high-level dirs, adjust as needed
             "Workshop", "AI-Workshop", "K8s-Workshop", "Writing-Workshop",
             "Proposal-Shop", "Azure-Workshop", "AWS-Workshop", "Tech-Challenges",
             "Misc-Workshop", "Orgs", "DevSecOps", "Personal-projects", "Google-Workshop"
        ]
    }
    try:
        with open(CONFIG_FILE, 'w') as f:
            json.dump(default_config, f, indent=2)
        logger.info(f"Created default configuration file at {CONFIG_FILE}")
    except IOError as e:
        logger.error(f"Could not write default config file: {e}")
    return default_config

# --- .gitignore Handling ---
def get_gitignore_matcher(directory):
    """Creates a gitignore_parser matcher for a given directory, if .gitignore exists."""
    gitignore_path = Path(directory) / ".gitignore"
    if gitignore_path.is_file():
        try:
            # Pass the path directly to parse_gitignore
            return gitignore_parser.parse_gitignore(gitignore_path)
        except Exception as e:
            logger.warning(f"Could not parse .gitignore file at {gitignore_path}: {e}")
    return None # No .gitignore or error parsing

# --- Directory Scanning (Parallelized) ---
def scan_directory(dir_path: Path, config, current_depth=0, parent_gitignore_matcher=None):
    """
    Scans a single directory. Returns lists of git repos and non-git dirs found within.
    Handles depth limits, exclusions, and .gitignore.
    """
    logger.info(f"Scanning directory: {dir_path} (depth: {current_depth})")
    
    if current_depth > config["max_depth"]:
        logger.info(f"Max depth reached for {dir_path}")
        return [], []

    git_repos_found = []
    non_git_dirs_found = [] # Only top-level non-git dirs relative to scan_directory

    # --- .gitignore Logic ---
    current_gitignore_matcher = get_gitignore_matcher(dir_path)
    def is_ignored(path_to_check):
        # Make sure path_to_check is a Path object
        path_obj = Path(path_to_check) if isinstance(path_to_check, str) else path_to_check
        # Check parent matcher first, then current directory's matcher
        if parent_gitignore_matcher and parent_gitignore_matcher(str(path_obj)):
            return True
        if current_gitignore_matcher and current_gitignore_matcher(str(path_obj)):
            return True
        # Check config exclusions (simple basename check)
        if path_obj.name in config.get("excluded_dirs", []):
             return True
        return False

    # --- Check Current Directory ---
    is_git_repo = (Path(dir_path) / ".git").is_dir()
    parent_scan_dir = Path(config["scan_directory"])
    is_top_level_scan = dir_path.parent == parent_scan_dir

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

    if is_git_repo:
        logger.debug(f"Found Git repository: {dir_path}")
        git_repos_found.append(dir_path)
        # Don't scan further into a git repo
        return git_repos_found, non_git_dirs_found
    elif is_top_level_scan and dir_path != config["scan_directory"]:
         # Only add non-git dirs directly under the main scan_directory
         # Exclude high_level_dirs if specified
         if Path(dir_path).name not in config.get("high_level_dirs", []):
             logger.debug(f"Found non-Git directory: {dir_path}")
             non_git_dirs_found.append(dir_path)
         else:
             logger.debug(f"Skipping high-level directory: {dir_path}")



    # --- Scan Subdirectories ---
    subdirs_to_scan = []
    try:
        for item in dir_path.iterdir():
            if item.is_dir():
                # Check if this subdir should be ignored
                if is_ignored(item):
                    logger.debug(f"Ignoring directory due to exclusion or .gitignore: {item}")
                    continue
                subdirs_to_scan.append(item)
    except PermissionError:
        logger.warning(f"Permission denied accessing: {dir_path}")
        return git_repos_found, non_git_dirs_found # Return what we have so far
    except FileNotFoundError:
        logger.warning(f"Directory not found (possibly removed during scan): {dir_path}")
        return git_repos_found, non_git_dirs_found

    # --- Parallel Subdirectory Scanning ---
    # Pass the combined matcher (parent + current) to children
    effective_matcher = current_gitignore_matcher or parent_gitignore_matcher # TODO: Refine combining logic if needed

    # Use ThreadPoolExecutor for I/O-bound tasks like scanning directories
    with concurrent.futures.ThreadPoolExecutor() as executor:
        # Map scan_directory function to subdirs
        future_to_subdir = {
            executor.submit(scan_directory, subdir, config, current_depth + 1, effective_matcher): subdir
            for subdir in subdirs_to_scan
        }
        for future in concurrent.futures.as_completed(future_to_subdir):
            subdir = future_to_subdir[future]
            try:
                sub_git_repos, sub_non_git_dirs = future.result()
                git_repos_found.extend(sub_git_repos)
                non_git_dirs_found.extend(sub_non_git_dirs)
            except Exception as exc:
                logger.error(f"Subdirectory scan {subdir} generated an exception: {exc}")

    return git_repos_found, non_git_dirs_found


# --- Data Aggregation ---
def get_repo_info(repo_path):
    """Get basic information about a git repository (no size)"""
    path_obj = Path(repo_path)
    try:
        last_modified_time = path_obj.stat().st_mtime
        last_modified_iso = datetime.fromtimestamp(last_modified_time).isoformat()
    except OSError as e:
        logger.warning(f"Could not get stats for {repo_path}: {e}")
        last_modified_iso = "N/A"

    info = {
        "path": str(path_obj.resolve()), # Store absolute path
        "name": path_obj.name,
        "last_modified": last_modified_iso,
        # "size_mb": round(get_dir_size(repo_path) / (1024 * 1024), 2) # Removed
    }
    return info

def get_dir_info(dir_path):
    """Get basic information about a non-git directory (no size)"""
    path_obj = Path(dir_path)
    try:
        last_modified_time = path_obj.stat().st_mtime
        last_modified_iso = datetime.fromtimestamp(last_modified_time).isoformat()
    except OSError as e:
        logger.warning(f"Could not get stats for {dir_path}: {e}")
        last_modified_iso = "N/A"

    info = {
        "path": str(path_obj.resolve()), # Store absolute path
        "name": path_obj.name,
        "last_modified": last_modified_iso,
        # "size_mb": round(get_dir_size(dir_path) / (1024 * 1024), 2) # Removed
    }
    return info

# --- Output Formatting ---
def print_table(data, title):
    """Print data in a table format (no size column)"""
    if not data:
        print(f"\nNo {title} found.")
        return

    # headers = ["Name", "Path", "Last Modified", "Size (MB)"] # Original
    headers = ["Name", "Path", "Last Modified"] # Updated
    table_data = []

    for item in data:
        # Format date for better readability if not N/A
        formatted_date = "N/A"
        if item["last_modified"] != "N/A":
            try:
                date_obj = datetime.fromisoformat(item["last_modified"])
                formatted_date = date_obj.strftime("%Y-%m-%d %H:%M:%S")
            except ValueError:
                 formatted_date = item["last_modified"] # Keep as is if format is unexpected

        table_data.append([
            item["name"],
            item["path"],
            formatted_date,
            # item["size_mb"] # Removed
        ])

    print(f"\n{title}:")
    # Sort by name for consistent output
    table_data.sort(key=lambda x: x[0])
    print(tabulate(table_data, headers=headers, tablefmt="grid"))

# --- Main Execution ---
if __name__ == "__main__":
    import argparse
    
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Scan for git repositories in specified directories')
    parser.add_argument('--force-scan', action='store_true',
                      help='Force a fresh scan even if results exist')
    args = parser.parse_args()
    
    # Load configuration
    config = load_config()

    # Set logging level based on config
    if config.get("verbose", False):
        logger.setLevel(logging.DEBUG)
        logger.info("Verbose logging enabled.")
    else:
        logger.setLevel(logging.INFO)


    scan_start_time = datetime.now()
    logger.info(f"Starting scan of '{config['scan_directory']}'...")
    logger.info(f"Max depth: {config['max_depth']}")
    logger.info(f"Excluded directory names: {config.get('excluded_dirs', [])}")
    logger.info(f"High-level directories to skip scanning into: {config.get('high_level_dirs', [])}")


    # --- Perform Scan ---
    # The initial call to scan_directory handles the parallel execution within it
    try:
        # Convert the scan_directory string to a Path object
        scan_dir_path = Path(config["scan_directory"])
        git_repos, non_git_repos = scan_directory(
            scan_dir_path,
            config,
            current_depth=0,
            parent_gitignore_matcher=None # No parent matcher at the top level
        )
    except Exception as e:
        logger.critical(f"An unexpected error occurred during the main scan: {e}", exc_info=True)
        git_repos, non_git_repos = [], [] # Ensure lists are initialized

    scan_end_time = datetime.now()
    scan_duration = scan_end_time - scan_start_time
    logger.info(f"Scan completed in {scan_duration}")


    # --- Process Results ---
    logger.info("Processing scan results...")
    result_data = {
        "scan_time": datetime.now().isoformat(),
        "scan_duration_seconds": scan_duration.total_seconds(),
        "scan_directory": config["scan_directory"],
        "git_repositories": sorted([get_repo_info(repo) for repo in git_repos], key=lambda x: x['name']),
        "non_git_directories": sorted([get_dir_info(repo) for repo in non_git_repos], key=lambda x: x['name']),
        "config_used": config # Include config for reference
    }

    # --- Save Results ---
    try:
        with open(SCAN_RESULTS_FILE, 'w') as f:
            json.dump(result_data, f, indent=2)
        logger.info(f"Results saved to {SCAN_RESULTS_FILE}")
    except IOError as e:
        logger.error(f"Could not write results file: {e}")
    except TypeError as e:
         logger.error(f"Could not serialize results to JSON: {e}")


    # --- Print Summary ---
    print(f"\n--- Scan Summary ---")
    print(f"Scan Directory: {config['scan_directory']}")
    print(f"Scan Duration: {scan_duration}")
    print(f"Found {len(result_data['git_repositories'])} Git-tracked repositories")
    print(f"Found {len(result_data['non_git_directories'])} top-level non-Git directories")
    print(f"Results saved to: {SCAN_RESULTS_FILE}")

    # Print tables if verbose mode is enabled
    if config.get("verbose", False):
        print_table(result_data["git_repositories"], "Git Repositories")
        print_table(result_data["non_git_directories"], "Non-Git Directories (Top-Level)")

    logger.info("Script finished.")