import React from 'react';
import Layout from '@theme/Layout';
import WeatherWidget from '@site/src/components/WeatherWidget';
import ErrorBoundary from '@site/src/components/ErrorBoundary';

export default function Weather() {
  return (
    <Layout
      title="Weather"
      description="Real-time weather information for Orlando, FL and San José, CR">
      <div className="container margin-vert--lg">
        <div className="row">
          <div className="col col--8 col--offset-2">
            <h1>Weather Information</h1>
            <p>
              Stay updated with real-time weather information for key locations. 
              We display current conditions including temperature, humidity, and weather conditions 
              for Orlando, Florida and San José, Costa Rica. If you allow location access, 
              we'll also show weather for your current location.
            </p>
            <ErrorBoundary showMessage errorMessage="Weather data is temporarily unavailable. Please try again later.">
              <WeatherWidget showUserLocation={true} locations={['orlando', 'sanjose']} />
            </ErrorBoundary>
            
            <div className="margin-top--lg">
              <h2>About the Weather Data</h2>
              <p>
                Weather data is sourced from <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a>, 
                a free and open-source weather API that provides accurate meteorological data. 
                The data is cached for one hour to ensure optimal performance while maintaining freshness.
              </p>
              
              <h3>Locations</h3>
              <ul>
                <li><strong>Orlando, Florida:</strong> A major city in central Florida, known for its theme parks and warm climate.</li>
                <li><strong>San José, Costa Rica:</strong> The capital and largest city of Costa Rica, located in the Central Valley.</li>
                <li><strong>Your Location:</strong> Weather for your current location (requires location permission).</li>
              </ul>
              
              <h3>Weather Information Displayed</h3>
              <ul>
                <li><strong>Temperature:</strong> Current temperature in Celsius</li>
                <li><strong>Weather Condition:</strong> Current weather conditions with descriptive icons</li>
                <li><strong>Humidity:</strong> Relative humidity percentage</li>
                <li><strong>Last Updated:</strong> Timestamp of when the data was last fetched</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}