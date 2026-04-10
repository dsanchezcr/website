import React from 'react';
import styles from './CareerTimeline.module.css';

export default function CareerTimeline({ items }) {
  return (
    <div className={styles.timeline}>
      {items.map((item, index) => (
        <div
          key={index}
          className={styles.item}
          data-aos="fade-up"
          data-aos-delay={index * 80}
        >
          <div className={styles.marker}>
            <span className={styles.icon} aria-hidden="true">{item.icon}</span>
          </div>
          <div className={styles.content}>
            <span className={styles.year}>{item.year}</span>
            <h3 className={styles.title}>{item.title}</h3>
            {item.location && (
              <span className={styles.location}>📍 {item.location}</span>
            )}
            <p className={styles.description}>{item.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
