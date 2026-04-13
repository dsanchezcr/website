import React from 'react';
import GameCard from './GameCard';
import GameCardGroup from './GameCardGroup';

const GamingEntriesRenderer = ({ items }) => {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  return (
    <>
      {items.map((item, index) => {
        if (!item || typeof item !== 'object') {
          return null;
        }

        const key = `${item.type || 'card'}-${item.title || index}`;

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
