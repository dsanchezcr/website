import React from 'react';
import clsx from 'clsx';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import Svg from '@site/static/img/logo.svg';
import CompactWeatherWidget from '@site/src/components/WeatherWidget/CompactWeatherWidget';
import OnlineStatusWidget from '@site/src/components/OnlineStatusWidget';
import ErrorBoundary from '@site/src/components/ErrorBoundary';
import styles from './index.module.css';

const FeatureList = [
  {
    title: 'Visite meu blog',
    link: '/blog',
    Svg: require('@site/static/img/home/blog.svg').default,
    description: (
      <>
        Adoro escrever e compartilhar sobre tecnologia.
      </>
    ),
  },
  {
    title: 'Confira meus projetos',
    link: '/projects',
    Svg: require('@site/static/img/home/projects.svg').default,
    description: (
      <>
        Todos de código aberto e disponíveis no GitHub.
      </>
    ),
  },
  {  
    title: 'Sobre',
    link: '/about',
    Svg: require('@site/static/img/home/about.svg').default,
    description: (
      <>
        Saiba sobre mim, minha carreira e meus hobbies.
      </>
    ),
  },
];

function Feature({Svg, title, link, description}) {
  return (    
      <div className={clsx('col col--4')}>
        <Link to={link}>
          <div className="text--center">
          <Svg className={styles.featureSvgHomeFeatures} role="img" />
          </div>
          <div className="text--center padding-horiz--md">
            <h3>{title}</h3>
            <p>{description}</p>
          </div>
        </Link>  
      </div>      
  );
}

function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <div className={styles.weatherWidgetContainer}>
          <ErrorBoundary>
            <CompactWeatherWidget />
          </ErrorBoundary>
        </div>
        <Svg className={styles.featureSvg} role="img" />
        <h1 className="hero__title">Oi, eu sou {siteConfig.title}.</h1>
        <p className="hero__subtitle">Global Black Belt - Azure Developer Productivity na Microsoft.</p>
        <p className="hero__subtitle">Ajudar as pessoas a construir soluções inovadoras com tecnologia. 🚀</p>
      </div>
    </header>
  );
}

export default function Home() {
  return (
    <Layout 
      title={`Inicio`}
      description="David Sanchez website pessoal"> 
      <div className={styles.homePageContainer}>
        <ErrorBoundary>
          <OnlineStatusWidget />
        </ErrorBoundary>
        <HomepageHeader />   
        <main> 
          <HomepageFeatures />
        </main>   
      </div>
    </Layout>    
  );
}