import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { useLocation } from '@docusaurus/router';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './styles.module.css';

// Localized content
const localizedContent = {
  en: {
    chatTitle: "Ask me about David's work and interests",
    chatSubtitle: "Powered by NLWeb and Azure OpenAI",
    welcomeTitle: "👋 Hello! I'm here to help you learn about David Sanchez.",
    welcomeDescription: "You can ask me about:",
    welcomeItems: [
      "His blog posts and technical articles",
      "His projects and contributions", 
      "His experience with Azure and Microsoft technologies",
      "Speaking topics and presentations"
    ],
    inputPlaceholder: "Ask me anything about David...",
    chatIconTooltip: "Chat with David's AI Assistant"
  },
  es: {
    chatTitle: "Pregúntame sobre el trabajo e intereses de David",
    chatSubtitle: "Powered by NLWeb and Azure OpenAI",
    welcomeTitle: "👋 ¡Hola! Estoy aquí para ayudarte a conocer sobre David Sanchez.",
    welcomeDescription: "Puedes preguntarme sobre:",
    welcomeItems: [
      "Sus artículos técnicos y posts del blog",
      "Sus proyectos y contribuciones",
      "Su experiencia con Azure y tecnologías de Microsoft", 
      "Temas de charlas y presentaciones"
    ],
    inputPlaceholder: "Pregúntame lo que quieras sobre David...",
    chatIconTooltip: "Chatea con el Asistente IA de David"
  },
  pt: {
    chatTitle: "Pergunte-me sobre o trabalho e interesses do David", 
    chatSubtitle: "Powered by NLWeb and Azure OpenAI",
    welcomeTitle: "👋 Olá! Estou aqui para ajudá-lo a conhecer sobre David Sanchez.",
    welcomeDescription: "Você pode me perguntar sobre:",
    welcomeItems: [
      "Seus artigos técnicos e posts do blog",
      "Seus projetos e contribuições",
      "Sua experiência com Azure e tecnologias Microsoft",
      "Tópicos de palestras e apresentações"
    ],
    inputPlaceholder: "Pergunte-me qualquer coisa sobre David...",
    chatIconTooltip: "Converse com o Assistente IA do David"
  }
};

export default function NLWebChat() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const location = useLocation();
  const { i18n } = useDocusaurusContext();
  
  // Get current locale from Docusaurus context with fallback to URL detection
  const getCurrentLocale = () => {
    // Try to get locale from Docusaurus context first
    if (i18n && i18n.currentLocale) {
      return i18n.currentLocale;
    }
    
    // Fallback to URL-based detection
    const pathname = location.pathname;
    if (pathname.startsWith('/es/') || pathname === '/es') return 'es';
    if (pathname.startsWith('/pt/') || pathname === '/pt') return 'pt';
    return 'en';
  };
  
  const currentLocale = getCurrentLocale();
  const content = localizedContent[currentLocale] || localizedContent.en;

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
      // Try to call the NLWeb API backend
      const apiUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:8080/api/chat'
        : '/api/chat';
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage.text }),
      });

      if (response.ok) {
        const data = await response.json();
        const botMessage = {
          id: Date.now() + 1,
          text: data.response,
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
      
      const fallbackResponses = {
        en: `Thanks for your question about "${userMessage.text}". The NLWeb backend is currently being set up with Azure OpenAI integration. Meanwhile, you can explore David's blog for insights on Azure technologies, developer productivity, and his latest projects. Check out the blog, projects, and about sections to learn more!`,
        es: `Gracias por tu pregunta sobre "${userMessage.text}". El backend de NLWeb se está configurando actualmente con la integración de Azure OpenAI. Mientras tanto, puedes explorar el blog de David para obtener información sobre tecnologías de Azure, productividad del desarrollador y sus últimos proyectos. ¡Consulta las secciones de blog, proyectos y acerca de para obtener más información!`,
        pt: `Obrigado pela sua pergunta sobre "${userMessage.text}". O backend do NLWeb está sendo configurado atualmente com integração do Azure OpenAI. Enquanto isso, você pode explorar o blog do David para insights sobre tecnologias Azure, produtividade do desenvolvedor e seus projetos mais recentes. Confira as seções blog, projetos e sobre para saber mais!`
      };
      
      const fallbackMessage = {
        id: Date.now() + 1,
        text: fallbackResponses[currentLocale],
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, fallbackMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Chat Bubble */}
      <div className={styles.chatBubbleContainer}>
        <button
          className={clsx(styles.chatBubbleIcon, { [styles.chatOpen]: isOpen })}
          onClick={() => setIsOpen(!isOpen)}
          title={content.chatIconTooltip}
          aria-label={content.chatIconTooltip}
        >
          {isOpen ? '✕' : '💬'}
        </button>
        
        {/* Chat Widget */}
        <div className={clsx(styles.chatWidget, { [styles.chatWidgetOpen]: isOpen })}>
          <div className={styles.chatHeader}>
            <h3>{content.chatTitle}</h3>
            <p>{content.chatSubtitle}</p>
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
                <p>{content.welcomeTitle}</p>
                <p>{content.welcomeDescription}</p>
                <ul>
                  {content.welcomeItems.map((item, index) => (
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
                  <p>{message.text}</p>
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
                placeholder={content.inputPlaceholder}
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
}