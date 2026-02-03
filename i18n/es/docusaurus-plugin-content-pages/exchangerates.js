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
      title="Tipos de Cambio"
      description="Tipos de cambio del Colón Costarricense para USD y EUR">
      <div className="container margin-vert--lg">
        <div className="row">
          <div className="col col--8 col--offset-2">
            <h1>Tipos de Cambio del Colón Costarricense</h1>
            <p>
              Tipos de cambio actuales del Colón Costarricense (CRC) frente a las principales monedas.
              Datos obtenidos del Banco Central de Costa Rica.
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
                <p>Cargando tipos de cambio...</p>
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
                  ⚠️ No se pudieron obtener los tipos de cambio: {error}
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
                      <h3 style={{ margin: 0 }}>Dólar Estadounidense (USD)</h3>
                      <p style={{ margin: 0, color: 'var(--ifm-color-emphasis-600)', fontSize: '0.9em' }}>1 USD =</p>
                    </div>
                  </div>
                  {dollarExchangeRate && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--ifm-color-emphasis-200)' }}>
                        <span>Compra:</span>
                        <strong>{formatRate(dollarExchangeRate.purchase?.value || dollarExchangeRate.buy)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                        <span>Venta:</span>
                        <strong>{formatRate(dollarExchangeRate.sale?.value || dollarExchangeRate.sell)}</strong>
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
                        <span>Compra:</span>
                        <strong>{formatRate(euroExchangeRate.purchase?.value || euroExchangeRate.buy)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                        <span>Venta:</span>
                        <strong>{formatRate(euroExchangeRate.sale?.value || euroExchangeRate.sell)}</strong>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="margin-top--lg">
              <h2>Acerca de estos Datos</h2>
              <p>
                Los tipos de cambio son proporcionados por el paquete npm <a href="https://www.npmjs.com/package/@dsanchezcr/colonesexchangerate" target="_blank" rel="noopener noreferrer">@dsanchezcr/colonesexchangerate</a>,
                que obtiene datos del Banco Central de Costa Rica (BCCR).
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}