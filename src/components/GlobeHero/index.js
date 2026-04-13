import React from 'react';
import styles from './styles.module.css';

const GlobeHero = ({ image, title, subtitle, children }) => {
  return (
    <div className={styles.hero}>
      <div className={styles.heroImage}>
        <img src={image} alt={title} />
        <div className={styles.overlay} />
        <div className={styles.globeContainer}>
          <div className={styles.globe}>
            <div className={`${styles.ring} ${styles.ring1}`} />
            <div className={`${styles.ring} ${styles.ring2}`} />
            <div className={`${styles.ring} ${styles.ring3}`} />
            <div className={styles.equator} />
          </div>
        </div>
      </div>
      <div className={styles.heroContent}>
        <h1 className={styles.heroTitle}>{title}</h1>
        {subtitle && <p className={styles.heroSubtitle}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
};

export default GlobeHero;
