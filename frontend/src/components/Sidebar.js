const e = React.createElement;

// Assuming Icon component is globally available or loaded before this script.

function Sidebar({ activeView, setActiveView }) {
    const navItems = [
        { id: 'gitRepoManager', label: 'Git Repo Manager', icon: 'code-branch' }
        // Example for future items:
        // { id: 'systemMonitor', label: 'System Monitor', icon: 'tachometer-alt' },
        // { id: 'userSettings', label: 'User Settings', icon: 'user-cog' },
    ];

    return e(
        'aside',
        { className: 'glass-dark w-64 min-h-screen p-4 fixed top-0 left-0 pt-20 z-20 flex flex-col' }, // pt-20 to account for header height (approx 4rem header + padding)
        e('nav', { className: 'flex-grow' },
            e('ul', { className: 'space-y-2' },
                navItems.map(item => e(
                    'li', { key: item.id },
                    e(
                        'button',
                        {
                            className: `w-full flex items-center space-x-3 p-3 rounded-md hover:bg-teal-600/30 transition-colors duration-150
                                        ${activeView === item.id ? 'bg-teal-500/40 text-white shadow-lg' : 'text-gray-300 hover:text-white'}`,
                            onClick: () => setActiveView(item.id),
                            title: item.label
                        },
                        e(Icon, { name: item.icon, className: `text-lg ${activeView === item.id ? 'text-teal-300' : 'text-gray-400'}` }),
                        e('span', { className: 'text-sm font-medium' }, item.label)
                    )
                ))
            )
        ),
        e('div', { className: 'mt-auto text-center text-xs text-gray-500 py-2' },
             `Sentinel v1.0` // You can make this dynamic later
        )
    );
}
