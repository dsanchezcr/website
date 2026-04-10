
import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import ReactMarkdown from 'react-markdown';
import { useLocale } from '@site/src/hooks';
import styles from './styles.module.css';
import { config } from '../../config/environment';

// Localized content
const translations = {
  en: {
    chatTitle: "Ask me about my website",
    chatSubtitle: "Powered by Microsoft Foundry",
    welcomeTitle: "👋 Hello Friend!",
    welcomeDescription: "You can ask me about:",
    welcomeItems: [
      "Blog posts or technical articles.",
      "Projects and contributions.",     
      "Gaming: Xbox, PlayStation, Switch, board games, chess, monthly updates.",
      "Movies & TV reviews, About me & health journey."
    ],
    inputPlaceholder: "Ask me anything about this website...",
    chatIconTooltip: "Chat with David's AI Assistant",
    fallbackResponse: (query) => `Thanks for your question about "${query}". The NLWeb backend is currently being set up with Microsoft Foundry integration. Meanwhile, you can explore David's blog for insights on Azure technologies, developer productivity, and his latest projects. Check out the blog, projects, and about sections to learn more!`,
    greetings: {
      home: "👋 Hi! Ask me anything about this site.",
      blog: "📝 Have questions about this post?",
      gaming: "🎮 Ask about my gaming collection!",
      'movies-tv': "🎬 Curious about my reviews?",
      projects: "🚀 Want to know more about a project?",
      about: "👋 Want to know more about David?",
      default: "💬 Need help? Ask me anything!",
    },
  },
  es: {
    chatTitle: "Pregúntame sobre mi sitio web",
    chatSubtitle: "Impulsado por Microsoft Foundry",
    welcomeTitle: "👋 ¡Hola Amig@!",
    welcomeDescription: "Puedes preguntarme sobre:",
    welcomeItems: [
      "Publicaciones de blog o artículos técnicos.",
      "Proyectos y contribuciones.",
      "Gaming: Xbox, PlayStation, Switch, juegos de mesa, ajedrez, actualizaciones mensuales.",
      "Reseñas de películas y series, Sobre mí y mi viaje de salud."
    ],
    inputPlaceholder: "Pregúntame cualquier cosa sobre este sitio web...",
    chatIconTooltip: "Chatea con el Asistente de IA de David",
    fallbackResponse: (query) => `Gracias por tu pregunta sobre "${query}". El backend de NLWeb se está configurando actualmente con la integración de Microsoft Foundry. Mientras tanto, puedes explorar el blog de David para obtener información sobre tecnologías de Azure, productividad del desarrollador y sus últimos proyectos. ¡Consulta las secciones de blog, proyectos y acerca de para obtener más información!`,
    greetings: {
      home: "👋 ¡Hola! Pregúntame lo que quieras.",
      blog: "📝 ¿Tienes preguntas sobre este artículo?",
      gaming: "🎮 ¡Pregunta sobre mi colección de juegos!",
      'movies-tv': "🎬 ¿Curiosidad sobre mis reseñas?",
      projects: "🚀 ¿Quieres saber más de un proyecto?",
      about: "👋 ¿Quieres saber más sobre David?",
      default: "💬 ¿Necesitas ayuda? ¡Pregúntame!",
    },
  },
  pt: {
    chatTitle: "Pergunte-me sobre meu site",
    chatSubtitle: "Desenvolvido com Microsoft Foundry",
    welcomeTitle: "👋 Olá amig@!",
    welcomeDescription: "Você pode me perguntar sobre:",
    welcomeItems: [
      "Posts no blog ou artigos técnicos.",
      "Projetos e contribuições.",
      "Gaming: Xbox, PlayStation, Switch, jogos de tabuleiro, xadrez, atualizações mensais.",
      "Resenhas de filmes e séries, Sobre mim e minha jornada de saúde."
    ],
    inputPlaceholder: "Pergunte-me qualquer coisa sobre este site...",
    chatIconTooltip: "Converse com o Assistente de IA do David",
    fallbackResponse: (query) => `Obrigado pela sua pergunta sobre "${query}". O backend do NLWeb está sendo configurado atualmente com integração do Microsoft Foundry. Enquanto isso, você pode explorar o blog do David para insights sobre tecnologias Azure, produtividade do desenvolvedor e seus projetos mais recentes. Confira as seções blog, projetos e sobre para saber mais!`,
    greetings: {
      home: "👋 Olá! Pergunte-me qualquer coisa.",
      blog: "📝 Tem perguntas sobre este artigo?",
      gaming: "🎮 Pergunte sobre minha coleção de jogos!",
      'movies-tv': "🎬 Curioso sobre minhas resenhas?",
      projects: "🚀 Quer saber mais sobre um projeto?",
      about: "👋 Quer saber mais sobre o David?",
      default: "💬 Precisa de ajuda? Pergunte-me!",
    },
  },
};

