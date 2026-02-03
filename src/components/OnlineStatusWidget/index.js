import React, { useState, useEffect } from 'react';
import { useColorMode } from '@docusaurus/theme-common';
import { translate } from '@docusaurus/Translate';
import styles from './styles.module.css';
import { config } from '../../config/environment';

const OnlineStatusWidget = ({ isNavbarWidget = false }) => {
  const [usersLastHour, setUsersLastHour] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const { colorMode } = useColorMode();

  // Feature flag check - moved after hooks to comply with Rules of Hooks
  const isFeatureEnabled = config.features.recentVisits;

  const fetchUsersLastHour = async () => {
    if (!isFeatureEnabled) return;
    
    try {
      const apiEndpoint = config.getApiEndpoint();
      const response = await fetch(`${apiEndpoint}/api/online-users`, {
        method: 'GET',
        cache: 'no-cache',
        headers: {
          'Accept': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUsersLastHour(data.usersLastHour || 0);
        setLastUpdated(new Date());
        setIsLoading(false);
      } else {
        console.warn('Failed to fetch users in last hour, status:', response.status);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error fetching users in last hour:', error);
      setIsLoading(false);
      // Fail silently and keep previous value if any
    }
  };

  useEffect(() => {
    if (!isFeatureEnabled) {
      setIsLoading(false);
      return;
    }
    
    // Add a small delay before the first fetch to prevent immediate API calls
    const initialDelay = setTimeout(() => {
      fetchUsersLastHour();
    }, 1000);
    // Set up interval for updates every 30 seconds
    const interval = setInterval(fetchUsersLastHour, 30000);
    return () => {
      clearTimeout(initialDelay);
      clearInterval(interval);
    };
  }, [isFeatureEnabled]);

  // Return null after hooks if feature is disabled
  if (!isFeatureEnabled) {
    return null;
  }

  const statusText = translate({
    id: 'onlineStatus.usersLastHour',
    message: '{count} users in the last hour',
    description: 'Number of users who visited in the last hour'
  }, { count: usersLastHour });

  const loadingText = translate({
    id: 'onlineStatus.loading',
    message: 'Loading...',
    description: 'Loading text for online status widget'
  });

  // Use only the main class for homepage context to avoid CSS specificity issues
  const widgetClass = isNavbarWidget ? 
    `${styles.onlineStatusWidget} ${styles.navbarWidget}` : 
    styles.onlineStatusWidget;

  if (isLoading) {
    return (
      <div className={widgetClass}>
        <div className={`${styles.onlineIndicator} ${styles.loading}`}>
          <span className={styles.userEmoji} role="img" aria-label="user">👤</span>
          <span className={styles.statusText}>{loadingText}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={widgetClass}>
      <div className={styles.onlineIndicator}>
        <span className={styles.userEmoji} role="img" aria-label="user">👤</span>
        <span className={styles.statusText}>{statusText}</span>
      </div>
    </div>
  );
};

export default OnlineStatusWidget;