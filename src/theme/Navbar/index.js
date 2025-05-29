import React from 'react';
import OriginalNavbar from '@theme-original/Navbar';
import CompactWeatherWidget from '@site/src/components/WeatherWidget/CompactWeatherWidget';

export default function Navbar(props) {
  return (
    <div style={{ position: 'relative' }}>
      <OriginalNavbar {...props} />
      <div style={{
        position: 'absolute',
        top: '50%',
        right: '140px', // Position to the left of the locale dropdown
        transform: 'translateY(-50%)',
        zIndex: 1000,
        pointerEvents: 'none',
      }}>
        <div style={{ pointerEvents: 'auto' }}>
          <CompactWeatherWidget />
        </div>
      </div>
    </div>
  );
}