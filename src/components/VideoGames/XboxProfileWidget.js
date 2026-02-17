import React, { useState, useEffect, useCallback } from 'react';
import styles from './styles.module.css';
import { config } from '../../config/environment';

const XboxProfileWidget = () => {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const apiEndpoint = config.getApiEndpoint();
      const response = await fetch(`${apiEndpoint}${config.routes.xboxProfile}`);

      if (!response.ok) {
        throw new Error(`Failed to load Xbox profile (${response.status})`);
      }

      const data = await response.json();
      setProfile(data);
    } catch (err) {
      console.error('Error fetching Xbox profile:', err);
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
          <p>Loading Xbox profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.profileWidget}>
        <div className={styles.profileError}>
          <p>⚠️ Unable to load Xbox profile data.</p>
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
      <div className={`${styles.profileHeader} ${styles.xbox}`}>
        {profile.avatarUrl && (
          <img
            src={profile.avatarUrl}
            alt={profile.gamertag}
            className={styles.profileAvatar}
          />
        )}
        <div className={styles.profileInfo}>
          <h3>{profile.gamertag}</h3>
          <p>Xbox Live Profile</p>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.profileStats}>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{profile.gamerscore?.toLocaleString() || '—'}</span>
          <span className={styles.statLabel}>Gamerscore</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{profile.gamesPlayed || '—'}</span>
          <span className={styles.statLabel}>Games Played</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{profile.accountTier || '—'}</span>
          <span className={styles.statLabel}>Account Tier</span>
        </div>
      </div>

      {/* Recently Played Games */}
      {profile.recentGames && profile.recentGames.length > 0 && (
        <div className={styles.profileGames}>
          <h4>🎮 Recently Played</h4>
          <div className={styles.gamesGrid}>
            {profile.recentGames.map((game, index) => {
              const storeUrl = `https://www.xbox.com/en-US/search?q=${encodeURIComponent(game.name)}`;
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
        </div>
      )}
    </div>
  );
};

export default XboxProfileWidget;
