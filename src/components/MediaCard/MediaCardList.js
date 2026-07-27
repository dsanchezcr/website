import React, { useMemo } from 'react';
import { useImdbData } from '@site/src/hooks/useImdbData';
import { useLocale } from '@site/src/hooks';
import MediaCard from './MediaCard';

const MediaCardList = ({ items, category }) => {
  const locale = useLocale();
  const filtered = useMemo(
    () => {
      const result = category ? items.filter(item => item.category === category) : items;
      return result.slice().sort((a, b) => {
        const aOrder = typeof a.order === 'number' ? a.order : Number.NEGATIVE_INFINITY;
        const bOrder = typeof b.order === 'number' ? b.order : Number.NEGATIVE_INFINITY;
        return bOrder - aOrder;
      });
    },
    [items, category]
  );

  const enriched = useImdbData(filtered);

  if (!enriched.length) {
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
    </div>
  );
};

export default MediaCardList;
