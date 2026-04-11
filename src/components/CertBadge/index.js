import React from 'react';
import styles from './CertBadge.module.css';

export function CertBadge({ name, image, icon, type }) {
  const typeClass = type === 'expert' ? styles.expert
    : type === 'associate' ? styles.associate
    : type === 'trainer' ? styles.trainer
    : styles.applied;

  return (
    <div className={`${styles.badge} ${typeClass}`}>
      {image ? (
        <img src={image} alt={name} className={styles.badgeImage} />
      ) : (
        <span className={styles.icon}>{icon}</span>
      )}
      <span className={styles.name}>{name}</span>
    </div>
  );
}

export function CertGrid({ children }) {
  return <div className={styles.grid}>{children}</div>;
}
