import React, { useState } from 'react';
import Layout from '@theme/Layout';
import { useLocale } from '@site/src/hooks';

const translations = {
  en: {
    title: 'Secrets',
    description: 'Hidden easter eggs and secret features on this website',
    heroTitle: '🥚 Hidden Secrets',
    heroSubtitle: 'This website is full of hidden interactive surprises. Can you find them all? Here are some hints...',
    triggerLabel: 'Trigger',
    howToExit: 'Exit',
    difficultyLabel: 'Difficulty',
    categoryLabel: 'Category',
    found: 'Found it?',
    tryIt: 'Try it now!',
    categories: {
      game: '🎮 Game',
      visual: '✨ Visual',
      tool: '🛠️ Tool',
      hidden: '👀 Hidden',
    },
    eggs: [
      {
        id: 'konami',
        emoji: '🚀',
        name: 'Space Shooter',
        description: 'A classic space shooter game with your own ship, enemy waves, and a score counter. Navigate through space and blast enemies!',
        trigger: 'Type the legendary Konami Code: ↑ ↑ ↓ ↓ ← → ← → B A',
        exit: 'Press Escape or click ✕',
        difficulty: '⭐⭐⭐',
        category: 'game',
        gradient: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
      },
      {
        id: 'terminal',
        emoji: '💻',
        name: 'Secret Terminal',
        description: 'A retro-style hacker terminal with interactive commands. Learn about this website through a CLI interface.',
        trigger: 'Press the backtick key (`) or navigate to /terminal',
        exit: 'Type "exit" or press Escape',
        difficulty: '⭐',
        category: 'tool',
        gradient: 'linear-gradient(135deg, #0a1628 0%, #1a3a2a 100%)',
      },
      {
        id: 'matrix',
        emoji: '🟢',
        name: 'Matrix Rain',
        description: 'The iconic green falling characters from The Matrix. A cascade of katakana and numbers rains across your screen.',
        trigger: 'Type the word "matrix" anywhere on the page',
        exit: 'Auto-fades after 6 seconds',
        difficulty: '⭐⭐',
        category: 'visual',
        gradient: 'linear-gradient(135deg, #000000 0%, #003300 100%)',
      },
      {
        id: 'console',
        emoji: '🔍',
        name: 'Developer Message',
        description: 'A special message awaits curious developers who open their browser\'s DevTools console. ASCII art and useful links included.',
        trigger: 'Open DevTools Console (F12) on any page',
        exit: 'Always there!',
        difficulty: '⭐',
        category: 'hidden',
        gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      },
      {
        id: 'confetti',
        emoji: '🇨🇷',
        name: 'Costa Rica Confetti',
        description: 'A patriotic confetti burst in Costa Rica flag colors — blue, white, and red — rains from the sky!',
        trigger: 'Click the footer copyright text 5 times quickly',
        exit: 'Auto-stops after 3 seconds',
        difficulty: '⭐⭐',
        category: 'visual',
        gradient: 'linear-gradient(135deg, #002b7f 0%, #ce1126 100%)',
      },
      {
        id: 'clippy',
        emoji: '📎',
        name: 'Clippy Returns',
        description: 'The legendary Microsoft Office assistant makes a comeback! Clippy pops up with funny tech jokes and helpful(?) tips.',
        trigger: 'Type the word "microsoft" anywhere on the page',
        exit: 'Click ✕ or wait 10 seconds',
        difficulty: '⭐⭐',
        category: 'visual',
        gradient: 'linear-gradient(135deg, #FFD700 0%, #FF8C00 100%)',
      },
      {
        id: 'birthday',
        emoji: '🎂',
        name: 'Birthday Celebration',
        description: 'A special birthday animation with floating emojis and a celebration banner. Only appears on a very specific date!',
        trigger: 'Visit the website on a special date (hint: January)',
        exit: 'Click dismiss button',
        difficulty: '⭐⭐⭐',
        category: 'hidden',
        gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      },
      {
        id: 'flappy',
        emoji: '🐦',
        name: 'Flappy Bird',
        description: 'A Flappy Bird clone featuring the website\'s logo as the bird! Fly through pipes and try to beat your score.',
        trigger: 'Type the word "flappy" anywhere on the page',
        exit: 'Press Escape or click ✕',
        difficulty: '⭐⭐',
        category: 'game',
        gradient: 'linear-gradient(135deg, #70c5ce 0%, #4a9 100%)',
      },
      {
        id: 'snake',
        emoji: '🐍',
        name: 'Snake Game',
        description: 'The classic Nokia Snake game! Eat food to grow longer, avoid walls and your own tail. How high can you score?',
        trigger: 'Type the word "snake" anywhere on the page',
        exit: 'Press Escape or click ✕',
        difficulty: '⭐⭐',
        category: 'game',
        gradient: 'linear-gradient(135deg, #1a1a2e 0%, #2d5016 100%)',
      },
      {
        id: 'dog',
        emoji: '🐕',
        name: 'Puppy Companion',
        description: 'An adorable ASCII art pixel dog follows your mouse cursor around the page. A loyal companion for your browsing session!',
        trigger: 'Type the word "dogs" anywhere on the page',
        exit: 'Click the dismiss button',
        difficulty: '⭐⭐',
        category: 'visual',
        gradient: 'linear-gradient(135deg, #8B4513 0%, #D2691E 100%)',
      },
    ],
  },
  es: {
    title: 'Secretos',
    description: 'Easter eggs ocultos y funciones secretas en este sitio web',
    heroTitle: '🥚 Secretos Ocultos',
    heroSubtitle: 'Este sitio web está lleno de sorpresas interactivas ocultas. ¿Puedes encontrarlas todas? Aquí tienes algunas pistas...',
    triggerLabel: 'Activación',
    howToExit: 'Salir',
    difficultyLabel: 'Dificultad',
    categoryLabel: 'Categoría',
    found: '¿Lo encontraste?',
    tryIt: '¡Pruébalo ahora!',
    categories: {
      game: '🎮 Juego',
      visual: '✨ Visual',
      tool: '🛠️ Herramienta',
      hidden: '👀 Oculto',
    },
    eggs: [
      {
        id: 'konami',
        emoji: '🚀',
        name: 'Nave Espacial',
        description: 'Un clásico juego de naves espaciales con tu propia nave, oleadas de enemigos y un contador de puntos. ¡Navega por el espacio y destruye enemigos!',
        trigger: 'Escribe el legendario Código Konami: ↑ ↑ ↓ ↓ ← → ← → B A',
        exit: 'Presiona Escape o haz clic en ✕',
        difficulty: '⭐⭐⭐',
        category: 'game',
        gradient: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
      },
      {
        id: 'terminal',
        emoji: '💻',
        name: 'Terminal Secreta',
        description: 'Una terminal estilo retro con comandos interactivos. Conoce este sitio web a través de una interfaz de línea de comandos.',
        trigger: 'Presiona la tecla acento grave (`) o navega a /terminal',
        exit: 'Escribe "exit" o presiona Escape',
        difficulty: '⭐',
        category: 'tool',
        gradient: 'linear-gradient(135deg, #0a1628 0%, #1a3a2a 100%)',
      },
      {
        id: 'matrix',
        emoji: '🟢',
        name: 'Lluvia Matrix',
        description: 'Los icónicos caracteres verdes cayendo de The Matrix. Una cascada de katakana y números llueve por tu pantalla.',
        trigger: 'Escribe la palabra "matrix" en cualquier lugar de la página',
        exit: 'Se desvanece automáticamente después de 6 segundos',
        difficulty: '⭐⭐',
        category: 'visual',
        gradient: 'linear-gradient(135deg, #000000 0%, #003300 100%)',
      },
      {
        id: 'console',
        emoji: '🔍',
        name: 'Mensaje para Desarrolladores',
        description: 'Un mensaje especial espera a los desarrolladores curiosos que abran la consola del navegador. Incluye arte ASCII y enlaces útiles.',
        trigger: 'Abre la Consola de DevTools (F12) en cualquier página',
        exit: '¡Siempre está ahí!',
        difficulty: '⭐',
        category: 'hidden',
        gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      },
      {
        id: 'confetti',
        emoji: '🇨🇷',
        name: 'Confeti de Costa Rica',
        description: '¡Una explosión patriótica de confeti en los colores de la bandera de Costa Rica — azul, blanco y rojo — llueve del cielo!',
        trigger: 'Haz clic en el texto de copyright del pie de página 5 veces rápidamente',
        exit: 'Se detiene automáticamente después de 3 segundos',
        difficulty: '⭐⭐',
        category: 'visual',
        gradient: 'linear-gradient(135deg, #002b7f 0%, #ce1126 100%)',
      },
      {
        id: 'clippy',
        emoji: '📎',
        name: 'Clippy Regresa',
        description: '¡El legendario asistente de Microsoft Office regresa! Clippy aparece con chistes de tecnología y consejos "útiles".',
        trigger: 'Escribe la palabra "microsoft" en cualquier lugar de la página',
        exit: 'Haz clic en ✕ o espera 10 segundos',
        difficulty: '⭐⭐',
        category: 'visual',
        gradient: 'linear-gradient(135deg, #FFD700 0%, #FF8C00 100%)',
      },
      {
        id: 'birthday',
        emoji: '🎂',
        name: 'Celebración de Cumpleaños',
        description: 'Una animación especial de cumpleaños con emojis flotantes y un banner de celebración. ¡Solo aparece en una fecha muy especial!',
        trigger: 'Visita el sitio web en una fecha especial (pista: enero)',
        exit: 'Haz clic en el botón de cerrar',
        difficulty: '⭐⭐⭐',
        category: 'hidden',
        gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      },
      {
        id: 'flappy',
        emoji: '🐦',
        name: 'Flappy Bird',
        description: 'Un clon de Flappy Bird con el logo del sitio web como pájaro. ¡Vuela entre las tuberías e intenta superar tu puntuación!',
        trigger: 'Escribe la palabra "flappy" en cualquier lugar de la página',
        exit: 'Presiona Escape o haz clic en ✕',
        difficulty: '⭐⭐',
        category: 'game',
        gradient: 'linear-gradient(135deg, #70c5ce 0%, #4a9 100%)',
      },
      {
        id: 'snake',
        emoji: '🐍',
        name: 'Juego de la Serpiente',
        description: 'El clásico juego Snake de Nokia. Come para crecer, evita las paredes y tu propia cola. ¿Cuántos puntos puedes lograr?',
        trigger: 'Escribe la palabra "snake" en cualquier lugar de la página',
        exit: 'Presiona Escape o haz clic en ✕',
        difficulty: '⭐⭐',
        category: 'game',
        gradient: 'linear-gradient(135deg, #1a1a2e 0%, #2d5016 100%)',
      },
      {
        id: 'dog',
        emoji: '🐕',
        name: 'Perrito Compañero',
        description: 'Un adorable perrito en arte ASCII sigue tu cursor por la página. ¡Un compañero leal para tu sesión de navegación!',
        trigger: 'Escribe la palabra "dogs" en cualquier lugar de la página',
        exit: 'Haz clic en el botón de cerrar',
        difficulty: '⭐⭐',
        category: 'visual',
        gradient: 'linear-gradient(135deg, #8B4513 0%, #D2691E 100%)',
      },
    ],
  },
  pt: {
    title: 'Segredos',
    description: 'Easter eggs ocultos e funções secretas neste website',
    heroTitle: '🥚 Segredos Ocultos',
    heroSubtitle: 'Este site está cheio de surpresas interativas escondidas. Você consegue encontrar todas? Aqui estão algumas dicas...',
    triggerLabel: 'Ativação',
    howToExit: 'Sair',
    difficultyLabel: 'Dificuldade',
    categoryLabel: 'Categoria',
    found: 'Encontrou?',
    tryIt: 'Tente agora!',
    categories: {
      game: '🎮 Jogo',
      visual: '✨ Visual',
      tool: '🛠️ Ferramenta',
      hidden: '👀 Oculto',
    },
    eggs: [
      {
        id: 'konami',
        emoji: '🚀',
        name: 'Nave Espacial',
        description: 'Um clássico jogo de naves espaciais com sua própria nave, ondas de inimigos e contador de pontos. Navegue pelo espaço e destrua inimigos!',
        trigger: 'Digite o lendário Código Konami: ↑ ↑ ↓ ↓ ← → ← → B A',
        exit: 'Pressione Escape ou clique em ✕',
        difficulty: '⭐⭐⭐',
        category: 'game',
        gradient: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
      },
      {
        id: 'terminal',
        emoji: '💻',
        name: 'Terminal Secreto',
        description: 'Um terminal estilo retro com comandos interativos. Conheça este site através de uma interface de linha de comando.',
        trigger: 'Pressione a tecla crase (`) ou navegue para /terminal',
        exit: 'Digite "exit" ou pressione Escape',
        difficulty: '⭐',
        category: 'tool',
        gradient: 'linear-gradient(135deg, #0a1628 0%, #1a3a2a 100%)',
      },
      {
        id: 'matrix',
        emoji: '🟢',
        name: 'Chuva Matrix',
        description: 'Os icônicos caracteres verdes caindo de The Matrix. Uma cascata de katakana e números chove pela tela.',
        trigger: 'Digite a palavra "matrix" em qualquer lugar da página',
        exit: 'Desaparece automaticamente após 6 segundos',
        difficulty: '⭐⭐',
        category: 'visual',
        gradient: 'linear-gradient(135deg, #000000 0%, #003300 100%)',
      },
      {
        id: 'console',
        emoji: '🔍',
        name: 'Mensagem para Desenvolvedores',
        description: 'Uma mensagem especial aguarda desenvolvedores curiosos que abrirem o console do navegador. Inclui arte ASCII e links úteis.',
        trigger: 'Abra o Console do DevTools (F12) em qualquer página',
        exit: 'Sempre está lá!',
        difficulty: '⭐',
        category: 'hidden',
        gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      },
      {
        id: 'confetti',
        emoji: '🇨🇷',
        name: 'Confete da Costa Rica',
        description: 'Uma explosão patriótica de confete nas cores da bandeira da Costa Rica — azul, branco e vermelho — chove do céu!',
        trigger: 'Clique no texto de copyright do rodapé 5 vezes rapidamente',
        exit: 'Para automaticamente após 3 segundos',
        difficulty: '⭐⭐',
        category: 'visual',
        gradient: 'linear-gradient(135deg, #002b7f 0%, #ce1126 100%)',
      },
      {
        id: 'clippy',
        emoji: '📎',
        name: 'Clippy Retorna',
        description: 'O lendário assistente do Microsoft Office está de volta! Clippy aparece com piadas de tecnologia e dicas "úteis".',
        trigger: 'Digite a palavra "microsoft" em qualquer lugar da página',
        exit: 'Clique em ✕ ou espere 10 segundos',
        difficulty: '⭐⭐',
        category: 'visual',
        gradient: 'linear-gradient(135deg, #FFD700 0%, #FF8C00 100%)',
      },
      {
        id: 'birthday',
        emoji: '🎂',
        name: 'Celebração de Aniversário',
        description: 'Uma animação especial de aniversário com emojis flutuantes e um banner de celebração. Só aparece em uma data muito especial!',
        trigger: 'Visite o site em uma data especial (dica: janeiro)',
        exit: 'Clique no botão de fechar',
        difficulty: '⭐⭐⭐',
        category: 'hidden',
        gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      },
      {
        id: 'flappy',
        emoji: '🐦',
        name: 'Flappy Bird',
        description: 'Um clone do Flappy Bird com o logo do site como pássaro! Voe entre os canos e tente superar sua pontuação.',
        trigger: 'Digite a palavra "flappy" em qualquer lugar da página',
        exit: 'Pressione Escape ou clique em ✕',
        difficulty: '⭐⭐',
        category: 'game',
        gradient: 'linear-gradient(135deg, #70c5ce 0%, #4a9 100%)',
      },
      {
        id: 'snake',
        emoji: '🐍',
        name: 'Jogo da Cobra',
        description: 'O clássico jogo Snake da Nokia! Coma para crescer, evite paredes e sua própria cauda. Quantos pontos você consegue?',
        trigger: 'Digite a palavra "snake" em qualquer lugar da página',
        exit: 'Pressione Escape ou clique em ✕',
        difficulty: '⭐⭐',
        category: 'game',
        gradient: 'linear-gradient(135deg, #1a1a2e 0%, #2d5016 100%)',
      },
      {
        id: 'dog',
        emoji: '🐕',
        name: 'Cachorrinho Companheiro',
        description: 'Um adorável cachorrinho em arte ASCII segue seu cursor pela página. Um companheiro fiel para sua sessão de navegação!',
        trigger: 'Digite a palavra "dogs" em qualquer lugar da página',
        exit: 'Clique no botão de fechar',
        difficulty: '⭐⭐',
        category: 'visual',
        gradient: 'linear-gradient(135deg, #8B4513 0%, #D2691E 100%)',
      },
    ],
  },
};

