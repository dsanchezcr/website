import React from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './styles.module.css';
import { platformColors, platformLabels, statusLabelsByLocale, getLocaleKey } from './gameCardConstants';

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
