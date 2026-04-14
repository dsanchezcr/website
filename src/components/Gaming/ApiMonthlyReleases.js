import React, { useState, useEffect, useMemo } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { config } from '@site/src/config/environment';

// localizeValue resolves locale-specific text from objects like {en, es, pt}
const ApiMonthlyReleases = ({ month, category }) => {
  return (
    <BrowserOnly fallback={<div style={{ textAlign: 'center', padding: '2rem', color: 'var(--ifm-font-color-secondary)' }}>Loading releases...</div>}>
      {() => <ApiMonthlyReleasesInner month={month} category={category} />}
    </BrowserOnly>
  );
};

const localizeValue = (value, localeKey) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }
  return value[localeKey] || value.en || value.es || value.pt || Object.values(value).find((v) => typeof v === 'string') || '';
};

const ApiMonthlyReleasesInner = ({ month, category }) => {
  const { i18n } = useDocusaurusContext();
  const localeKey = i18n?.currentLocale || 'en';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const apiEndpoint = config.getApiEndpoint();
        const url = `${apiEndpoint}${config.routes.contentMonthlyUpdates}?month=${encodeURIComponent(month)}`;

        const response = await fetch(url, { headers: { Accept: 'application/json' }, signal: controller.signal });

        if (!response.ok) {
          throw new Error(`Failed to load monthly updates (${response.status})`);
        }

        const data = await response.json();
        setItems(data);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => controller.abort();
  }, [month]);

  const filteredItems = useMemo(
    () => (category ? items.filter(item => item.category === category) : items),
    [items, category]
  );

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--ifm-font-color-secondary)' }}>Loading releases...</div>;
  }

  if (error) {
    return <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--ifm-color-danger)' }}>Error: {error}</div>;
  }

  if (filteredItems.length === 0) {
    return null;
  }

  const upcomingItems = filteredItems.filter(item => item.category === 'upcoming');
  const playingItems = filteredItems.filter(item => item.category === 'playing');

  return (
    <div>
      {upcomingItems.length > 0 && (
        <>
          {upcomingItems.map((item) => {
            const title = localizeValue(item.title, localeKey);
            const description = localizeValue(item.description, localeKey);
            const youtubeTitle = localizeValue(item.youtubeTitle, localeKey);

            return (
              <div key={item.id} style={{ marginBottom: '2rem' }}>
                <h3>{title}{item.releaseDate ? ` — ${item.releaseDate}` : ''}</h3>
                {description && <p>{description}{item.platforms ? ` ${item.platforms}` : ''}</p>}
                {item.youtubeVideoId && (
                  <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', maxWidth: '100%', marginTop: '1rem' }}>
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${item.youtubeVideoId}`}
                      title={youtubeTitle || title}
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      loading="lazy"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
      {playingItems.length > 0 && (
        <>
          <ul>
            {playingItems.map((item) => {
              const title = localizeValue(item.title, localeKey);
              const description = localizeValue(item.description, localeKey);
              return (
                <li key={item.id}>
                  <strong>{title}</strong>{description ? ` — ${description}` : ''}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
};

export default ApiMonthlyReleases;
