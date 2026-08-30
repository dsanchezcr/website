import React, { useState, useEffect, useMemo } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import GameCard from './GameCard';
import GameCardGroup from './GameCardGroup';
import Pagination from '../Pagination';

const localizeValue = (value, localeKey) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }

  return value[localeKey] || value.en || value.es || value.pt || Object.values(value).find((item) => typeof item === 'string') || '';
};

const localizeEntry = (entry, localeKey) => {
  if (!entry || typeof entry !== 'object') {
    return entry;
  }

  const localized = {
    ...entry,
    title: localizeValue(entry.title, localeKey),
    recommendation: localizeValue(entry.recommendation, localeKey),
    description: localizeValue(entry.description, localeKey),
  };

  if (entry.type === 'group' && Array.isArray(entry.games)) {
    localized.games = entry.games.map((game) => localizeEntry(game, localeKey));
  }

  return localized;
};

const GamingEntriesRenderer = ({ items, section, itemsPerPage = 10 }) => {
  const { i18n } = useDocusaurusContext();
  const localeKey = i18n?.currentLocale || 'en';
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [items, section]);

  const sortedItems = useMemo(() => {
    if (!Array.isArray(items)) return [];
    const validItems = items.filter(item => item && typeof item === 'object');
    const isTopList = section === 'topGames' || section === 'top-movies' || section === 'top-series' || section === 'top-tv';
    return validItems.slice().sort((a, b) => {
      if (isTopList) {
        const aOrder = Number.isFinite(a?.order) ? a.order : Number.POSITIVE_INFINITY;
        const bOrder = Number.isFinite(b?.order) ? b.order : Number.POSITIVE_INFINITY;
        return aOrder - bOrder;
      }
      const aOrder = Number.isFinite(a?.order) ? a.order : Number.NEGATIVE_INFINITY;
      const bOrder = Number.isFinite(b?.order) ? b.order : Number.NEGATIVE_INFINITY;
      return bOrder - aOrder;
    });
  }, [items, section]);

  if (!Array.isArray(sortedItems) || sortedItems.length === 0) {
    return null;
  }

  const totalPages = Math.ceil(sortedItems.length / itemsPerPage);
  const paginatedItems = sortedItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <>
      {paginatedItems.map((rawItem, index) => {
        if (!rawItem || typeof rawItem !== 'object') {
          return null;
        }

        const item = localizeEntry(rawItem, localeKey);

        const key = rawItem.id || `${item.type || 'card'}-${item.title || ''}-${index}`;

        if (item.type === 'group') {
          const { games, ...groupProps } = item;

          return (
            <GameCardGroup key={key} {...groupProps}>
              {(games || []).map((game, gameIndex) => (
                <GameCard key={`${key}-game-${game.title || gameIndex}`} {...game} />
              ))}
            </GameCardGroup>
          );
        }

        return <GameCard key={key} {...item} />;
      })}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        locale={localeKey}
      />
    </>
  );
};

export default GamingEntriesRenderer;
