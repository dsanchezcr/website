import { useState, useEffect } from 'react';
import ColonesExchangeRate from '@dsanchezcr/colonesexchangerate';

export default function ExchangeRates() {
  const [dollarExchangeRate, setDollarExchangeRate] = useState(null);
  const [euroExchangeRate, setEuroExchangeRate] = useState(null);

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
      }
    };

    fetchExchangeRates();
  }, []);

  return (
    <>
      <pre>{JSON.stringify(dollarExchangeRate)}</pre>
      <pre>{JSON.stringify(euroExchangeRate)}</pre>
    </>
  );
}