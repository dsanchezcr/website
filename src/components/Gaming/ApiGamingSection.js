import React, { useState, useEffect, useMemo } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import { config } from '@site/src/config/environment';
import GamingEntriesRenderer from './GamingEntriesRenderer';

/**
 * API-driven wrapper for GamingEntriesRenderer.
 * Fetches gaming data from Cosmos DB via the content API at runtime,
 * replacing the previous pattern of importing static JSON at build time.
 *
 * Props:
 *  - platform: e.g. "xbox", "playstation"
 *  - section: optional section key (e.g. "topGames", "anticipated")
 *  - filter: optional client-side filter function applied to the items array
 */
const ApiGamingSection = ({ platform, section, filter }) => {
  return (
    <BrowserOnly fallback={<div style={{ textAlign: 'center', padding: '2rem', color: 'var(--ifm-font-color-secondary)' }}>Loading games...</div>}>
      {() => <ApiGamingSectionInner platform={platform} section={section} filter={filter} />}
    </BrowserOnly>
  );
};

const ApiGamingSectionInner = ({ platform, section, filter }) => {
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
        let url = `${apiEndpoint}${config.routes.contentGaming}?platform=${encodeURIComponent(platform)}`;
        if (section) {
          url += `&section=${encodeURIComponent(section)}`;
        }

        const response = await fetch(url, { headers: { Accept: 'application/json' }, signal: controller.signal });

        if (!response.ok) {
          throw new Error(`Failed to load gaming content (${response.status})`);
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
  }, [platform, section]);

  const filteredItems = useMemo(
    () => (typeof filter === 'function' ? items.filter(filter) : items),
    [items, filter]
  );

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--ifm-font-color-secondary)' }}>Loading games...</div>;
  }

  if (error) {
    return <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--ifm-color-danger)' }}>Error: {error}</div>;
  }

  return <GamingEntriesRenderer items={filteredItems} />;
};

export default ApiGamingSection;
