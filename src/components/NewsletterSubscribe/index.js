import React, { useState } from 'react';
import Link from '@docusaurus/Link';
import { config } from '@site/src/config/environment';
import { useLocale } from '@site/src/hooks';
import styles from './styles.module.css';

const translations = {
  en: {
    title: '📬 Stay Updated',
    description: 'Subscribe to the newsletter and receive the latest blog posts, projects, and content updates.',
    emailPlaceholder: 'Your email address',
    weekly: 'Weekly',
    monthly: 'Monthly',
    frequencyLabel: 'Frequency',
    subscribe: 'Subscribe',
    subscribing: 'Subscribing...',
    successTitle: 'Check your email!',
    successMessage: 'A verification link has been sent to confirm your subscription.',
    errorGeneric: 'Something went wrong. Please try again later.',
    errorAlreadySubscribed: 'This email is already subscribed.',
    errorInvalidEmail: 'Please enter a valid email address.',
    privacyNote: 'We respect your privacy. Unsubscribe anytime.',
    privacyLink: 'Privacy Policy',
  },
  es: {
    title: '📬 Mantente Actualizado',
    description: 'Suscríbete al boletín y recibe las últimas publicaciones del blog, proyectos y actualizaciones de contenido.',
    emailPlaceholder: 'Tu correo electrónico',
    weekly: 'Semanal',
    monthly: 'Mensual',
    frequencyLabel: 'Frecuencia',
    subscribe: 'Suscribirse',
    subscribing: 'Suscribiendo...',
    successTitle: '¡Revisa tu correo!',
    successMessage: 'Se ha enviado un enlace de verificación para confirmar tu suscripción.',
    errorGeneric: 'Algo salió mal. Inténtalo de nuevo más tarde.',
    errorAlreadySubscribed: 'Este correo ya está suscrito.',
    errorInvalidEmail: 'Por favor ingresa un correo electrónico válido.',
    privacyNote: 'Respetamos tu privacidad. Cancela en cualquier momento.',
    privacyLink: 'Política de Privacidad',
  },
  pt: {
    title: '📬 Fique Atualizado',
    description: 'Assine o boletim e receba as últimas publicações do blog, projetos e atualizações de conteúdo.',
    emailPlaceholder: 'Seu endereço de e-mail',
    weekly: 'Semanal',
    monthly: 'Mensal',
    frequencyLabel: 'Frequência',
    subscribe: 'Assinar',
    subscribing: 'Assinando...',
    successTitle: 'Verifique seu e-mail!',
    successMessage: 'Um link de verificação foi enviado para confirmar sua assinatura.',
    errorGeneric: 'Algo deu errado. Tente novamente mais tarde.',
    errorAlreadySubscribed: 'Este e-mail já está inscrito.',
    errorInvalidEmail: 'Por favor, insira um endereço de e-mail válido.',
    privacyNote: 'Respeitamos sua privacidade. Cancele a qualquer momento.',
    privacyLink: 'Política de Privacidade',
  },
};

export default function NewsletterSubscribe() {
  const [email, setEmail] = useState('');
  const [frequency, setFrequency] = useState('weekly');
  const [website, setWebsite] = useState(''); // Honeypot
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const lang = useLocale();
  const t = translations[lang] || translations.en;

  const privacyPath = lang === 'en' ? '/privacy' : `/${lang}/privacy`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Basic email validation
    const trimmedEmail = email.trim();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setError(t.errorInvalidEmail);
      return;
    }

    setIsLoading(true);

    try {
      const apiEndpoint = config.getApiEndpoint();
      const response = await fetch(`${apiEndpoint}${config.routes.newsletterSubscribe}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail,
          frequency,
          language: lang,
          recaptchaToken: '', // reCAPTCHA can be added later for enhanced protection
          website, // Honeypot
        }),
      });

      if (response.ok) {
        setIsSuccess(true);
      } else if (response.status === 409) {
        setError(t.errorAlreadySubscribed);
      } else {
        setError(t.errorGeneric);
      }
    } catch {
      setError(t.errorGeneric);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className={styles.newsletterBanner}>
        <div className={styles.newsletterContent}>
          <h3 className={styles.newsletterTitle}>{t.successTitle}</h3>
          <p className={styles.successMessage}>{t.successMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.newsletterBanner}>
      <div className={styles.newsletterContent}>
        <h3 className={styles.newsletterTitle}>{t.title}</h3>
        <p className={styles.newsletterDescription}>{t.description}</p>
        <form className={styles.newsletterForm} onSubmit={handleSubmit}>
          {/* Honeypot field - hidden from users, bots will fill it */}
          <input
            type="text"
            name="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            className={styles.honeypot}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.emailPlaceholder}
            className={styles.emailInput}
            required
            aria-label={t.emailPlaceholder}
          />
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            className={styles.frequencySelect}
            aria-label={t.frequencyLabel}
          >
            <option value="weekly">{t.weekly}</option>
            <option value="monthly">{t.monthly}</option>
          </select>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={isLoading}
          >
            {isLoading ? t.subscribing : t.subscribe}
          </button>
        </form>
        {error && <p className={styles.errorMessage}>{error}</p>}
        <p className={styles.privacyNote}>
          {t.privacyNote} <Link to={privacyPath}>{t.privacyLink}</Link>
        </p>
      </div>
    </div>
  );
}
