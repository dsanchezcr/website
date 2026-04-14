import React, { useState, useEffect } from 'react';
import { useLocale } from '@site/src/hooks';
import { config } from '@site/src/config/environment';
import ParkList from './ParkList';
import styles from './styles.module.css';

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
  const [park, setPark] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch park data from API
  useEffect(() => {
    const controller = new AbortController();

    const fetchPark = async () => {
      setLoading(true);
      setError(null);
      setPark(null);
      try {
        const apiEndpoint = config.getApiEndpoint();
        let url = `${apiEndpoint}${config.routes.contentParks}?provider=${encodeURIComponent(dataSource)}`;
        if (parkId) {
          url += `&parkId=${encodeURIComponent(parkId)}`;
        }

        const response = await fetch(url, { headers: { Accept: 'application/json' }, signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Failed to load park data (${response.status})`);
        }

        const parks = await response.json();
        const found = parkId ? parks.find(p => p.parkId === parkId) : parks[0];
        setPark(found || null);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchPark();
    return () => controller.abort();
  }, [dataSource, parkId]);

  // Eagerly load the map component
  useEffect(() => {
    if (!MapComponent) {
      import('./ParkMap').then(mod => {
        setMapComponent(() => mod.default);
      });
    }
  }, [MapComponent]);

  if (loading) return <p style={{ textAlign: 'center', color: 'var(--ifm-font-color-secondary)' }}>Loading park data...</p>;
  if (error) return <p style={{ textAlign: 'center', color: 'var(--ifm-color-danger)' }}>Error: {error}</p>;
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
