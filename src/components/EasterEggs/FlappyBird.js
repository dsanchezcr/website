import React, { useEffect, useRef, useState } from 'react';
import { useLocale } from '@site/src/hooks';

const gameStrings = {
  en: { gameOver: 'GAME OVER', score: 'Score', retry: 'Click or Space to retry', start1: 'Press Space or Click', start2: 'to start', closeLabel: 'Close game' },
  es: { gameOver: 'FIN DEL JUEGO', score: 'Puntos', retry: 'Clic o Espacio para reintentar', start1: 'Presiona Espacio o Clic', start2: 'para iniciar', closeLabel: 'Cerrar juego' },
  pt: { gameOver: 'FIM DE JOGO', score: 'Pontos', retry: 'Clique ou Espaço para reiniciar', start1: 'Pressione Espaço ou Clique', start2: 'para iniciar', closeLabel: 'Fechar jogo' },
};

const STYLES = {
  overlay: {
    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
    zIndex: 99999, background: 'rgba(0,0,0,0.9)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
  },
  canvas: { border: '2px solid #4a9', borderRadius: 4, display: 'block' },
  closeBtn: {
    position: 'absolute', top: 16, right: 16,
    background: 'transparent', border: '2px solid #fff', color: '#fff',
    fontSize: 20, padding: '4px 12px', cursor: 'pointer', borderRadius: 4,
  },
  score: {
    color: '#fff', fontFamily: 'monospace', fontSize: 20,
    marginBottom: 8,
  },
  start: {
    color: '#fff', fontFamily: 'monospace', fontSize: 16,
    position: 'absolute', textAlign: 'center',
  },
};

const W = 320;
const H = 480;
const GRAVITY = 0.35;
const JUMP = -6;
const PIPE_WIDTH = 50;
const PIPE_GAP = 130;
const PIPE_SPEED = 2.5;
const BIRD_SIZE = 24;

export default function FlappyBird({ onClose }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const [score, setScore] = useState(0);
  const stateRef = useRef(null);
  const logoRef = useRef(null);
  const lang = useLocale();
  const strings = gameStrings[lang] || gameStrings.en;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = W;
    canvas.height = H;

    // Load logo image
    const logo = new Image();
    logo.src = '/img/logo.png';
    logo.onload = () => { logoRef.current = logo; };

    const state = {
      bird: { x: 80, y: H / 2, vy: 0 },
      pipes: [],
      score: 0,
      gameOver: false,
      started: false,
      spawnTimer: 0,
    };
    stateRef.current = state;

    function jump() {
      if (state.gameOver) {
        // Reset
        state.bird = { x: 80, y: H / 2, vy: 0 };
        state.pipes = [];
        state.score = 0;
        state.gameOver = false;
        state.started = true;
        setScore(0);
        return;
      }
      if (!state.started) {
        state.started = true;
      }
      state.bird.vy = JUMP;
    }

    const handleKey = (e) => {
      if (e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault();
        jump();
      }
    };
    const handleClick = (e) => {
      if (e.target === canvas) jump();
    };

    document.addEventListener('keydown', handleKey);
    canvas.addEventListener('click', handleClick);

    function spawnPipe() {
      const topH = 60 + Math.random() * (H - PIPE_GAP - 120);
      state.pipes.push({ x: W, topH, scored: false });
    }

    function update() {
      if (!state.started || state.gameOver) return;
      const b = state.bird;
      b.vy += GRAVITY;
      b.y += b.vy;

      // Ground / ceiling
      if (b.y + BIRD_SIZE > H || b.y < 0) {
        state.gameOver = true;
      }

      state.spawnTimer++;
      if (state.spawnTimer % 90 === 0) spawnPipe();

      state.pipes.forEach((p) => {
        p.x -= PIPE_SPEED;

        // Collision
        if (b.x + BIRD_SIZE > p.x && b.x < p.x + PIPE_WIDTH) {
          if (b.y < p.topH || b.y + BIRD_SIZE > p.topH + PIPE_GAP) {
            state.gameOver = true;
          }
        }

        // Score
        if (!p.scored && p.x + PIPE_WIDTH < b.x) {
          p.scored = true;
          state.score++;
          setScore(state.score);
        }
      });

      state.pipes = state.pipes.filter((p) => p.x > -PIPE_WIDTH);
    }

    function draw() {
      // Sky
      ctx.fillStyle = '#70c5ce';
      ctx.fillRect(0, 0, W, H);

      // Ground
      ctx.fillStyle = '#ded895';
      ctx.fillRect(0, H - 20, W, 20);

      // Pipes
      ctx.fillStyle = '#4a9';
      state.pipes.forEach((p) => {
        ctx.fillRect(p.x, 0, PIPE_WIDTH, p.topH);
        ctx.fillRect(p.x, p.topH + PIPE_GAP, PIPE_WIDTH, H - p.topH - PIPE_GAP);
        // Pipe caps
        ctx.fillStyle = '#3a8';
        ctx.fillRect(p.x - 4, p.topH - 20, PIPE_WIDTH + 8, 20);
        ctx.fillRect(p.x - 4, p.topH + PIPE_GAP, PIPE_WIDTH + 8, 20);
        ctx.fillStyle = '#4a9';
      });

      // Bird (logo or fallback)
      const b = state.bird;
      if (logoRef.current) {
        ctx.drawImage(logoRef.current, b.x, b.y, BIRD_SIZE, BIRD_SIZE);
      } else {
        ctx.fillStyle = '#ff0';
        ctx.beginPath();
        ctx.arc(b.x + BIRD_SIZE / 2, b.y + BIRD_SIZE / 2, BIRD_SIZE / 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Score
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 32px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(state.score, W / 2, 50);

      if (!state.started) {
        ctx.fillStyle = '#fff';
        ctx.font = '18px monospace';
        ctx.fillText(strings.start1, W / 2, H / 2 + 40);
        ctx.fillText(strings.start2, W / 2, H / 2 + 65);
      }

      if (state.gameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#f44';
        ctx.font = 'bold 36px monospace';
        ctx.fillText(strings.gameOver, W / 2, H / 2 - 10);
        ctx.fillStyle = '#fff';
        ctx.font = '18px monospace';
        ctx.fillText(`${strings.score}: ${state.score}`, W / 2, H / 2 + 30);
        ctx.fillText(strings.retry, W / 2, H / 2 + 60);
      }
    }

    function loop() {
      update();
      draw();
      animRef.current = requestAnimationFrame(loop);
    }
    loop();

    return () => {
      document.removeEventListener('keydown', handleKey);
      canvas.removeEventListener('click', handleClick);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <div style={STYLES.overlay}>
      <div style={STYLES.score}>{strings.score}: {score}</div>
      <button style={STYLES.closeBtn} onClick={onClose} aria-label={strings.closeLabel}>✕</button>
      <canvas ref={canvasRef} style={STYLES.canvas} />
    </div>
  );
}
