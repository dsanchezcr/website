import React from 'react';
import clsx from 'clsx';
import Layout from '@theme/Layout';
import BlogSidebar from '@theme/BlogSidebar';
import { useLocation } from '@docusaurus/router';

export default function BlogLayout(props) {
  const { sidebar, toc, children, ...layoutProps } = props;
  const location = useLocation();
  
  // Check if we're on an individual blog post page (not the listing page)
  // Blog listing pages are typically /blog, /blog/page/2, /blog/tags/*, /blog/archive
  const isListingSegment = (path) => {
    const segments = path.split('/').filter(Boolean);
    return segments.includes('page') || 
           segments.includes('tags') || 
           segments.includes('archive') || 
           segments.includes('authors');
  };

  const isPostPage = location.pathname.startsWith('/blog/') && 
    !isListingSegment(location.pathname) &&
    location.pathname !== '/blog/' &&
    location.pathname !== '/blog';
  
  // Also check for localized paths - exclude exact blog listing pages
  const isLocalizedPostPage = (
    location.pathname.startsWith('/es/blog/') || 
    location.pathname.startsWith('/pt/blog/')
  ) && 
    !isListingSegment(location.pathname) &&
    !['/es/blog/', '/es/blog', '/pt/blog/', '/pt/blog'].includes(location.pathname);

  const shouldHideSidebar = isPostPage || isLocalizedPostPage;
  const hasSidebar = sidebar && sidebar.items && sidebar.items.length > 0 && !shouldHideSidebar;

  return (
    <Layout {...layoutProps}>
      <div className="container margin-vert--lg">
        <div className="row">
          <BlogSidebar sidebar={hasSidebar ? sidebar : { items: [] }} />
          <main
            className={clsx('col', {
              'col--7': hasSidebar,
              'col--9 col--offset-1': !hasSidebar,
            })}
            itemScope
            itemType="https://schema.org/Blog">
            {children}
          </main>
          {toc && <div className="col col--2">{toc}</div>}
        </div>
      </div>
    </Layout>
  );
}
