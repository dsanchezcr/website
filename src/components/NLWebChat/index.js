
import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { useLocale } from '@site/src/hooks';
import styles from './styles.module.css';
import { config } from '../../config/environment';

// Localized content
const translations = {
  en: {
    chatTitle: "Ask me about my website",
    chatSubtitle: "Powered by Azure OpenAI",
    welcomeTitle: "👋 Hello Friend!",
    welcomeDescription: "You can ask me about:",
    welcomeItems: [
      "Blog posts or technical articles.",
      "Projects and contributions.",     
      "Speaking topics and presentations",
      "Tech behind the website."
    ],
    inputPlaceholder: "Ask me anything about this website...",
    chatIconTooltip: "Chat with David's AI Assistant",
    fallbackResponse: (query) => `Thanks for your question about "${query}". The NLWeb backend is currently being set up with Azure OpenAI integration. Meanwhile, you can explore David's blog for insights on Azure technologies, developer productivity, and his latest projects. Check out the blog, projects, and about sections to learn more!`
  },
  es: {
    chatTitle: "Pregúntame sobre mi sitio web",
    chatSubtitle: "Impulsado por Azure OpenAI",
    welcomeTitle: "👋 ¡Hola Amig@!",
    welcomeDescription: "Puedes preguntarme sobre:",
    welcomeItems: [
      "Publicaciones de blog o artículos técnicos.",
      "Proyectos y contribuciones.",
      "Temas de charlas y presentaciones",
      "Tecnología detrás del sitio web."
    ],
    inputPlaceholder: "Pregúntame cualquier cosa sobre este sitio web...",
    chatIconTooltip: "Chatea con el Asistente de IA de David",
    fallbackResponse: (query) => `Gracias por tu pregunta sobre "${query}". El backend de NLWeb se está configurando actualmente con la integración de Azure OpenAI. Mientras tanto, puedes explorar el blog de David para obtener información sobre tecnologías de Azure, productividad del desarrollador y sus últimos proyectos. ¡Consulta las secciones de blog, proyectos y acerca de para obtener más información!`
  },
  pt: {
    chatTitle: "Pergunte-me sobre meu site",
    chatSubtitle: "Desenvolvido com Azure OpenAI",
    welcomeTitle: "👋 Olá amig@!",
    welcomeDescription: "Você pode me perguntar sobre:",
    welcomeItems: [
      "Posts no blog ou artigos técnicos.",
      "Projetos e contribuições.",
      "Tópicos de palestras e apresentações",
      "Tecnologia por trás do site."
    ],
    inputPlaceholder: "Pergunte-me qualquer coisa sobre este site...",
    chatIconTooltip: "Converse com o Assistente de IA do David",
    fallbackResponse: (query) => `Obrigado pela sua pergunta sobre "${query}". O backend do NLWeb está sendo configurado atualmente com integração do Azure OpenAI. Enquanto isso, você pode explorar o blog do David para insights sobre tecnologias Azure, produtividade do desenvolvedor e seus projetos mais recentes. Confira as seções blog, projetos e sobre para saber mais!`
  },
};

const NLWebChat = () => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef(null);
  
  // Use shared locale hook for consistency
  const locale = useLocale();
  const t = translations[locale] || translations.en;
  
  // Feature flag check - moved after hooks to comply with Rules of Hooks
  const isFeatureEnabled = config.features.aiChat;

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
      // Use environment.js config to get the API endpoint
      const apiUrl = config.getApiEndpoint() + '/api/nlweb/ask';
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: userMessage.text }),
      });

      if (response.ok) {
        const data = await response.json();
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
        <button
          className={clsx(styles.chatBubbleIcon, { [styles.chatOpen]: isOpen })}
          onClick={() => setIsOpen(!isOpen)}
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