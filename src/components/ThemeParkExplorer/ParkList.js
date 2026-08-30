import React, { useState, useEffect, useMemo } from 'react';
import styles from './styles.module.css';
import CATEGORIES from './categories';
import ParkItemCard from './ParkItemCard';
import Pagination from '../Pagination';

const getLocalized = (field, locale) => {
  if (!field) return '';
  if (typeof field === 'string') return field;
  return field[locale] || field.en || '';
};

const ParkList = ({ park, locale = 'en', itemsPerPage = 10 }) => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredItems = useMemo(() => {
    const items = park.items || [];
    if (activeCategory === 'all') return items;
    return items.filter(item => item.category === activeCategory);
  }, [park.items, activeCategory]);

  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      const aOrder = Number.isFinite(a.order) ? a.order : Number.NEGATIVE_INFINITY;
      const bOrder = Number.isFinite(b.order) ? b.order : Number.NEGATIVE_INFINITY;
      return bOrder - aOrder;
    });
  }, [filteredItems]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, park.items]);

  const totalPages = Math.ceil(sortedItems.length / itemsPerPage);
  const paginatedItems = useMemo(() => {
    return sortedItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [sortedItems, currentPage, itemsPerPage]);

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
        <>
          <div className={styles.itemsList}>
            {paginatedItems.map(item => (
              <ParkItemCard key={item.id} item={item} locale={locale} />
            ))}
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            locale={locale}
          />
        </>
      )}
    </div>
  );
};

export default ParkList;
