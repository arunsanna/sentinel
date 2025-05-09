const e = React.createElement;

// Assume Header, Sidebar, ThemeToggleButton, GitRepoManagerPage, and Icon components 
// are globally available or loaded before this script in the correct order.

function App() {
    const [theme, setTheme] = React.useState(() => {
        // Initialize theme from localStorage or default to 'dark'
        const savedTheme = localStorage.getItem('theme');
        return savedTheme || 'dark';
    });
    const [activeView, setActiveView] = React.useState('gitRepoManager'); // Default view

    React.useEffect(() => {
        // Apply theme class to body and save to localStorage
        if (theme === 'light') {
            document.body.classList.add('light-theme');
            document.body.classList.remove('dark-theme');
        } else {
            document.body.classList.add('dark-theme');
            document.body.classList.remove('light-theme');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
    };

    let contentView = null;
    if (activeView === 'gitRepoManager') {
        // GitRepoManagerPage will eventually manage its own state for repositories, etc.
        // For now, it's a simple component.
        contentView = e(GitRepoManagerPage, {}); 
    } 
    // Example for future views:
    // else if (activeView === 'systemMonitor') {
    //    contentView = e(SystemMonitorPage, {}); // Assuming SystemMonitorPage component exists
    // }

    return e(
        'div',
        // The theme class will be applied to the body, so App's div doesn't strictly need it,
        // but it can be useful for component-level theme scoping if desired.
        // Using flex here to ensure sidebar and main content area are laid out correctly.
        { className: 'flex flex-col min-h-screen' }, 
        e(Header), // Renders the main header
        e(ThemeToggleButton, { theme, toggleTheme }), // Theme toggle button, positioned by its own CSS
        e(
            'div',
            { className: 'flex flex-1 pt-16' }, // pt-16 to offset for fixed header height (assuming header is 4rem/64px high)
            e(Sidebar, { activeView, setActiveView }), // Renders the navigation sidebar
            e(
                'main',
                // ml-64 to offset for fixed sidebar width (assuming sidebar is 16rem/256px wide)
                // p-0 because the page component (e.g., GitRepoManagerPage) will define its own padding
                { className: 'flex-1 ml-64 p-0 overflow-y-auto bg-[var(--color-background-secondary)]' }, 
                contentView // Renders the currently active page/view
            )
        )
    );
}

// After all component files are loaded, this is how you would initialize the app:
// (This part would typically be in your main HTML file or a dedicated entry script)
/*
    const domContainer = document.getElementById('root');
    if (domContainer) {
        const root = ReactDOM.createRoot(domContainer);
        root.render(e(App));
    } else {
        console.error("Root element #root not found in the DOM.");
    }
*/
