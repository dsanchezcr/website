import React, { useState, useEffect, useCallback } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './styles.module.css';

const CHESS_USERNAME = 'dsanchezcr';
const PROFILE_URL = `https://api.chess.com/pub/player/${CHESS_USERNAME}`;
const STATS_URL = `https://api.chess.com/pub/player/${CHESS_USERNAME}/stats`;

const labelsByLocale = {
  en: {
    loading: 'Loading Chess.com profile...',
    error: '⚠️ Unable to load Chess.com profile data.',
    tryAgain: 'Try Again',
    memberSince: 'Member since',
    league: 'League',
    gamesPlayed: 'Games Played',
    wins: 'Wins',
    winRate: 'Win Rate',
    bestTactics: 'Best Tactics',
    gameModes: '♟️ Game Modes',
    rapid: 'Rapid',
    blitz: 'Blitz',
    daily: 'Daily',
    best: 'Best',
    viewProfile: 'View full profile on Chess.com ↗',
  },
  es: {
    loading: 'Cargando perfil de Chess.com...',
    error: '⚠️ No se pudo cargar el perfil de Chess.com.',
    tryAgain: 'Intentar de nuevo',
    memberSince: 'Miembro desde',
    league: 'Liga',
    gamesPlayed: 'Partidas Jugadas',
    wins: 'Victorias',
    winRate: 'Tasa de Victoria',
    bestTactics: 'Mejor Táctica',
    gameModes: '♟️ Modos de Juego',
    rapid: 'Rápida',
    blitz: 'Blitz',
    daily: 'Diaria',
    best: 'Mejor',
    viewProfile: 'Ver perfil completo en Chess.com ↗',
  },
  pt: {
    loading: 'Carregando perfil do Chess.com...',
    error: '⚠️ Não foi possível carregar o perfil do Chess.com.',
    tryAgain: 'Tentar novamente',
    memberSince: 'Membro desde',
    league: 'Liga',
    gamesPlayed: 'Partidas Jogadas',
    wins: 'Vitórias',
    winRate: 'Taxa de Vitória',
    bestTactics: 'Melhor Tática',
    gameModes: '♟️ Modos de Jogo',
    rapid: 'Rápida',
    blitz: 'Blitz',
    daily: 'Diária',
    best: 'Melhor',
    viewProfile: 'Ver perfil completo no Chess.com ↗',
  },
};

const getLocaleKey = (locale) => {
  if (!locale) return 'en';
  if (locale.startsWith('es')) return 'es';
  if (locale.startsWith('pt')) return 'pt';
  return 'en';
};

