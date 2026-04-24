import React, { useState, useEffect } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import { config } from '../config/environment';
import { useLocale } from '@site/src/hooks';

const translations = {
  en: {
    title: 'Newsletter',
    description: 'Manage your newsletter subscription preferences.',
    manageTitle: 'Manage Your Subscription',
    manageDescription: 'Update your newsletter frequency or unsubscribe.',
    emailLabel: 'Email:',
    frequencyLabel: 'Frequency:',
    weekly: 'Weekly',
    monthly: 'Monthly',
    updateButton: 'Update Preferences',
    updating: 'Updating...',
    unsubscribeButton: 'Unsubscribe',
    unsubscribing: 'Unsubscribing...',
    statusActive: 'Active',
    statusPending: 'Pending verification',
    statusUnsubscribed: 'Unsubscribed',
    statusLabel: 'Status:',
    subscribedSince: 'Subscribed since:',
    successUpdate: 'Your preferences have been updated.',
    successUnsubscribe: 'You have been unsubscribed.',
    errorLoad: 'Could not load subscription details. Please check your link.',
    errorUpdate: 'Could not update preferences. Please try again.',
    errorUnsubscribe: 'Could not unsubscribe. Please try again.',
    noSubscription: 'No subscription found for this email.',
    subscribePrompt: 'Want to subscribe? Enter your email in the newsletter form at the bottom of any page.',
    linkRequired: 'To manage your subscription, use the management link included in your newsletter emails.',
    lookingUp: 'Loading...',
    privacyNote: 'Your data is handled according to our',
    privacyLink: 'Privacy Policy',
  },
  es: {
    title: 'Boletín',
    description: 'Gestiona las preferencias de tu suscripción al boletín.',
    manageTitle: 'Gestionar tu Suscripción',
    manageDescription: 'Actualiza la frecuencia de tu boletín o cancela la suscripción.',
    emailLabel: 'Correo:',
    frequencyLabel: 'Frecuencia:',
    weekly: 'Semanal',
    monthly: 'Mensual',
    updateButton: 'Actualizar Preferencias',
    updating: 'Actualizando...',
    unsubscribeButton: 'Cancelar Suscripción',
    unsubscribing: 'Cancelando...',
    statusActive: 'Activa',
    statusPending: 'Verificación pendiente',
    statusUnsubscribed: 'Cancelada',
    statusLabel: 'Estado:',
    subscribedSince: 'Suscrito desde:',
    successUpdate: 'Tus preferencias han sido actualizadas.',
    successUnsubscribe: 'Tu suscripción ha sido cancelada.',
    errorLoad: 'No se pudieron cargar los detalles de la suscripción. Verifica tu enlace.',
    errorUpdate: 'No se pudieron actualizar las preferencias. Inténtalo de nuevo.',
    errorUnsubscribe: 'No se pudo cancelar la suscripción. Inténtalo de nuevo.',
    noSubscription: 'No se encontró una suscripción para este correo.',
    subscribePrompt: '¿Quieres suscribirte? Ingresa tu correo en el formulario del boletín al final de cualquier página.',
    linkRequired: 'Para gestionar tu suscripción, usa el enlace de gestión incluido en los correos del boletín.',
    lookingUp: 'Cargando...',
    privacyNote: 'Tus datos se manejan según nuestra',
    privacyLink: 'Política de Privacidad',
  },
  pt: {
    title: 'Boletim',
    description: 'Gerencie as preferências da sua assinatura do boletim.',
    manageTitle: 'Gerenciar sua Assinatura',
    manageDescription: 'Atualize a frequência do seu boletim ou cancele a assinatura.',
    emailLabel: 'E-mail:',
    frequencyLabel: 'Frequência:',
    weekly: 'Semanal',
    monthly: 'Mensal',
    updateButton: 'Atualizar Preferências',
    updating: 'Atualizando...',
    unsubscribeButton: 'Cancelar Assinatura',
    unsubscribing: 'Cancelando...',
    statusActive: 'Ativa',
    statusPending: 'Verificação pendente',
    statusUnsubscribed: 'Cancelada',
    statusLabel: 'Status:',
    subscribedSince: 'Inscrito desde:',
    successUpdate: 'Suas preferências foram atualizadas.',
    successUnsubscribe: 'Sua assinatura foi cancelada.',
    errorLoad: 'Não foi possível carregar os detalhes da assinatura. Verifique seu link.',
    errorUpdate: 'Não foi possível atualizar as preferências. Tente novamente.',
    errorUnsubscribe: 'Não foi possível cancelar a assinatura. Tente novamente.',
    noSubscription: 'Nenhuma assinatura encontrada para este e-mail.',
    subscribePrompt: 'Quer se inscrever? Insira seu e-mail no formulário do boletim no final de qualquer página.',
    linkRequired: 'Para gerenciar sua assinatura, use o link de gerenciamento incluído nos e-mails do boletim.',
    lookingUp: 'Carregando...',
    privacyNote: 'Seus dados são tratados de acordo com nossa',
    privacyLink: 'Política de Privacidade',
  },
};

