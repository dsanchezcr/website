import React from 'react';
import Link from '@docusaurus/Link';
import GitHubStats from '@site/src/components/GitHubStats';
import styles from './ProjectCard.module.css';

export default function ProjectCard({ title, description, link, repo, image, tags, archived }) {
  return (
    <Link to={link} className={styles.card}>
      {image && (
        <div className={styles.imageWrapper}>
          <img src={image} alt={title} className={styles.image} loading="lazy" />
          {archived && (
            <span className={styles.archivedBadge}>📦 Archived</span>
          )}
        </div>
      )}
      <div className={styles.content}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.description}>{description}</p>
        {tags && (
          <div className={styles.tags}>
            {tags.map((tag, i) => (
              <span key={i} className={styles.tag}>{tag}</span>
            ))}
          </div>
        )}
        {repo && (
          <div className={styles.stats}>
            <GitHubStats repo={repo} />
          </div>
        )}
      </div>
    </Link>
  );
}

export function ProjectCardGrid({ children }) {
  return <div className={styles.grid}>{children}</div>;
}
