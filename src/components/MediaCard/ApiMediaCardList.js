import React, { useState, useEffect } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import { config } from '@site/src/config/environment';
import MediaCardList from './MediaCardList';
import { useLocale } from '@site/src/hooks';
import { mediaTranslations } from './mediaTranslations';

const VALID_CONTENT_TYPES = ['movies', 'series'];

/**
 * API-driven wrapper for MediaCardList.
 * Fetches movie/series data from Cosmos DB via the content API at runtime,
 * replacing the previous pattern of importing static JSON at build time.
 */
const ApiMediaCardList = ({ contentType, category }) => {
  const locale = useLocale();
  const text = mediaTranslations[locale] || mediaTranslations.en;
  if (!VALID_CONTENT_TYPES.includes(contentType)) {
    return <div role="alert">{text.invalidType}</div>;
  }
  return (
    <BrowserOnly fallback={<div role="status">{text.loading}</div>}>
      {() => <ApiMediaCardListInner contentType={contentType} category={category} text={text} />}
    </BrowserOnly>
  );
};

const ApiMediaCardListInner = ({ contentType, category, text }) => {
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
        const route = contentType === 'series' ? config.routes.contentSeries : config.routes.contentMovies;
        const url = category
          ? `${apiEndpoint}${route}?category=${encodeURIComponent(category)}`
          : `${apiEndpoint}${route}`;

        const response = await fetch(url, { headers: { Accept: 'application/json' }, signal: controller.signal });

        if (!response.ok) {
          throw new Error(`Failed to load content (${response.status})`);
        }

        const data = await response.json();
        if (!Array.isArray(data)) throw new Error('Invalid content response');
        if (!controller.signal.aborted) setItems(data);
      } catch (err) {
        if (!controller.signal.aborted && err.name !== 'AbortError') {
          setError(true);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => controller.abort();
  }, [contentType, category]);

  if (loading) {
    return <div role="status">{text.loading}</div>;
  }

  if (error) {
    return <div role="alert">{text.error}</div>;
  }

  return <MediaCardList items={items} category={category} contentType={contentType} />;
};

export default ApiMediaCardList;
