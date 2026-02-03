import React, { useState } from 'react';
import Layout from '@theme/Layout';
import { config } from '../config/environment';
import { useLocation } from '@docusaurus/router';
import { GoogleReCaptchaProvider, useGoogleReCaptcha } from 'react-google-recaptcha-v3';

// Translations for all supported languages
const translations = {
  en: {
    title: 'Contact',
    description: 'Contact Page',
    intro: 'Feel free to reach out if you have any question or suggestion.',
    nameLabel: 'Name:',
    emailLabel: 'Email:',
    messageLabel: 'Message:',
    submitButton: 'Submit',
    thanks: 'Thanks.',
    successTitle: 'Email verification sent!',
    successMessage: 'Please check your email and click the verification link to complete your contact request.',
    successSpam: "If you don't see it, please check your spam folder.",
    recaptchaNotice: 'This site is protected by reCAPTCHA and the Google',
    privacyPolicy: 'Privacy Policy',
    and: 'and',
    termsOfService: 'Terms of Service',
    apply: 'apply.',
    errorGeneric: 'There was an error submitting the form. Please try again later.',
    errorRecaptcha: 'Security verification is not ready. Please wait a moment and try again.',
    validationName: 'Please enter your name (2-100 characters).',
    validationEmail: 'Please enter a valid email address.',
    validationMessage: 'Please enter a message (10-5000 characters).',
  },
  es: {
    title: 'Contacto',
    description: 'Página de contacto',
    intro: 'No dude en comunicarse si tiene alguna pregunta o sugerencia.',
    nameLabel: 'Nombre:',
    emailLabel: 'Email:',
    messageLabel: 'Mensaje:',
    submitButton: 'Enviar',
    thanks: 'Gracias.',
    successTitle: '¡Verificación de correo enviada!',
    successMessage: 'Por favor revisa tu correo y haz clic en el enlace de verificación para completar tu solicitud de contacto.',
    successSpam: 'Si no lo ves, revisa tu carpeta de spam.',
    recaptchaNotice: 'Este sitio está protegido por reCAPTCHA y se aplican la',
    privacyPolicy: 'Política de privacidad',
    and: 'y los',
    termsOfService: 'Términos de servicio',
    apply: 'de Google.',
    errorGeneric: 'Ha ocurrido un error al enviar el formulario. Por favor, inténtelo de nuevo.',
    errorRecaptcha: 'La verificación de seguridad no está lista. Por favor espere un momento e intente de nuevo.',
    validationName: 'Por favor ingrese su nombre (2-100 caracteres).',
    validationEmail: 'Por favor ingrese un correo electrónico válido.',
    validationMessage: 'Por favor ingrese un mensaje (10-5000 caracteres).',
  },
  pt: {
    title: 'Contato',
    description: 'Página de contato',
    intro: 'Sinta-se à vontade para entrar em contato se tiver alguma dúvida ou sugestão.',
    nameLabel: 'Nome:',
    emailLabel: 'Email:',
    messageLabel: 'Mensagem:',
    submitButton: 'Enviar',
    thanks: 'Obrigado.',
    successTitle: 'Verificação de e-mail enviada!',
    successMessage: 'Por favor, verifique seu e-mail e clique no link de verificação para completar sua solicitação de contato.',
    successSpam: 'Se não encontrar, verifique sua pasta de spam.',
    recaptchaNotice: 'Este site é protegido pelo reCAPTCHA e se aplicam a',
    privacyPolicy: 'Política de Privacidade',
    and: 'e os',
    termsOfService: 'Termos de Serviço',
    apply: 'do Google.',
    errorGeneric: 'Ocorreu um erro ao enviar o formulário. Por favor, tente novamente.',
    errorRecaptcha: 'A verificação de segurança não está pronta. Por favor aguarde um momento e tente novamente.',
    validationName: 'Por favor, insira seu nome (2-100 caracteres).',
    validationEmail: 'Por favor, insira um endereço de e-mail válido.',
    validationMessage: 'Por favor, insira uma mensagem (10-5000 caracteres).',
  }
};

