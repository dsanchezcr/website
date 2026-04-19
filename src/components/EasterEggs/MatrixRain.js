import React, { useEffect, useRef } from 'react';

const STYLES = {
  overlay: {
    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
    zIndex: 99999, pointerEvents: 'none',
  },
  canvas: { display: 'block', width: '100%', height: '100%' },
};

export default function MatrixRain({ onClose }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width = window.innerWidth;
    const H = canvas.height = window.innerHeight;

    const fontSize = 16;
    const cols = Math.floor(W / fontSize);
    const drops = new Array(cols).fill(1);

    const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789';

    let opacity = 1;
    const startTime = Date.now();
    const DURATION = 6000;
    const FADE_START = 4500;

    function draw() {
      const elapsed = Date.now() - startTime;

      if (elapsed > FADE_START) {
        opacity = Math.max(0, 1 - (elapsed - FADE_START) / (DURATION - FADE_START));
      }

      ctx.fillStyle = `rgba(0, 0, 0, 0.05)`;
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = `rgba(0, 255, 0, ${opacity})`;
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(char, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > H && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }

      if (elapsed >= DURATION) {
        onClose();
        return;
      }
      requestAnimationFrame(draw);
    }

    const animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, [onClose]);

  return (
    <div style={STYLES.overlay}>
      <canvas ref={canvasRef} style={STYLES.canvas} />
    </div>
  );
}
