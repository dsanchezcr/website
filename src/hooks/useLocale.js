/**
 * Custom hook for consistent locale detection across all components.
 * Uses Docusaurus context with URL fallback for reliability.
 */
import { useLocation } from '@docusaurus/router';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

/**
 * Returns the current locale ('en', 'es', or 'pt').
 * Prioritizes Docusaurus i18n context, falls back to URL detection.
 * 
 * @returns {string} Current locale code
 */
export function useLocale() {
  const { i18n } = useDocusaurusContext();
  const location = useLocation();
  
  // Try Docusaurus context first (most reliable)
  if (i18n?.currentLocale) {
    return i18n.currentLocale;
  }
  
  // Fallback to URL-based detection
  const pathname = location.pathname;
  if (pathname.startsWith('/es/') || pathname === '/es') return 'es';
  if (pathname.startsWith('/pt/') || pathname === '/pt') return 'pt';
  return 'en';
}

/**
 * Returns localized content based on current locale.
 * 
 * @param {Object} translations - Object with keys 'en', 'es', 'pt' containing localized content
 * @returns {Object} Localized content for current locale
 */
export function useTranslations(translations) {
  const locale = useLocale();
  return translations[locale] || translations.en;
}

export default useLocale;