function EasterEggCard({ egg, t, index }) {
  const [isHovered, setIsHovered] = useState(false);
  const categoryLabel = t.categories[egg.category];

  return (
    <div
      className="easter-egg-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-aos="fade-up"
      data-aos-delay={index * 80}
      style={{
        borderRadius: 16,
        background: egg.gradient,
        color: '#fff',
        padding: '1.75rem',
        transition: 'all 0.3s ease',
        transform: isHovered ? 'translateY(-8px) scale(1.02)' : 'translateY(0) scale(1)',
        boxShadow: isHovered
          ? '0 20px 40px rgba(0, 0, 0, 0.35)'
          : '0 8px 24px rgba(0, 0, 0, 0.2)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* Decorative circle */}
      <div style={{
        position: 'absolute', top: -20, right: -20,
        width: 100, height: 100, borderRadius: '50%',
        background: 'rgba(255,255,255,0.08)', pointerEvents: 'none',
      }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <span style={{ fontSize: 40, lineHeight: 1 }}>{egg.emoji}</span>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>{egg.name}</h3>
          <span style={{
            display: 'inline-block', marginTop: 4,
            background: 'rgba(255,255,255,0.2)', borderRadius: 12,
            padding: '2px 10px', fontSize: '0.75rem', fontWeight: 600,
          }}>
            {categoryLabel}
          </span>
        </div>
      </div>

      {/* Description */}
      <p style={{ fontSize: '0.92rem', lineHeight: 1.6, opacity: 0.92, flex: 1, margin: '0 0 1rem' }}>
        {egg.description}
      </p>

      {/* Details */}
      <div style={{
        background: 'rgba(0,0,0,0.25)', borderRadius: 12, padding: '0.85rem 1rem',
        fontSize: '0.85rem', lineHeight: 1.7,
      }}>
        <div><strong>{t.triggerLabel}:</strong> {egg.trigger}</div>
        <div><strong>{t.howToExit}:</strong> {egg.exit}</div>
        <div style={{ marginTop: 4 }}>
          <strong>{t.difficultyLabel}:</strong>{' '}
          <span style={{ letterSpacing: 2 }}>{egg.difficulty}</span>
        </div>
      </div>
    </div>
  );
}

export default function SecretsPage() {
  const lang = useLocale();
  const t = translations[lang] || translations.en;

  return (
    <Layout title={t.title} description={t.description}>
      <div style={{ background: 'var(--ifm-background-color)', minHeight: 'calc(100vh - 60px)' }}>
        {/* Hero */}
        <div style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          padding: '4rem 2rem', textAlign: 'center', color: '#fff',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: '15%', left: '8%',
            width: 200, height: 200, borderRadius: '50%',
            background: 'rgba(255,255,255,0.03)', pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', bottom: '10%', right: '12%',
            width: 160, height: 160, borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)', pointerEvents: 'none',
          }} />
          <div className="container" style={{ position: 'relative', zIndex: 1 }}>
            <h1 style={{
              fontSize: '2.75rem', fontWeight: 800, marginBottom: '1rem',
              textShadow: '0 2px 4px rgba(0,0,0,0.3)',
            }}>
              {t.heroTitle}
            </h1>
            <p style={{
              fontSize: '1.2rem', maxWidth: 650, margin: '0 auto', opacity: 0.92, lineHeight: 1.6,
            }}>
              {t.heroSubtitle}
            </p>
          </div>
        </div>

        {/* Cards Grid — 5 per row on desktop, responsive on smaller screens */}
        <div className="container" style={{ padding: '3rem 1rem 4rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '1.5rem',
            maxWidth: 1400,
            margin: '0 auto',
          }}>
            {t.eggs.map((egg, i) => (
              <EasterEggCard key={egg.id} egg={egg} t={t} index={i} />
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
