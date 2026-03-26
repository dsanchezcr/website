import React from 'react';
import styles from './styles.module.css';

const getLocalizedReview = (review, locale) => {
  if (!review) return '';
  if (typeof review === 'string') return review;
  return review[locale] || review.en || '';
};

const MediaCard = ({ titleId, myRating, review, imdb, loading, error, locale = 'en' }) => {
  const title = imdb?.primaryTitle || titleId;
  const imageUrl = imdb?.primaryImage?.url;
  const imdbRating = imdb?.rating?.aggregateRating;
  const year = imdb?.startYear;
  const genres = imdb?.genres;
  const imdbUrl = `https://www.imdb.com/title/${titleId}/`;
  const localizedReview = getLocalizedReview(review, locale);

  const card = (
    <div className={styles.mediaCard}>
      <div className={styles.mediaCardContent}>
        <div className={styles.posterContainer}>
          {loading ? (
            <div className={styles.posterSkeleton} />
          ) : imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              className={styles.posterImage}
              loading="lazy"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            <div className={styles.posterPlaceholder} />
          )}
          <div className={styles.ratingBadges}>
            {imdbRating != null && (
              <span className={styles.imdbBadge}>⭐ {imdbRating.toFixed(1)}</span>
            )}
            {myRating != null && (
              <span className={styles.myRatingBadge}>My: {myRating}/10</span>
            )}
          </div>
        </div>

        <div className={styles.mediaInfo}>
          <h3 className={styles.mediaTitle}>
            {loading ? 'Loading...' : title}{year ? ` (${year})` : ''}
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

          {error && <p className={styles.errorText}>{error}</p>}
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
