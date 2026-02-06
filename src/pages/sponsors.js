import React from 'react';
import Layout from '@theme/Layout';
import { useLocale } from '@site/src/hooks';
import GitHubSvg from '@site/static/img/Sponsors/github.svg';
import BMCSvg from '@site/static/img/Sponsors/bmc.svg';
import VenmoSvg from '@site/static/img/Sponsors/venmo.svg';

// Translations for all supported languages
const translations = {
  en: {
    title: 'Sponsors',
    description: 'Support my work and help me continue creating content',
    heroTitle: 'Support My Work',
    heroSubtitle: 'Your support helps me keep creating open-source projects, writing blog posts, and sharing knowledge with the community.',
    chooseMethod: 'Choose your preferred way to contribute:',
    github: {
      name: 'GitHub Sponsors',
      description: 'Get recognition on my GitHub profile and exclusive updates',
      cta: 'Sponsor on GitHub'
    },
    bmc: {
      name: 'Buy Me a Coffee',
      description: 'Quick and easy one-time or monthly support',
      cta: 'Buy a Coffee'
    },
    venmo: {
      name: 'Venmo',
      description: 'Simple and direct support via Venmo',
      cta: 'Send via Venmo'
    },
    thanks: 'Thank You!',
    thanksMessage: 'Every contribution, big or small, makes a difference. Your support motivates me to keep learning, building, and sharing.',
    heartEmoji: '❤️'
  },
  es: {
    title: 'Patrocinadores',
    description: 'Apoya mi trabajo y ayúdame a seguir creando contenido',
    heroTitle: 'Apoya Mi Trabajo',
    heroSubtitle: 'Tu apoyo me ayuda a seguir creando proyectos de código abierto, escribiendo artículos y compartiendo conocimientos con la comunidad.',
    chooseMethod: 'Elige tu forma preferida de contribuir:',
    github: {
      name: 'GitHub Sponsors',
      description: 'Obtén reconocimiento en mi perfil de GitHub y actualizaciones exclusivas',
      cta: 'Patrocinar en GitHub'
    },
    bmc: {
      name: 'Buy Me a Coffee',
      description: 'Apoyo rápido y fácil, único o mensual',
      cta: 'Invítame un Café'
    },
    venmo: {
      name: 'Venmo',
      description: 'Apoyo simple y directo a través de Venmo',
      cta: 'Enviar por Venmo'
    },
    thanks: '¡Gracias!',
    thanksMessage: 'Cada contribución, grande o pequeña, hace una diferencia. Tu apoyo me motiva a seguir aprendiendo, construyendo y compartiendo.',
    heartEmoji: '❤️'
  },
  pt: {
    title: 'Patrocinadores',
    description: 'Apoie meu trabalho e me ajude a continuar criando conteúdo',
    heroTitle: 'Apoie Meu Trabalho',
    heroSubtitle: 'Seu apoio me ajuda a continuar criando projetos de código aberto, escrevendo artigos e compartilhando conhecimento com a comunidade.',
    chooseMethod: 'Escolha sua forma preferida de contribuir:',
    github: {
      name: 'GitHub Sponsors',
      description: 'Ganhe reconhecimento no meu perfil do GitHub e atualizações exclusivas',
      cta: 'Patrocinar no GitHub'
    },
    bmc: {
      name: 'Buy Me a Coffee',
      description: 'Apoio rápido e fácil, único ou mensal',
      cta: 'Me Pague um Café'
    },
    venmo: {
      name: 'Venmo',
      description: 'Apoio simples e direto através do Venmo',
      cta: 'Enviar pelo Venmo'
    },
    thanks: 'Obrigado!',
    thanksMessage: 'Cada contribuição, grande ou pequena, faz a diferença. Seu apoio me motiva a continuar aprendendo, construindo e compartilhando.',
    heartEmoji: '❤️'
  }
};

const sponsorMethods = [
  {
    key: 'github',
    url: 'https://github.com/sponsors/dsanchezcr',
    Icon: GitHubSvg,
    gradient: 'linear-gradient(135deg, #24292e 0%, #40494f 100%)',
    hoverGradient: 'linear-gradient(135deg, #2d333b 0%, #4a545e 100%)'
  },
  {
    key: 'bmc',
    url: 'https://buymeacoffee.com/dsanchezcr',
    Icon: BMCSvg,
    gradient: 'linear-gradient(135deg, #ff813f 0%, #ffdd00 100%)',
    hoverGradient: 'linear-gradient(135deg, #ff9959 0%, #ffeb4d 100%)'
  },
  {
    key: 'venmo',
    url: 'https://venmo.com/dsanchezcr',
    Icon: VenmoSvg,
    gradient: 'linear-gradient(135deg, #3d95ce 0%, #008cff 100%)',
    hoverGradient: 'linear-gradient(135deg, #4aa8e8 0%, #1a9fff 100%)'
  }
];

