import React from 'react';
import clsx from 'clsx';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
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
        <p className="hero__subtitle">A developer and technology passionate. {siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
              className="button button--secondary button--lg"
              to="pathname:///Resume_David_Sanchez.pdf">
              Download my resume 📃
          </Link>
        </div>
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