function NewsletterManagement() {
  const lang = useLocale();
  const t = translations[lang] || translations.en;
  const privacyPath = lang === 'en' ? '/privacy' : `/${lang}/privacy`;

  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [subscription, setSubscription] = useState(null);
  const [frequency, setFrequency] = useState('weekly');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [hasParams, setHasParams] = useState(false);

  // Load email/token from URL params
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const emailParam = params.get('email');
      const tokenParam = params.get('token');
      if (emailParam && tokenParam) {
        setEmail(emailParam);
        setToken(tokenParam);
        setHasParams(true);
      }
    }
  }, []);

  // Auto-load subscription when params are present
  useEffect(() => {
    if (hasParams && email && token) {
      loadSubscription();
    }
  }, [hasParams]);

  const loadSubscription = async () => {
    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      const apiEndpoint = config.getApiEndpoint();
      const response = await fetch(
        `${apiEndpoint}${config.routes.newsletterStatus}?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`
      );

      if (response.ok) {
        const data = await response.json();
        setSubscription(data);
        setFrequency(data.frequency);
      } else if (response.status === 404) {
        setError(t.noSubscription);
      } else {
        setError(t.errorLoad);
      }
    } catch {
      setError(t.errorLoad);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePreferences = async () => {
    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      const apiEndpoint = config.getApiEndpoint();
      const response = await fetch(`${apiEndpoint}${config.routes.newsletterPreferences}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, frequency, token }),
      });

      if (response.ok) {
        setMessage(t.successUpdate);
        setSubscription((prev) => ({ ...prev, frequency }));
      } else {
        setError(t.errorUpdate);
      }
    } catch {
      setError(t.errorUpdate);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      const apiEndpoint = config.getApiEndpoint();
      const response = await fetch(
        `${apiEndpoint}${config.routes.newsletterUnsubscribe}?token=${encodeURIComponent(token)}`
      );

      if (response.ok) {
        setMessage(t.successUnsubscribe);
        setSubscription((prev) => ({ ...prev, status: 'unsubscribed' }));
      } else {
        setError(t.errorUnsubscribe);
      }
    } catch {
      setError(t.errorUnsubscribe);
    } finally {
      setIsLoading(false);
    }
  };

  const statusText = {
    active: t.statusActive,
    pending: t.statusPending,
    unsubscribed: t.statusUnsubscribed,
  };

  return (
    <Layout title={t.title} description={t.description}>
      <div className="container margin-vert--lg">
        <div className="row">
          <div className="col col--6 col--offset-3">
            <h1>{t.manageTitle}</h1>
            <p>{t.manageDescription}</p>

            {!subscription && !error && !hasParams && (
              <div>
                <p>{t.linkRequired}</p>
                <p style={{ color: 'var(--ifm-color-emphasis-600)', fontSize: '0.85rem' }}>
                  {t.subscribePrompt}
                </p>
              </div>
            )}

            {!subscription && !error && hasParams && isLoading && (
              <p>{t.lookingUp}</p>
            )}

            {subscription && (
              <div style={{ marginTop: '1.5rem' }}>
                <div style={{
                  background: 'var(--ifm-color-emphasis-100)',
                  padding: '1.5rem',
                  borderRadius: '8px',
                  marginBottom: '1.5rem',
                }}>
                  <p><strong>{t.emailLabel}</strong> {subscription.email}</p>
                  <p><strong>{t.statusLabel}</strong> {statusText[subscription.status] || subscription.status}</p>
                  <p><strong>{t.subscribedSince}</strong> {new Date(subscription.subscribedAt).toLocaleDateString()}</p>
                </div>

                {subscription.status === 'active' && (
                  <>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                        {t.frequencyLabel}
                      </label>
                      <select
                        value={frequency}
                        onChange={(e) => setFrequency(e.target.value)}
                        style={{
                          padding: '0.6rem 1rem',
                          border: '1px solid var(--ifm-color-emphasis-300)',
                          borderRadius: '6px',
                          fontSize: '0.9rem',
                          width: '100%',
                        }}
                      >
                        <option value="weekly">{t.weekly}</option>
                        <option value="monthly">{t.monthly}</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      <button
                        onClick={handleUpdatePreferences}
                        disabled={isLoading}
                        className="button button--primary"
                      >
                        {isLoading ? t.updating : t.updateButton}
                      </button>
                      <button
                        onClick={handleUnsubscribe}
                        disabled={isLoading}
                        className="button button--danger button--outline"
                      >
                        {isLoading ? t.unsubscribing : t.unsubscribeButton}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {message && (
              <p style={{ color: 'var(--ifm-color-success)', marginTop: '1rem' }}>{message}</p>
            )}
            {error && (
              <p style={{ color: 'var(--ifm-color-danger)', marginTop: '1rem' }}>{error}</p>
            )}

            <p style={{
              color: 'var(--ifm-color-emphasis-600)',
              fontSize: '0.8rem',
              marginTop: '2rem',
            }}>
              {t.privacyNote} <Link to={privacyPath}>{t.privacyLink}</Link>.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default NewsletterManagement;
