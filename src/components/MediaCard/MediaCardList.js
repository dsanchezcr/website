import React, { useState, useEffect, useMemo } from 'react';
import { useImdbData } from '@site/src/hooks/useImdbData';
import { useLocale } from '@site/src/hooks';
import MediaCard from './MediaCard';
import Pagination from '../Pagination';

const MediaCardList = ({ items, category, itemsPerPage = 10 }) => {
  const locale = useLocale();
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(
    () => {
      const isTopList = category === 'top-movies' || category === 'top-series' || category === 'top-tv';
      const result = category ? items.filter(item => item.category === category) : items;
      return result.slice().sort((a, b) => {
        if (isTopList) {
          const aOrder = Number.isFinite(a.order) ? a.order : Number.POSITIVE_INFINITY;
          const bOrder = Number.isFinite(b.order) ? b.order : Number.POSITIVE_INFINITY;
          return aOrder - bOrder;
        }
        const aOrder = Number.isFinite(a.order) ? a.order : Number.NEGATIVE_INFINITY;
        const bOrder = Number.isFinite(b.order) ? b.order : Number.NEGATIVE_INFINITY;
        return bOrder - aOrder;
      });
    },
    [items, category]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [items, category]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
    [filtered, currentPage, itemsPerPage]
  );

  const enriched = useImdbData(paginated);

  if (!filtered.length) {
    return (
      <p style={{ textAlign: 'center', color: 'var(--ifm-font-color-secondary)' }}>
        No titles to display yet.
      </p>
    );
  }

  return (
    <div>
      {enriched.map(item => (
        <MediaCard key={item.titleId} {...item} locale={locale} />
      ))}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        locale={locale}
      />
    </div>
  );
};

export default MediaCardList;
