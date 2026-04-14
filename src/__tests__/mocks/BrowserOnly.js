// Mock for @docusaurus/BrowserOnly
// In tests (jsdom environment), renders children directly.
export default function BrowserOnly({ children, fallback }) {
  if (typeof children === 'function') return children();
  return fallback || null;
}
