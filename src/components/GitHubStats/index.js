import React, { useState, useEffect } from 'react';
import styles from './GitHubStats.module.css';

const CACHE_KEY = 'gh_repo_stats';
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

function getCached(repo) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${CACHE_KEY}_${repo}`);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) return null;
    return data;
  } catch { return null; }
}

function setCache(repo, data) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${CACHE_KEY}_${repo}`, JSON.stringify({ data, ts: Date.now() }));
  } catch { /* localStorage full or unavailable */ }
}

export default function GitHubStats({ repo }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const cached = getCached(repo);
    if (cached) {
      setStats(cached);
      return;
    }

    fetch(`https://api.github.com/repos/${repo}`)
      .then((res) => {
        if (!res.ok) throw new Error('API error');
        return res.json();
      })
      .then((data) => {
        const result = {
          stars: data.stargazers_count,
          forks: data.forks_count,
          language: data.language,
          archived: data.archived,
        };
        setCache(repo, result);
        setStats(result);
      })
      .catch(() => {
        // Silently fail — badges just won't show
      });
  }, [repo]);

  if (!stats) return null;

  return (
    <span className={styles.statsContainer}>
      {stats.archived && (
        <span className={styles.archivedBadge} title="Archived">
          📦 Archived
        </span>
      )}
      {stats.stars > 0 && (
        <span className={styles.badge} title="GitHub Stars">
          ⭐ {stats.stars}
        </span>
      )}
      {stats.forks > 0 && (
        <span className={styles.badge} title="GitHub Forks">
          🍴 {stats.forks}
        </span>
      )}
      {stats.language && (
        <span className={styles.badge} title="Primary Language">
          {stats.language}
        </span>
      )}
    </span>
  );
}
