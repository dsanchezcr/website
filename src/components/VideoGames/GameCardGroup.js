import React from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './styles.module.css';

const platformColors = {
  xbox: '#107C10',
  playstation: '#003087',
  'nintendo-switch': '#E4000F',
  'nintendo-switch-2': '#FF3C28',
  'meta-quest': '#1C1E20',
};

const platformLabels = {
  xbox: 'Xbox',
  playstation: 'PlayStation',
  'nintendo-switch': 'Nintendo Switch',
  'nintendo-switch-2': 'Nintendo Switch 2',
  'meta-quest': 'Meta Quest',
};

const statusLabelsByLocale = {
  en: {
    completed: '✅ Completed',
    playing: '🎮 Currently Playing',
    backlog: '📋 Backlog',
    dropped: '❌ Dropped',
  },
  es: {
    completed: '✅ Completado',
    playing: '🎮 Jugando ahora',
    backlog: '📋 Pendientes',
    dropped: '❌ Abandonado',
  },
  pt: {
    completed: '✅ Concluido',
    playing: '🎮 Jogando agora',
    backlog: '📋 Pendentes',
    dropped: '❌ Abandonado',
  },
};

const getLocaleKey = (locale) => {
  if (!locale) return 'en';
  if (locale.startsWith('es')) return 'es';
  if (locale.startsWith('pt')) return 'pt';
  return 'en';
};

const GameCardGroup = ({ title, platform, status, recommendation, hoursPlayed, children }) => {
  const { i18n } = useDocusaurusContext();
  const localeKey = getLocaleKey(i18n?.currentLocale);
  const statusLabels = statusLabelsByLocale[localeKey] || statusLabelsByLocale.en;
  // Extract game data from children (GameCard components)
  const games = React.Children.toArray(children)
    .filter((child) => child.props)
    .map((child) => ({
      title: child.props.title,
      imageUrl: child.props.imageUrl,
      url: child.props.url,
    }));

  if (games.length === 0) return null;

  return (
    <div className={styles.gameCard}>
      <div
        className={styles.platformBadge}
        style={{ backgroundColor: platformColors[platform] || '#666' }}
      >
        {platformLabels[platform] || platform}
      </div>

      <div className={styles.gameCardContent}>
        <div className={styles.gameGroupImages}>
          {games.map((game, index) => {
            const content = (
              <div key={index} className={styles.gameGroupItem}>
                {game.imageUrl && (
                  <div className={styles.gameImageContainer}>
                    <img
                      src={game.imageUrl}
                      alt={game.title}
                      className={styles.gameImage}
                      loading="lazy"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                )}
                <span className={styles.gameGroupTitle}>{game.title}</span>
              </div>
            );
            return game.url ? (
              <a key={index} href={game.url} target="_blank" rel="noopener noreferrer" className={styles.gameCardLink}>
                {content}
              </a>
            ) : content;
          })}
        </div>

        <div className={styles.gameInfo}>
          {title && <h3 className={styles.gameTitle}>{title}</h3>}
          <div className={styles.gameMeta}>
            {status && (
              <span className={styles.gameStatus}>
                {statusLabels[status] || status}
              </span>
            )}
            {hoursPlayed && (
              <span className={styles.gameHours}>🕐 {hoursPlayed}h played</span>
            )}
          </div>

          {recommendation && (
            <p className={styles.gameRecommendation}>
              💬 <em>{recommendation}</em>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameCardGroup;
