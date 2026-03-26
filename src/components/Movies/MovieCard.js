import React from 'react';
import styles from './styles.module.css';

const MovieCard = ({
  title,
  theatre,
  theatreLabel,
  watchDateLabel,
  watchDateValue,
  watchTimeLabel,
  watchTimeValue,
  ratingLabel,
  ratingValue,
  ratingPendingLabel,
  review,
  reviewLabel,
  genresLabel,
  genres,
  posterUrl,
  externalUrl,
  format,
  formatLabel,
}) => {
  const card = (
    <div className={styles.movieCard}>
      <div className={styles.movieCardContent}>
        {posterUrl ? (
          <div className={styles.posterContainer}>
            <img
              src={posterUrl}
              alt={title}
              className={styles.posterImage}
              loading="lazy"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
        ) : (
          <div className={styles.posterPlaceholder} />
        )}

        <div className={styles.movieInfo}>
          <h3 className={styles.movieTitle}>{title}</h3>
          <div className={styles.metaGrid}>
            {theatre && (
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{theatreLabel}</span>
                <span className={styles.metaValue}>{theatre}</span>
              </div>
            )}
            {watchDateValue && (
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{watchDateLabel}</span>
                <span className={styles.metaValue}>{watchDateValue}</span>
              </div>
            )}
            {watchTimeValue && (
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{watchTimeLabel}</span>
                <span className={styles.metaValue}>{watchTimeValue}</span>
              </div>
            )}
            {format && (
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{formatLabel}</span>
                <span className={styles.metaValue}>{format}</span>
              </div>
            )}
          </div>

          <div className={styles.ratingRow}>
            <span className={styles.ratingLabel}>{ratingLabel}</span>
            {ratingValue === null || ratingValue === undefined ? (
              <span className={styles.ratingPending}>{ratingPendingLabel}</span>
            ) : (
              <span className={styles.ratingValue}>{ratingValue}/10</span>
            )}
          </div>

          {review && (
            <p className={styles.reviewText}>
              <span className={styles.reviewLabel}>{reviewLabel}</span> {review}
            </p>
          )}

          {genres && genres.length > 0 && (
            <div className={styles.genresRow}>
              <span className={styles.genresLabel}>{genresLabel}</span>
              <div className={styles.genreChips}>
                {genres.map((genre) => (
                  <span key={genre} className={styles.genreChip}>{genre}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (externalUrl) {
    return (
      <a href={externalUrl} target="_blank" rel="noopener noreferrer" className={styles.movieCardLink}>
        {card}
      </a>
    );
  }

  return card;
};

export default MovieCard;
