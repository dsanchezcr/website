import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';

function injectJsonLd(data) {
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(data);
  script.setAttribute('data-jsonld', 'true');
  document.head.appendChild(script);
}

function clearJsonLd() {
  document.querySelectorAll('script[data-jsonld]').forEach((el) => el.remove());
}

function getJsonLdForPage() {
  const path = window.location.pathname;
  const url = window.location.href;
  const title = document.title?.replace(/\s*[|–-]\s*David Sanchez.*$/, '').trim() || '';
  const description = document.querySelector('meta[name="description"]')?.content || '';
  const ogImage = document.querySelector('meta[property="og:image"]')?.content || '';

  // Person schema (always present as site owner)
  const person = {
    '@type': 'Person',
    name: 'David Sanchez',
    url: 'https://dsanchezcr.com',
    jobTitle: 'Director Go-To-Market Developer Audience',
    worksFor: { '@type': 'Organization', name: 'Microsoft' },
    sameAs: [
      'https://github.com/dsanchezcr',
      'https://linkedin.com/in/dsanchezcr',
      'https://twitter.com/dsanchezcr',
      'https://youtube.com/@dsanchezcr',
    ],
  };

  const normalizedPath = path.replace(/^\/(es|pt)(?=\/|$)/, '') || '/';

  // Blog post
  if (normalizedPath.match(/^\/blog\/(?!archive|tags|page).+/)) {
    const dateEl = document.querySelector('time');
    const datePublished = dateEl?.dateTime || dateEl?.getAttribute('datetime') || '';
    return [
      {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: title,
        description,
        url,
        image: ogImage || undefined,
        datePublished: datePublished || undefined,
        author: person,
        publisher: {
          '@type': 'Person',
          name: 'David Sanchez',
          url: 'https://dsanchezcr.com',
        },
      },
    ];
  }

  // About page
  if (normalizedPath.startsWith('/about')) {
    return [
      {
        '@context': 'https://schema.org',
        '@type': 'ProfilePage',
        mainEntity: {
          ...person,
          '@context': 'https://schema.org',
          description,
          image: ogImage || 'https://dsanchezcrwebsite.blob.core.windows.net/images/about/devops-conf.jpg',
          knowsLanguage: ['English', 'Spanish', 'Portuguese'],
          alumniOf: { '@type': 'Organization', name: 'Microsoft' },
        },
      },
    ];
  }

  // Projects section
  if (normalizedPath.startsWith('/projects')) {
    return [
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: title,
        description,
        url,
        author: person,
      },
    ];
  }

  // Homepage
  if (normalizedPath === '/' || normalizedPath === '') {
    return [
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'David Sanchez',
        url: 'https://dsanchezcr.com',
        description: 'Personal website and blog of David Sanchez — software development, Azure, GitHub, and technology.',
        author: person,
        potentialAction: {
          '@type': 'SearchAction',
          target: 'https://dsanchezcr.com/search?q={search_term_string}',
          'query-input': 'required name=search_term_string',
        },
      },
    ];
  }

  return null;
}

if (ExecutionEnvironment.canUseDOM) {
  // Inject on initial load (after DOM is ready)
  const injectOnReady = () => {
    // Small delay to let meta tags render
    setTimeout(() => {
      clearJsonLd();
      const schemas = getJsonLdForPage();
      if (schemas) {
        schemas.forEach(injectJsonLd);
      }
    }, 100);
  };

  // Initial page
  if (document.readyState === 'complete') {
    injectOnReady();
  } else {
    window.addEventListener('load', injectOnReady);
  }

  // SPA route changes
  const observer = new MutationObserver(() => {
    clearJsonLd();
    const schemas = getJsonLdForPage();
    if (schemas) {
      schemas.forEach(injectJsonLd);
    }
  });

  // Watch for title changes as a proxy for route changes
  const titleEl = document.querySelector('title');
  if (titleEl) {
    observer.observe(titleEl, { childList: true });
  }
}
