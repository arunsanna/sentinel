#!/usr/bin/env python3
from flask import Flask, jsonify, request, render_template, Response, stream_with_context
from pathlib import Path
import json
import logging
import os
import time
from datetime import datetime
import threading
import queue

# Import modules
from modules.scanner import RepositoryScanner
from modules.git_operations import GitOperations
from modules.config import ConfigManager

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__, 
            static_folder="static",
            template_folder="templates")

# Initialize configuration
config_manager = ConfigManager(app)

# Global scan progress tracking
scan_progress = {
    "is_scanning": False,
    "total_dirs": 0,
    "processed_dirs": 0,
    "git_repos_found": 0,
    "scan_path": "",
    "message": "",
    "progress_queue": queue.Queue()
}

# Global pull progress tracking
pull_progress = {
    "is_pulling": False,
    "repo_id": "",
    "repo_path": "",
    "message": "",
    "progress_queue": queue.Queue()
}

# Routes
@app.route('/')
def index():
    """Serve the main application page"""
    return render_template('index.html')

@app.route('/debug')
def debug():
    """Debug page to test if the server is responding"""
    return render_template('debug.html')

@app.route('/simplified')
def simplified():
    """Serve a simplified version of the application page"""
    return render_template('simplified.html')

# API Routes
@app.route('/api/browse_directories', methods=['GET'])
def browse_directories():
    requested_path_str = request.args.get('path', None)
    items = []
    parent_path = None
    current_path_for_response = None

    try:
        if not requested_path_str:
            # List configured base paths
            base_paths = config_manager.get_browseable_base_paths()
            current_path_for_response = "/" # Virtual root for base paths
            for p_str in base_paths:
                p = Path(p_str)
                if p.exists() and p.is_dir():
                    items.append({"name": p.name, "path": str(p.resolve()), "type": "directory"})
                else:
                    logger.warning(f"Configured browseable_base_path does not exist or is not a directory: {p_str}")
        else:
            # Validate if the requested path is within allowed bases
            if not config_manager.is_path_within_browseable_bases(requested_path_str):
                logger.warning(f"Attempt to browse outside of allowed base paths: {requested_path_str}")
                return jsonify({"error": "Access denied: Path is outside of browseable areas."}), 403

            current_path = Path(requested_path_str).resolve()
            current_path_for_response = str(current_path)

            if not current_path.exists() or not current_path.is_dir():
                return jsonify({"error": "Path not found or is not a directory."}), 404

            # Determine parent path, ensuring it doesn't go "above" a base path
            # This logic for parent_path needs to be careful not to allow escaping the browseable roots.
            # If current_path is one of the base_paths, parent should be our virtual root "/"
            # Otherwise, it's current_path.parent
            
            is_base_path = False
            for bp_str in config_manager.get_browseable_base_paths():
                if current_path == Path(bp_str).resolve():
                    is_base_path = True
                    break
            
            if is_base_path:
                parent_path = "/" # Virtual root
            else:
                # Ensure parent is still within browseable area
                potential_parent = current_path.parent
                if config_manager.is_path_within_browseable_bases(str(potential_parent)):
                    parent_path = str(potential_parent)
                else: # Should not happen if initial validation is correct, but as a safeguard
                    parent_path = "/" 


            for item_name in os.listdir(current_path):
                item_path = current_path / item_name
                item_type = "directory" if item_path.is_dir() else "file"
                # Optionally hide hidden files/folders, or specific types
                # if item_name.startswith('.'):
                #     continue
                items.append({"name": item_name, "path": str(item_path.resolve()), "type": item_type})
        
        # Sort items: directories first, then files, then alphabetically
        items.sort(key=lambda x: (x['type'] != 'directory', x['name'].lower()))

        return jsonify({
            "current_path": current_path_for_response,
            "parent_path": parent_path,
            "items": items
        })

    except PermissionError:
        logger.error(f"Permission denied while trying to browse path: {requested_path_str}")
        return jsonify({"error": "Permission denied to access this path on the server."}), 500
    except Exception as e:
        logger.error(f"Error browsing directories for path '{requested_path_str}': {e}")
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500


