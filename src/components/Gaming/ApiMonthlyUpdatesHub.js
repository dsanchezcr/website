import React, { useState, useEffect, useRef, useCallback } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { config } from '@site/src/config/environment';
import ApiMonthlyReleases from './ApiMonthlyReleases';
import Comments from '@site/src/components/Comments';

const MONTH_NAMES = {
  en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
  es: ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
  pt: ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'],
};

const MONTH_SLUGS = ['january','february','march','april','may','june','july','august','september','october','november','december'];

const SECTION_LABELS = {
  en: { upcoming: 'Upcoming Releases', playing: "What I'm Playing" },
  es: { upcoming: 'Próximos Lanzamientos', playing: 'Lo Que Estoy Jugando' },
  pt: { upcoming: 'Próximos Lançamentos', playing: 'O Que Estou Jogando' },
};

function formatMonth(monthKey, locale) {
  const [year, m] = monthKey.split('-');
  const monthIndex = parseInt(m, 10) - 1;
  const names = MONTH_NAMES[locale] || MONTH_NAMES.en;
  return `${names[monthIndex]} ${year}`;
}

function monthKeyToSlug(monthKey) {
  const [year, m] = monthKey.split('-');
  const monthIndex = parseInt(m, 10) - 1;
  return `${MONTH_SLUGS[monthIndex]}-${year}`;
}

function slugToMonthKey(slug) {
  for (let i = 0; i < MONTH_SLUGS.length; i++) {
    if (slug.startsWith(MONTH_SLUGS[i] + '-')) {
      const year = slug.slice(MONTH_SLUGS[i].length + 1);
      return `${year}-${String(i + 1).padStart(2, '0')}`;
    }
  }
  return null;
}

const localizeValue = (value, localeKey) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  return value[localeKey] || value.en || value.es || value.pt || '';
};

const ApiMonthlyUpdatesHub = () => {
  return (
    <BrowserOnly fallback={<div style={{ textAlign: 'center', padding: '2rem', color: 'var(--ifm-font-color-secondary)' }}>Loading monthly updates...</div>}>
      {() => <HubInner />}
    </BrowserOnly>
  );
};

const HubInner = () => {
  const { i18n } = useDocusaurusContext();
  const locale = i18n?.currentLocale?.split('-')[0] || 'en';
  const [months, setMonths] = useState([]);
  const [monthData, setMonthData] = useState({});
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scrollTarget, setScrollTarget] = useState(null);
  const sectionRefs = useRef({});

  // Resolve the target month from URL hash (e.g. #april-2026 → 2026-04)
  const getHashMonth = useCallback(() => {
    const hash = window.location.hash.replace('#', '');
    return hash ? slugToMonthKey(hash) : null;
  }, []);

  // Fetch list of months
  useEffect(() => {
    const controller = new AbortController();
    const fetchMonths = async () => {
      setLoading(true);
      setError(null);
      try {
        const apiEndpoint = config.getApiEndpoint();
        const url = `${apiEndpoint}${config.routes.contentMonthlyUpdates}`;
        const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: controller.signal });
        if (!res.ok) throw new Error(`Failed to load months (${res.status})`);
        const data = await res.json();
        setMonths(data);

        // If URL has a hash like #april-2026, expand that month; otherwise expand newest
        const hashMonth = getHashMonth();
        if (hashMonth && data.includes(hashMonth)) {
          setExpanded({ [hashMonth]: true });
          setScrollTarget(hashMonth);
        } else if (data.length > 0) {
          setExpanded({ [data[0]]: true });
        }
      } catch (err) {
        if (err.name !== 'AbortError') setError(err.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    fetchMonths();
    return () => controller.abort();
  }, []);

  // Fetch data for each expanded month
  useEffect(() => {
    const controller = new AbortController();
    const expandedMonths = Object.entries(expanded).filter(([, v]) => v).map(([k]) => k);
    const toFetch = expandedMonths.filter(m => !monthData[m]);

    if (toFetch.length === 0) return;

    const fetchAll = async () => {
      const apiEndpoint = config.getApiEndpoint();
      const results = {};
      await Promise.all(toFetch.map(async (m) => {
        try {
          const url = `${apiEndpoint}${config.routes.contentMonthlyUpdates}?month=${encodeURIComponent(m)}`;
          const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: controller.signal });
          if (res.ok) results[m] = await res.json();
        } catch { /* ignore aborts */ }
      }));
      if (!controller.signal.aborted) {
        setMonthData(prev => ({ ...prev, ...results }));
      }
    };
    fetchAll();
    return () => controller.abort();
  }, [expanded, monthData]);

  // Scroll to target month once its data is loaded
  useEffect(() => {
    if (scrollTarget && monthData[scrollTarget] && sectionRefs.current[scrollTarget]) {
      sectionRefs.current[scrollTarget].scrollIntoView({ behavior: 'smooth', block: 'start' });
      setScrollTarget(null);
    }
  }, [scrollTarget, monthData]);

  const toggleMonth = (monthKey) => {
    setExpanded(prev => {
      const next = { ...prev, [monthKey]: !prev[monthKey] };
      // Update URL hash for shareability
      if (next[monthKey]) {
        window.history.replaceState(null, '', `#${monthKeyToSlug(monthKey)}`);
      } else {
        window.history.replaceState(null, '', window.location.pathname);
      }
      return next;
    });
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--ifm-font-color-secondary)' }}>Loading monthly updates...</div>;
  }
  if (error) {
    return <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--ifm-color-danger)' }}>Error: {error}</div>;
  }
  if (months.length === 0) {
    return <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--ifm-font-color-secondary)' }}>No monthly updates available yet.</div>;
  }

  const labels = SECTION_LABELS[locale] || SECTION_LABELS.en;

  return (
    <div>
      {months.map((monthKey) => {
        const isExpanded = expanded[monthKey] || false;
        const data = monthData[monthKey] || [];
        const meta = data.find(d => d.category === 'meta');
        const heroImage = meta?.heroImageUrl;
        const introText = meta ? localizeValue(meta.introText, locale) : null;
        const upcomingItems = data.filter(d => d.category === 'upcoming');
        const playingItems = data.filter(d => d.category === 'playing');
        const title = formatMonth(monthKey, locale);
        const slug = monthKeyToSlug(monthKey);

        return (
          <div key={monthKey} id={slug} ref={el => sectionRefs.current[monthKey] = el} style={{ marginBottom: '2rem', border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: '8px', overflow: 'hidden' }}>
            <button
              onClick={() => toggleMonth(monthKey)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '1rem 1.5rem', background: 'var(--ifm-color-emphasis-100)', border: 'none',
                cursor: 'pointer', fontSize: '1.25rem', fontWeight: 700,
                color: 'var(--ifm-font-color-base)', textAlign: 'left',
              }}
            >
              <span>🎮 {title}</span>
              <span style={{ fontSize: '1rem', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
            </button>

            {isExpanded && (
              <div style={{ padding: '1.5rem' }}>
                {heroImage && (
                  <img src={heroImage} alt={title} style={{ width: '100%', borderRadius: '8px', marginBottom: '1rem' }} loading="lazy" />
                )}
                {introText && <p>{introText}</p>}

                {upcomingItems.length > 0 && (
                  <>
                    <h2>{labels.upcoming}</h2>
                    <ApiMonthlyReleases month={monthKey} category="upcoming" />
                  </>
                )}

                {playingItems.length > 0 && (
                  <>
                    <h2>{labels.playing}</h2>
                    <ApiMonthlyReleases month={monthKey} category="playing" />
                  </>
                )}

                <hr />
                <Comments />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ApiMonthlyUpdatesHub;
