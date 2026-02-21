import React, { useState, useEffect } from 'react';
import Layout from '@theme/Layout';
import ColonesExchangeRate from '@dsanchezcr/colonesexchangerate';

export default function ExchangeRates() {
  const [dollarExchangeRate, setDollarExchangeRate] = useState(null);
  const [euroExchangeRate, setEuroExchangeRate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchExchangeRates = async () => {
      const exchangeRateClient = new ColonesExchangeRate();
      try {
        const dollarRate = await exchangeRateClient.getDollarExchangeRate();
        setDollarExchangeRate(dollarRate);
        const euroRate = await exchangeRateClient.getEuroExchangeRate();
        setEuroExchangeRate(euroRate);
      } catch (ex) {
        console.error(`Error: ${ex.message}`);
        setError(ex.message);
      } finally {
        setLoading(false);
      }
    };

    fetchExchangeRates();
  }, []);

  const formatRate = (rate) => {
    if (!rate) return 'N/A';
    return new Intl.NumberFormat('es-CR', { 
      style: 'currency', 
      currency: 'CRC',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    }).format(rate);
  };

  return (
    <Layout
      title="Taxas de Câmbio"
      description="Taxas de câmbio do Colón da Costa Rica para USD e EUR">
      <div className="container margin-vert--lg">
        <div className="row">
          <div className="col col--8 col--offset-2">
            <h1>Taxas de Câmbio do Colón da Costa Rica</h1>
            <p>
              Taxas de câmbio atuais do Colón da Costa Rica (CRC) em relação às principais moedas.
              Dados obtidos do Banco Central da Costa Rica.
            </p>
            
            {loading && (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  border: '4px solid var(--ifm-color-emphasis-200)',
                  borderTop: '4px solid var(--ifm-color-primary)',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 16px'
                }} />
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                <p>Carregando taxas de câmbio...</p>
              </div>
            )}
            
            {error && (
              <div style={{ 
                backgroundColor: 'var(--ifm-color-danger-contrast-background)', 
                padding: '16px', 
                borderRadius: '8px',
                border: '1px solid var(--ifm-color-danger-dark)',
                marginBottom: '20px'
              }} role="alert">
                <p style={{ margin: 0, color: 'var(--ifm-color-danger-dark)' }}>
                  ⚠️ Não foi possível obter as taxas de câmbio: {error}
                </p>
              </div>
            )}
            
            {!loading && !error && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginTop: '20px' }}>
                {/* USD Exchange Rate Card */}
                <div style={{
                  backgroundColor: 'var(--ifm-card-background-color)',
                  border: '1px solid var(--ifm-color-emphasis-200)',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                    <span style={{ fontSize: '2rem', marginRight: '12px' }}>🇺🇸</span>
                    <div>
                      <h3 style={{ margin: 0 }}>Dólar Americano (USD)</h3>
                      <p style={{ margin: 0, color: 'var(--ifm-color-emphasis-600)', fontSize: '0.9em' }}>1 USD =</p>
                    </div>
                  </div>
                  {dollarExchangeRate && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--ifm-color-emphasis-200)' }}>
                        <span>Compra:</span>
                        <strong>{formatRate(dollarExchangeRate.purchase)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                        <span>Venda:</span>
                        <strong>{formatRate(dollarExchangeRate.sale)}</strong>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* EUR Exchange Rate Card */}
                <div style={{
                  backgroundColor: 'var(--ifm-card-background-color)',
                  border: '1px solid var(--ifm-color-emphasis-200)',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                    <span style={{ fontSize: '2rem', marginRight: '12px' }}>🇪🇺</span>
                    <div>
                      <h3 style={{ margin: 0 }}>Euro (EUR)</h3>
                      <p style={{ margin: 0, color: 'var(--ifm-color-emphasis-600)', fontSize: '0.9em' }}>1 EUR =</p>
                    </div>
                  </div>
                  {euroExchangeRate && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--ifm-color-emphasis-200)' }}>
                        <span>Colones:</span>
                        <strong>{formatRate(euroExchangeRate.colones)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                        <span>Dólares:</span>
                        <strong>${euroExchangeRate.dollars?.toFixed(4) || 'N/A'}</strong>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="margin-top--lg">
              <h2>Sobre estes Dados</h2>
              <p>
                As taxas de câmbio são fornecidas pelo pacote npm <a href="https://www.npmjs.com/package/@dsanchezcr/colonesexchangerate" target="_blank" rel="noopener noreferrer">@dsanchezcr/colonesexchangerate</a>,
                que obtém dados do Banco Central da Costa Rica (BCCR).
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}