// Extract current page context to provide the AI with page-aware responses
const getPageContext = () => {
  if (typeof window === 'undefined') return null;

  const path = window.location.pathname;
  const title = document.title?.replace(/\s*[|–-]\s*David Sanchez.*$/, '').trim() || '';

  // Extract main content text from the page
  const mainEl = document.querySelector('article') || document.querySelector('main');
  let content = '';
  if (mainEl) {
    // Clone to avoid modifying the DOM
    const clone = mainEl.cloneNode(true);
    // Remove nav, footer, scripts, styles, chat widget itself
    clone.querySelectorAll('nav, footer, script, style, .chatBubbleContainer, header').forEach(el => el.remove());
    content = clone.textContent?.replace(/\s+/g, ' ').trim() || '';
    // Limit to ~2000 chars to stay within API limits
    if (content.length > 2000) {
      content = content.substring(0, 2000);
    }
  }

  // Determine section from the path (normalize locale prefixes like /es, /pt)
  const normalizedPath = path.replace(/^\/(es|pt)(?=\/|$)/, '') || '/';
  let section = 'home';
  if (normalizedPath.startsWith('/blog')) section = 'blog';
  else if (normalizedPath.startsWith('/gaming')) section = 'gaming';
  else if (normalizedPath.startsWith('/movies-tv')) section = 'movies-tv';
  else if (normalizedPath.startsWith('/disney')) section = 'disney';
  else if (normalizedPath.startsWith('/universal')) section = 'universal';
  else if (normalizedPath.startsWith('/3dprinting')) section = '3dprinting';
  else if (normalizedPath.startsWith('/about')) section = 'about';
  else if (normalizedPath.startsWith('/projects')) section = 'projects';
  else if (normalizedPath.startsWith('/contact')) section = 'contact';
  else if (normalizedPath.startsWith('/sponsors')) section = 'sponsors';
  else if (normalizedPath.startsWith('/weather')) section = 'weather';
  else if (normalizedPath.startsWith('/exchangerates')) section = 'exchangerates';

  return { path, title, content, section };
};

