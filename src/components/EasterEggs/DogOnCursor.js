import React, { useEffect, useRef, useState } from 'react';

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
    transition: 'left 0.15s, top 0.15s',
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
  const [pos, setPos] = useState({ x: 100, y: 100 });
  const [frame, setFrame] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const targetRef = useRef({ x: 100, y: 100 });
  const posRef = useRef({ x: 100, y: 100 });

  useEffect(() => {
    const handleMouse = (e) => {
      targetRef.current = { x: e.clientX, y: e.clientY };
    };
    document.addEventListener('mousemove', handleMouse);

    // Animation loop: dog follows cursor with a lag
    let animId;
    let frameCount = 0;
    function animate() {
      const cur = posRef.current;
      const tgt = targetRef.current;
      const dx = tgt.x - cur.x;
      const dy = tgt.y - cur.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 40) {
        cur.x += dx * 0.06;
        cur.y += dy * 0.06;
        setPos({ x: cur.x, y: cur.y });
        setFlipped(dx < 0);

        // Alternate frames when moving
        frameCount++;
        if (frameCount % 10 === 0) {
          setFrame((f) => (f + 1) % DOG_FRAMES.length);
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
        style={{
          ...STYLES.dog,
          left: pos.x + 20,
          top: pos.y - 10,
          transform: flipped ? 'scaleX(-1)' : 'none',
        }}
      >
        {DOG_FRAMES[frame]}
      </pre>
      <button style={STYLES.closeBtn} onClick={onClose} aria-label="Close dog">
        🐕 Dismiss dog
      </button>
    </>
  );
}
