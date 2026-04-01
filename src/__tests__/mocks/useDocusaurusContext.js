// Mock for @docusaurus/useDocusaurusContext
export default function useDocusaurusContext() {
  return {
    siteConfig: {
      title: 'David Sanchez',
      tagline: 'Test',
    },
    i18n: {
      currentLocale: 'en',
      defaultLocale: 'en',
      locales: ['en', 'es', 'pt'],
    },
  };
}