function SponsorCard({ method, translations }) {
  const t = translations[method.key];
  const { Icon, url, gradient, hoverGradient } = method;
  
  const [isHovered, setIsHovered] = React.useState(false);
  
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="sponsor-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '2rem 1.5rem',
        borderRadius: '16px',
        background: isHovered ? hoverGradient : gradient,
        textDecoration: 'none',
        color: '#ffffff',
        transition: 'all 0.3s ease',
        transform: isHovered ? 'translateY(-8px) scale(1.02)' : 'translateY(0) scale(1)',
        boxShadow: isHovered
          ? '0 20px 40px rgba(0, 0, 0, 0.25)'
          : '0 8px 24px rgba(0, 0, 0, 0.15)',
        minHeight: '280px',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Decorative circles */}
      <div style={{
        position: 'absolute',
        top: '-20px',
        right: '-20px',
        width: '100px',
        height: '100px',
        borderRadius: '50%',
        background: 'rgba(255, 255, 255, 0.1)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-30px',
        left: '-30px',
        width: '120px',
        height: '120px',
        borderRadius: '50%',
        background: 'rgba(255, 255, 255, 0.08)',
        pointerEvents: 'none'
      }} />
      
      {/* Icon container */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '16px',
        padding: '1.25rem',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        transition: 'transform 0.3s ease',
        transform: isHovered ? 'scale(1.1)' : 'scale(1)'
      }}>
        <Icon width="60" height="60" />
      </div>
      
      {/* Content */}
      <h3 style={{
        margin: '0 0 0.5rem 0',
        fontSize: '1.35rem',
        fontWeight: '700',
        textAlign: 'center',
        textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
      }}>
        {t.name}
      </h3>
      
      <p style={{
        margin: '0 0 1.25rem 0',
        fontSize: '0.95rem',
        textAlign: 'center',
        opacity: '0.9',
        lineHeight: '1.5',
        flex: 1
      }}>
        {t.description}
      </p>
      
      {/* CTA Button */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.2)',
        padding: '0.75rem 1.5rem',
        borderRadius: '25px',
        fontWeight: '600',
        fontSize: '0.9rem',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        transition: 'all 0.3s ease',
        transform: isHovered ? 'scale(1.05)' : 'scale(1)'
      }}>
        {t.cta} →
      </div>
    </a>
  );
}

export default function Sponsors() {
  const lang = useLocale();
  const t = translations[lang] || translations.en;
  
  return (
    <Layout title={t.title} description={t.description}>
      <div className="sponsors-page" style={{ 
        background: 'var(--ifm-background-color)',
        minHeight: 'calc(100vh - 60px)'
      }}>
        {/* Hero Section */}
        <div style={{
          background: 'linear-gradient(135deg, var(--ifm-color-primary) 0%, var(--ifm-color-primary-darker) 100%)',
          padding: '4rem 2rem',
          textAlign: 'center',
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Background decorative elements */}
          <div style={{
            position: 'absolute',
            top: '20%',
            left: '10%',
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.05)',
            pointerEvents: 'none'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '10%',
            right: '15%',
            width: '150px',
            height: '150px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.08)',
            pointerEvents: 'none'
          }} />
          
          <div className="container" style={{ position: 'relative', zIndex: 1 }}>
            <h1 style={{
              fontSize: '2.75rem',
              fontWeight: '800',
              marginBottom: '1rem',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
            }}>
              {t.heroTitle}
            </h1>
            <p style={{
              fontSize: '1.2rem',
              maxWidth: '600px',
              margin: '0 auto',
              opacity: '0.95',
              lineHeight: '1.7'
            }}>
              {t.heroSubtitle}
            </p>
          </div>
        </div>
        
        {/* Sponsor Methods Section */}
        <div className="container" style={{ padding: '4rem 2rem' }}>
          <h2 style={{
            textAlign: 'center',
            marginBottom: '3rem',
            fontSize: '1.5rem',
            fontWeight: '600',
            color: 'var(--ifm-font-color-base)'
          }}>
            {t.chooseMethod}
          </h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '2rem',
            maxWidth: '1000px',
            margin: '0 auto'
          }}>
            {sponsorMethods.map((method) => (
              <SponsorCard key={method.key} method={method} translations={t} />
            ))}
          </div>
        </div>
        
        {/* Thank You Section */}
        <div style={{
          background: 'var(--ifm-color-emphasis-100)',
          padding: '4rem 2rem',
          textAlign: 'center'
        }}>
          <div className="container">
            <div style={{
              maxWidth: '600px',
              margin: '0 auto',
              padding: '2rem',
              background: 'var(--ifm-background-color)',
              borderRadius: '16px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
            }}>
              <span style={{ fontSize: '3rem' }}>{t.heartEmoji}</span>
              <h2 style={{
                marginTop: '1rem',
                marginBottom: '1rem',
                fontSize: '2rem',
                fontWeight: '700',
                color: 'var(--ifm-font-color-base)'
              }}>
                {t.thanks}
              </h2>
              <p style={{
                color: 'var(--ifm-font-color-secondary)',
                fontSize: '1.1rem',
                lineHeight: '1.7',
                margin: 0
              }}>
                {t.thanksMessage}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
