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

const GameCard = ({ title, platform, status, imageUrl, recommendation, hoursPlayed, url }) => {
  const { i18n } = useDocusaurusContext();
  const localeKey = getLocaleKey(i18n?.currentLocale);
  const statusLabels = statusLabelsByLocale[localeKey] || statusLabelsByLocale.en;
  const card = (
    <div className={styles.gameCard}>
      <div
        className={styles.platformBadge}
        style={{ backgroundColor: platformColors[platform] || '#666' }}
      >
        {platformLabels[platform] || platform}
      </div>

      <div className={styles.gameCardContent}>
        {imageUrl && (
          <div className={styles.gameImageContainer}>
            <img
              src={imageUrl}
              alt={title}
              className={styles.gameImage}
              loading="lazy"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
        )}

        <div className={styles.gameInfo}>
          <h3 className={styles.gameTitle}>{title}</h3>

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

  if (url) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className={styles.gameCardLink}>
        {card}
      </a>
    );
  }

  return card;
};

export default GameCard;
