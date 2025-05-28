import React, { useState, useEffect } from 'react';
import { useColorMode } from '@docusaurus/theme-common';
import { translate } from '@docusaurus/Translate';
import styles from './styles.module.css';

const OnlineStatusWidget = ({ isNavbarWidget = false }) => {
  const [activeUsers, setActiveUsers] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const { colorMode } = useColorMode();

  const fetchActiveUsers = async () => {
    try {
      const response = await fetch('https://dsanchezcr.azurewebsites.net/api/GetOnlineUsersFunction');
      if (response.ok) {
        const data = await response.json();
        setActiveUsers(data.activeUsers);
        setLastUpdated(new Date());
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error fetching active users:', error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchActiveUsers();
    
    // Set up interval for updates every 30 seconds
    const interval = setInterval(fetchActiveUsers, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const statusText = translate({
    id: 'onlineStatus.usersOnline',
    message: '{count} online',
    description: 'Number of users currently online'
  }, { count: activeUsers });

  const loadingText = translate({
    id: 'onlineStatus.loading',
    message: 'Loading...',
    description: 'Loading text for online status widget'
  });

  const widgetClass = isNavbarWidget ? 
    `${styles.onlineStatusWidget} ${styles.navbarWidget}` : 
    styles.onlineStatusWidget;

  if (isLoading) {
    return (
      <div className={widgetClass}>
        <div className={`${styles.onlineIndicator} ${styles.loading}`}>
          <span className={styles.statusDot}></span>
          <span className={styles.statusText}>{loadingText}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={widgetClass}>
      <div className={styles.onlineIndicator}>
        <span className={`${styles.statusDot} ${styles.active}`}></span>
        <span className={styles.statusText}>{statusText}</span>
      </div>
    </div>
  );
};

export default OnlineStatusWidget;