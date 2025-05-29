import React, { useState, useEffect } from 'react';
import { useLocation } from '@docusaurus/router';
import translations from './translations';
import './CompactWeatherWidget.css';
import { config } from '../../config/environment';

const CompactWeatherWidget = () => {
  const [weatherData, setWeatherData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Get current locale from URL
  const location = useLocation();
  const locale = location.pathname.startsWith('/es') ? 'es' : 
                location.pathname.startsWith('/pt') ? 'pt' : 'en';
  const t = translations[locale] || translations.en;

  // Only fetch predefined locations (Orlando, FL and San José, CR)
  const locations = ['orlando', 'sanjose'];

  // Fetch weather data
  useEffect(() => {
    const fetchWeatherData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const apiEndpoint = config.getApiEndpoint();
        const weatherPromises = locations.map(location => 
          fetch(`${apiEndpoint}/api/GetWeatherFunction?location=${location}`)
            .catch(() => null) // Handle individual request failures
        );
        
        const responses = await Promise.all(weatherPromises);
        const weatherResults = [];
        
        for (const response of responses) {
          if (response && response.ok) {
            try {
              const data = await response.json();
              if (Array.isArray(data)) {
                weatherResults.push(...data);
              } else if (data && data.Location) {
                weatherResults.push(data);
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
        setLoading(false);
      }
    };

    fetchWeatherData();
  }, [t]);

  if (loading) {
    return (
      <div className="compact-weather">
        <div className="compact-weather-loading">
          <div className="compact-spinner"></div>
        </div>
      </div>
    );
  }

  if (error || weatherData.length === 0) {
    return (
      <div className="compact-weather">
        <div className="compact-weather-error">⚠️</div>
      </div>
    );
  }

  return (
    <div className="compact-weather" role="region" aria-label={t.title}>
      <div className="compact-weather-items">
        {weatherData.map((weather, index) => (
          <div key={index} className="compact-weather-item" 
               title={`${weather.Location}: ${weather.Description}, ${Math.round(weather.Temperature)}°C`}>
            <span className="compact-weather-icon" role="img" aria-label={weather.Description}>
              {weather.Icon}
            </span>
            <div className="compact-weather-info">
              <div className="compact-weather-location">{weather.Location.split(',')[0]}</div>
              <div className="compact-weather-temp">{Math.round(weather.Temperature)}°C</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CompactWeatherWidget;