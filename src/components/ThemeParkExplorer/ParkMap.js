import React, { useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './styles.module.css';
import CATEGORIES from './categories';

const getLocalized = (field, locale) => {
  if (!field) return '';
  if (typeof field === 'string') return field;
  return field[locale] || field.en || '';
};

const createCategoryIcon = (category, order) => {
  const cat = CATEGORIES[category] || { emoji: '📍', color: '#6b7280' };
  const label = order != null ? `${order}` : cat.emoji;

  return L.divIcon({
    className: '',
    html: `<div style="background:${cat.color};color:#fff;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:${order != null ? '14px' : '16px'};font-weight:bold;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid #fff;">${label}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -20],
  });
};

const ParkMap = ({ park, locale = 'en' }) => {
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredItems = useMemo(() => {
    const items = (park.items || []).filter(item => item.coordinates);
    if (activeCategory === 'all') return items;
    return items.filter(item => item.category === activeCategory);
  }, [park.items, activeCategory]);

  const availableCategories = useMemo(() => {
    const cats = new Set((park.items || []).filter(i => i.coordinates).map(i => i.category));
    return Object.entries(CATEGORIES).filter(([key]) => cats.has(key));
  }, [park.items]);

  // Build route polyline from items that have an order, sorted by order
  const routePositions = useMemo(() => {
    const ordered = filteredItems
      .filter(item => item.order != null && item.coordinates)
      .sort((a, b) => a.order - b.order);
    return ordered.map(item => {
      const coords = item.coordinates;
      return Array.isArray(coords) ? [coords[0], coords[1]] : coords;
    });
  }, [filteredItems]);

  const translations = {
    en: { all: 'All', mustDo: 'Must Do', noItems: 'No recommendations to show on map yet.', moreInfo: 'More info' },
    es: { all: 'Todos', mustDo: 'Imperdible', noItems: 'Aún no hay recomendaciones para mostrar en el mapa.', moreInfo: 'Más información' },
    pt: { all: 'Todos', mustDo: 'Imperdível', noItems: 'Nenhuma recomendação para mostrar no mapa ainda.', moreInfo: 'Mais informações' },
  };
  const t = translations[locale] || translations.en;

  if (!park.mapCenter) return null;

  return (
    <div className={styles.mapContainer}>
      {availableCategories.length > 0 && (
        <div className={styles.categoryFilters}>
          <button
            className={`${styles.categoryFilter} ${activeCategory === 'all' ? styles.active : ''}`}
            onClick={() => setActiveCategory('all')}
          >
            {t.all}
          </button>
          {availableCategories.map(([key, cat]) => (
            <button
              key={key}
              className={`${styles.categoryFilter} ${activeCategory === key ? styles.active : ''}`}
              style={{ '--cat-color': cat.color }}
              onClick={() => setActiveCategory(key)}
            >
              {cat.emoji} {getLocalized(cat.label, locale)}
            </button>
          ))}
        </div>
      )}

      <MapContainer
        center={park.mapCenter}
        zoom={park.mapZoom || 16}
        className={styles.leafletMap}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {routePositions.length >= 2 && (
          <Polyline
            positions={routePositions}
            pathOptions={{
              color: 'var(--ifm-color-primary, #0d9488)',
              weight: 3,
              opacity: 0.7,
              dashArray: '8, 8',
            }}
          />
        )}
        {filteredItems.map(item => (
          <Marker
            key={item.id}
            position={item.coordinates}
            icon={createCategoryIcon(item.category, item.order)}
          >
            <Popup>
              <div className={styles.popupContent}>
                <strong>
                  {item.url ? (
                    <a href={item.url} target="_blank" rel="noopener noreferrer">{getLocalized(item.name, locale)}</a>
                  ) : getLocalized(item.name, locale)}
                </strong>
                {item.mustDo && <span className={styles.popupMustDo}> ⭐ {t.mustDo}</span>}
                {item.rating != null && <div>{'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}</div>}
                {getLocalized(item.review, locale) && (
                  <p><em>{getLocalized(item.review, locale)}</em></p>
                )}
                {getLocalized(item.tips, locale) && (
                  <p>💡 {getLocalized(item.tips, locale)}</p>
                )}
                {item.url && (
                  <p><a href={item.url} target="_blank" rel="noopener noreferrer">🔗 {t.moreInfo}</a></p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {filteredItems.length === 0 && (
        <p className={styles.emptyMessage}>{t.noItems}</p>
      )}
    </div>
  );
};

export default ParkMap;