const NLWebChat = () => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState(null); // Store session ID for conversation continuity
  const [showGreeting, setShowGreeting] = useState(false);
  const messagesEndRef = useRef(null);
  
  // Use shared locale hook for consistency
  const locale = useLocale();
  const t = translations[locale] || translations.en;
  
  // Feature flag check - moved after hooks to comply with Rules of Hooks
  const isFeatureEnabled = config.features.aiChat;

  // Contextual greeting tooltip — show after 5 seconds, hide after 8 more
  useEffect(() => {
    if (!isFeatureEnabled) return;
    const showTimer = setTimeout(() => {
      if (!isOpen) setShowGreeting(true);
    }, 5000);
    const hideTimer = setTimeout(() => {
      setShowGreeting(false);
    }, 13000);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [isFeatureEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // Get contextual greeting based on current page section
  const getGreetingText = () => {
    if (typeof window === 'undefined') return t.greetings?.default || '';
    const path = window.location.pathname;
    const normalizedPath = path.replace(/^\/(es|pt)(?=\/|$)/, '') || '/';
    const greetings = t.greetings || {};
    if (normalizedPath === '/' || normalizedPath === '') return greetings.home || greetings.default;
    for (const [key, text] of Object.entries(greetings)) {
      if (key !== 'default' && key !== 'home' && normalizedPath.startsWith(`/${key}`)) return text;
    }
    return greetings.default || '';
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Capture current page context for page-aware responses
      const pageContext = getPageContext();

      // Use environment.js config to get the API endpoint
      const apiUrl = config.getApiEndpoint() + config.routes.chat;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          query: userMessage.text,
          language: locale, // Pass user's language for localized responses
          currentPage: pageContext, // Pass current page context for page-aware responses
          sessionId: sessionId // Pass session ID for conversation continuity
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Store the session ID returned by the server for future requests
        if (data.session_id) {
          setSessionId(data.session_id);
        }
        const botMessage = {
          id: Date.now() + 1,
          text: data.result,
          sender: 'bot',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMessage]);
      } else {
        throw new Error(`API response: ${response.status}`);
      }
    } catch (error) {
      console.warn('NLWeb API not available, using fallback response:', error);
      
      // Fallback to simulated response if API is not available
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const fallbackMessage = {
        id: Date.now() + 1,
        text: t.fallbackResponse(userMessage.text),
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, fallbackMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Return null after hooks if feature is disabled
  if (!isFeatureEnabled) {
    return null;
  }

  return (
    <>
      {/* Floating Chat Bubble */}
      <div className={styles.chatBubbleContainer}>
        {/* Contextual greeting tooltip */}
        {showGreeting && !isOpen && (
          <div
            className={styles.greetingTooltip}
            onClick={() => { setShowGreeting(false); setIsOpen(true); }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') { setShowGreeting(false); setIsOpen(true); } }}
          >
            <span>{getGreetingText()}</span>
            <button
              className={styles.greetingClose}
              onClick={(e) => { e.stopPropagation(); setShowGreeting(false); }}
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        )}
        <button
          className={clsx(styles.chatBubbleIcon, { [styles.chatOpen]: isOpen })}
          onClick={() => { setIsOpen(!isOpen); setShowGreeting(false); }}
          title={t.chatIconTooltip}
          aria-label={t.chatIconTooltip}
        >
          {isOpen ? '✕' : '💬'}
        </button>
        
        {/* Chat Widget */}
        <div className={clsx(styles.chatWidget, { [styles.chatWidgetOpen]: isOpen })}>
          <div className={styles.chatHeader}>
            <h3>{t.chatTitle}</h3>
            <p>{t.chatSubtitle}</p>
            <button 
              className={styles.closeButton}
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
            >
              ✕
            </button>
          </div>
          
          <div className={styles.chatMessages}>
            {messages.length === 0 && (
              <div className={styles.welcomeMessage}>
                <p>{t.welcomeTitle}</p>
                <p>{t.welcomeDescription}</p>
                <ul>
                  {t.welcomeItems.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {messages.map((message) => (
              <div 
                key={message.id} 
                className={clsx(
                  styles.message, 
                  message.sender === 'user' ? styles.userMessage : styles.botMessage
                )}
              >
                <div className={styles.messageContent}>
                  {message.sender === 'bot' ? (
                    <div className={styles.markdownContent}>
                      <ReactMarkdown
                        components={{
                          // Open links in new tab
                          a: ({node, ...props}) => (
                            <a {...props} target="_blank" rel="noopener noreferrer" />
                          ),
                          // Style paragraphs
                          p: ({node, ...props}) => (
                            <p style={{ margin: '0.5em 0' }} {...props} />
                          ),
                        }}
                      >
                        {message.text}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p>{message.text}</p>
                  )}
                  <span className={styles.timestamp}>
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className={clsx(styles.message, styles.botMessage)}>
                <div className={styles.messageContent}>
                  <div className={styles.typing}>
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          
          <form onSubmit={handleSubmit} className={styles.chatForm}>
            <div className={styles.inputGroup}>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={t.inputPlaceholder}
                className={styles.chatInput}
                disabled={isLoading}
              />
              <button 
                type="submit" 
                className={styles.sendButton}
                disabled={isLoading || !inputValue.trim()}
              >
                {isLoading ? '...' : '→'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default NLWebChat;