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
    function ControlsBar({ searchQuery, setSearchQuery, sortBy, setSortBy, loading, repositoriesCount }) {
        if (loading || repositoriesCount === 0) {
            return null;
        }
        return e(
            'div',
            { className: 'glass-light p-4 mb-4 flex flex-col sm:flex-row items-center gap-4' },
            e(
                'div', 
                { className: 'relative flex-grow w-full sm:w-auto' }, 
                e(Icon, { 
                    name: 'search', 
                    className: 'absolute left-3 top-1/2 -translate-y-1/2 text-gray-400' // Kept gray for subtlety
                }),
                e('input', {
                    type: 'text',
                    placeholder: 'Search repositories...',
                    value: searchQuery,
                    onChange: (event) => setSearchQuery(event.target.value),
                    className: 'glass-input w-full pl-10 pr-4',
                    'aria-label': 'Search repositories'
                })
            ),
            e(
                'div',
                { className: 'flex items-center gap-2' },
                e('label', { htmlFor: 'sort-select', className: 'text-sm' }, 'Sort by:'),
                e(
                    'select',
                    {
                        id: 'sort-select',
                        className: 'glass-input py-2', // Adjusted padding for select
                        value: sortBy,
                        onChange: (event) => setSortBy(event.target.value),
                        'aria-label': 'Sort repositories'
                    },
                    e('option', { value: 'name' }, 'Name'),
                    e('option', { value: 'modified' }, 'Last Modified')
                )
            )
        );
    }

    // Component: RepositoryCard
    function RepositoryCard({ repo, onSelectRepo, onQuickPull, isPulling }) {
        return e(
            'div',
            { 
                key: repo.id,
                className: 'glass p-5 hover:shadow-lg transition-all rounded-xl relative group repo-card', // Added repo-card class
                role: 'button',
                tabIndex: "0",
                'aria-label': `View details for ${repo.name}`,
                onClick: () => onSelectRepo(repo),
                onKeyDown: (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        onSelectRepo(repo);
                        event.preventDefault();
                    }
                }
            },
            new Date(repo.last_modified) > new Date(Date.now() - 86400000) && e(
                'div',
                { 
                    className: 'absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full',
                    'aria-label': 'Updated in the last 24 hours'
                },
                'New'
            ),
            e(
                'div',
                { 
                    className: 'absolute right-3 top-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity',
                    onClick: (event) => event.stopPropagation() // Prevent card click when clicking button
                },
                e(
                    'button',
                    {
                        className: `bg-teal-500/80 hover:bg-teal-600 p-2 rounded-full text-white ${isPulling ? 'opacity-50 cursor-not-allowed' : ''}`, // Updated color
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
                    isPulling
                        ? e(Icon, { name: 'spinner', className: 'animate-spin' })
                        : e(Icon, { name: 'sync-alt' })
                )
            ),
            e('h3', { className: 'font-bold text-lg mb-3 flex items-center' }, 
                e(Icon, { name: 'folder', className: 'mr-2 text-teal-400 flex-shrink-0' }), // Updated color
                e('span', { className: 'truncate', title: repo.name }, repo.name)
            ),
            e(
                'div',
                { className: 'path-wrapper mb-4' },
                e('p', { 
                    className: 'text-sm opacity-80 bg-black/10 p-2 rounded truncate', 
                    title: repo.path 
                }, repo.path),
                e('div', { className: 'path-tooltip' }, repo.path)
            ),
            e(
                'div',
                { className: 'mt-auto pt-2 border-t border-white/10 flex justify-between items-center' },
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
    function RepositoryDetailModal({ selectedRepo, closeRepoDetails, pullLogs, pullInProgress, pullRepository }) {
        if (!selectedRepo) {
            return null;
        }
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
                        { className: 'mt-6 mb-4' }, // Added mb-4
                        e(
                            'button',
                            {
                                className: `glass-button px-4 py-2 flex items-center ${pullInProgress ? 'opacity-50 cursor-not-allowed' : ''}`, // Used glass-button
                                onClick: () => pullRepository(selectedRepo.id),
                                disabled: pullInProgress
                            },
                            pullInProgress
                                ? e(Icon, { name: 'spinner', className: 'mr-2 animate-spin' })
                                : e(Icon, { name: 'sync-alt', className: 'mr-2' }),
                            pullInProgress ? 'Pulling...' : 'Pull Latest Changes'
                        )
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
    
    // Main App component
    function App() {
        const [repositories, setRepositories] = React.useState([]);
        const [loading, setLoading] = React.useState(true);
        const [selectedRepo, setSelectedRepo] = React.useState(null);
        const [pullLogs, setPullLogs] = React.useState([]);
        const [pullInProgress, setPullInProgress] = React.useState(false);
        const [eventSource, setEventSource] = React.useState(null);
        const [searchQuery, setSearchQuery] = React.useState('');
        const [sortBy, setSortBy] = React.useState('name');
        const [loadingStates, setLoadingStates] = React.useState({});

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


        const fetchRepositories = async () => {
            try {
                setLoading(true);
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
            { className: 'container mx-auto px-4 py-8' },
            e(HeaderComponent),
            e(ControlsBar, { 
                searchQuery, setSearchQuery, sortBy, setSortBy, 
                loading, repositoriesCount: repositories.length 
            }),
            
            loading ? e(LoadingSkeleton) :
            repositories.length === 0 ? e(EmptyState) :
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
                selectedRepo, closeRepoDetails, pullLogs, pullInProgress, pullRepository
            })
        );
    }
            
    // Render the App
    const domContainer = document.getElementById('root');
    const root = ReactDOM.createRoot(domContainer);
    root.render(e(App));
})();
