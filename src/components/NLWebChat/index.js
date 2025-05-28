import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import styles from './styles.module.css';

export default function NLWebChat() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

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
      // TODO: Replace with actual NLWeb API call
      // For now, simulate a response
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const botMessage = {
        id: Date.now() + 1,
        text: `I received your message: "${userMessage.text}". The NLWeb backend integration is in progress. Once connected to Azure OpenAI, I'll be able to provide intelligent responses about David's website content.`,
        sender: 'bot',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        text: 'Sorry, I encountered an error. Please try again.',
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.nlwebChat}>
      <div className={styles.chatHeader}>
        <h3>Ask me about David's work and interests</h3>
        <p>Powered by NLWeb and Azure OpenAI</p>
      </div>
      
      <div className={styles.chatMessages}>
        {messages.length === 0 && (
          <div className={styles.welcomeMessage}>
            <p>👋 Hello! I'm here to help you learn about David Sanchez.</p>
            <p>You can ask me about:</p>
            <ul>
              <li>His blog posts and technical articles</li>
              <li>His projects and contributions</li>
              <li>His experience with Azure and Microsoft technologies</li>
              <li>Speaking topics and presentations</li>
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
            placeholder="Ask me anything about David..."
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
  );
}