import React, { useEffect, useRef, useCallback } from 'react';
import { useLocale } from '@site/src/hooks';

const gameStrings = {
  en: { gameOver: 'GAME OVER', score: 'Score', exit: 'Press Escape to exit', closeLabel: 'Close game' },
  es: { gameOver: 'FIN DEL JUEGO', score: 'Puntos', exit: 'Presiona Escape para salir', closeLabel: 'Cerrar juego' },
  pt: { gameOver: 'FIM DE JOGO', score: 'Pontos', exit: 'Pressione Escape para sair', closeLabel: 'Fechar jogo' },
};

const STYLES = {
  overlay: {
    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
    zIndex: 99999, background: '#000',
  },
  canvas: { display: 'block', width: '100%', height: '100%' },
  closeBtn: {
    position: 'absolute', top: 16, right: 16, zIndex: 100000,
    background: 'transparent', border: '2px solid #0f0', color: '#0f0',
    fontSize: 20, padding: '4px 12px', cursor: 'pointer', borderRadius: 4,
  },
  score: {
    position: 'absolute', top: 16, left: 16, color: '#0f0',
    fontFamily: 'monospace', fontSize: 20, zIndex: 100000,
  },
};

export default function KonamiSpaceShooter({ onClose }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const stateRef = useRef(null);
  const lang = useLocale();
  const strings = gameStrings[lang] || gameStrings.en;

  const initGame = useCallback((canvas) => {
    const ctx = canvas.getContext('2d');
    const W = canvas.width = canvas.offsetWidth;
    const H = canvas.height = canvas.offsetHeight;

    const state = {
      player: { x: W / 2 - 20, y: H - 80, w: 40, h: 40, speed: 6 },
      bullets: [],
      enemies: [],
      score: 0,
      keys: {},
      spawnTimer: 0,
      gameOver: false,
    };
    stateRef.current = state;

    const onKeyDown = (e) => { state.keys[e.key] = true; };
    const onKeyUp = (e) => { state.keys[e.key] = false; };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    function spawnEnemy() {
      state.enemies.push({
        x: Math.random() * (W - 30),
        y: -30,
        w: 30, h: 30,
        speed: 2 + Math.random() * 2,
      });
    }

    function update() {
      if (state.gameOver) return;
      const p = state.player;

      if (state.keys['ArrowLeft'] || state.keys['a']) p.x -= p.speed;
      if (state.keys['ArrowRight'] || state.keys['d']) p.x += p.speed;
      if (state.keys['ArrowUp'] || state.keys['w']) p.y -= p.speed;
      if (state.keys['ArrowDown'] || state.keys['s']) p.y += p.speed;
      p.x = Math.max(0, Math.min(W - p.w, p.x));
      p.y = Math.max(0, Math.min(H - p.h, p.y));

      if (state.keys[' ']) {
        state.keys[' '] = false;
        state.bullets.push({ x: p.x + p.w / 2 - 2, y: p.y, w: 4, h: 10 });
      }

      state.bullets.forEach((b) => { b.y -= 8; });
      state.bullets = state.bullets.filter((b) => b.y > -10);

      state.enemies.forEach((e) => { e.y += e.speed; });

      // Collision: bullet → enemy
      state.enemies = state.enemies.filter((enemy) => {
        const hit = state.bullets.some((b, bi) => {
          if (b.x < enemy.x + enemy.w && b.x + b.w > enemy.x &&
              b.y < enemy.y + enemy.h && b.y + b.h > enemy.y) {
            state.bullets.splice(bi, 1);
            return true;
          }
          return false;
        });
        if (hit) state.score += 10;
        return !hit;
      });

      // Collision: enemy → player
      state.enemies.forEach((enemy) => {
        if (enemy.x < p.x + p.w && enemy.x + enemy.w > p.x &&
            enemy.y < p.y + p.h && enemy.y + enemy.h > p.y) {
          state.gameOver = true;
        }
      });

      state.enemies = state.enemies.filter((e) => e.y < H + 30);

      state.spawnTimer++;
      if (state.spawnTimer % 40 === 0) spawnEnemy();
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);

      // Stars
      ctx.fillStyle = '#333';
      for (let i = 0; i < 60; i++) {
        const sx = (i * 137.5) % W;
        const sy = ((i * 221.3) + performance.now() * 0.02) % H;
        ctx.fillRect(sx, sy, 2, 2);
      }

      const p = state.player;
      // Player ship
      ctx.fillStyle = '#0ff';
      ctx.beginPath();
      ctx.moveTo(p.x + p.w / 2, p.y);
      ctx.lineTo(p.x, p.y + p.h);
      ctx.lineTo(p.x + p.w, p.y + p.h);
      ctx.closePath();
      ctx.fill();

      // Bullets
      ctx.fillStyle = '#ff0';
      state.bullets.forEach((b) => ctx.fillRect(b.x, b.y, b.w, b.h));

      // Enemies
      ctx.fillStyle = '#f00';
      state.enemies.forEach((e) => {
        ctx.beginPath();
        ctx.moveTo(e.x + e.w / 2, e.y + e.h);
        ctx.lineTo(e.x, e.y);
        ctx.lineTo(e.x + e.w, e.y);
        ctx.closePath();
        ctx.fill();
      });

      if (state.gameOver) {
        ctx.fillStyle = '#f00';
        ctx.font = 'bold 48px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(strings.gameOver, W / 2, H / 2 - 20);
        ctx.fillStyle = '#fff';
        ctx.font = '24px monospace';
        ctx.fillText(`${strings.score}: ${state.score}`, W / 2, H / 2 + 30);
        ctx.fillText(strings.exit, W / 2, H / 2 + 70);
      }
    }

    function loop() {
      update();
      draw();
      // Update score display
      const el = document.getElementById('space-shooter-score');
      if (el) el.textContent = `${strings.score}: ${state.score}`;
      animRef.current = requestAnimationFrame(loop);
    }

    loop();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cleanup = initGame(canvas);
    return cleanup;
  }, [initGame]);

  return (
    <div style={STYLES.overlay}>
      <span id="space-shooter-score" style={STYLES.score}>{strings.score}: 0</span>
      <button style={STYLES.closeBtn} onClick={onClose} aria-label={strings.closeLabel}>✕</button>
      <canvas ref={canvasRef} style={STYLES.canvas} />
    </div>
  );
}
