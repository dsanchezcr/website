import React, { useState, useEffect } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import { config } from '@site/src/config/environment';
import MediaCardList from './MediaCardList';

/**
 * API-driven wrapper for MediaCardList.
 * Fetches movie/series data from Cosmos DB via the content API at runtime,
 * replacing the previous pattern of importing static JSON at build time.
 */
const ApiMediaCardList = ({ contentType, category }) => {
  return (
    <BrowserOnly fallback={<div style={{ textAlign: 'center', padding: '2rem', color: 'var(--ifm-font-color-secondary)' }}>Loading content...</div>}>
      {() => <ApiMediaCardListInner contentType={contentType} category={category} />}
    </BrowserOnly>
  );
};

const ApiMediaCardListInner = ({ contentType, category }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const apiEndpoint = config.getApiEndpoint();
        const route = contentType === 'series' ? config.routes.contentSeries : config.routes.contentMovies;
        const url = category
          ? `${apiEndpoint}${route}?category=${encodeURIComponent(category)}`
          : `${apiEndpoint}${route}`;

        const response = await fetch(url, { headers: { Accept: 'application/json' } });

        if (!response.ok) {
          throw new Error(`Failed to load content (${response.status})`);
        }

        const data = await response.json();
        setItems(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [contentType, category]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--ifm-font-color-secondary)' }}>Loading content...</div>;
  }

  if (error) {
    return <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--ifm-color-danger)' }}>Error: {error}</div>;
  }

  return <MediaCardList items={items} category={category} />;
};

export default ApiMediaCardList;
