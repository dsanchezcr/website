import React from 'react';
import { mediaTranslations } from './mediaTranslations';
import styles from './styles.module.css';

// Approved, unmodified TMDB logo from https://www.themoviedb.org/about/logos-attribution.
const logo = 'https://www.themoviedb.org/assets/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg';

export default function TmdbAttribution({ locale = 'en' }) {
  const text = mediaTranslations[locale] || mediaTranslations.en;
  return (
    <section className={styles.attribution} aria-label={text.credits}>
      <h3>{text.credits}</h3>
      <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer">
        <img src={logo} alt="TMDB" width="154" height="20" loading="lazy" />
      </a>
      <p>{text.attribution}</p>
      {locale !== 'en' && <small lang="en">{mediaTranslations.en.attribution}</small>}
    </section>
  );
}
