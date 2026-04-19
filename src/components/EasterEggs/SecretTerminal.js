import React, { useState, useRef, useEffect } from 'react';
import { useLocale } from '@site/src/hooks';

const STYLES = {
  overlay: {
    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
    zIndex: 99999, background: 'rgba(0,0,0,0.85)', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
  },
  terminal: {
    width: '90%', maxWidth: 700, height: '70vh', background: '#1a1a2e',
    border: '2px solid #0f0', borderRadius: 8, padding: 16,
    fontFamily: '"Courier New", Courier, monospace', fontSize: 14,
    color: '#0f0', display: 'flex', flexDirection: 'column',
    boxShadow: '0 0 30px rgba(0,255,0,0.2)',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    borderBottom: '1px solid #0f0', paddingBottom: 8, marginBottom: 8,
  },
  title: { margin: 0, fontSize: 14, color: '#0f0' },
  closeBtn: {
    background: 'transparent', border: 'none', color: '#f00',
    fontSize: 18, cursor: 'pointer',
  },
  output: {
    flex: 1, overflowY: 'auto', whiteSpace: 'pre-wrap', lineHeight: 1.6,
  },
  inputLine: { display: 'flex', alignItems: 'center', marginTop: 8 },
  prompt: { color: '#0f0', marginRight: 8 },
  input: {
    flex: 1, background: 'transparent', border: 'none', outline: 'none',
    color: '#0f0', fontFamily: 'inherit', fontSize: 14, caretColor: '#0f0',
  },
};

const translations = {
  en: {
    welcome: `Welcome to dsanchezcr terminal v1.0.0\nType "help" for available commands.\n`,
    notFound: (cmd) => `Command not found: ${cmd}. Type "help" for available commands.`,
    closeLabel: 'Close terminal',
    inputLabel: 'Terminal input',
    commands: {
      help: () =>
        `Available commands:\n  help       — Show this help message\n  whoami     — About David Sanchez\n  projects   — View projects\n  blog       — Visit the blog\n  contact    — Contact information\n  clear      — Clear terminal\n  exit       — Close terminal`,
      whoami: () =>
        `David Sanchez — Software Engineer\nCosta Rica 🇨🇷\nBuilding innovative solutions with technology.\nGitHub: https://github.com/dsanchezcr`,
      projects: () =>
        `Featured Projects:\n→ dsanchezcr.com — This website (Docusaurus + Azure)\n→ colonesexchangerate — Costa Rican currency exchange NPM package\n→ CosmicWorks — Azure Cosmos DB sample app\n\nType "exit" and visit /projects for the full list.`,
      blog: () =>
        `Latest blog topics:\n→ Agentic DevOps\n→ Building Your AI Agent Team\n→ CI/CD in the Agentic Era\n→ GitHub Copilot at Scale\n\nType "exit" and visit /blog to read them.`,
      contact: () =>
        `You can reach David at:\n→ Website: https://dsanchezcr.com/contact\n→ GitHub: https://github.com/dsanchezcr\n→ LinkedIn: https://linkedin.com/in/dsanchezcr\n\nOr just type "exit" and go to /contact.`,
    },
  },
  es: {
    welcome: `Bienvenido a dsanchezcr terminal v1.0.0\nEscribe "help" para ver los comandos disponibles.\n`,
    notFound: (cmd) => `Comando no encontrado: ${cmd}. Escribe "help" para ver los comandos disponibles.`,
    closeLabel: 'Cerrar terminal',
    inputLabel: 'Entrada de terminal',
    commands: {
      help: () =>
        `Comandos disponibles:\n  help       — Mostrar este mensaje de ayuda\n  whoami     — Sobre David Sanchez\n  projects   — Ver proyectos\n  blog       — Visitar el blog\n  contact    — Información de contacto\n  clear      — Limpiar terminal\n  exit       — Cerrar terminal`,
      whoami: () =>
        `David Sanchez — Ingeniero de Software\nCosta Rica 🇨🇷\nConstruyendo soluciones innovadoras con tecnología.\nGitHub: https://github.com/dsanchezcr`,
      projects: () =>
        `Proyectos Destacados:\n→ dsanchezcr.com — Este sitio web (Docusaurus + Azure)\n→ colonesexchangerate — Paquete NPM de tipo de cambio costarricense\n→ CosmicWorks — App de ejemplo de Azure Cosmos DB\n\nEscribe "exit" y visita /projects para la lista completa.`,
      blog: () =>
        `Últimos temas del blog:\n→ DevOps Agéntico\n→ Construyendo tu Equipo de Agentes IA\n→ CI/CD en la Era Agéntica\n→ GitHub Copilot a Escala\n\nEscribe "exit" y visita /blog para leerlos.`,
      contact: () =>
        `Puedes contactar a David en:\n→ Sitio web: https://dsanchezcr.com/contact\n→ GitHub: https://github.com/dsanchezcr\n→ LinkedIn: https://linkedin.com/in/dsanchezcr\n\nO escribe "exit" y ve a /contact.`,
    },
  },
  pt: {
    welcome: `Bem-vindo ao dsanchezcr terminal v1.0.0\nDigite "help" para ver os comandos disponíveis.\n`,
    notFound: (cmd) => `Comando não encontrado: ${cmd}. Digite "help" para ver os comandos disponíveis.`,
    closeLabel: 'Fechar terminal',
    inputLabel: 'Entrada do terminal',
    commands: {
      help: () =>
        `Comandos disponíveis:\n  help       — Mostrar esta mensagem de ajuda\n  whoami     — Sobre David Sanchez\n  projects   — Ver projetos\n  blog       — Visitar o blog\n  contact    — Informações de contato\n  clear      — Limpar terminal\n  exit       — Fechar terminal`,
      whoami: () =>
        `David Sanchez — Engenheiro de Software\nCosta Rica 🇨🇷\nConstruindo soluções inovadoras com tecnologia.\nGitHub: https://github.com/dsanchezcr`,
      projects: () =>
        `Projetos em Destaque:\n→ dsanchezcr.com — Este site (Docusaurus + Azure)\n→ colonesexchangerate — Pacote NPM de câmbio costarriquenho\n→ CosmicWorks — App de exemplo do Azure Cosmos DB\n\nDigite "exit" e visite /projects para a lista completa.`,
      blog: () =>
        `Últimos tópicos do blog:\n→ DevOps Agêntico\n→ Construindo sua Equipe de Agentes IA\n→ CI/CD na Era Agêntica\n→ GitHub Copilot em Escala\n\nDigite "exit" e visite /blog para ler.`,
      contact: () =>
        `Você pode contatar David em:\n→ Site: https://dsanchezcr.com/contact\n→ GitHub: https://github.com/dsanchezcr\n→ LinkedIn: https://linkedin.com/in/dsanchezcr\n\nOu digite "exit" e vá para /contact.`,
    },
  },
};

