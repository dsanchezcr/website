import React, { useEffect, useRef, useState, useCallback } from 'react';

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
};

const CELL = 20;
const COLS = 20;
const ROWS = 20;
const W = COLS * CELL;
const H = ROWS * CELL;

export default function SnakeGame({ onClose }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const [score, setScore] = useState(0);

  const initGame = useCallback((canvas) => {
    const ctx = canvas.getContext('2d');
    canvas.width = W;
    canvas.height = H;

    let snake = [{ x: 10, y: 10 }];
    let dir = { x: 1, y: 0 };
    let nextDir = { x: 1, y: 0 };
    let food = spawnFood(snake);
    let gameScore = 0;
    let gameOver = false;
    let lastUpdate = 0;
    const TICK = 120; // ms per move

    function spawnFood(snakeBody) {
      let pos;
      do {
        pos = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
      } while (snakeBody.some((s) => s.x === pos.x && s.y === pos.y));
      return pos;
    }

    const handleKey = (e) => {
      const map = {
        ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
        w: { x: 0, y: -1 }, s: { x: 0, y: 1 },
        a: { x: -1, y: 0 }, d: { x: 1, y: 0 },
      };
      const newDir = map[e.key];
      if (newDir && !(newDir.x === -dir.x && newDir.y === -dir.y)) {
        e.preventDefault();
        nextDir = newDir;
      }
      if (e.key === ' ' && gameOver) {
        // Restart
        snake = [{ x: 10, y: 10 }];
        dir = { x: 1, y: 0 };
        nextDir = { x: 1, y: 0 };
        food = spawnFood(snake);
        gameScore = 0;
        gameOver = false;
        setScore(0);
      }
    };
    document.addEventListener('keydown', handleKey);

    function update() {
      if (gameOver) return;
      dir = nextDir;
      const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

      // Wall collision
      if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
        gameOver = true;
        return;
      }
      // Self collision
      if (snake.some((s) => s.x === head.x && s.y === head.y)) {
        gameOver = true;
        return;
      }

      snake.unshift(head);

      if (head.x === food.x && head.y === food.y) {
        gameScore += 10;
        setScore(gameScore);
        food = spawnFood(snake);
      } else {
        snake.pop();
      }
    }

    function draw() {
      // Background
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, W, H);

      // Grid lines (subtle)
      ctx.strokeStyle = '#222';
      for (let i = 0; i <= COLS; i++) {
        ctx.beginPath();
        ctx.moveTo(i * CELL, 0);
        ctx.lineTo(i * CELL, H);
        ctx.stroke();
      }
      for (let i = 0; i <= ROWS; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * CELL);
        ctx.lineTo(W, i * CELL);
        ctx.stroke();
      }

      // Snake
      snake.forEach((s, i) => {
        ctx.fillStyle = i === 0 ? '#4caf50' : '#66bb6a';
        ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2);
      });

      // Food
      ctx.fillStyle = '#f44336';
      ctx.beginPath();
      ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL / 2 - 2, 0, Math.PI * 2);
      ctx.fill();

      if (gameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#f44';
        ctx.font = 'bold 32px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', W / 2, H / 2 - 10);
        ctx.fillStyle = '#fff';
        ctx.font = '16px monospace';
        ctx.fillText(`Score: ${gameScore}`, W / 2, H / 2 + 25);
        ctx.fillText('Press Space to retry', W / 2, H / 2 + 55);
      }
    }

    function loop(timestamp) {
      if (timestamp - lastUpdate >= TICK) {
        update();
        lastUpdate = timestamp;
      }
      draw();
      animRef.current = requestAnimationFrame(loop);
    }
    animRef.current = requestAnimationFrame(loop);

    return () => {
      document.removeEventListener('keydown', handleKey);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    return initGame(canvas);
  }, [initGame]);

  return (
    <div style={STYLES.overlay}>
      <div style={STYLES.score}>Score: {score}</div>
      <button style={STYLES.closeBtn} onClick={onClose} aria-label="Close game">✕</button>
      <canvas ref={canvasRef} style={STYLES.canvas} />
    </div>
  );
}
