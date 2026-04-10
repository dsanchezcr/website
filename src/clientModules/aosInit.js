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

  // Refresh AOS on route changes (SPA navigation)
  const observer = new MutationObserver(() => {
    AOS.refresh();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