@app.route('/api/scan/progress', methods=['GET'])
def scan_progress_stream():
    """Stream scan progress updates using Server-Sent Events"""
    def generate():
        # Initial event when connected
        if scan_progress["is_scanning"]:
            # Create a copy of scan_progress without the queue
            progress_copy = {k: v for k, v in scan_progress.items() if k != "progress_queue"}
            yield f"data: {json.dumps({'status': 'scanning', 'progress': progress_copy})}\n\n"
        else:
            yield f"data: {json.dumps({'status': 'idle'})}\n\n"
        
        # Wait for new events
        while True:
            try:
                # Get a progress update if available or wait for 1 second
                try:
                    progress_update = scan_progress["progress_queue"].get(timeout=1.0)
                    yield f"data: {json.dumps(progress_update)}\n\n"
                except queue.Empty:
                    # Send a heartbeat event to keep connection alive
                    yield f"data: {json.dumps({'status': 'heartbeat'})}\n\n"
                    
                time.sleep(0.1)  # Small pause to prevent CPU hogging
            except GeneratorExit:
                # Client disconnected
                break
    
    return Response(stream_with_context(generate()), 
                   mimetype='text/event-stream',
                   headers={
                       'Cache-Control': 'no-cache',
                       'Connection': 'keep-alive'
                   })

@app.route('/api/repository/<repo_id>/pull/progress', methods=['GET'])
def pull_progress_stream(repo_id):
    """Stream pull progress updates using Server-Sent Events"""
    def generate():
        # Initial event when connected
        if pull_progress["is_pulling"] and pull_progress["repo_id"] == repo_id:
            # Create a copy of pull_progress without the queue
            progress_copy = {k: v for k, v in pull_progress.items() if k != "progress_queue"}
            yield f"data: {json.dumps({'status': 'pulling', 'progress': progress_copy})}\n\n"
        else:
            yield f"data: {json.dumps({'status': 'idle', 'repo_id': repo_id})}\n\n"
        
        # Wait for new events
        while True:
            try:
                # Get a progress update if available or wait for 1 second
                try:
                    progress_update = pull_progress["progress_queue"].get(timeout=1.0)
                    # Only send updates for the requested repo
                    if progress_update.get("repo_id") == repo_id:
                        yield f"data: {json.dumps(progress_update)}\n\n"
                except queue.Empty:
                    # Send a heartbeat event to keep connection alive
                    yield f"data: {json.dumps({'status': 'heartbeat', 'repo_id': repo_id})}\n\n"
                    
                time.sleep(0.1)  # Small pause to prevent CPU hogging
            except GeneratorExit:
                # Client disconnected
                break
    
    return Response(stream_with_context(generate()), 
                   mimetype='text/event-stream',
                   headers={
                       'Cache-Control': 'no-cache',
                       'Connection': 'keep-alive'
                   })

def progress_update_callback(update_info):
    """Callback function to report scan progress"""
    global scan_progress
    
    if update_info.get("type") == "git_repo":
        scan_progress["git_repos_found"] += 1
    
    scan_progress["processed_dirs"] += 1
    scan_progress["message"] = update_info.get("message", "")
    
    # Put update in the queue for SSE clients
    progress_update = {
        "status": "progress", 
        "progress": {k: v for k, v in scan_progress.items() if k != "progress_queue"},
        "update": update_info
    }
    scan_progress["progress_queue"].put(progress_update)

def pull_update_callback(update_info):
    """Callback function to report pull progress"""
    global pull_progress
    
    # Add the update to the progress info
    pull_progress["message"] = update_info.get("message", "")
    
    # Put update in the queue for SSE clients
    progress_update = {
        "status": update_info.get("status", "progress"), 
        "progress": {k: v for k, v in pull_progress.items() if k != "progress_queue"},
        "update": update_info,
        "repo_id": pull_progress["repo_id"]
    }
    pull_progress["progress_queue"].put(progress_update)

