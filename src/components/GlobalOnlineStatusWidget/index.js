import React from 'react';
import OnlineStatusWidget from '@site/src/components/OnlineStatusWidget';

// Add the online status widget to the navbar after page load
export default function GlobalOnlineStatusWidget() {
  React.useEffect(() => {
    // Find the navbar right items container
    const navbarRight = document.querySelector('.navbar__items--right');
    if (navbarRight && !navbarRight.querySelector('.global-online-widget')) {
      // Create a container for our widget
      const widgetContainer = document.createElement('div');
      widgetContainer.className = 'global-online-widget';
      widgetContainer.style.display = 'contents';
      
      // Insert before the language dropdown if it exists, otherwise append
      const languageDropdown = navbarRight.querySelector('.dropdown');
      if (languageDropdown) {
        navbarRight.insertBefore(widgetContainer, languageDropdown);
      } else {
        navbarRight.appendChild(widgetContainer);
      }
      
      // Use ReactDOM to render our component
      import('react-dom/client').then(({ createRoot }) => {
        const root = createRoot(widgetContainer);
        root.render(React.createElement(OnlineStatusWidget, { isNavbarWidget: true }));
      });
    }
  }, []);

  return null; // This component doesn't render anything directly
}