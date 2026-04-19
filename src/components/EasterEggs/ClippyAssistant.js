import React, { useState, useEffect } from 'react';
import { useLocale } from '@site/src/hooks';

const translations = {
  en: {
    lines: [
      "It looks like you're browsing a website. Would you like help with that? 📎",
      "Hey! I noticed you typed 'Microsoft'. I used to work there, you know! 📎",
      "Did you know David builds cool stuff with Azure? I'm so proud! 📎",
      "I see you're looking at code. Want me to paperclip it together? 📎",
      "Fun fact: I was retired in Office 2007, but I never truly left! 📎",
      "I'm basically the OG AI assistant. ChatGPT who? 📎",
    ],
    closeLabel: 'Close Clippy',
    tipTitle: 'Click for another tip',
    tipLabel: 'Clippy - click for another tip',
  },
  es: {
    lines: [
      "Parece que estás navegando un sitio web. ¿Te gustaría ayuda? 📎",
      "¡Oye! Noté que escribiste 'Microsoft'. ¡Yo solía trabajar ahí! 📎",
      "¿Sabías que David construye cosas geniales con Azure? ¡Estoy orgulloso! 📎",
      "Veo que estás mirando código. ¿Quieres que lo sujete con un clip? 📎",
      "Dato curioso: me jubilaron en Office 2007, ¡pero nunca me fui del todo! 📎",
      "Soy básicamente el asistente de IA original. ¿ChatGPT quién? 📎",
    ],
    closeLabel: 'Cerrar Clippy',
    tipTitle: 'Clic para otro consejo',
    tipLabel: 'Clippy - clic para otro consejo',
  },
  pt: {
    lines: [
      "Parece que você está navegando um site. Gostaria de ajuda? 📎",
      "Ei! Notei que você digitou 'Microsoft'. Eu costumava trabalhar lá! 📎",
      "Sabia que o David constrói coisas legais com Azure? Estou orgulhoso! 📎",
      "Vejo que você está olhando código. Quer que eu prenda com um clipe? 📎",
      "Curiosidade: fui aposentado no Office 2007, mas nunca realmente saí! 📎",
      "Sou basicamente o assistente de IA original. ChatGPT quem? 📎",
    ],
    closeLabel: 'Fechar Clippy',
    tipTitle: 'Clique para outra dica',
    tipLabel: 'Clippy - clique para outra dica',
  },
};

const STYLES = {
  container: {
    position: 'fixed', bottom: 24, left: 24, zIndex: 99999,
    display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
    animation: 'clippy-bounce 0.5s ease-out',
  },
  bubble: {
    background: '#ffffcc', border: '2px solid #333', borderRadius: 12,
    padding: '12px 16px', maxWidth: 280, fontSize: 14,
    fontFamily: '"Comic Sans MS", "Segoe UI", sans-serif',
    color: '#333', position: 'relative', marginBottom: 8,
    boxShadow: '2px 2px 8px rgba(0,0,0,0.2)',
  },
  bubbleArrow: {
    position: 'absolute', bottom: -10, left: 30,
    width: 0, height: 0,
    borderLeft: '10px solid transparent',
    borderRight: '10px solid transparent',
    borderTop: '10px solid #333',
  },
  clippy: {
    fontSize: 64, lineHeight: 1, cursor: 'pointer',
    filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))',
    userSelect: 'none',
  },
  closeBtn: {
    position: 'absolute', top: -8, right: -8,
    background: '#f44336', color: '#fff', border: 'none',
    borderRadius: '50%', width: 20, height: 20, fontSize: 12,
    cursor: 'pointer', display: 'flex', alignItems: 'center',
    justifyContent: 'center', lineHeight: 1,
  },
};

export default function ClippyAssistant({ onClose }) {
  const lang = useLocale();
  const t = translations[lang] || translations.en;
  const [line, setLine] = useState('');

  useEffect(() => {
    setLine(t.lines[Math.floor(Math.random() * t.lines.length)]);

    // Add animation keyframes
    const style = document.createElement('style');
    style.textContent = `
      @keyframes clippy-bounce {
        0% { transform: translateY(100px); opacity: 0; }
        60% { transform: translateY(-10px); opacity: 1; }
        100% { transform: translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);

    const timer = setTimeout(onClose, 10000);
    return () => {
      clearTimeout(timer);
      document.head.removeChild(style);
    };
  }, [onClose]);

  const nextLine = () => {
    setLine(t.lines[Math.floor(Math.random() * t.lines.length)]);
  };

  return (
    <div style={STYLES.container}>
      <div style={STYLES.bubble}>
        <button style={STYLES.closeBtn} onClick={onClose} aria-label={t.closeLabel}>✕</button>
        {line}
        <div style={STYLES.bubbleArrow} />
      </div>
      <button
        style={{ ...STYLES.clippy, background: 'none', border: 'none', padding: 0 }}
        onClick={nextLine}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); nextLine(); } }}
        title={t.tipTitle}
        aria-label={t.tipLabel}
      >
        📎
      </button>
    </div>
  );
}
