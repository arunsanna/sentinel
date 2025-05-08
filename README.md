# Repository Scanner

A web-based application for scanning, monitoring, and managing Git repositories on your system.

## Features

- Scan your local filesystem for Git repositories
- View repositories in a sortable, filterable table
- Pull/refresh repositories with a single click
- Monitor repository status (changes, commits ahead/behind)
- Configure scan depth and exclusions
- Real-time scan progress indicators using Server-Sent Events
- Live pull progress and logs with detailed operation information
- Modern, responsive glassmorphic UI with dark mode support
- Mobile-friendly design with optimized card views

## UI Features

The application features a modern, responsive glassmorphic design with the following UI features:

- **Glassmorphic Interface**: Frosted glass effect with depth and transparency
- **Dark/Light Mode**: Toggle between dark and light themes for comfortable viewing
- **Responsive Design**: Optimized for all device sizes with tailored mobile views
- **Progress Tracking**: Real-time visual feedback for scanning and pull operations
- **Animated Elements**: Smooth transitions and loading animations
- **Icon Integration**: Font Awesome icons for improved visual cues and usability
- **Card-Based Mobile View**: Optimized mobile experience with expandable cards
- **Interactive Logs**: Collapsible log panels for detailed operation information

## Getting Started

### Prerequisites

- Python 3.8+
- Git
- Docker and Docker Compose (optional, for containerized deployment)

### Installation

#### Option 1: Local Installation

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/repository-scanner.git
   cd repository-scanner
   ```

2. Install the required packages:
   ```
   pip install -r requirements.txt
   ```

3. Run the application:
   ```
   python app.py
   ```

4. Open your browser and navigate to `http://localhost:8080`

#### Option 2: Docker Installation

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/repository-scanner.git
   cd repository-scanner
   ```

2. Build and run with Docker Compose:
   ```
   docker-compose up -d
   ```

3. Open your browser and navigate to `http://localhost:8080`

### API Endpoints

The application provides the following REST API endpoints:

- `GET /api/scan` - Scan for repositories with parameters:
  - `path` - The directory path to scan
  - `depth` - Maximum depth to scan (default: 10)

- `GET /api/scan/progress` - Server-Sent Events endpoint for real-time scan progress updates

- `GET /api/repositories` - Get all repositories found in the last scan

- `GET /api/repository/:id` - Get detailed information about a specific repository

- `POST /api/repository/:id/pull` - Pull the latest changes for a repository

- `GET /api/repository/:id/pull/progress` - Server-Sent Events endpoint for real-time pull progress and logs

- `GET /api/config` - Get the current configuration

- `POST /api/config` - Update the configuration

## Configuration

The application creates a default configuration at `data/config.json` with these settings:

```json
{
  "scan_directory": "~/code",
  "max_depth": 10,
  "verbose": false,
  "excluded_dirs": [
    "node_modules", ".git", "venv", "__pycache__", "dist", "build",
    ".terraform", "modules", ".venv", "env"
  ],
  "high_level_dirs": []
}
```

You can modify these settings through the UI or by directly editing the config file.

## Development

### Project Structure

- `app.py` - Flask application entry point
- `modules/` - Modular components for repository scanning, Git operations, and configuration
- `templates/` - HTML templates for the web interface
- `static/` - Static assets (CSS, JavaScript)
- `data/` - Configuration and scan results storage

### Adding New Features

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with Flask, React, and GitPython
- Styled with Tailwind CSS