const ChessProfileWidget = () => {
  const { i18n } = useDocusaurusContext();
  const labels = labelsByLocale[getLocaleKey(i18n?.currentLocale)] || labelsByLocale.en;
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [profileRes, statsRes] = await Promise.all([
        fetch(PROFILE_URL),
        fetch(STATS_URL),
      ]);

      if (!profileRes.ok || !statsRes.ok) {
        throw new Error('Failed to load Chess.com profile');
      }

      const profileData = await profileRes.json();
      const statsData = await statsRes.json();
      setProfile(profileData);
      setStats(statsData);
    } catch (err) {
      console.error('Error fetching Chess.com profile:', err);
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
          <p>{labels.loading}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.profileWidget}>
        <div className={styles.profileError}>
          <p>{labels.error}</p>
          <button className="button button--primary button--sm" onClick={fetchProfile}>
            {labels.tryAgain}
          </button>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const totalGames = (mode) => {
    if (!mode) return 0;
    return (mode.record?.win || 0) + (mode.record?.loss || 0) + (mode.record?.draw || 0);
  };

  const winRate = (mode) => {
    if (!mode) return '—';
    const total = totalGames(mode);
    if (total === 0) return '—';
    return `${Math.round((mode.record.win / total) * 100)}%`;
  };

  const rapid = stats?.chess_rapid;
  const blitz = stats?.chess_blitz;
  const daily = stats?.chess_daily;
  const tactics = stats?.tactics;

  const allGames = totalGames(rapid) + totalGames(blitz) + totalGames(daily);
  const allWins = (rapid?.record?.win || 0) + (blitz?.record?.win || 0) + (daily?.record?.win || 0);

  const joinedDate = profile.joined
    ? new Date(profile.joined * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })
    : null;

  return (
    <div className={styles.profileWidget}>
      {/* Header */}
      <div className={`${styles.profileHeader} ${styles.chess}`}>
        {profile.avatar && (
          <img
            src={profile.avatar}
            alt={profile.username}
            className={styles.profileAvatar}
          />
        )}
        <div className={styles.profileInfo}>
          <h3>{profile.name || profile.username}</h3>
          <p>
            Chess.com{profile.league ? ` · ${profile.league} ${labels.league}` : ''}
            {joinedDate ? ` · ${labels.memberSince} ${joinedDate}` : ''}
          </p>
        </div>
      </div>

      {/* Overall Stats */}
      <div className={styles.profileStats}>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{allGames.toLocaleString()}</span>
          <span className={styles.statLabel}>{labels.gamesPlayed}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{allWins.toLocaleString()}</span>
          <span className={styles.statLabel}>{labels.wins}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statValue}>
            {allGames > 0 ? `${Math.round((allWins / allGames) * 100)}%` : '—'}
          </span>
          <span className={styles.statLabel}>{labels.winRate}</span>
        </div>
        {tactics?.highest?.rating && (
          <div className={styles.statItem}>
            <span className={styles.statValue}>{tactics.highest.rating}</span>
            <span className={styles.statLabel}>{labels.bestTactics}</span>
          </div>
        )}
      </div>

      {/* Game Modes */}
      <div className={styles.chessModesSection}>
        <h4>{labels.gameModes}</h4>
        <div className={styles.chessModesGrid}>
          {rapid && (
            <div className={styles.chessModeCard}>
              <div className={styles.chessModeIcon}>⏱️</div>
              <div className={styles.chessModeTitle}>{labels.rapid}</div>
              <div className={styles.chessModeRating}>{rapid.last?.rating || '—'}</div>
              <div className={styles.chessModeDetail}>{labels.best}: {rapid.best?.rating || '—'}</div>
              <div className={styles.chessModeDetail}>
                {rapid.record?.win}W / {rapid.record?.loss}L / {rapid.record?.draw}D
              </div>
              <div className={styles.chessModeDetail}>{labels.winRate}: {winRate(rapid)}</div>
            </div>
          )}
          {blitz && (
            <div className={styles.chessModeCard}>
              <div className={styles.chessModeIcon}>⚡</div>
              <div className={styles.chessModeTitle}>{labels.blitz}</div>
              <div className={styles.chessModeRating}>{blitz.last?.rating || '—'}</div>
              <div className={styles.chessModeDetail}>{labels.best}: {blitz.best?.rating || '—'}</div>
              <div className={styles.chessModeDetail}>
                {blitz.record?.win}W / {blitz.record?.loss}L / {blitz.record?.draw}D
              </div>
              <div className={styles.chessModeDetail}>{labels.winRate}: {winRate(blitz)}</div>
            </div>
          )}
          {daily && (
            <div className={styles.chessModeCard}>
              <div className={styles.chessModeIcon}>📬</div>
              <div className={styles.chessModeTitle}>{labels.daily}</div>
              <div className={styles.chessModeRating}>{daily.last?.rating || '—'}</div>
              <div className={styles.chessModeDetail}>{labels.best}: {daily.best?.rating || '—'}</div>
              <div className={styles.chessModeDetail}>
                {daily.record?.win}W / {daily.record?.loss}L / {daily.record?.draw}D
              </div>
              <div className={styles.chessModeDetail}>{labels.winRate}: {winRate(daily)}</div>
            </div>
          )}
        </div>
      </div>

      {/* Profile Link */}
      <div className={styles.profileCacheNotice}>
        <a href={`https://www.chess.com/member/${CHESS_USERNAME}`} target="_blank" rel="noopener noreferrer">
          {labels.viewProfile}
        </a>
      </div>
    </div>
  );
};

export default ChessProfileWidget;
