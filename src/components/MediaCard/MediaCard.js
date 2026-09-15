import React from 'react';
import styles from './styles.module.css';
import { mediaTranslations, resolveMediaText } from './mediaTranslations';

// Metadata comes only from stored Cosmos content. TMDB credentials and metadata
// requests never reach the browser. IMDb-only manual cards remain compatible.
const MediaCard = ({
  titleId, tmdbId, mediaType, title, titleTranslations, imageUrl, posterPath,
  year, genres, genresTranslations, overview, tmdbRating, imdbRating, myRating,
  review, locale = 'en',
}) => {
  const text = mediaTranslations[locale] || mediaTranslations.en;
  const isTmdb = Number.isInteger(tmdbId) && tmdbId > 0 && ['movie', 'tv'].includes(mediaType);
  const displayTitle = resolveMediaText(titleTranslations, locale) || title || titleId || text.untitled;
  const mediaUrl = isTmdb
    ? `https://www.themoviedb.org/${mediaType}/${tmdbId}`
    : (/^tt\d{6,12}$/.test(titleId || '') ? `https://www.imdb.com/title/${titleId}/` : null);
  const poster = isTmdb && /^\/[a-zA-Z0-9_-]+\.(jpg|png|webp)$/.test(posterPath || '')
    ? `https://image.tmdb.org/t/p/w500${posterPath}` : imageUrl;
  const localizedReview = resolveMediaText(review, locale);
  const localizedOverview = resolveMediaText(overview, locale);
  const displayGenres = genresTranslations?.[locale] || genresTranslations?.en || genres || [];
  const communityRating = isTmdb ? tmdbRating : imdbRating;

  const card = (
    <div className={styles.mediaCard}>
      <div className={styles.mediaCardContent}>
        <div className={styles.posterContainer}>
          {poster ? (
            <img
              src={poster}
              alt={displayTitle}
              className={styles.posterImage}
              loading="lazy"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            <div className={styles.posterPlaceholder} role="img" aria-label={text.noPoster} />
          )}
          <div className={styles.ratingBadges}>
            {communityRating != null && (
              <span className={styles.communityBadge}>{isTmdb ? 'TMDB ' : 'IMDb '}⭐ {Number(communityRating).toFixed(1)}</span>
            )}
            {myRating != null && (
              <span className={styles.myRatingBadge}>{text.myRating}: {myRating}/10</span>
            )}
          </div>
        </div>

        <div className={styles.mediaInfo}>
          <h3 className={styles.mediaTitle}>
            {displayTitle}{year ? ` (${year})` : ''}
          </h3>

          {localizedOverview && <p className={styles.overview}>{localizedOverview}</p>}

          {localizedReview && (
            <p className={styles.review}>
              💬 <em>{localizedReview}</em>
            </p>
          )}

          {displayGenres.length > 0 && (
            <div className={styles.genreChips}>
              {displayGenres.map(g => (
                <span key={g} className={styles.genreChip}>{g}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return mediaUrl ? (
    <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className={styles.mediaCardLink}>
      {card}
    </a>
  ) : card;
};

export default MediaCard;
