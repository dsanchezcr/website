import { useEffect, useRef } from 'react';

export default function CostaRicaConfetti({ onClose }) {
  const rafRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const confetti = (await import('canvas-confetti')).default;

        const duration = 3000;
        const end = Date.now() + duration;
        const colors = ['#002b7f', '#ffffff', '#ce1126']; // Costa Rica flag colors

        (function frame() {
          if (cancelled) return;
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
            onClose();
          }
        })();
      } catch {
        onClose();
      }
    })();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [onClose]);

  return null;
}
