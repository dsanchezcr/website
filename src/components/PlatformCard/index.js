import React from 'react';
import Link from '@docusaurus/Link';
import styles from './PlatformCard.module.css';

export function PlatformCard({ name, description, image, icon, link, items }) {
  return (
    <Link to={link} className={styles.card}>
      <div className={styles.logoWrapper}>
        {image ? (
          <img src={image} alt={name} className={styles.logo} loading="lazy" />
        ) : (
          <span className={styles.iconFallback}>{icon}</span>
        )}
      </div>
      <div className={styles.content}>
        <h3 className={styles.name}>{name}</h3>
        <p className={styles.description}>{description}</p>
        {items && (
          <ul className={styles.items}>
            {items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        )}
      </div>
    </Link>
  );
}

export function PlatformGrid({ children }) {
  return <div className={styles.grid}>{children}</div>;
}
