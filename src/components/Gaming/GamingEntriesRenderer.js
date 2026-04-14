import React from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import GameCard from './GameCard';
import GameCardGroup from './GameCardGroup';

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

const GamingEntriesRenderer = ({ items }) => {
  const { i18n } = useDocusaurusContext();
  const localeKey = i18n?.currentLocale || 'en';

  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  return (
    <>
      {items.map((rawItem, index) => {
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
    </>
  );
};

export default GamingEntriesRenderer;
