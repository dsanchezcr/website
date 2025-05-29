import React from 'react';
import clsx from 'clsx';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import Svg from '@site/static/img/logo.svg';
import OnlineStatusWidget from '@site/src/components/OnlineStatusWidget';
import CompactWeatherWidget from '@site/src/components/WeatherWidget/CompactWeatherWidget';

import styles from './index.module.css';

const FeatureList = [
  {
    title: 'Visit my blog',
    link: '/blog',
    Svg: require('@site/static/img/home/blog.svg').default,
    description: (
      <>
        I love writing and sharing about technology.
      </>
    ),
  },
  {
    title: 'Check out my projects',
    link: '/projects',
    Svg: require('@site/static/img/home/projects.svg').default,
    description: (
      <>
        All of them are open source and available on GitHub.
      </>
    ),
  },
  {
    title: 'About me',
    link: '/about',
    Svg: require('@site/static/img/home/about.svg').default,
    description: (
      <>
        Learn a bit about me, my career and my hobbies.
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
          <CompactWeatherWidget />
        </div>
        <Svg className={styles.featureSvg} role="img" />
        <h1 className="hero__title">Hello, I am {siteConfig.title}.</h1>
        <p className="hero__subtitle">Global Black Belt - Azure Developer Productivity at Microsoft.</p>
        <p className="hero__subtitle">Helping people build innovative solutions with technology. 🚀</p>
      </div>
    </header>
  );
}

export default function Home() {
  return (
    <Layout 
      title={`Home`}
      description="David Sanchez personal website"> 
      <div className={styles.homePageContainer}>
        <OnlineStatusWidget />
        <HomepageHeader />   
        <main>        
          <HomepageFeatures /> 
        </main>
      </div>   
    </Layout>    
  );
}