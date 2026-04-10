import React from 'react';
import clsx from 'clsx';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Link from '@docusaurus/Link';
import Svg from '@site/static/img/logo.svg';
import CompactWeatherWidget from '@site/src/components/WeatherWidget/CompactWeatherWidget';
import OnlineStatusWidget from '@site/src/components/OnlineStatusWidget';
import ErrorBoundary from '@site/src/components/ErrorBoundary';
import styles from './Homepage.module.css';

function Feature({Svg: FeatureSvg, title, link, description}) {
  return (
    <div className={clsx('col col--4')}>
      <Link to={link} className={styles.featureCard}>
        <div className="text--center">
          <FeatureSvg className={styles.featureSvgHomeFeatures} role="img" />
        </div>
        <div className="text--center padding-horiz--md">
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </Link>
    </div>
  );
}

export function HomepageFeatures({features}) {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {features.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function HomepageHeader({greeting, subtitle, tagline}) {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero', styles.heroBanner)}>
      <div className="container">
        <div className={styles.visitorWidgetContainer}>
          <ErrorBoundary>
            <OnlineStatusWidget />
          </ErrorBoundary>
        </div>
        <div className={styles.weatherWidgetContainer}>
          <ErrorBoundary>
            <CompactWeatherWidget />
          </ErrorBoundary>
        </div>
        <Svg className={styles.featureSvg} role="img" />
        <h1 className={styles.heroTitle}>{greeting} {siteConfig.title}.</h1>
        <p className={styles.heroSubtitle}>{subtitle}</p>
        <p className={styles.heroTagline}>{tagline}</p>
      </div>
    </header>
  );
}

export { styles };
