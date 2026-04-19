import React from 'react';
import EasterEggManager from '@site/src/components/EasterEggs/EasterEggManager';
import ErrorBoundary from '@site/src/components/ErrorBoundary';

export default function Root({ children }) {
  return (
    <>
      {children}
      <ErrorBoundary>
        <EasterEggManager />
      </ErrorBoundary>
    </>
  );
}
