import { useEffect, useRef } from 'react';
import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';

export default function CostaRicaConfetti() {
  const clickCount = useRef(0);
  const clickTimer = useRef(null);
  const rafRef = useRef(null);
  const inProgressRef = useRef(false);

  useEffect(() => {
    if (!ExecutionEnvironment.canUseDOM) return;

    const handleClick = async (e) => {
      if (!(e.target instanceof Element)) return;

      // Check if click target is within footer copyright area
      const footer = e.target.closest('.footer__copyright') || e.target.closest('.footer__bottom');
      if (!footer) return;

      clickCount.current++;

      if (clickTimer.current) clearTimeout(clickTimer.current);
      clickTimer.current = setTimeout(() => { clickCount.current = 0; }, 1500);

      if (clickCount.current >= 5) {
        clickCount.current = 0;
        if (inProgressRef.current) return; // Prevent overlapping loops
        inProgressRef.current = true;
        const confetti = (await import('canvas-confetti')).default;

        const duration = 3000;
        const end = Date.now() + duration;
        const colors = ['#002b7f', '#ffffff', '#ce1126']; // Costa Rica flag colors

        (function frame() {
          confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.6 },
            colors,
          });
          confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.6 },
            colors,
          });
          if (Date.now() < end) {
            rafRef.current = requestAnimationFrame(frame);
          } else {
            inProgressRef.current = false;
          }
        })();
      }
    };

    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('click', handleClick);
      if (clickTimer.current) clearTimeout(clickTimer.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return null;
}
