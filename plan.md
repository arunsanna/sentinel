# Repository Scanner Web UI Plan

## Overview
Create a web-based UI for the existing repository scanner script (`scan_git_repos.py`) that will allow users to:
1. Scan folders for Git repositories with customizable depth
2. View results in a sortable, filterable table
3. Click on individual repositories to refresh/pull changes
4. Monitor the status of repositories (behind/ahead of remote)
5. Perform batch operations on multiple repositories

## Core Features

### 1. Repository Scanning
- Leverage the existing Python scanning script
- Add a web interface to initiate scans
- Allow configuration of scan parameters (directory, depth, exclusions)
- Show scan progress and results in real-time
- Support scanning arbitrary directories with customizable depth

### 2. Repository Display
- Present repositories in a responsive table format
- Include key information:
  - Repository name
  - Path
  - Last modified date
  - Current branch
  - Status (changes, commits ahead/behind)
  - Last pull/refresh timestamp
- Support for filtering and sorting repositories by various attributes

### 3. Repository Management
- Enable clicking on a repository to:
  - View detailed information
  - Pull latest changes
  - View basic git status and commit history
- Batch operations on multiple repositories
- Error handling for failed operations
- Diff viewer for code changes

### 4. Persistent Storage
- Save scan results and user preferences
- Track repository history and update status
- Store configurations for different scanning profiles
- Database backend for efficient querying and filtering

## Technology Stack

### Backend
- **Flask**: Web framework to build the API and serve the UI
- **Refactored Python modules**: Modular components from `scan_git_repos.py`
- **GitPython**: For repository operations (status, pull)
- **SQLite/PostgreSQL**: For persistent storage
- **Celery/RQ**: For background tasks and scheduled operations
- **Docker**: For containerization and easy deployment

### Frontend
- **React.js with TypeScript**: For building a responsive, interactive UI
- **Tailwind CSS**: For styling and responsive design
- **React Table or Material-UI DataGrid**: For advanced table functionality
- **Recharts/Chart.js**: For data visualization
- **Axios**: For API requests to the backend

## User Flow
1. User opens web application
2. User views previously scanned repositories (if any)
3. User initiates a new scan or configures scan parameters (including directory path and scan depth)
4. System scans for repositories and displays results with real-time progress updates
5. User can sort/filter the table to find specific repositories
6. User selects repositories to refresh/pull
7. System performs git operations and updates status
8. User can view detailed information about specific repositories including commit history and diffs

## Non-Functional Requirements
- Responsive design that works on desktop and mobile
- Asynchronous operations for long-running tasks
- Error handling and user feedback
- Dark/light theme support
- Performance optimization for scanning large directories
- Containerized deployment for easy installation

## Open Source Strategy
- MIT or Apache 2.0 license
- Comprehensive documentation
- Contribution guidelines
- CI/CD pipeline for testing and building
- Docker images for easy deployment
- Community engagement and issue management

## Future Enhancements
- Repository health dashboard
- Git operation scheduling
- Notifications for outdated repositories
- Integration with GitHub/GitLab APIs
- Visualization of repository statistics
- User authentication for multi-user environments
- Plugin system for custom repository operations
