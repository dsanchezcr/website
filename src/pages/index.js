import React from 'react';
import clsx from 'clsx';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Svg from '@site/static/img/logo.svg';
import HomepageFeatures from '@site/src/components/index';
import NLWebChat from '@site/src/components/NLWebChat';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Svg className={styles.featureSvg} role="img" />
        <h1 className="hero__title">Hello, I am {siteConfig.title}.</h1>
        <p className="hero__subtitle">Global Black Belt - Azure Developer Productivity at Microsoft.</p>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
      </div>
    </header>
  );
}

export default function Home() {
  return (
    <Layout 
      title={`Home`}
      description="David Sanchez personal website"> 
      <HomepageHeader />   
        <main>        
      <HomepageFeatures />
      <NLWebChat />
      </main>   
    </Layout>    
  );
}