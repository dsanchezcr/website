import React from 'react';
import styles from './styles.module.css';
import CATEGORIES from './categories';

const getLocalized = (field, locale) => {
  if (!field) return '';
  if (typeof field === 'string') return field;
  return field[locale] || field.en || '';
};

const ParkItemCard = ({ item, locale = 'en' }) => {
  const category = CATEGORIES[item.category] || {};
  const name = getLocalized(item.name, locale);
  const review = getLocalized(item.review, locale);
  const tips = getLocalized(item.tips, locale);

  return (
    <div className={styles.itemCard} style={{ borderLeftColor: category.color }}>
      <div className={styles.itemHeader}>
        <span className={styles.itemEmoji}>{category.emoji}</span>
        <h4 className={styles.itemName}>
          {item.url ? (
            <a href={item.url} target="_blank" rel="noopener noreferrer">{name}</a>
          ) : name}
        </h4>
        {item.mustDo && <span className={styles.mustDoBadge}>⭐ Must Do</span>}
        {item.order != null && <span className={styles.orderBadge}>#{item.order}</span>}
      </div>
      {item.rating != null && (
        <div className={styles.ratingStars}>
          {'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}
        </div>
      )}
      {review && <p className={styles.itemReview}>💬 <em>{review}</em></p>}
      {tips && <p className={styles.itemTips}>💡 {tips}</p>}
    </div>
  );
};

export default ParkItemCard;