def perform_scan_async(scan_path, max_depth):
    """Perform the scan in a background thread"""
    global scan_progress
    
    # Reset progress
    scan_progress["is_scanning"] = True
    scan_progress["total_dirs"] = 0  # Will be estimated
    scan_progress["processed_dirs"] = 0
    scan_progress["git_repos_found"] = 0
    scan_progress["scan_path"] = scan_path
    scan_progress["message"] = f"Starting scan of {scan_path}"
    
    # Send initial message
    scan_progress["progress_queue"].put({
        "status": "started", 
        "progress": {k: v for k, v in scan_progress.items() if k != "progress_queue"}
    })
    
    try:
        # Skip directory counting for now to fix the error
        scan_progress["total_dirs"] = 100  # Placeholder value
        
        # Perform the actual scan
        scanner = RepositoryScanner(config_manager.get_config())
        git_repos, non_git_dirs = scanner.scan_directory(
            Path(scan_path),
            max_depth=max_depth,
            progress_callback=progress_update_callback  # Pass our callback
        )
        
        # Process results
        result_data = {
            "scan_time": datetime.now().isoformat(),
            "scan_directory": scan_path,
            "git_repositories": scanner.get_repositories_info(git_repos),
            "non_git_directories": scanner.get_directories_info(non_git_dirs),
        }
        
        # Save results
        config_manager.save_scan_results(result_data)
        
        # Send completion message
        scan_progress["progress_queue"].put({
            "status": "completed", 
            "progress": {k: v for k, v in scan_progress.items() if k != "progress_queue"},
            "message": f"Scan completed. Found {len(git_repos)} Git repositories.",
            "result": result_data
        })
    except Exception as e:
        logger.error(f"Error during scan: {e}")
        scan_progress["progress_queue"].put({
            "status": "error", 
            "progress": {k: v for k, v in scan_progress.items() if k != "progress_queue"},
            "message": f"Error during scan: {str(e)}"
        })
    finally:
        scan_progress["is_scanning"] = False

def perform_pull_async(repo_id, repo_path):
    """Perform the pull in a background thread"""
    global pull_progress
    
    # Reset progress
    pull_progress["is_pulling"] = True
    pull_progress["repo_id"] = repo_id
    pull_progress["repo_path"] = repo_path
    pull_progress["message"] = f"Starting pull for repository at {repo_path}"
    
    # Send initial message (careful not to include queue)
    initial_progress = {k: v for k, v in pull_progress.items() if k != "progress_queue"}
    pull_progress["progress_queue"].put({
        "status": "started", 
        "progress": initial_progress,
        "repo_id": repo_id
    })
    
    try:
        # Perform the pull
        git_ops = GitOperations()
        pull_result = git_ops.pull_repository(repo_path, progress_callback=pull_update_callback)
        
        # Send completion message (careful not to include queue)
        completion_progress = {k: v for k, v in pull_progress.items() if k != "progress_queue"}
        pull_progress["progress_queue"].put({
            "status": "completed", 
            "progress": completion_progress,
            "message": pull_result.get("message", "Pull completed"),
            "result": pull_result,
            "repo_id": repo_id
        })
        
        return pull_result
    except Exception as e:
        logger.error(f"Error during pull: {e}")
        
        # Send error message (careful not to include queue)
        error_progress = {k: v for k, v in pull_progress.items() if k != "progress_queue"}
        pull_progress["progress_queue"].put({
            "status": "error", 
            "progress": error_progress,
            "message": f"Error during pull: {str(e)}",
            "repo_id": repo_id
        })
        
        return {
            "success": False,
            "message": f"Error: {str(e)}"
        }
    finally:
        pull_progress["is_pulling"] = False

@app.route('/api/scan', methods=['GET'])
def scan_repositories():
    """Scan for repositories based on query parameters and return initial response"""
    global scan_progress
    
    # If already scanning, return current status
    if scan_progress["is_scanning"]:
        return jsonify({
            "status": "already_scanning", 
            "message": "Scan already in progress", 
            "progress": {k: v for k, v in scan_progress.items() if k != "progress_queue"}
        })
    
    scan_path = request.args.get('path', config_manager.get_config().get('scan_directory'))
    max_depth = int(request.args.get('depth', config_manager.get_config().get('max_depth', 10)))
    
    # Start scan in background thread
    scan_thread = threading.Thread(
        target=perform_scan_async, 
        args=(scan_path, max_depth)
    )
    scan_thread.daemon = True
    scan_thread.start()
    
    return jsonify({
        "status": "started",
        "message": f"Scan started for {scan_path} with max depth {max_depth}",
        "listen_url": "/api/scan/progress"
    })

