import React, { useState, useEffect } from 'react';
import { useColorMode } from '@docusaurus/theme-common';
import { translate } from '@docusaurus/Translate';
import './CompactVisitorWidget.css';
import { config } from '../../config/environment';

const OnlineStatusWidget = ({ isNavbarWidget = false }) => {
  const [usersLast24Hours, setUsersLast24Hours] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const { colorMode } = useColorMode();

  // Feature flag check - moved after hooks to comply with Rules of Hooks
  const isFeatureEnabled = config.features.recentVisits;

  const fetchUsersLast24Hours = async () => {
    if (!isFeatureEnabled) return;
    
    try {
      const apiEndpoint = config.getApiEndpoint();
      const response = await fetch(`${apiEndpoint}${config.routes.onlineUsers}`, {
        method: 'GET',
        cache: 'no-cache',
        headers: {
          'Accept': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        
        // Check if analytics is actually configured and returning real data
        // Source === "Fallback" means Google Analytics is not configured
        if (data.source === 'Fallback' || data.error) {
          setHasError(true);
          setUsersLast24Hours(null);
        } else {
          setHasError(false);
          setUsersLast24Hours(data.usersLast24Hours || 0);
        }
        
        setLastUpdated(new Date());
        setIsLoading(false);
      } else {
        console.warn('Failed to fetch users in last 24 hours, status:', response.status);
        setHasError(true);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error fetching users in last 24 hours:', error);
      setHasError(true);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isFeatureEnabled) {
      setIsLoading(false);
      return;
    }
    
    // Add a small delay before the first fetch to prevent immediate API calls
    const initialDelay = setTimeout(() => {
      fetchUsersLast24Hours();
    }, 1000);
    // Set up interval for updates every 5 minutes (less frequent for 24-hour data)
    const interval = setInterval(fetchUsersLast24Hours, 300000);
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
    id: 'onlineStatus.usersLast24Hours',
    message: '{count} visitors in 24h',
    description: 'Number of users who visited in the last 24 hours'
  }, { count: usersLast24Hours });

  const loadingText = translate({
    id: 'onlineStatus.loading',
    message: 'Loading...',
    description: 'Loading text for online status widget'
  });

  // Navbar-specific rendering (simple inline style)
  if (isNavbarWidget) {
    if (hasError) {
      return (
        <div className="compact-visitor-navbar">
          <span className="compact-visitor-icon" role="img" aria-label="warning">⚠️</span>
        </div>
      );
    }
    return (
      <div className="compact-visitor-navbar">
        <span className="compact-visitor-icon" role="img" aria-label="visitors">👥</span>
        <span className="compact-visitor-count">{usersLast24Hours}</span>
      </div>
    );
  }

  // Homepage widget (styled like weather widget, but on left)
  if (isLoading) {
    return (
      <div className="compact-visitor-container">
        <div className="compact-visitor">
          <div className="compact-visitor-loading">
            <div className="compact-spinner"></div>
          </div>
        </div>
      </div>
    );
  }

  // Show warning when analytics is not configured or errored
  if (hasError) {
    return (
      <div className="compact-visitor-container">
        <div className="compact-visitor">
          <div className="compact-visitor-error">⚠️</div>
        </div>
      </div>
    );
  }

  return (
    <div className="compact-visitor-container">
      <div className="compact-visitor">
        <div className="compact-visitor-items">
          <div className="compact-visitor-item" title="Visitors in the last 24 hours">
            <span className="compact-visitor-icon" role="img" aria-label="visitors">👥</span>
            <div className="compact-visitor-info">
              <span className="compact-visitor-label">Visitors</span>
              <span className="compact-visitor-count">{statusText}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnlineStatusWidget;