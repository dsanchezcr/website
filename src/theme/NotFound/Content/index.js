import React, { useEffect, useState } from 'react';
import { useLocation } from '@docusaurus/router';
import Head from '@docusaurus/Head';
import { useLocale } from '@site/src/hooks/useLocale';
import NotFoundGame from '@site/src/components/NotFoundGame';

export default function NotFoundContent() {
  const locale = useLocale();
  const { pathname } = useLocation();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  // SWA serves the root 404 document even for missing locale-prefixed URLs.
  const pathLocale = hydrated ? /^\/(es|pt)(?:\/|$)/.exec(pathname)?.[1] : null;
  return (
    <>
      <Head><meta name="robots" content="noindex, follow" /></Head>
      <NotFoundGame locale={pathLocale || locale} />
    </>
  );
}
