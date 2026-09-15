import React, { useState, useEffect, useMemo } from 'react';
import { useLocale } from '@site/src/hooks';
import MediaCard from './MediaCard';
import Pagination from '../Pagination';
import TmdbAttribution from './TmdbAttribution';
import { mediaTranslations } from './mediaTranslations';

const MediaCardList = ({ items = [], category, contentType, itemsPerPage = 10 }) => {
  const locale = useLocale();
  const text = mediaTranslations[locale] || mediaTranslations.en;
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
        const aTmdb = a.syncSource === 'tmdb';
        const bTmdb = b.syncSource === 'tmdb';
        if (aTmdb !== bTmdb) return aTmdb ? -1 : 1;
        if (aTmdb && bTmdb) {
          const snapshot = (Date.parse(b.syncedAt) || 0) - (Date.parse(a.syncedAt) || 0);
          if (snapshot) return snapshot;
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

  if (!filtered.length) {
    return (
      <p style={{ textAlign: 'center', color: 'var(--ifm-font-color-secondary)' }}>
        {text.empty}
      </p>
    );
  }

  return (
    <div>
      {paginated.map(item => (
        <MediaCard
          key={`${item.category || category}:${item.id || `${item.mediaType || contentType}:${item.tmdbId || item.titleId}`}`}
          {...item}
          mediaType={item.mediaType || (contentType === 'series' ? 'tv' : 'movie')}
          locale={locale}
        />
      ))}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        locale={locale}
      />
      {filtered.some(item => item.tmdbId) && <TmdbAttribution locale={locale} />}
    </div>
  );
};

export default MediaCardList;
