import React, { useState, useMemo } from 'react';
import styles from './styles.module.css';
import CATEGORIES from './categories';
import ParkItemCard from './ParkItemCard';

const getLocalized = (field, locale) => {
  if (!field) return '';
  if (typeof field === 'string') return field;
  return field[locale] || field.en || '';
};

const ParkList = ({ park, locale = 'en' }) => {
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredItems = useMemo(() => {
    const items = park.items || [];
    if (activeCategory === 'all') return items;
    return items.filter(item => item.category === activeCategory);
  }, [park.items, activeCategory]);

  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity));
  }, [filteredItems]);

  const availableCategories = useMemo(() => {
    const cats = new Set((park.items || []).map(item => item.category));
    return Object.entries(CATEGORIES).filter(([key]) => cats.has(key));
  }, [park.items]);

  const translations = {
    en: { all: 'All', noItems: 'No recommendations yet. Check back soon!' },
    es: { all: 'Todos', noItems: 'Aún no hay recomendaciones. ¡Vuelve pronto!' },
    pt: { all: 'Todos', noItems: 'Nenhuma recomendação ainda. Volte em breve!' },
  };
  const t = translations[locale] || translations.en;

  return (
    <div className={styles.listContainer}>
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

      {sortedItems.length === 0 ? (
        <p className={styles.emptyMessage}>{t.noItems}</p>
      ) : (
        <div className={styles.itemsList}>
          {sortedItems.map(item => (
            <ParkItemCard key={item.id} item={item} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ParkList;
