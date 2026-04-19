import React, { useEffect, useRef } from 'react';
import { useLocale } from '@site/src/hooks';

const uiStrings = {
  en: { dismiss: '🐕 Dismiss dog', closeLabel: 'Close dog' },
  es: { dismiss: '🐕 Ocultar perrito', closeLabel: 'Cerrar perrito' },
  pt: { dismiss: '🐕 Dispensar cachorro', closeLabel: 'Fechar cachorro' },
};

const DOG_FRAMES = [
  // Frame 1: standing
  `
   / \\__
  (    @\\___
  /         O
 /   (_____/
/_____/   U
  `,
  // Frame 2: walking
  `
   / \\__
  (    @\\___
  /         O
 /   (_____/
/____/  \\__/
  `,
];

const STYLES = {
  dog: {
    position: 'fixed',
    zIndex: 99998,
    pointerEvents: 'none',
    fontFamily: 'monospace',
    fontSize: 10,
    lineHeight: 1.1,
    whiteSpace: 'pre',
    color: '#8B4513',
    textShadow: '0 0 2px rgba(0,0,0,0.3)',
  },
  closeBtn: {
    position: 'fixed', bottom: 16, right: 16, zIndex: 99999,
    background: 'rgba(0,0,0,0.7)', border: '1px solid #888', color: '#fff',
    padding: '6px 14px', borderRadius: 20, cursor: 'pointer',
    fontFamily: 'monospace', fontSize: 12,
  },
};

export default function DogOnCursor({ onClose }) {
  const lang = useLocale();
  const t = uiStrings[lang] || uiStrings.en;
  const dogRef = useRef(null);
  const targetRef = useRef({ x: 100, y: 100 });
  const posRef = useRef({ x: 100, y: 100 });
  const frameRef = useRef(0);

  useEffect(() => {
    const handleMouse = (e) => {
      targetRef.current = { x: e.clientX, y: e.clientY };
    };
    document.addEventListener('mousemove', handleMouse);

    let animId;
    let frameCount = 0;
    function animate() {
      const cur = posRef.current;
      const tgt = targetRef.current;
      const dx = tgt.x - cur.x;
      const dy = tgt.y - cur.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 40 && dogRef.current) {
        cur.x += dx * 0.06;
        cur.y += dy * 0.06;
        // Direct DOM style updates to avoid React re-renders
        dogRef.current.style.left = `${cur.x + 20}px`;
        dogRef.current.style.top = `${cur.y - 10}px`;
        dogRef.current.style.transform = dx < 0 ? 'scaleX(-1)' : 'none';

        frameCount++;
        if (frameCount % 10 === 0) {
          frameRef.current = (frameRef.current + 1) % DOG_FRAMES.length;
          dogRef.current.textContent = DOG_FRAMES[frameRef.current];
        }
      }

      animId = requestAnimationFrame(animate);
    }
    animId = requestAnimationFrame(animate);

    return () => {
      document.removeEventListener('mousemove', handleMouse);
      cancelAnimationFrame(animId);
    };
  }, []);

  // Hide on touch-only devices
  if (typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches) {
    return null;
  }

  return (
    <>
      <pre
        ref={dogRef}
        style={{
          ...STYLES.dog,
          left: 120,
          top: 90,
        }}
      >
        {DOG_FRAMES[0]}
      </pre>
      <button style={STYLES.closeBtn} onClick={onClose} aria-label={t.closeLabel}>
        {t.dismiss}
      </button>
    </>
  );
}
