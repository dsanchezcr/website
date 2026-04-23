import React from 'react';
import OriginalLayout from '@theme-original/Layout';
import NLWebChat from '@site/src/components/NLWebChat';
import NewsletterSubscribe from '@site/src/components/NewsletterSubscribe';
import ErrorBoundary from '@site/src/components/ErrorBoundary';
import './Layout.css';

export default function Layout(props) {
  return (
    <>
      {/* Skip link for keyboard accessibility */}
      <a href="#__docusaurus_skipToContent__" className="skip-to-content">
        Skip to main content
      </a>
      <OriginalLayout {...props} />
      <ErrorBoundary>
        <NewsletterSubscribe />
      </ErrorBoundary>
      {/* Feature flag check is done inside NLWebChat for consistency with other widgets */}
      <ErrorBoundary>
        <NLWebChat />
      </ErrorBoundary>
    </>
  );
}