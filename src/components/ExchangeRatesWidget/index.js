import React, { useState, useEffect } from 'react';
import ColonesExchangeRate from '@dsanchezcr/colonesexchangerate';

/**
 * Embeddable Exchange Rates Widget component (without Layout wrapper)
 * For use in MDX pages like projects.mdx
 */
export default function ExchangeRatesWidget() {
  const [dollarExchangeRate, setDollarExchangeRate] = useState(null);
  const [euroExchangeRate, setEuroExchangeRate] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
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
        console.error(`Error fetching exchange rates: ${ex.message}`);
        setError(ex.message);
      } finally {
        setIsLoading(false);
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

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <div className="loading-spinner" style={{
          width: '30px',
          height: '30px',
          border: '3px solid var(--ifm-color-emphasis-200)',
          borderTop: '3px solid var(--ifm-color-primary)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 12px'
        }} />
        <p style={{ margin: 0, fontSize: '0.9em', color: 'var(--ifm-color-emphasis-600)' }}>Loading exchange rates...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        backgroundColor: 'var(--ifm-color-danger-contrast-background)', 
        padding: '12px 16px', 
        borderRadius: '8px',
        border: '1px solid var(--ifm-color-danger-dark)',
      }} role="alert">
        <p style={{ margin: 0, color: 'var(--ifm-color-danger-dark)', fontSize: '0.9em' }}>
          ⚠️ Unable to fetch exchange rates: {error}
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', margin: '16px 0' }}>
      {/* USD Exchange Rate Card */}
      <div style={{
        backgroundColor: 'var(--ifm-card-background-color)',
        border: '1px solid var(--ifm-color-emphasis-200)',
        borderRadius: '10px',
        padding: '20px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '1.5rem', marginRight: '10px' }}>🇺🇸</span>
          <div>
            <h4 style={{ margin: 0, fontSize: '1rem' }}>US Dollar (USD)</h4>
            <p style={{ margin: 0, color: 'var(--ifm-color-emphasis-600)', fontSize: '0.8em' }}>1 USD =</p>
          </div>
        </div>
        {dollarExchangeRate && (
          <div style={{ fontSize: '0.9em' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--ifm-color-emphasis-200)' }}>
              <span>Buy:</span>
              <strong>{formatRate(dollarExchangeRate.purchase?.value || dollarExchangeRate.purchase || dollarExchangeRate.buy)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
              <span>Sell:</span>
              <strong>{formatRate(dollarExchangeRate.sale?.value || dollarExchangeRate.sale || dollarExchangeRate.sell)}</strong>
            </div>
          </div>
        )}
      </div>
      
      {/* EUR Exchange Rate Card */}
      <div style={{
        backgroundColor: 'var(--ifm-card-background-color)',
        border: '1px solid var(--ifm-color-emphasis-200)',
        borderRadius: '10px',
        padding: '20px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '1.5rem', marginRight: '10px' }}>🇪🇺</span>
          <div>
            <h4 style={{ margin: 0, fontSize: '1rem' }}>Euro (EUR)</h4>
            <p style={{ margin: 0, color: 'var(--ifm-color-emphasis-600)', fontSize: '0.8em' }}>1 EUR =</p>
          </div>
        </div>
        {euroExchangeRate && (
          <div style={{ fontSize: '0.9em' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--ifm-color-emphasis-200)' }}>
              <span>Colones:</span>
              <strong>{formatRate(euroExchangeRate.colones)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
              <span>Dollars:</span>
              <strong>${euroExchangeRate.dollars?.toFixed(4) || 'N/A'}</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