export default function SecretTerminal({ onClose }) {
  const lang = useLocale();
  const prefix = lang === 'en' ? '' : `/${lang}`;
  const baseT = translations[lang] || translations.en;
  // Inject locale prefix into command outputs
  const t = {
    ...baseT,
    commands: {
      ...baseT.commands,
      projects: () => baseT.commands.projects().replace(/\/projects/g, `${prefix}/projects`),
      blog: () => baseT.commands.blog().replace(/\/blog/g, `${prefix}/blog`),
      contact: () => baseT.commands.contact().replace(/\/contact/g, `${prefix}/contact`),
    },
  };
  const [lines, setLines] = useState([t.welcome]);
  const [input, setInput] = useState('');
  const outputRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();

    // Handle Escape key to close terminal (works on /terminal page too)
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [lines]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const cmd = input.trim().toLowerCase();
    const newLines = [...lines, `> ${input}`];

    if (cmd === 'clear') {
      setLines([]);
    } else if (cmd === 'exit') {
      onClose();
    } else if (t.commands[cmd]) {
      newLines.push(t.commands[cmd]());
      setLines(newLines);
    } else if (cmd) {
      newLines.push(t.notFound(cmd));
      setLines(newLines);
    } else {
      setLines(newLines);
    }
    setInput('');
  };

  return (
    <div style={STYLES.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={STYLES.terminal}>
        <div style={STYLES.header}>
          <h4 style={STYLES.title}>dsanchezcr@terminal:~$</h4>
          <button style={STYLES.closeBtn} onClick={onClose} aria-label={t.closeLabel}>✕</button>
        </div>
        <div ref={outputRef} style={STYLES.output}>
          {lines.map((line, i) => <div key={i}>{line}</div>)}
        </div>
        <form onSubmit={handleSubmit} style={STYLES.inputLine}>
          <span style={STYLES.prompt}>$</span>
          <input
            ref={inputRef}
            style={STYLES.input}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoFocus
            aria-label={t.inputLabel}
          />
        </form>
      </div>
    </div>
  );
}
