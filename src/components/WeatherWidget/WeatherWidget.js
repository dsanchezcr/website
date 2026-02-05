import React, { useState, useEffect, useCallback } from 'react';
import { useLocale } from '@site/src/hooks';
import translations from './translations';
import './WeatherWidget.css';
import { config } from '../../config/environment';

const WeatherWidget = ({ showUserLocation = false, showLocationButton = false, locations = ['orlando', 'sanjose'] }) => {
  const [weatherData, setWeatherData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState(null); // 'requesting', 'denied', 'unavailable', 'not-supported'
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  
  // Use shared locale hook for consistency
  const locale = useLocale();
  const t = translations[locale] || translations.en;

  // Manual location request handler
  const requestUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus('not-supported');
      return;
    }

    setIsRequestingLocation(true);
    setLocationStatus('requesting');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude
        });
        setLocationStatus(null);
        setIsRequestingLocation(false);
      },
      (error) => {
        console.warn('Unable to get user location:', error.message);
        setIsRequestingLocation(false);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationStatus('denied');
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setLocationStatus('unavailable');
        } else {
          setLocationStatus('unavailable');
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  }, []);

  // Auto-request location on mount if showUserLocation is true (legacy behavior)
  useEffect(() => {
    if (showUserLocation && !showLocationButton && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          });
        },
        (error) => {
          console.warn('Unable to get user location:', error.message);
        }
      );
    }
  }, [showUserLocation, showLocationButton]);

  // Fetch weather data
  useEffect(() => {
    const fetchWeatherData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const apiEndpoint = config.getApiEndpoint();
        const weatherPromises = [];
        
        // Fetch user location weather if available
        if (userLocation) {
          const userWeatherUrl = `${apiEndpoint}/api/weather?lat=${userLocation.lat}&lon=${userLocation.lon}`;
          weatherPromises.push(
            fetch(userWeatherUrl).catch(() => null) // Handle individual request failures
          );
        }
        
        // Fetch predefined locations weather
        for (const location of locations) {
          const locationWeatherUrl = `${apiEndpoint}/api/weather?location=${location}`;
          weatherPromises.push(
            fetch(locationWeatherUrl).catch(() => null) // Handle individual request failures
          );
        }
        
        const responses = await Promise.all(weatherPromises);
        const weatherResults = [];
        
        for (const response of responses) {
          if (response && response.ok) {
            try {
              const data = await response.json();
              if (Array.isArray(data)) {
                // Update location names for user location
                const localizedData = data.map(item => ({
                  ...item,
                  Location: item.Location === "Your Location" ? t.yourLocation : item.Location
                }));
                weatherResults.push(...localizedData);
              } else if (data && data.Location) {
                const localizedItem = {
                  ...data,
                  Location: data.Location === "Your Location" ? t.yourLocation : data.Location
                };
                weatherResults.push(localizedItem);
              }
            } catch (jsonError) {
              console.warn('Failed to parse weather data:', jsonError);
            }
          }
        }
        
        if (weatherResults.length === 0) {
          setError(t.error);
        } else {
          setWeatherData(weatherResults);
        }
      } catch (err) {
        console.error('Error fetching weather data:', err);
        setError(t.error);
      } finally {
        setIsLoading(false);
      }
    };

    // Always fetch weather data for predefined locations
    // If user location is required but not available, we'll wait a bit then fetch without it
    if (!showUserLocation) {
      fetchWeatherData();
    } else if (userLocation) {
      fetchWeatherData();
    } else {
      // Give geolocation a chance to work, then fetch predefined locations anyway
      const timer = setTimeout(() => {
        if (!userLocation) {
          fetchWeatherData();
        }
      }, 3000); // Wait 3 seconds for geolocation
      
      return () => clearTimeout(timer);
    }
  }, [userLocation, locations, showUserLocation, t]);

  if (isLoading) {
    return (
      <div className="weather-widget">
        <div className="weather-loading">
          <div className="weather-spinner"></div>
          <p>{t.loading}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="weather-widget">
        <div className="weather-error">
          <p>⚠️ {error}</p>
        </div>
      </div>
    );
  }

  // Get location status message
  const getLocationStatusMessage = () => {
    switch (locationStatus) {
      case 'requesting':
        return t.requestingLocation;
      case 'denied':
        return t.locationDenied;
      case 'unavailable':
        return t.locationUnavailable;
      case 'not-supported':
        return t.locationNotSupported;
      default:
        return null;
    }
  };

  return (
    <div className="weather-widget" role="region" aria-label={t.title}>
      <h3 className="weather-title">{t.title}</h3>
      
      {/* Location request button */}
      {showLocationButton && !userLocation && (
        <div className="weather-location-request">
          <button
            className="weather-location-button"
            onClick={requestUserLocation}
            disabled={isRequestingLocation}
            aria-label={t.getMyLocation}
          >
            {isRequestingLocation ? (
              <>
                <span className="weather-button-spinner" aria-hidden="true"></span>
                {t.requestingLocation}
              </>
            ) : (
              <>
                <span aria-hidden="true">📍</span> {t.getMyLocation}
              </>
            )}
          </button>
          {locationStatus && locationStatus !== 'requesting' && (
            <p className="weather-location-status" role="alert">
              {getLocationStatusMessage()}
            </p>
          )}
        </div>
      )}

      <div className="weather-grid" role="list">
        {weatherData.map((weather, index) => (
          <div key={index} className="weather-card" role="listitem" 
               aria-label={`Weather for ${weather.Location}: ${weather.Description}, ${Math.round(weather.Temperature)} degrees Celsius`}>
            <div className="weather-location">
              <h4>{weather.Location}</h4>
            </div>
            <div className="weather-main">
              <span className="weather-icon" title={weather.Description} role="img" aria-label={weather.Description}>
                {weather.Icon}
              </span>
              <div className="weather-temp">
                <span className="temp-celsius" aria-label={`${Math.round(weather.Temperature)} degrees Celsius`}>
                  {Math.round(weather.Temperature)}°C
                </span>
                <span className="temp-fahrenheit" aria-label={`${Math.round((weather.Temperature * 9/5) + 32)} degrees Fahrenheit`}>
                  {Math.round((weather.Temperature * 9/5) + 32)}°F
                </span>
              </div>
            </div>
            <div className="weather-details">
              <div className="weather-condition">
                {weather.Description}
              </div>
              <div className="weather-humidity" aria-label={`${t.humidity}: ${weather.Humidity} percent`}>
                💧 {weather.Humidity}% {t.humidity}
              </div>
            </div>
            <div className="weather-updated">
              {t.lastUpdated} {new Date(weather.LastUpdated).toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WeatherWidget;