function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState(''); // Honeypot field
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const location = useLocation();
  const { executeRecaptcha } = useGoogleReCaptcha();
  
  // Extract language from URL path
  const getLanguage = () => {
    const pathname = location.pathname;
    if (pathname.startsWith('/es/') || pathname === '/es') return 'es';
    if (pathname.startsWith('/pt/') || pathname === '/pt') return 'pt';
    return 'en';
  };
  
  const lang = getLanguage();
  const t = translations[lang] || translations.en;

  // Client-side validation
  const validateForm = () => {
    if (!name.trim() || name.trim().length < 2 || name.trim().length > 100) {
      setError(t.validationName);
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setError(t.validationEmail);
      return false;
    }
    
    if (!message.trim() || message.trim().length < 10 || message.trim().length > 5000) {
      setError(t.validationMessage);
      return false;
    }
    
    return true;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate form
    if (!validateForm()) {
      return;
    }

    if (!executeRecaptcha) {
      setError(t.errorRecaptcha);
      return;
    }

    try {
      setIsLoading(true);
      
      // Get reCAPTCHA token
      const token = await executeRecaptcha('contact_form');

      const requestData = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        message: message.trim(),
        language: lang,
        recaptchaToken: token,
        website: website // Honeypot field
      };
    
      const apiEndpoint = config.getApiEndpoint();
      const response = await fetch(`${apiEndpoint}/api/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const contentType = response.headers.get('Content-Type');
      let responseData;
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      if (!response.ok) {
        const errorMessage = responseData?.error || t.errorGeneric;
        setError(errorMessage);
        setIsLoading(false);
        return;
      }
      
      // Success
      setIsSuccess(true);
      setName('');
      setEmail('');
      setMessage('');
      setWebsite('');
    } catch (err) {
      setError(t.errorGeneric);
    } finally {
      setIsLoading(false);
    }
  };

  // Success state
  if (isSuccess) {
    return (
      <Layout title={t.title} description={t.description}>
        <div className="container margin-vert--lg">
          <div className="row">
            <div className="col col--8 col--offset-2">
              <div style={{ 
                textAlign: 'center', 
                padding: '40px 20px',
                backgroundColor: 'var(--ifm-color-success-contrast-background)',
                borderRadius: '8px',
                border: '1px solid var(--ifm-color-success-dark)'
              }}>
                <h2 style={{ color: 'var(--ifm-color-success-dark)' }}>✓ {t.successTitle}</h2>
                <p>{t.successMessage}</p>
                <p style={{ color: 'var(--ifm-color-emphasis-600)', fontSize: '0.9em' }}>
                  {t.successSpam}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Layout title={t.title} description={t.description}>
        <div className="container margin-vert--lg">
          <div className="row">
            <div className="col col--8 col--offset-2" style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div className="loading-spinner" style={{
                width: '50px',
                height: '50px',
                border: '4px solid var(--ifm-color-emphasis-200)',
                borderTop: '4px solid var(--ifm-color-primary)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 20px'
              }} />
              <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
              <p>Sending...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={t.title} description={t.description}>
      <div className="container margin-vert--lg">
        <div className="row">
          <div className="col col--8 col--offset-2">
            <h1>{t.title}</h1>
            <p>{t.intro}</p>
            
            {error && (
              <div style={{ 
                backgroundColor: 'var(--ifm-color-danger-contrast-background)', 
                padding: '12px 16px', 
                marginBottom: '20px', 
                borderRadius: '4px', 
                border: '1px solid var(--ifm-color-danger-dark)',
                color: 'var(--ifm-color-danger-dark)'
              }} role="alert">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit} noValidate>
              <div style={{ marginBottom: '16px' }}>
                <label htmlFor="contact-name" style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                  {t.nameLabel}
                </label>
                <input 
                  id="contact-name"
                  type="text" 
                  value={name} 
                  required 
                  maxLength={100}
                  minLength={2}
                  onChange={(e) => setName(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '10px 12px',
                    borderRadius: '4px',
                    border: '1px solid var(--ifm-color-emphasis-300)',
                    fontSize: '1rem'
                  }}
                  aria-required="true"
                />
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label htmlFor="contact-email" style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                  {t.emailLabel}
                </label>
                <input 
                  id="contact-email"
                  type="email" 
                  value={email} 
                  required 
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '10px 12px',
                    borderRadius: '4px',
                    border: '1px solid var(--ifm-color-emphasis-300)',
                    fontSize: '1rem'
                  }}
                  aria-required="true"
                />
              </div>
              
              {/* Honeypot field - hidden from real users but visible to bots */}
              <div style={{ position: 'absolute', left: '-9999px' }} aria-hidden="true">
                <label htmlFor="contact-website">Website:</label>
                <input 
                  id="contact-website"
                  type="text" 
                  name="website" 
                  value={website} 
                  onChange={(e) => setWebsite(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label htmlFor="contact-message" style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                  {t.messageLabel}
                </label>
                <textarea 
                  id="contact-message"
                  value={message} 
                  required
                  minLength={10}
                  maxLength={5000}
                  rows={6}
                  onChange={(e) => setMessage(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '10px 12px',
                    borderRadius: '4px',
                    border: '1px solid var(--ifm-color-emphasis-300)',
                    fontSize: '1rem',
                    resize: 'vertical'
                  }}
                  aria-required="true"
                />
                <div style={{ fontSize: '0.8rem', color: 'var(--ifm-color-emphasis-600)', marginTop: '4px' }}>
                  {message.length}/5000
                </div>
              </div>
              
              <div style={{ 
                fontSize: '12px', 
                color: 'var(--ifm-color-emphasis-600)', 
                marginBottom: '16px',
                textAlign: 'center'
              }}>
                {t.recaptchaNotice}{' '}
                <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">{t.privacyPolicy}</a>{' '}
                {t.and}{' '}
                <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer">{t.termsOfService}</a>{' '}
                {t.apply}
              </div>
              
              <button 
                type="submit" 
                className="button button--primary button--lg"
                disabled={isLoading}
                style={{ marginBottom: '16px' }}
              >
                {t.submitButton}
              </button>
              
              <p style={{ color: 'var(--ifm-color-emphasis-600)' }}>{t.thanks}</p>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default function Contact() {
  return (
    <GoogleReCaptchaProvider reCaptchaKey={config.recaptchaSiteKey}>
      <ContactForm />
    </GoogleReCaptchaProvider>
  );
}