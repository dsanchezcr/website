import React, { useState, useEffect } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './styles.module.css';
import { getLocaleKey } from './gameCardConstants';

const releasedLabels = {
  en: 'Released!',
  es: '¡Lanzado!',
  pt: 'Lançado!',
};

const defaultLabels = {
  en: 'Countdown',
  es: 'Cuenta regresiva',
  pt: 'Contagem regressiva',
};

const Countdown = ({ targetDate, label }) => {
  const { i18n } = useDocusaurusContext();
  const localeKey = getLocaleKey(i18n?.currentLocale);
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const target = new Date(targetDate);
      const diff = target - now;

      if (diff <= 0) {
        return null;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      return { days, hours, minutes, seconds };
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      if (!remaining) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  if (!timeLeft) {
    return (
      <div className={styles.countdownBanner}>
        🎉 {label || releasedLabels[localeKey]}
      </div>
    );
  }

  return (
    <div className={styles.countdownBanner}>
      <span className={styles.countdownLabel}>⏳ {label || defaultLabels[localeKey]}</span>
      <span className={styles.countdownTimer}>
        {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
      </span>
    </div>
  );
};

export default Countdown;
