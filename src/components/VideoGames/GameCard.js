import React from 'react';
import styles from './styles.module.css';

const platformColors = {
  xbox: '#107C10',
  playstation: '#003087',
  'nintendo-switch': '#E4000F',
  'meta-quest': '#1C1E20',
};

const platformLabels = {
  xbox: 'Xbox',
  playstation: 'PlayStation',
  'nintendo-switch': 'Nintendo Switch',
  'meta-quest': 'Meta Quest',
};

const statusLabels = {
  completed: '✅ Completed',
  playing: '🎮 Currently Playing',
  backlog: '📋 Backlog',
  dropped: '❌ Dropped',
};

const GameCard = ({ title, platform, rating, status, imageUrl, recommendation, hoursPlayed }) => {
  const stars = '⭐'.repeat(Math.min(Math.max(rating || 0, 0), 5));
  const emptyStars = '☆'.repeat(5 - Math.min(Math.max(rating || 0, 0), 5));

  return (
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

          <div className={styles.gameRating} title={`${rating}/5`}>
            <span className={styles.filledStars}>{stars}</span>
            <span className={styles.emptyStars}>{emptyStars}</span>
          </div>

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

export default GameCard;
