import React from 'react';
import styles from './styles.module.css';

const TRAIL_SPARKLE_COUNT = 8;

const getTrailSparkleStyle = (i) => ({
  '--spark-delay': `${i * 0.15}s`,
  '--spark-size': `${2 + (i % 3)}px`,
});

const SparkleHero = ({ image, title, subtitle, children }) => {
  return (
    <div className={styles.hero}>
      <div className={styles.heroImage}>
        <img src={image} alt={title} />
        <div className={styles.overlay} />
        <div className={styles.sparkleField}>
          <div className={styles.arcPath}>
            <div className={styles.mainSparkle} />
          </div>
          {Array.from({ length: TRAIL_SPARKLE_COUNT }).map((_, i) => (
            <div key={i} className={styles.trailSparkle} style={getTrailSparkleStyle(i)} />
          ))}
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

export default SparkleHero;
