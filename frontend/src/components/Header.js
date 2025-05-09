const e = React.createElement;

// Assuming Icon component is globally available or loaded before this script.

function Header() {
    return e(
        'header',
        { className: 'glass-dark p-4 shadow-md fixed top-0 left-0 right-0 z-30 flex items-center justify-between' },
        e(
            'div',
            { className: 'flex items-center' },
            e(Icon, { name: 'shield-alt', className: 'text-3xl text-teal-400 mr-3' }),
            e('h1', { className: 'text-2xl font-bold text-white' }, 'Sentinel Control Center')
        )
        // The ThemeToggleButton will be rendered in App.js to have access to theme state and toggleTheme function
    );
}
