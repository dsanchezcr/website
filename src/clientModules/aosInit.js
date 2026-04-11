import AOS from 'aos';
import 'aos/dist/aos.css';
import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';

if (ExecutionEnvironment.canUseDOM) {
  // Initialize AOS after the page has rendered
  window.addEventListener('load', () => {
    AOS.init({
      duration: 600,
      easing: 'ease-out',
      once: true,
      offset: 80,
      disable: () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    });
  });

  // Refresh AOS on route changes (SPA navigation) — debounced
  let refreshTimer = null;
  const observer = new MutationObserver(() => {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => AOS.refresh(), 200);
  });
  // Observe the Docusaurus app root for content changes during SPA navigation
  const appRoot = document.getElementById('__docusaurus') || document.body;
  observer.observe(appRoot, { childList: true, subtree: true });
}
