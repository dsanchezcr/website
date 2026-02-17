import React, { useState, useEffect, useCallback } from 'react';
import styles from './styles.module.css';
import { config } from '../../config/environment';

const PlayStationProfileWidget = () => {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const apiEndpoint = config.getApiEndpoint();
      const response = await fetch(`${apiEndpoint}${config.routes.playstationProfile}`);

      if (!response.ok) {
        throw new Error(`Failed to load PlayStation profile (${response.status})`);
      }

      const data = await response.json();
      setProfile(data);
    } catch (err) {
      console.error('Error fetching PlayStation profile:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (isLoading) {
    return (
      <div className={styles.profileWidget}>
        <div className={styles.profileLoading}>
          <div className={styles.profileSpinner} />
          <p>Loading PlayStation profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.profileWidget}>
        <div className={styles.profileError}>
          <p>⚠️ Unable to load PlayStation profile data.</p>
          <button className="button button--primary button--sm" onClick={fetchProfile}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className={styles.profileWidget}>
      {/* Header */}
      <div className={`${styles.profileHeader} ${styles.playstation}`}>
        {profile.avatarUrl && (
          <img
            src={profile.avatarUrl}
            alt={profile.onlineId || 'PSN Profile'}
            className={styles.profileAvatar}
          />
        )}
        <div className={styles.profileInfo}>
          <h3>{profile.onlineId || 'PSN Profile'}</h3>
          <p>PlayStation Network</p>
        </div>
      </div>

      {/* Trophy Summary */}
      {profile.trophySummary && (
        <div className={styles.trophyRow}>
          <div className={styles.trophyItem}>
            <span className={styles.trophyIcon}>🏆</span>
            <span>{profile.trophySummary.platinum || 0}</span>
          </div>
          <div className={styles.trophyItem}>
            <span className={styles.trophyIcon}>🥇</span>
            <span>{profile.trophySummary.gold || 0}</span>
          </div>
          <div className={styles.trophyItem}>
            <span className={styles.trophyIcon}>🥈</span>
            <span>{profile.trophySummary.silver || 0}</span>
          </div>
          <div className={styles.trophyItem}>
            <span className={styles.trophyIcon}>🥉</span>
            <span>{profile.trophySummary.bronze || 0}</span>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className={styles.profileStats}>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{profile.trophyLevel || '—'}</span>
          <span className={styles.statLabel}>Trophy Level</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{profile.gamesPlayed || '—'}</span>
          <span className={styles.statLabel}>Games Played</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statValue}>
            {profile.trophySummary
              ? (profile.trophySummary.platinum + profile.trophySummary.gold +
                 profile.trophySummary.silver + profile.trophySummary.bronze).toLocaleString()
              : '—'}
          </span>
          <span className={styles.statLabel}>Total Trophies</span>
        </div>
      </div>

      {/* Recently Played Games */}
      {profile.recentGames && profile.recentGames.length > 0 && (
        <div className={styles.profileGames}>
          <h4>🎮 Recently Played</h4>
          <div className={styles.gamesGrid}>
            {profile.recentGames.map((game, index) => {
              const storeUrl = `https://store.playstation.com/search/${encodeURIComponent(game.name)}`;
              return (
                <a
                  key={index}
                  href={storeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.recentGameLink}
                  title={game.name}
                >
                  <div className={styles.recentGameCard}>
                    {game.imageUrl && (
                      <img
                        src={game.imageUrl}
                        alt={game.name}
                        className={styles.recentGameImage}
                        loading="lazy"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}
                    <div className={styles.recentGameTitle} title={game.name}>
                      {game.name}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Cache notice */}
      {profile.lastUpdated && (
        <div className={styles.profileCacheNotice}>
          Last updated: {new Date(profile.lastUpdated).toLocaleDateString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
          })}
          {profile.isCached && ' (cached)'}
        </div>
      )}
    </div>
  );
};

export default PlayStationProfileWidget;
