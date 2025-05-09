const e = React.createElement;

// Assume Icon component is globally available or loaded before this script.
// If Icon is not available, this component will not render correctly.

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
    const [showDiscardConfirmationMessage, setShowDiscardConfirmationMessage] = React.useState(false);

    if (!selectedRepo) {
        return null;
    }

    const handleDiscardClick = () => {
        setShowDiscardConfirmationMessage(true); 
    };

    const handleConfirmDiscard = () => {
        discardRepoChanges(selectedRepo.id);
        setShowDiscardConfirmationMessage(false); 
    };

    const handleCancelDiscard = () => {
        setShowDiscardConfirmationMessage(false); 
    };

    // Determine the primary remote URL to display
    let primaryRemoteUrl = null;
    if (selectedRepo && selectedRepo.remotes && selectedRepo.remotes.length > 0 && selectedRepo.remotes[0].fetch_url) {
        primaryRemoteUrl = selectedRepo.remotes[0].fetch_url;
    }

    return e(
        React.Fragment,
        null,
        e('div', { 
            className: 'fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-40 repo-modal-overlay', 
            onClick: closeRepoDetails
        }),
        e(
            'div',
            { 
                className: 'glass repo-detail p-6', 
                onClick: (event) => event.stopPropagation() 
            },
            e(
                'div', // Header
                { className: 'repo-detail-header flex justify-between items-center pb-4 border-b border-white/10' }, 
                e('h2', { className: 'text-2xl font-bold flex items-center' }, 
                    e(Icon, { name: 'folder-open', className: 'mr-3 text-teal-400' }), 
                    selectedRepo.name
                ),
                e(
                    'button',
                    { 
                        className: 'text-lg p-2 rounded-full hover:bg-white/10 text-gray-300 hover:text-white', 
                        onClick: closeRepoDetails,
                        'aria-label': 'Close modal'
                    },
                    e(Icon, { name: 'times' })
                )
            ),
            e(
                'div', // Body
                { className: 'repo-detail-body mt-4' }, 
                // Grid for Path, Remote URL, Branch, Status, Last Modified
                e('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mb-6' },
                    e(
                        'div',
                        null,
                        e('h3', { className: 'text-lg font-semibold mb-1 flex items-center' }, 
                            e(Icon, {name: 'map-marker-alt', className: 'mr-2 text-teal-400'}), 
                            'Path'
                        ),
                        e('p', { 
                            className: 'text-sm break-all text-gray-300', 
                            title: selectedRepo.path 
                        }, selectedRepo.path)
                    ),
                    // Display Remote URL
                    e(
                        'div',
                        null,
                        e('h3', { className: 'text-lg font-semibold mb-1 flex items-center' }, 
                            e(Icon, {name: 'cloud', className: 'mr-2 text-teal-400'}), 
                            'Remote URL'
                        ),
                        e('p', { 
                            className: 'text-sm break-all text-gray-300', 
                            title: primaryRemoteUrl || 'N/A' 
                        }, primaryRemoteUrl || '' // Display empty string if null/undefined, or 'N/A'
                        )
                    ),
                    e(
                        'div',
                        null,
                        e('h3', { className: 'text-lg font-semibold mb-1 flex items-center' }, 
                            e(Icon, {name: 'code-branch', className: 'mr-2 text-teal-400'}), 
                            'Current Branch'
                        ),
                        e('p', { className: 'text-sm text-gray-300' }, selectedRepo.current_branch || 'N/A')
                    ),
                    e(
                        'div',
                        null,
                        e('h3', { className: 'text-lg font-semibold mb-1 flex items-center' }, 
                            e(Icon, {name: 'info-circle', className: 'mr-2 text-teal-400'}), 
                            'Status'
                        ),
                        e('p', { className: 'text-sm text-gray-300' }, selectedRepo.status || 'N/A')
                    ),
                    e(
                        'div',
                        null,
                        e('h3', { className: 'text-lg font-semibold mb-1 flex items-center' }, 
                            e(Icon, {name: 'calendar-alt', className: 'mr-2 text-teal-400'}), 
                            'Last Modified'
                        ),
                        e('p', { className: 'text-sm text-gray-300' }, new Date(selectedRepo.last_modified).toLocaleString())
                    )
                ),
                // Action Buttons
                e(
                    'div',
                    { className: 'mt-6 mb-4 flex flex-wrap gap-3' },
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
                    e(
                        'button',
                        {
                            className: `glass-button px-4 py-2 flex items-center ${statusLoading ? 'opacity-50 cursor-not-allowed' : ''}`,
                            onClick: () => fetchRepoStatus(selectedRepo.id),
                            disabled: statusLoading,
                            style: { backgroundColor: 'var(--color-accent-hover)'}
                        },
                        statusLoading
                            ? e(Icon, { name: 'spinner', className: 'mr-2 animate-spin' })
                            : e(Icon, { name: 'info-circle', className: 'mr-2' }), 
                        statusLoading ? 'Getting Status...' : 'Get Status'
                    ),
                    e(
                        'button',
                        {
                            className: `glass-button px-4 py-2 flex items-center ${discardLoading || showDiscardConfirmationMessage ? 'opacity-50 cursor-not-allowed' : ''}`,
                            onClick: handleDiscardClick,
                            disabled: discardLoading || showDiscardConfirmationMessage,
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
                    { className: 'my-4 p-4 rounded-md glass-dark border border-red-500/50' },
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
                    (repoStatusOutput || statusError) && e(React.Fragment, null, 
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
                (pullLogs.length > 0 || pullInProgress) && e(
                    'div',
                    { className: 'mt-4' },
                    e('h3', { className: 'text-lg font-semibold mb-2 flex items-center' }, 
                        e(Icon, { name: 'terminal', className: 'mr-2 text-teal-400' }),
                        'Pull Logs'
                    ),
                    e(
                        'div',
                        { className: 'log-container' },
                        pullLogs.length === 0 && pullInProgress && e('p', {className: 'log-info'}, 'Awaiting logs...'),
                        pullLogs.map((log, index) => e(
                            'div',
                            { 
                                key: index,
                                className: `py-1 border-b border-gray-700/50 last:border-0 ${
                                    log.status === 'error' ? 'log-error' :
                                    log.status === 'success' ? 'log-success' : 'log-info'
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
