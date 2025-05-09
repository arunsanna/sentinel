const e = React.createElement;

// Assuming Icon component is globally available or loaded before this script.

function ThemeToggleButton({ theme, toggleTheme }) {
    return e(
        'button',
        {
            onClick: toggleTheme,
            className: 'p-2 rounded-md hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white fixed top-4 right-4 z-50 glass-button',
            style: { 
                color: 'var(--color-text-primary)',
                background: 'var(--color-glass-light-bg)'
            },
            'aria-label': `Switch to ${theme === 'light' ? 'dark' : 'light'} mode`,
            title: `Switch to ${theme === 'light' ? 'dark' : 'light'} mode`
        },
        e(Icon, { name: theme === 'light' ? 'moon' : 'sun', className: 'h-6 w-6' })
    );
}
