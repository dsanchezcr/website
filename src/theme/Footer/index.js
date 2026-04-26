import React from 'react';
import OriginalFooter from '@theme-original/Footer';
import NewsletterSubscribe from '@site/src/components/NewsletterSubscribe';
import ErrorBoundary from '@site/src/components/ErrorBoundary';

export default function Footer(props) {
  return (
    <>
      <ErrorBoundary>
        <NewsletterSubscribe />
      </ErrorBoundary>
      <OriginalFooter {...props} />
    </>
  );
}