@app.route('/api/repositories', methods=['GET'])
def get_repositories():
    """Get all repositories with optional filtering"""
    try:
        # Load the latest scan results
        results = config_manager.get_scan_results()
        
        # Apply filters if provided
        # TODO: Implement filtering logic
        
        return jsonify(results.get("git_repositories", []))
    except Exception as e:
        logger.error(f"Error retrieving repositories: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/repository/<repo_id>', methods=['GET'])
def get_repository(repo_id):
    """Get detailed information about a specific repository"""
    try:
        # Load the repository by ID
        # We'll use path as ID for now
        results = config_manager.get_scan_results()
        repositories = results.get("git_repositories", [])
        
        repository = next((repo for repo in repositories if repo.get("id") == repo_id), None)
        
        if not repository:
            return jsonify({"error": "Repository not found"}), 404
        
        # Get detailed Git information
        git_ops = GitOperations()
        git_info = git_ops.get_repository_info(repository.get("path"))
        
        # Combine the data
        detailed_info = {**repository, **git_info}
        
        return jsonify(detailed_info)
    except Exception as e:
        logger.error(f"Error retrieving repository details: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/repository/<repo_id>/pull', methods=['POST'])
def pull_repository(repo_id):
    """Pull the latest changes for a repository"""
    global pull_progress
    
    try:
        # Find the repository
        results = config_manager.get_scan_results()
        repositories = results.get("git_repositories", [])
        
        repository = next((repo for repo in repositories if repo.get("id") == repo_id), None)
        
        if not repository:
            return jsonify({"error": "Repository not found"}), 404
        
        # If already pulling this repository, return current status
        if pull_progress["is_pulling"] and pull_progress["repo_id"] == repo_id:
            return jsonify({
                "status": "already_pulling", 
                "message": "Pull already in progress", 
                "progress": {k: v for k, v in pull_progress.items() if k != "progress_queue"},
                "repository": repository
            })
        
        # Start pull in background thread
        repo_path = repository.get("path")
        pull_thread = threading.Thread(
            target=perform_pull_async, 
            args=(repo_id, repo_path)
        )
        pull_thread.daemon = True
        pull_thread.start()
        
        return jsonify({
            "status": "started",
            "message": f"Pull started for repository at {repo_path}",
            "repository": repository,
            "listen_url": f"/api/repository/{repo_id}/pull/progress"
        })
    except Exception as e:
        logger.error(f"Error initiating repository pull: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/repository/<repo_id>/status', methods=['GET'])
def get_repository_status(repo_id):
    """Get the git status for a specific repository"""
    try:
        results = config_manager.get_scan_results()
        repositories = results.get("git_repositories", [])
        
        repository = next((repo for repo in repositories if repo.get("id") == repo_id), None)
        
        if not repository:
            return jsonify({"error": "Repository not found"}), 404
            
        repo_path = repository.get("path")
        if not repo_path:
            return jsonify({"error": "Repository path not found"}), 404

        git_ops = GitOperations()
        status_output = git_ops.get_git_status(repo_path) # Assumes get_git_status exists in GitOperations
        
        if status_output is None: # Or however your get_git_status indicates an error
             return jsonify({"error": "Failed to get git status. Not a git repository or other error."}), 500

        return jsonify({"status_output": status_output})
        
    except Exception as e:
        logger.error(f"Error retrieving repository status for {repo_id}: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/repository/<repo_id>/discard_changes', methods=['POST'])
def discard_repository_changes(repo_id):
    """Discard all local changes (reset --hard and clean -fd) for a repository."""
    try:
        results = config_manager.get_scan_results()
        repositories = results.get("git_repositories", [])
        repository = next((repo for repo in repositories if repo.get("id") == repo_id), None)

        if not repository:
            return jsonify({"error": "Repository not found"}), 404
            
        repo_path = repository.get("path")
        if not repo_path:
            return jsonify({"error": "Repository path not found"}), 404

        git_ops = GitOperations()
        # This method will need to be created in GitOperations
        success, message = git_ops.discard_local_changes(repo_path) 
        
        if not success:
            return jsonify({"error": message or "Failed to discard local changes."}), 500

        return jsonify({"message": message or "Local changes discarded successfully."})
        
    except Exception as e:
        logger.error(f"Error discarding changes for repository {repo_id}: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/config', methods=['GET'])
def get_config():
    """Get the current configuration"""
    try:
        return jsonify(config_manager.get_config())
    except Exception as e:
        logger.error(f"Error retrieving configuration: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/config', methods=['POST'])
def update_config():
    """Update the configuration"""
    try:
        new_config = request.json
        config_manager.update_config(new_config)
        return jsonify({"success": True, "config": config_manager.get_config()})
    except Exception as e:
        logger.error(f"Error updating configuration: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Create necessary directories
    os.makedirs('data', exist_ok=True)
    os.makedirs('modules', exist_ok=True)
    
    # Ensure config is initialized
    config_manager.init_config()
    
    # Run the app on port 8080 instead of 5000 (which conflicts with AirPlay on macOS)
    app.run(debug=True, host='0.0.0.0', port=8080)
