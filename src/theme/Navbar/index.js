import React from 'react';
import OriginalNavbar from '@theme-original/Navbar';
import CompactWeatherWidget from '@site/src/components/WeatherWidget/CompactWeatherWidget';
import './navbar.css';

export default function Navbar(props) {
  return (
    <div className="custom-navbar-wrapper">
      <OriginalNavbar {...props} />
      <div className="navbar-weather-widget">
        <CompactWeatherWidget />
      </div>
    </div>
  );
}