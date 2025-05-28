import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';

if (ExecutionEnvironment.canUseDOM) {
  // Create and inject the online status widget into the navbar
  const createOnlineStatusWidget = () => {
    import('../components/OnlineStatusWidget').then((module) => {
      const OnlineStatusWidget = module.default;
      import('react').then((React) => {
        import('react-dom/client').then(({ createRoot }) => {
          // Find the navbar right items container
          const navbarRight = document.querySelector('.navbar__items--right');
          if (navbarRight && !navbarRight.querySelector('.global-online-widget')) {
            // Create a container for our widget
            const widgetContainer = document.createElement('div');
            widgetContainer.className = 'global-online-widget';
            
            // Insert before the language dropdown if it exists, otherwise append
            const languageDropdown = navbarRight.querySelector('.dropdown');
            if (languageDropdown) {
              navbarRight.insertBefore(widgetContainer, languageDropdown);
            } else {
              navbarRight.appendChild(widgetContainer);
            }
            
            // Render the widget
            const root = createRoot(widgetContainer);
            root.render(React.createElement(OnlineStatusWidget, { isNavbarWidget: true }));
          }
        });
      });
    });
  };

  // Wait for the navbar to be available
  const initWidget = () => {
    if (document.querySelector('.navbar__items--right')) {
      createOnlineStatusWidget();
    } else {
      // Retry after a short delay if navbar isn't ready
      setTimeout(initWidget, 100);
    }
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }
}