import React, { useEffect, useState } from 'react';
import { useLocale } from '@site/src/hooks';

const translations = {
  en: {
    title: '🎂 Happy Birthday David! 🎂',
    subtitle: 'January 10th — Time to celebrate! 🥳🎉',
    dismiss: 'Thanks! 🎈',
  },
  es: {
    title: '🎂 ¡Feliz Cumpleaños David! 🎂',
    subtitle: '10 de enero — ¡Hora de celebrar! 🥳🎉',
    dismiss: '¡Gracias! 🎈',
  },
  pt: {
    title: '🎂 Feliz Aniversário David! 🎂',
    subtitle: '10 de janeiro — Hora de celebrar! 🥳🎉',
    dismiss: 'Obrigado! 🎈',
  },
};

const STYLES = {
  overlay: {
    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
    zIndex: 99998, pointerEvents: 'none', overflow: 'hidden',
  },
  emoji: {
    position: 'absolute', fontSize: 32, animation: 'birthday-float 3s ease-out forwards',
    pointerEvents: 'none',
  },
  banner: {
    position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
    zIndex: 99999, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: 16, padding: '24px 40px', textAlign: 'center',
    color: '#fff', fontFamily: 'system-ui, sans-serif',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    animation: 'birthday-pop 0.5s ease-out',
  },
  title: { fontSize: 28, margin: '0 0 8px' },
  subtitle: { fontSize: 16, margin: 0, opacity: 0.9 },
  closeBtn: {
    marginTop: 16, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.5)',
    color: '#fff', padding: '6px 20px', borderRadius: 20, cursor: 'pointer',
    fontSize: 14, pointerEvents: 'auto',
  },
};

const EMOJIS = ['🎂', '🎈', '🎉', '🎊', '🥳', '🎁', '🎶', '✨', '🍰', '🎵'];

export default function BirthdayEgg() {
  const lang = useLocale();
  const t = translations[lang] || translations.en;
  const [show, setShow] = useState(false);
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    const today = new Date();
    // January 10th
    if (today.getMonth() === 0 && today.getDate() === 10) {
      const key = `birthday-shown-${today.getFullYear()}`;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        setShow(true);

        // Generate floating emojis
        const p = Array.from({ length: 30 }, (_, i) => ({
          id: i,
          emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
          left: Math.random() * 100,
          delay: Math.random() * 2,
          size: 20 + Math.random() * 24,
        }));
        setParticles(p);

        // Add animation keyframes
        const style = document.createElement('style');
        style.id = 'birthday-keyframes';
        style.textContent = `
          @keyframes birthday-float {
            0% { transform: translateY(100vh) rotate(0deg); opacity: 1; }
            100% { transform: translateY(-100px) rotate(360deg); opacity: 0; }
          }
          @keyframes birthday-pop {
            0% { transform: translate(-50%, -50%) scale(0); }
            80% { transform: translate(-50%, -50%) scale(1.1); }
            100% { transform: translate(-50%, -50%) scale(1); }
          }
        `;
        document.head.appendChild(style);

        return () => {
          const el = document.getElementById('birthday-keyframes');
          if (el) el.remove();
        };
      }
    }
  }, []);

  if (!show) return null;

  return (
    <>
      <div style={STYLES.overlay}>
        {particles.map((p) => (
          <span
            key={p.id}
            style={{
              ...STYLES.emoji,
              left: `${p.left}%`,
              fontSize: p.size,
              animationDelay: `${p.delay}s`,
            }}
          >
            {p.emoji}
          </span>
        ))}
      </div>
      <div style={STYLES.banner}>
        <h2 style={STYLES.title}>{t.title}</h2>
        <p style={STYLES.subtitle}>{t.subtitle}</p>
        <button style={STYLES.closeBtn} onClick={() => setShow(false)}>{t.dismiss}</button>
      </div>
    </>
  );
}
