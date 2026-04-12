import React, { useState, useMemo, useEffect } from 'react';
import { useLocale } from '@site/src/hooks';
import ParkList from './ParkList';
import styles from './styles.module.css';

import disneyParks from '@site/src/data/disney-parks.json';
import universalParks from '@site/src/data/universal-parks.json';

const DATA_SOURCES = {
  disney: disneyParks,
  universal: universalParks,
};

const MapIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
    <line x1="8" y1="2" x2="8" y2="18" />
    <line x1="16" y1="6" x2="16" y2="22" />
  </svg>
);

const ListIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

const ThemeParkExplorer = ({ dataSource, parkId }) => {
  const locale = useLocale();
  const [viewMode, setViewMode] = useState('map');
  const [MapComponent, setMapComponent] = useState(null);

  const park = useMemo(() => {
    const parks = DATA_SOURCES[dataSource] || [];
    return parks.find(p => p.parkId === parkId);
  }, [dataSource, parkId]);

  // Eagerly load the map component
  useEffect(() => {
    if (!MapComponent) {
      import('./ParkMap').then(mod => {
        setMapComponent(() => mod.default);
      });
    }
  }, [MapComponent]);

  if (!park) return <p>Park not found.</p>;

  const translations = {
    en: { map: 'Map', list: 'List' },
    es: { map: 'Mapa', list: 'Lista' },
    pt: { map: 'Mapa', list: 'Lista' },
  };
  const t = translations[locale] || translations.en;

  return (
    <div className={styles.explorer}>
      <div className={styles.viewToggle} role="tablist">
        <div
          role="tab"
          tabIndex={0}
          aria-selected={viewMode === 'map'}
          className={`${styles.toggleTab} ${viewMode === 'map' ? styles.activeTab : ''}`}
          onClick={() => setViewMode('map')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setViewMode('map'); }}
        >
          <MapIcon /> {t.map}
        </div>
        <div
          role="tab"
          tabIndex={0}
          aria-selected={viewMode === 'list'}
          className={`${styles.toggleTab} ${viewMode === 'list' ? styles.activeTab : ''}`}
          onClick={() => setViewMode('list')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setViewMode('list'); }}
        >
          <ListIcon /> {t.list}
        </div>
      </div>

      {viewMode === 'map' ? (
        MapComponent ? (
          <MapComponent park={park} locale={locale} />
        ) : (
          <div className={styles.mapLoading}>Loading map...</div>
        )
      ) : (
        <ParkList park={park} locale={locale} />
      )}
    </div>
  );
};

export default ThemeParkExplorer;
