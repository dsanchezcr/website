import React from 'react';
import styles from './styles.module.css';

const getLocalizedReview = (review, locale) => {
  if (!review) return '';
  if (typeof review === 'string') return review;
  return review[locale] || review.en || '';
};

// Movie/series metadata (title, poster image, year, genres, IMDb rating) is
// sourced directly from Cosmos DB — no live IMDb API call is made, so the
// card renders correctly on the very first load with no cache required.
const MediaCard = ({ titleId, title, imageUrl, year, genres, imdbRating, myRating, review, locale = 'en' }) => {
  const displayTitle = title || titleId;
  const imdbUrl = `https://www.imdb.com/title/${titleId}/`;
  const localizedReview = getLocalizedReview(review, locale);

  const card = (
    <div className={styles.mediaCard}>
      <div className={styles.mediaCardContent}>
        <div className={styles.posterContainer}>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={displayTitle}
              className={styles.posterImage}
              loading="lazy"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            <div className={styles.posterPlaceholder} />
          )}
          <div className={styles.ratingBadges}>
            {imdbRating != null && (
              <span className={styles.imdbBadge}>⭐ {Number(imdbRating).toFixed(1)}</span>
            )}
            {myRating != null && (
              <span className={styles.myRatingBadge}>My: {myRating}/10</span>
            )}
          </div>
        </div>

        <div className={styles.mediaInfo}>
          <h3 className={styles.mediaTitle}>
            {displayTitle}{year ? ` (${year})` : ''}
          </h3>

          {localizedReview && (
            <p className={styles.review}>
              💬 <em>{localizedReview}</em>
            </p>
          )}

          {genres && genres.length > 0 && (
            <div className={styles.genreChips}>
              {genres.map(g => (
                <span key={g} className={styles.genreChip}>{g}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <a href={imdbUrl} target="_blank" rel="noopener noreferrer" className={styles.mediaCardLink}>
      {card}
    </a>
  );
};

export default MediaCard;
