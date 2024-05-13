import React from 'react';
import clsx from 'clsx';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Svg from '@site/static/img/logo.svg';
import HomepageFeatures from '@site/src/components/index';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Svg className={styles.featureSvg} role="img" />
        <h1 className="hero__title">Hello, I am {siteConfig.title}.</h1>
        <p className="hero__subtitle">Software Development and Technology Passionate.</p>
        <p className="hero__subtitle">Global Black Belt Sales Specialist - Azure Developer Audience at Microsoft.</p>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <p className="hero__subtitle">The views expressed on this site are my own and do not necessarily reflect the views of my employer.</p>
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
      </main>   
    </Layout>    
  );
}