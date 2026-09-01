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

const MONTH_NAME_TO_INDEX = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};

/**
 * Parses a free-form releaseDate string (e.g. "August 12", "TBA", "Q1 2027")
 * combined with the item's month partition (e.g. "2026-08") into a sortable
 * timestamp. Returns Number.POSITIVE_INFINITY when the date can't be parsed,
 * so unparsable items sort to the end instead of disrupting known dates.
 */
const parseReleaseDateForSort = (releaseDate, month) => {
  if (typeof releaseDate !== 'string' || releaseDate.trim().length === 0) {
    return Number.POSITIVE_INFINITY;
  }

  const [yearPart] = (month || '').split('-');
  const year = parseInt(yearPart, 10);

  const match = releaseDate.match(/([A-Za-z]+)\s+(\d{1,2})/);
  if (match) {
    const monthIndex = MONTH_NAME_TO_INDEX[match[1].toLowerCase()];
    const day = parseInt(match[2], 10);
    if (monthIndex !== undefined && Number.isFinite(day) && Number.isFinite(year)) {
      return new Date(year, monthIndex, day).getTime();
    }
  }

  // Day-only fallback, e.g. "12th" or "12".
  const dayOnlyMatch = releaseDate.match(/^(\d{1,2})/);
  if (dayOnlyMatch && Number.isFinite(year)) {
    const [, monthPart] = (month || '').split('-');
    const monthIndex = parseInt(monthPart, 10) - 1;
    const day = parseInt(dayOnlyMatch[1], 10);
    if (Number.isFinite(monthIndex) && Number.isFinite(day)) {
      return new Date(year, monthIndex, day).getTime();
    }
  }

  return Number.POSITIVE_INFINITY;
};

export const sortByReleaseDateAscending = (items, month) =>
  items.slice().sort((a, b) => {
    const aTime = parseReleaseDateForSort(a.releaseDate, a.month || month);
    const bTime = parseReleaseDateForSort(b.releaseDate, b.month || month);
    if (aTime !== bTime) {
      return aTime - bTime;
    }
    // Stable fallback for equal/unparsable dates: preserve curated order.
    const aOrder = Number.isFinite(a.order) ? a.order : 0;
    const bOrder = Number.isFinite(b.order) ? b.order : 0;
    return bOrder - aOrder;
  });

const renderInlineBold = (value) => {
  if (typeof value !== 'string' || value.length === 0) {
    return value;
  }

  const parts = value.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  if (parts.length <= 1) {
    return value;
  }

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={`b-${index}`}>{part.slice(2, -2)}</strong>;
    }
    return <React.Fragment key={`t-${index}`}>{part}</React.Fragment>;
  });
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

  const upcomingItems = sortByReleaseDateAscending(filteredItems.filter(item => item.category === 'upcoming'), month);
  const eventItems = sortByReleaseDateAscending(filteredItems.filter(item => item.category === 'event'), month);
  const playingItems = filteredItems.filter(item => item.category === 'playing');

  return (
    <div>
      {upcomingItems.length > 0 && (
        <>
          {upcomingItems.map((item) => {
            const title = localizeValue(item.title, localeKey);
            const description = localizeValue(item.description, localeKey);
            const youtubeTitle = localizeValue(item.youtubeTitle, localeKey);
            const detailText = `${description || ''}${item.platforms ? ` ${item.platforms}` : ''}`.trim();

            return (
              <div key={item.id} style={{ marginBottom: '2rem' }}>
                <h3>{title}{item.releaseDate ? ` — ${item.releaseDate}` : ''}</h3>
                {detailText && <p>{renderInlineBold(detailText)}</p>}
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
      {eventItems.length > 0 && (
        <>
          {eventItems.map((item) => {
            const title = localizeValue(item.title, localeKey);
            const description = localizeValue(item.description, localeKey);
            const youtubeTitle = localizeValue(item.youtubeTitle, localeKey);
            const detailText = `${description || ''}${item.platforms ? ` ${item.platforms}` : ''}`.trim();

            return (
              <div key={item.id} style={{ marginBottom: '2rem' }}>
                <h3>{title}{item.releaseDate ? ` — ${item.releaseDate}` : ''}</h3>
                {detailText && <p>{renderInlineBold(detailText)}</p>}
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
