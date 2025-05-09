(function() {
    const e = React.createElement;

    // Helper: Icon component
    const Icon = ({ name, className }) => { 
        return e('i', { 
            className: `fas fa-${name} ${className || ''}` 
        });
    };

    // Helper: Format time ago
    function formatTimeAgo(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        
        return date.toLocaleDateString();
    }

    // Component: ThemeToggleButton
    function ThemeToggleButton({ theme, toggleTheme }) {
        return e(
            'button',
            {
                onClick: toggleTheme,
                className: 'p-2 rounded-md hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white fixed top-4 right-4 z-50 glass-button', // Added glass-button for consistency
                style: { 
                    color: 'var(--color-text-primary)', // Use CSS var for icon color
                    background: 'var(--color-glass-light-bg)' // Use CSS var for bg
                },
                'aria-label': `Switch to ${theme === 'light' ? 'dark' : 'light'} mode`,
                title: `Switch to ${theme === 'light' ? 'dark' : 'light'} mode`
            },
            e(Icon, { name: theme === 'light' ? 'moon' : 'sun', className: 'h-6 w-6' })
        );
    }


    // Component: HeaderComponent
    function HeaderComponent() {
        return e(
            'header',
            { className: 'mb-8' },
            e(
                'div',
                { className: 'flex items-center justify-center mb-6 text-center' },
                e(Icon, { name: 'code-branch', className: 'text-4xl text-teal-400 mr-4' }), // Updated color
                e('h1', { className: 'text-4xl font-bold' }, 'Repository Scanner')
            ),
            e('p', { className: 'text-xl opacity-80 text-center mb-6' }, 'Monitor and manage your Git repositories')
        );
    }

    // Component: ControlsBar
    function ControlsBar({ 
        searchQuery, setSearchQuery, 
        sortBy, setSortBy, 
        loading, repositoriesCount,
        scanPathInput, setScanPathInput,
        scanDepthInput, setScanDepthInput,
        handleStartScan,
        isScanning,
        onBrowseDirectories // New prop
    }) {

        const handleBrowseClick = () => { // Renamed from previous version
            onBrowseDirectories(); // Call prop to open modal
        };
        
        // Hide controls if initial loading or no repos and not currently scanning
        if (loading || (repositoriesCount === 0 && !isScanning)) {
            // Still show scan controls if no repos but allow scanning
            if (repositoriesCount === 0 && !isScanning) {
                 // Render only scan controls if no repos yet
                return e(
                    'div',
                    { className: 'glass-light p-4 mb-6 flex flex-col sm:flex-row items-start gap-4' },
                    e('div', { className: 'flex flex-col gap-2 w-full sm:w-auto sm:flex-grow-[2]' },
                        e('label', { htmlFor: 'scanPath', className: 'text-sm font-medium opacity-80' }, 'Scan Path'),
                        e('div', { className: 'flex items-center gap-2 w-full' }, // Wrapper for input and browse button
                            e('input', {
                                type: 'text',
                                id: 'scanPath',
                                placeholder: 'Enter path or browse', // Updated placeholder
                                className: 'glass-input flex-grow', 
                                value: scanPathInput,
                                onChange: (e) => setScanPathInput(e.target.value),
                                disabled: isScanning
                            }),
                            e('button', {
                                onClick: handleBrowseClick, // Uses new handler
                                className: `glass-button px-3 py-2 flex-shrink-0 ${isScanning ? 'opacity-50 cursor-not-allowed' : ''}`,
                                disabled: isScanning,
                                title: 'Browse for folder'
                            }, e(Icon, { name: 'folder-open', className: '' }))
                        )
                    ),
                    e('div', { className: 'flex flex-col gap-2 w-full sm:w-auto sm:flex-grow-[1]' }, // Narrower depth input
                        e('label', { htmlFor: 'scanDepth', className: 'text-sm font-medium opacity-80' }, 'Scan Depth'),
                        e('input', {
                            type: 'number',
                            id: 'scanDepth',
                            placeholder: 'Depth',
                            className: 'glass-input w-full sm:w-24',
                            value: scanDepthInput,
                            onChange: (e) => setScanDepthInput(e.target.value),
                            min: '0',
                            disabled: isScanning
                        })
                    ),
                    e('div', { className: 'w-full sm:w-auto pt-0 sm:pt-7' }, // Align button with inputs
                        e('button', {
                            onClick: handleStartScan,
                            className: `glass-button px-4 py-2 w-full sm:w-auto flex items-center justify-center ${isScanning ? 'opacity-50 cursor-not-allowed' : ''}`,
                            disabled: isScanning
                        },
                        isScanning ? e(Icon, { name: 'spinner', className: 'animate-spin mr-2' }) : e(Icon, { name: 'search-location', className: 'mr-2' }),
                        isScanning ? 'Scanning...' : 'Scan Repositories'
                        )
                    )
                );
            }
            return null; // Hide all controls if loading initial repo list
        }

        return e(
            'div',
            { className: 'glass-light p-4 mb-6 flex flex-col items-start gap-4' },
            e('div', {className: 'w-full flex flex-col sm:flex-row items-start gap-4'},
                e('div', { className: 'flex flex-col gap-2 w-full sm:w-auto sm:flex-grow-[2]' }, 
                    e('label', { htmlFor: 'scanPath', className: 'text-sm font-medium opacity-80' }, 'Scan Path'),
                    e('div', { className: 'flex items-center gap-2 w-full' }, // Wrapper for input and browse button
                        e('input', {
                            type: 'text',
                            id: 'scanPath',
                            placeholder: 'Enter path or browse', // Updated placeholder
                            className: 'glass-input flex-grow',
                            value: scanPathInput,
                            onChange: (e) => setScanPathInput(e.target.value),
                            disabled: isScanning
                        }),
                        e('button', {
                            onClick: handleBrowseClick, // Uses new handler
                            className: `glass-button px-3 py-2 flex-shrink-0 ${isScanning ? 'opacity-50 cursor-not-allowed' : ''}`,
                            disabled: isScanning,
                            title: 'Browse for folder'
                        }, e(Icon, { name: 'folder-open', className: '' }))
                    )
                ),
                e('div', { className: 'flex flex-col gap-2 w-full sm:w-auto sm:flex-grow-[1]' },
                    e('label', { htmlFor: 'scanDepth', className: 'text-sm font-medium opacity-80' }, 'Scan Depth'),
                    e('input', {
                        type: 'number',
                        id: 'scanDepth',
                        placeholder: 'Depth',
                        className: 'glass-input w-full sm:w-24',
                        value: scanDepthInput,
                        onChange: (e) => setScanDepthInput(e.target.value),
                        min: '0',
                        disabled: isScanning
                    })
                ),
                e('div', { className: 'w-full sm:w-auto pt-0 sm:pt-7' },
                    e('button', {
                        onClick: handleStartScan,
                        className: `glass-button px-4 py-2 w-full sm:w-auto flex items-center justify-center ${isScanning ? 'opacity-50 cursor-not-allowed' : ''}`,
                        disabled: isScanning
                    },
                    isScanning ? e(Icon, { name: 'spinner', className: 'animate-spin mr-2' }) : e(Icon, { name: 'search-location', className: 'mr-2' }),
                    isScanning ? 'Scanning...' : 'Scan Repositories'
                    )
                )
            ),
            // Search and Sort Row (only if repositories exist)
            repositoriesCount > 0 && e('div', {className: 'w-full flex flex-col sm:flex-row items-center gap-4 pt-4 border-t border-white/10'},
                e(
                    'div', 
                    { className: 'relative flex-grow w-full sm:w-auto' }, 
                    e(Icon, { 
                        name: 'search', 
                        className: 'absolute left-3 top-1/2 -translate-y-1/2 text-gray-400' 
                    }),
                    e('input', {
                        type: 'text',
                        placeholder: 'Search repositories...',
                        className: 'glass-input pl-10 pr-4 py-2 w-full',
                        value: searchQuery,
                        onChange: (e) => setSearchQuery(e.target.value)
                    })
                ),
                e(
                    'div',
                    { className: 'flex items-center gap-2 w-full sm:w-auto' },
                    e('label', { htmlFor: 'sortBy', className: 'text-sm opacity-80' }, 'Sort by:'),
                    e(
                        'select',
                        {
                            id: 'sortBy',
                            className: 'glass-input px-3 py-2 ',
                            value: sortBy,
                            onChange: (e) => setSortBy(e.target.value)
                        },
                        e('option', { value: 'name' }, 'Name'),
                        e('option', { value: 'last_modified' }, 'Last Modified'),
                        e('option', { value: 'status' }, 'Status')
                    )
                )
            )
        );
    }

    // Component: ScanStatusDisplay (New)
    function ScanStatusDisplay({ isScanning, scanProgressMessages, scanError }) {
        const [isExpanded, setIsExpanded] = React.useState(false); // Initialize as collapsed

        // Determine if there's anything to display at all (header or content)
        const hasContent = isScanning || scanError || scanProgressMessages.length > 0;

        if (!hasContent) {
            return null;
        }

        const toggleExpansion = () => {
            setIsExpanded(!isExpanded);
        };

        return e(
            'div',
            { className: 'glass-dark p-4 mb-6 rounded-lg' },
            e(
                'div', // Clickable header area
                { 
                    className: 'flex items-center justify-between cursor-pointer hover:bg-white/5 p-1 -m-1 rounded', // Added padding and negative margin for better click area
                    onClick: toggleExpansion 
                },
                e('div', {className: 'flex items-center'}, // Group title and scanning status
                    isScanning && e(Icon, { name: 'spinner', className: 'animate-spin mr-2 text-teal-300' }),
                    !isScanning && scanError && e(Icon, { name: 'exclamation-circle', className: 'mr-2 text-red-400' }),
                    !isScanning && !scanError && scanProgressMessages.length > 0 && e(Icon, { name: 'check-circle', className: 'mr-2 text-green-400' }),
                    e('span', { className: `font-medium ${isScanning ? 'text-teal-300' : scanError ? 'text-red-300' : 'text-gray-200'}`},
                        isScanning ? 'Scan in progress...' : scanError ? 'Scan Error Occurred' : 'Scan Activity'
                    )
                ),
                e(Icon, { name: isExpanded ? 'chevron-up' : 'chevron-down', className: 'text-gray-400' })
            ),
            
            // Collapsible content area
            isExpanded && e(
                'div',
                { className: 'mt-3 pt-3 border-t border-white/10' }, // Add top border when expanded
                scanError && e('div', { className: 'log-error p-2 rounded mb-2 text-sm' }, // Use log-error style
                    // Error message is already part of the header, but if you want more detail:
                    // e(Icon, { name: 'exclamation-circle', className: 'mr-2' }), 
                    `Details: ${scanError}`
                ),
                scanProgressMessages.length > 0 && e(
                    'div',
                    { className: 'log-container text-xs', style: { maxHeight: '150px' } }, // Use log-container style
                    scanProgressMessages.map((msg, index) => e('p', { key: index }, msg))
                ),
                !isScanning && !scanError && scanProgressMessages.length === 0 && e(
                    'p', {className: 'text-sm text-gray-400'}, 'No scan messages to display.'
                )
            )
        );
    }

    // Component: RepositoryCard
    function RepositoryCard({ repo, onSelectRepo, onQuickPull, isPulling }) {
        const [isPathVisible, setIsPathVisible] = React.useState(false); // Local state for path visibility

        const togglePathVisibility = (event) => {
            event.stopPropagation(); // Prevent card click when toggling path
            setIsPathVisible(!isPathVisible);
        };

        return e(
            'div',
            { 
                className: 'glass p-4 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out cursor-pointer repo-card group relative', // Added relative for popover
                onClick: () => onSelectRepo(repo)
            },
            // Quick Pull Button - positioned top-right
            e(
                'div',
                { 
                    className: 'absolute right-3 top-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity',
                    onClick: (event) => event.stopPropagation() 
                },
                e(
                    'button',
                    {
                        className: `bg-teal-500/80 hover:bg-teal-600 p-2 rounded-full text-white ${isPulling ? 'opacity-50 cursor-not-allowed' : ''}`,
                        'aria-label': 'Quick pull repository',
                        title: 'Quick pull repository',
                        disabled: isPulling,
                        onClick: (event) => {
                            event.stopPropagation(); // Prevent card click
                            if (!isPulling) {
                                onQuickPull(repo.id);
                            }
                        }
                    },
                    isPulling ? e(Icon, { name: 'spinner', className: 'animate-spin' }) : e(Icon, { name: 'download' })
                )
            ),
            e('h3', { className: 'font-bold text-lg mb-1 flex items-center' }, // Reduced mb
                e(Icon, { name: 'folder', className: 'mr-2 text-teal-400 flex-shrink-0' }),
                e('span', { className: 'truncate', title: repo.name }, repo.name)
            ),
            // Path display replaced with an icon and conditional popover
            e('div', { className: 'text-xs text-gray-400 mb-3 flex items-center' }, // Use text-gray-400 from theme
                e(Icon, { name: 'map-marker-alt', className: 'mr-1 text-gray-500' }), // Path icon
                e('span', { className: 'truncate flex-grow' }, 'Path: Click icon to view'), // Placeholder text
                e(
                    'button',
                    {
                        onClick: togglePathVisibility,
                        className: 'ml-2 p-1 rounded hover:bg-white/10 focus:outline-none',
                        title: isPathVisible ? 'Hide path' : 'Show path',
                        'aria-label': isPathVisible ? 'Hide full path' : 'Show full path'
                    },
                    e(Icon, { name: isPathVisible ? 'eye-slash' : 'eye', className: 'text-teal-400' })
                )
            ),
            isPathVisible && e(
                'div',
                { 
                    className: 'absolute left-4 right-4 bottom-16 mb-1 p-3 rounded-md shadow-lg z-10 glass-light path-popover', // Use glass-light for popover
                    onClick: (e) => e.stopPropagation() // Prevent card click if popover is clicked
                },
                e('p', { className: 'text-xs break-all' }, repo.path)
            ),
            // End of new path display logic
            e('p', { className: 'text-sm opacity-80 mb-1 line-clamp-2' }, repo.description || 'No description available.'),
            e('div', { className: 'mt-auto pt-2 border-t border-white/10 flex justify-between items-center' },
                e('div', { className: 'text-xs opacity-70 flex items-center' },
                    e(Icon, { name: 'clock', className: 'mr-2 text-teal-300' }), // Updated color
                    formatTimeAgo(new Date(repo.last_modified))
                ),
                e('span', { 
                    className: 'text-xs font-medium bg-teal-500/20 px-2 py-1 rounded-full text-teal-100' // Updated color
                }, 'Git')
            )
        );
    }

    // Component: RepositoryDetailModal
    function RepositoryDetailModal({ 
        selectedRepo, 
        closeRepoDetails, 
        pullLogs, 
        pullInProgress, 
        pullRepository,
        repoStatusOutput,
        statusLoading,
        statusError,
        fetchRepoStatus,
        discardLoading,
        discardError,
        discardRepoChanges 
    }) {
        const [showDiscardConfirmationMessage, setShowDiscardConfirmationMessage] = React.useState(false); // New state for custom confirm

        if (!selectedRepo) {
            return null;
        }

        const handleDiscardClick = () => {
            setShowDiscardConfirmationMessage(true); // Show custom confirmation UI
        };

        const handleConfirmDiscard = () => {
            discardRepoChanges(selectedRepo.id);
            setShowDiscardConfirmationMessage(false); // Hide custom confirmation UI
        };

        const handleCancelDiscard = () => {
            setShowDiscardConfirmationMessage(false); // Hide custom confirmation UI
        };

        return e(
            React.Fragment,
            null,
            e('div', { 
                className: 'fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-40 repo-modal-overlay', // Added repo-modal-overlay
                onClick: closeRepoDetails
            }),
            e(
                'div',
                { 
                    className: 'glass repo-detail p-6', // Base padding, specific sections can override
                    onClick: (event) => event.stopPropagation() 
                },
                e(
                    'div', // Header
                    { className: 'repo-detail-header flex justify-between items-center pb-4 border-b border-white/10' }, // Added styling
                    e('h2', { className: 'text-2xl font-bold flex items-center' }, 
                        e(Icon, { name: 'folder-open', className: 'mr-3 text-teal-400' }), // Updated color
                        selectedRepo.name
                    ),
                    e(
                        'button',
                        { 
                            className: 'text-lg p-2 rounded-full hover:bg-white/10 text-gray-300 hover:text-white', // Styling for close button
                            onClick: closeRepoDetails,
                            'aria-label': 'Close modal'
                        },
                        e(Icon, { name: 'times' })
                    )
                ),
                e(
                    'div', // Body
                    { className: 'repo-detail-body mt-4' }, // Added class, padding handled by this class or its children
                    e(
                        'div',
                        { className: 'mb-4' },
                        e('h3', { className: 'text-lg font-semibold mb-2' }, 'Repository Path'),
                        e('p', { 
                            className: 'text-sm bg-black/20 p-3 rounded-lg break-all',
                            style: { wordBreak: 'break-all', hyphens: 'auto' } // Simplified style
                        }, selectedRepo.path)
                    ),
                    e(
                        'div',
                        { className: 'mb-4' },
                        e('h3', { className: 'text-lg font-semibold mb-2' }, 'Last Modified'),
                        e('p', { className: 'text-sm' }, new Date(selectedRepo.last_modified).toLocaleString())
                    ),
                    e(
                        'div',
                        { className: 'mt-6 mb-4 flex flex-wrap gap-3' }, // Added flex-wrap and gap
                        e(
                            'button',
                            {
                                className: `glass-button px-4 py-2 flex items-center ${pullInProgress ? 'opacity-50 cursor-not-allowed' : ''}`,
                                onClick: () => pullRepository(selectedRepo.id),
                                disabled: pullInProgress
                            },
                            pullInProgress
                                ? e(Icon, { name: 'spinner', className: 'mr-2 animate-spin' })
                                : e(Icon, { name: 'sync-alt', className: 'mr-2' }),
                            pullInProgress ? 'Pulling...' : 'Pull Latest Changes'
                        ),
                        // New "Get Status" button
                        e(
                            'button',
                            {
                                className: `glass-button px-4 py-2 flex items-center ${statusLoading ? 'opacity-50 cursor-not-allowed' : ''}`,
                                onClick: () => fetchRepoStatus(selectedRepo.id),
                                disabled: statusLoading,
                                style: { backgroundColor: 'var(--color-accent-hover)'} // Slightly different color for distinction
                            },
                            statusLoading
                                ? e(Icon, { name: 'spinner', className: 'mr-2 animate-spin' })
                                : e(Icon, { name: 'info-circle', className: 'mr-2' }), 
                            statusLoading ? 'Getting Status...' : 'Get Status'
                        ),
                        // "Discard Changes" button - now triggers custom confirmation
                        e(
                            'button',
                            {
                                className: `glass-button px-4 py-2 flex items-center ${discardLoading || showDiscardConfirmationMessage ? 'opacity-50 cursor-not-allowed' : ''}`,
                                onClick: handleDiscardClick, // Updated onClick
                                disabled: discardLoading || showDiscardConfirmationMessage, // Disable if confirm message is shown or already discarding
                                style: { backgroundColor: 'var(--color-log-error)', color: 'var(--color-text-primary)' } 
                            },
                            discardLoading
                                ? e(Icon, { name: 'spinner', className: 'mr-2 animate-spin' })
                                : e(Icon, { name: 'trash', className: 'mr-2' }),
                            discardLoading ? 'Discarding...' : 'Discard Changes'
                        )
                    ),
                    // Custom Confirmation UI for Discarding Changes
                    showDiscardConfirmationMessage && e(
                        'div',
                        { className: 'my-4 p-4 rounded-md glass-dark border border-red-500/50' }, // Styled confirmation box
                        e('h4', { className: 'text-lg font-semibold text-red-300 mb-2' }, 
                            e(Icon, { name: 'exclamation-triangle', className: 'mr-2' }),
                            'Confirm Destructive Action'
                        ),
                        e('p', { className: 'text-sm mb-1' }, 'You are about to discard ALL local changes in this repository.'),
                        e('ul', { className: 'list-disc list-inside text-sm mb-3 pl-4' },
                            e('li', null, 'All uncommitted changes to tracked files will be PERMANENTLY LOST (git reset --hard HEAD).'),
                            e('li', null, 'All untracked files and directories will be PERMANENTLY DELETED (git clean -fd).')
                        ),
                        e('p', { className: 'text-sm font-bold text-red-300 mb-3' }, 'THIS ACTION CANNOT BE UNDONE.'),
                        e('div', { className: 'flex justify-end gap-3' },
                            e('button', {
                                className: 'glass-button px-4 py-2 text-sm',
                                onClick: handleCancelDiscard,
                                style: { backgroundColor: 'var(--color-glass-light-bg)', color: 'var(--color-text-primary)'}
                            }, 'Cancel'),
                            e('button', {
                                className: 'glass-button px-4 py-2 text-sm',
                                onClick: handleConfirmDiscard,
                                style: { backgroundColor: 'var(--color-log-error)',  color: 'var(--color-text-primary)' }
                            }, 'Confirm Discard')
                        )
                    ),

                    // Display Git Status Output or Discard Error/Success
                    (!showDiscardConfirmationMessage && (repoStatusOutput || statusError || discardError || (discardLoading === false && !discardError && !statusLoading && !pullInProgress && selectedRepo.lastDiscardMessage))) && e(
                        'div',
                        { className: 'mt-4' },
                        (repoStatusOutput || statusError) && e(React.Fragment, null, // Group status related elements
                            e('h3', { className: 'text-lg font-semibold mb-2 flex items-center' },
                                e(Icon, { name: 'clipboard-list', className: 'mr-2 text-teal-400' }),
                                'Git Status'
                            ),
                            statusError && e('p', { className: 'log-error p-2 rounded bg-red-500/20' }, `Error: ${statusError}`),
                            repoStatusOutput && e(
                                'pre',
                                {
                                    className: 'log-container',
                                    style: { maxHeight: '10rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }
                                },
                                repoStatusOutput
                            )
                        ),
                        discardError && e('p', { className: 'log-error p-2 rounded bg-red-500/20 mt-2' }, `Discard Error: ${discardError}`),
                        selectedRepo.lastDiscardMessage && !discardError && e('p', { className: 'log-success p-2 rounded bg-green-500/20 mt-2' }, selectedRepo.lastDiscardMessage)
                    ),
                    (pullLogs.length > 0 || pullInProgress) && e( // Show log container if logs exist or pull is in progress
                        'div',
                        { className: 'mt-4' },
                        e('h3', { className: 'text-lg font-semibold mb-2 flex items-center' }, 
                            e(Icon, { name: 'terminal', className: 'mr-2 text-teal-400' }), // Updated color
                            'Pull Logs'
                        ),
                        e(
                            'div',
                            { className: 'log-container' }, // Used class
                            pullLogs.length === 0 && pullInProgress && e('p', {className: 'log-info'}, 'Awaiting logs...'),
                            pullLogs.map((log, index) => e(
                                'div',
                                { 
                                    key: index,
                                    className: `py-1 border-b border-gray-700/50 last:border-0 ${ // Adjusted border color
                                        log.status === 'error' ? 'log-error' :
                                        log.status === 'success' ? 'log-success' : 'log-info' // Used classes
                                    }`
                                },
                                e('span', { className: 'text-gray-500 mr-2' }, log.time),
                                e(Icon, { 
                                    name: log.status === 'error' ? 'times-circle' : 
                                          log.status === 'success' ? 'check-circle' : 'info-circle',
                                    className: 'mr-1'
                                }),
                                log.message
                            ))
                        )
                    )
                )
            )
        );
    }

    // Component: LoadingSkeleton
    function LoadingSkeleton() {
        return e(
            'div',
            { className: 'glass p-8' },
            e('div', { className: 'flex justify-between items-center mb-6' },
                e('div', { className: 'h-8 bg-white/10 rounded w-48 shimmer' }),
                e('div', { className: 'h-8 bg-white/10 rounded w-24 shimmer' })
            ),
            e(
                'div',
                { className: 'repo-grid' }, // Use repo-grid for consistency
                [...Array(6)].map((_, i) => e(
                    'div',
                    { key: i, className: 'glass p-4 shimmer repo-card' }, // Added repo-card for consistent styling
                    e('div', { className: 'h-6 bg-white/10 rounded w-3/4 mb-4' }),
                    e('div', { className: 'h-4 bg-white/10 rounded w-full mb-3' }),
                    e('div', { className: 'h-4 bg-white/10 rounded w-1/2' })
                ))
            )
        );
    }

    // Component: EmptyState
    function EmptyState() {
        return e(
            'div',
            { className: 'glass p-8 text-center' },
            e(Icon, { name: 'folder-open', className: 'text-5xl mb-4 text-teal-400' }), // Updated color
            e('h2', { className: 'text-2xl font-bold mb-3' }, 'No repositories found'),
            e('p', { className: 'mb-6 text-gray-200' }, 'There are no Git repositories configured in the system.'),
            e('a', { 
                href: '/documentation', // Assuming this is a valid link
                className: 'glass-button px-5 py-2 inline-flex items-center',
            },
            e(Icon, { name: 'book', className: 'mr-2' }),
            'Check Documentation')
        );
    }
    
    // Component: DirectoryBrowserModal (New)
    function DirectoryBrowserModal({ isOpen, onClose, onSelectPath }) {
        const [currentPath, setCurrentPath] = React.useState(null); // null for base paths, or a string path
        const [items, setItems] = React.useState([]);
        const [parentPath, setParentPath] = React.useState(null);
        const [isLoading, setIsLoading] = React.useState(false);
        const [error, setError] = React.useState(null);

        const fetchDirectoryContents = async (path) => {
            setIsLoading(true);
            setError(null);
            try {
                const url = path ? `/api/browse_directories?path=${encodeURIComponent(path)}` : '/api/browse_directories';
                const response = await fetch(url);
                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.error || `Failed to load directory: ${response.statusText}`);
                }
                const data = await response.json();
                setItems(data.items || []);
                setCurrentPath(data.current_path);
                setParentPath(data.parent_path);
            } catch (err) {
                console.error("Error fetching directory contents:", err);
                setError(err.message);
                setItems([]); // Clear items on error
            } finally {
                setIsLoading(false);
            }
        };

        React.useEffect(() => {
            if (isOpen) {
                fetchDirectoryContents(null); // Fetch base paths when modal opens
            } else {
                // Reset state when modal closes
                setCurrentPath(null);
                setItems([]);
                setParentPath(null);
                setError(null);
            }
        }, [isOpen]);

        const handleItemClick = (item) => {
            if (item.type === 'directory') {
                fetchDirectoryContents(item.path);
            }
        };

        const handleSelectCurrentPath = () => {
            if (currentPath && currentPath !== "/") { // Don't select the virtual root
                onSelectPath(currentPath);
                onClose();
            } else if (items.length > 0 && currentPath === "/") {
                // If at root and user wants to select one of the base paths shown
                // This case might need a specific item selection rather than "current path"
                // For now, we assume selection happens on a non-virtual-root path
                setError("Please navigate into a directory to select it, or select a specific base path if listed.");
            }
        };
        
        const handleNavigateUp = () => {
            if (parentPath) {
                 // If parentPath is "/", fetch base paths, otherwise fetch the parentPath
                fetchDirectoryContents(parentPath === "/" ? null : parentPath);
            }
        };


        if (!isOpen) {
            return null;
        }

        return e(
            'div', { className: 'repo-modal-overlay' }, // Reuse overlay style
            e(
                'div', { className: 'repo-detail glass-dark w-full max-w-2xl', onClick: e => e.stopPropagation() }, // Reuse modal style
                e('div', { className: 'p-4 border-b border-white/10 flex justify-between items-center' },
                    e('h3', { className: 'text-xl font-semibold' }, 'Browse Server Directories'),
                    e('button', { onClick: onClose, className: 'p-1 rounded-full hover:bg-white/10' }, e(Icon, { name: 'times', className: 'h-5 w-5' }))
                ),
                e('div', { className: 'p-4 repo-detail-body', style: { minHeight: '300px', maxHeight: '60vh' } }, // Ensure scrollability
                    e('div', { className: 'mb-3 flex items-center justify-between gap-2' },
                        e('button', 
                            { 
                                onClick: handleNavigateUp, 
                                disabled: isLoading || !parentPath,
                                className: `glass-button px-3 py-1 text-sm ${!parentPath || isLoading ? 'opacity-50 cursor-not-allowed' : ''}`
                            }, 
                            e(Icon, { name: 'arrow-up', className: 'mr-1' }), 'Up'
                        ),
                        e('span', { className: 'text-sm truncate text-gray-300 flex-grow text-center', title: currentPath || 'Base Directories' }, 
                            e(Icon, { name: 'folder', className: 'mr-2 text-teal-400 flex-shrink-0'}),
                            currentPath || 'Base Directories'
                        ),
                        e('button', 
                            { 
                                onClick: handleSelectCurrentPath, 
                                disabled: isLoading || !currentPath || currentPath === "/",
                                className: `glass-button px-3 py-1 text-sm ${!currentPath || currentPath === "/" || isLoading ? 'opacity-50 cursor-not-allowed' : ''}`
                            }, 
                            'Select Current Path'
                        )
                    ),
                    isLoading && e('div', { className: 'flex justify-center items-center h-32' }, e(Icon, { name: 'spinner', className: 'animate-spin h-8 w-8 text-teal-400' })),
                    error && e('p', { className: 'log-error p-2 rounded' }, error),
                    !isLoading && !error && items.length === 0 && e('p', { className: 'text-center text-gray-400 py-4' }, 'No items found or directory is empty.'),
                    !isLoading && !error && items.length > 0 && e(
                        'ul', { className: 'space-y-1' },
                        items.map(item => e(
                            'li', 
                            { 
                                key: item.path, 
                                onClick: () => handleItemClick(item),
                                className: `p-2 rounded-md flex items-center gap-2 ${item.type === 'directory' ? 'cursor-pointer hover:bg-white/5' : 'opacity-60'} transition-colors duration-150`
                            },
                            e(Icon, { name: item.type === 'directory' ? 'folder' : 'file-alt', className: `flex-shrink-0 ${item.type === 'directory' ? 'text-teal-400' : 'text-gray-500'}` }),
                            e('span', { className: 'truncate' }, item.name)
                        ))
                    )
                )
            )
        );
    }

    // Main App component
    function App() {
        const [repositories, setRepositories] = React.useState([]);
        const [loading, setLoading] = React.useState(true); // For initial repo list load
        const [selectedRepo, setSelectedRepo] = React.useState(null);
        const [pullLogs, setPullLogs] = React.useState([]);
        const [pullInProgress, setPullInProgress] = React.useState(false);
        const [eventSource, setEventSource] = React.useState(null);
        const [searchQuery, setSearchQuery] = React.useState('');
        const [sortBy, setSortBy] = React.useState('name');
        const [loadingStates, setLoadingStates] = React.useState({});
        const [theme, setTheme] = React.useState(localStorage.getItem('theme') || 'dark');
        // New state variables for Git Status
        const [repoStatusOutput, setRepoStatusOutput] = React.useState(null);
        const [statusLoading, setStatusLoading] = React.useState(false);
        const [statusError, setStatusError] = React.useState(null);
        // New state variables for Discard Changes
        const [discardLoading, setDiscardLoading] = React.useState(false);
        const [discardError, setDiscardError] = React.useState(null);
        const [lastDiscardMessage, setLastDiscardMessage] = React.useState(null);

        // New state for manual scan feature
        const [scanPathInput, setScanPathInput] = React.useState('');
        const [scanDepthInput, setScanDepthInput] = React.useState('5'); // Default depth
        const [isScanning, setIsScanning] = React.useState(false); // For manual scan process
        const [scanProgressMessages, setScanProgressMessages] = React.useState([]);
        const [scanError, setScanError] = React.useState(null);
        const [scanEventSource, setScanEventSource] = React.useState(null);
        // New state for Directory Browser Modal
        const [isBrowserModalOpen, setIsBrowserModalOpen] = React.useState(false);


        React.useEffect(() => {
            if (theme === 'light') {
                document.body.classList.add('light-theme');
            } else {
                document.body.classList.remove('light-theme');
            }
            localStorage.setItem('theme', theme);
        }, [theme]);

        const toggleTheme = () => {
            setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
        };

        const filteredRepositories = React.useMemo(() => {
            return repositories.filter(repo => 
                repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                repo.path.toLowerCase().includes(searchQuery.toLowerCase())
            ).sort((a, b) => {
                if (sortBy === 'modified') {
                    return new Date(b.last_modified) - new Date(a.last_modified);
                }
                return a.name.localeCompare(b.name);
            });
        }, [repositories, searchQuery, sortBy]);

        const closeRepoDetails = () => {
            if (eventSource) {
                eventSource.close();
                setEventSource(null);
            }
            setPullLogs([]);
            setPullInProgress(false);
            setSelectedRepo(null);
            setRepoStatusOutput(null); 
            setStatusError(null);      
            setDiscardError(null); // Clear discard error on close
            setLastDiscardMessage(null); // Clear last discard message
        };

        React.useEffect(() => {
            return () => {
                if (eventSource) eventSource.close();
            };
        }, [eventSource]);

        React.useEffect(() => {
            if (selectedRepo) {
                setPullLogs([]);
                setPullInProgress(false);
                setRepoStatusOutput(null); 
                setStatusError(null);      
                setDiscardError(null); // Clear discard error when repo changes
                setLastDiscardMessage(null); // Clear last discard message
                if (eventSource) {
                    eventSource.close();
                    setEventSource(null);
                }
            }
        }, [selectedRepo]);

        const connectToPullProgressStream = (repoId) => {
            if (eventSource) eventSource.close();
            
            const newEventSource = new EventSource(`/api/repository/${repoId}/pull/progress`);
            
            newEventSource.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.status === "heartbeat") return;

                if (data.status === "completed" || data.status === "error") {
                    setPullInProgress(false);
                    setPullLogs(logs => [...logs, {
                        time: new Date().toLocaleTimeString(),
                        message: data.message || (data.status === "completed" ? "Pull completed successfully" : "Error during pull"),
                        status: data.status === "completed" ? "success" : "error"
                    }]);
                    if (data.status === "completed") fetchRepositories();
                    newEventSource.close();
                    setEventSource(null);
                    setLoadingStates(prev => ({...prev, [repoId]: false})); // For quick pull
                } else if (data.status === "progress" || data.status === "running") {
                    setPullInProgress(true);
                    if (data.update && data.update.message) {
                        setPullLogs(logs => [...logs, {
                            time: new Date().toLocaleTimeString(),
                            message: data.update.message,
                            status: "info"
                        }]);
                    }
                } else if (data.status === "started") {
                    setPullInProgress(true);
                    setPullLogs([{
                        time: new Date().toLocaleTimeString(),
                        message: "Pull operation started",
                        status: "info"
                    }]);
                }
            };
            
            newEventSource.onerror = (error) => {
                console.error("EventSource error:", error);
                newEventSource.close();
                setEventSource(null);
                setPullInProgress(false);
                setLoadingStates(prev => ({...prev, [repoId]: false})); // For quick pull
                 setPullLogs(logs => [...logs, {
                    time: new Date().toLocaleTimeString(),
                    message: "Connection to progress stream failed.",
                    status: "error"
                }]);
            };
            setEventSource(newEventSource);
        };

        const pullRepository = async (repoId, isQuickPull = false) => {
            try {
                if (!isQuickPull) { // Modal pull
                    setPullLogs([]);
                    setPullInProgress(true);
                } else { // Quick pull from card
                    setLoadingStates(prev => ({...prev, [repoId]: true}));
                }
                
                connectToPullProgressStream(repoId);
                
                const response = await fetch(`/api/repository/${repoId}/pull`, { method: 'POST' });
                const result = await response.json();
                
                if (result.status !== 'started' && result.status !== 'already_pulling') {
                    setPullInProgress(false);
                    setPullLogs(logs => [...logs, {
                        time: new Date().toLocaleTimeString(),
                        message: result.error || 'Error initiating pull',
                        status: "error"
                    }]);
                    if (isQuickPull) setLoadingStates(prev => ({...prev, [repoId]: false}));
                }
            } catch (error) {
                console.error('Error pulling repository:', error);
                setPullInProgress(false);
                setPullLogs(logs => [...logs, {
                    time: new Date().toLocaleTimeString(),
                    message: `Error: ${error.message}`,
                    status: "error"
                }]);
                if (isQuickPull) setLoadingStates(prev => ({...prev, [repoId]: false}));
            }
        };
        
        const handleQuickPull = (repoId) => {
            pullRepository(repoId, true);
        };

        const fetchRepoStatus = async (repoId) => {
            setStatusLoading(true);
            setRepoStatusOutput(null);
            setStatusError(null);
            try {
                const response = await fetch(`/api/repository/${repoId}/status`);
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                setRepoStatusOutput(data.status_output);
            } catch (error) {
                console.error('Error fetching repository status:', error);
                setStatusError(error.message);
                setRepoStatusOutput(null);
            } finally {
                setStatusLoading(false);
            }
        };

        const discardRepoChanges = async (repoId) => {
            setDiscardLoading(true);
            setDiscardError(null);
            setLastDiscardMessage(null);
            try {
                const response = await fetch(`/api/repository/${repoId}/discard_changes`, {
                    method: 'POST',
                });
                const data = await response.json(); // Attempt to parse JSON regardless of ok status
                if (!response.ok) {
                    throw new Error(data.error || `HTTP error! status: ${response.status}`);
                }
                setLastDiscardMessage(data.message || 'Local changes discarded successfully.');
                // Optionally, refresh status or other details
                fetchRepoStatus(repoId); 
            } catch (error) {
                console.error('Error discarding repository changes:', error);
                setDiscardError(error.message);
            } finally {
                setDiscardLoading(false);
            }
        };

        // Function to start a new repository scan
        const handleStartScan = async () => {
            if (!scanPathInput.trim()) {
                setScanError('Scan path cannot be empty.');
                setScanProgressMessages([]);
                return;
            }

            setIsScanning(true);
            setScanError(null);
            setScanProgressMessages(['Scan initiated...']);
            setRepositories([]); // Clear existing repositories from display

            // Close existing scan SSE connection if any
            if (scanEventSource) {
                scanEventSource.close();
            }

            try {
                const response = await fetch(`/api/scan?path=${encodeURIComponent(scanPathInput)}&depth=${encodeURIComponent(scanDepthInput)}`);
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                }
                // Backend confirms scan started, now connect to SSE for progress
                const newScanEventSource = new EventSource('/api/scan/progress');
                setScanEventSource(newScanEventSource);

                newScanEventSource.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    if (data.status === 'heartbeat') return;

                    let message = data.message || (data.update ? data.update.message : null) || data.status;
                    
                    if (data.progress && data.progress.message) {
                        message = data.progress.message;
                    }
                    if (data.update && data.update.path) {
                         message += ` (${data.update.path})`;
                    }

                    setScanProgressMessages(prev => [...prev, message]);

                    if (data.status === 'completed') {
                        setIsScanning(false);
                        setScanProgressMessages(prev => [...prev, 'Scan completed successfully! Fetching updated repository list...']);
                        fetchRepositories(); // Refresh the main list
                        newScanEventSource.close();
                        setScanEventSource(null);
                    } else if (data.status === 'error') {
                        setIsScanning(false);
                        setScanError(data.message || 'An unknown error occurred during scan.');
                        newScanEventSource.close();
                        setScanEventSource(null);
                    }
                };

                newScanEventSource.onerror = (error) => {
                    console.error('Scan SSE error:', error);
                    setIsScanning(false);
                    setScanError('Connection error during scan progress updates.');
                    newScanEventSource.close();
                    setScanEventSource(null);
                };

            } catch (error) {
                console.error('Error starting scan:', error);
                setScanError(error.message);
                setIsScanning(false);
            }
        };

        const fetchRepositories = async () => {
            setLoading(true); // For initial repo list load or re-fetch
            try {
                const response = await fetch('/api/repositories');
                const data = await response.json();
                setRepositories(data);
            } catch (error) {
                console.error("Error fetching repositories:", error);
                // Optionally, set an error state to display to the user
            } finally {
                setLoading(false);
            }
        };

        React.useEffect(() => {
            fetchRepositories();
        }, []);
        
        return e(
            'div', 
            { className: 'container mx-auto px-4 py-8 relative' }, // Added relative for potential absolute positioning inside
            e(ThemeToggleButton, { theme, toggleTheme }),
            e(HeaderComponent),
            e(ControlsBar, { 
                searchQuery, setSearchQuery, 
                sortBy, setSortBy, 
                loading: loading && !isScanning, 
                repositoriesCount: repositories.length,
                scanPathInput, setScanPathInput,      
                scanDepthInput, setScanDepthInput,    
                handleStartScan,                      
                isScanning,
                onBrowseDirectories: () => setIsBrowserModalOpen(true) // Open modal from ControlsBar
            }),
            // Display Scan Status
            e(ScanStatusDisplay, { isScanning, scanProgressMessages, scanError }),

            // Directory Browser Modal
            e(DirectoryBrowserModal, {
                isOpen: isBrowserModalOpen,
                onClose: () => setIsBrowserModalOpen(false),
                onSelectPath: (selectedPath) => {
                    setScanPathInput(selectedPath); // Update the scan path input in App's state
                    setIsBrowserModalOpen(false);
                }
            }),

            loading && !isScanning ? e(LoadingSkeleton) : 
            !isScanning && repositories.length === 0 && !scanError ? e(EmptyState) : // Show empty state if not scanning, no repos, no scan error
            e(
                'div', // Main content area for repository list
                { className: 'glass p-6' },
                e(
                    'div', 
                    { className: 'flex justify-between items-center mb-6 flex-wrap gap-2' },
                    e('h2', { className: 'text-2xl font-bold flex items-center' }, 
                        e(Icon, { name: 'list', className: 'mr-3 text-teal-400' }), // Updated color
                        `Repositories (${filteredRepositories.length})`
                    ),
                    searchQuery && filteredRepositories.length !== repositories.length && e(
                        'div',
                        { className: 'text-sm text-teal-200 bg-teal-500/20 px-3 py-1 rounded-full' }, // Updated color
                        `Showing ${filteredRepositories.length} of ${repositories.length} repositories`
                    )
                ),
                
                filteredRepositories.length === 0 ? 
                    e(
                        'div',
                        { className: 'text-center py-8' },
                        e(Icon, { name: 'search', className: 'text-4xl mb-2 text-gray-400' }), // Kept gray
                        e('p', { className: 'text-xl mb-2' }, 'No matching repositories found'),
                        e('p', { className: 'text-sm text-gray-300' }, `Try adjusting your search query: "${searchQuery}"`),
                        e('button', { 
                            className: 'mt-4 text-teal-400 underline hover:text-teal-300', // Updated color
                            onClick: () => setSearchQuery('')
                        }, 'Clear search')
                    ) :
                    e(
                        'div',
                        { className: 'repo-grid' },
                        filteredRepositories.map(repo => e(RepositoryCard, {
                            key: repo.id,
                            repo,
                            onSelectRepo: setSelectedRepo,
                            onQuickPull: handleQuickPull,
                            isPulling: loadingStates[repo.id] || (selectedRepo && selectedRepo.id === repo.id && pullInProgress)
                        }))
                    )
            ),
            
            e(RepositoryDetailModal, {
                selectedRepo, 
                closeRepoDetails, 
                pullLogs, 
                pullInProgress, 
                pullRepository,
                repoStatusOutput,
                statusLoading,
                statusError,
                fetchRepoStatus,
                discardLoading,       // Pass new state
                discardError,         // Pass new state
                discardRepoChanges    // Pass new function
            })
        );
    }
            
    // Render the App
    const domContainer = document.getElementById('root');
    const root = ReactDOM.createRoot(domContainer);
    root.render(e(App));
})();
