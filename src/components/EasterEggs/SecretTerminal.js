import React, { useState, useRef, useEffect } from 'react';

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

const COMMANDS = {
  help: () =>
    `Available commands:
  help       — Show this help message
  whoami     — About David Sanchez
  projects   — View projects
  blog       — Visit the blog
  contact    — Contact information
  clear      — Clear terminal
  exit       — Close terminal`,
  whoami: () =>
    `David Sanchez — Software Engineer
Costa Rica 🇨🇷
Building innovative solutions with technology.
GitHub: https://github.com/dsanchezcr`,
  projects: () =>
    `Featured Projects:
→ dsanchezcr.com — This website (Docusaurus + Azure)
→ colonesexchangerate — Costa Rican currency exchange NPM package
→ CosmicWorks — Azure Cosmos DB sample app

Type "exit" and visit /projects for the full list.`,
  blog: () =>
    `Latest blog topics:
→ Agentic DevOps
→ Building Your AI Agent Team
→ CI/CD in the Agentic Era
→ GitHub Copilot at Scale

Type "exit" and visit /blog to read them.`,
  contact: () =>
    `You can reach David at:
→ Website: https://dsanchezcr.com/contact
→ GitHub: https://github.com/dsanchezcr
→ LinkedIn: https://linkedin.com/in/yourprofile

Or just type "exit" and go to /contact.`,
};

const WELCOME = `Welcome to dsanchezcr terminal v1.0.0
Type "help" for available commands.
`;

export default function SecretTerminal({ onClose }) {
  const [lines, setLines] = useState([WELCOME]);
  const [input, setInput] = useState('');
  const outputRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
    } else if (COMMANDS[cmd]) {
      newLines.push(COMMANDS[cmd]());
      setLines(newLines);
    } else if (cmd) {
      newLines.push(`Command not found: ${cmd}. Type "help" for available commands.`);
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
          <button style={STYLES.closeBtn} onClick={onClose} aria-label="Close terminal">✕</button>
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
            aria-label="Terminal input"
          />
        </form>
      </div>
    </div>
  );
}
