import React from 'react';
import clsx from 'clsx';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/index';
import Translate, {translate} from '@docusaurus/Translate';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <h1 className="hero__title">Hello, I am {siteConfig.title}.</h1>
        <p className="hero__subtitle">A developer and technology passionate. {siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
              className="button button--secondary button--lg"
              to="pathname:///Resume_David_Sanchez.pdf">
              Download my resume
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home() {
  return (
        //<Layout title={`Home`} description="David Sanchez personal website"> <HomepageHeader />   <main>        <HomepageFeatures /> </main>   </Layout>
    <Layout>      
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: '20px',
      }}>         
      <main>
        <br/>
        <h1>
            <Translate id="homepage.header">Hello! Welcome to my personal website.</Translate>
        </h1>
        <h2>
          <Translate>I am </Translate><span className="intro__name" style={{ color: 'rgb(50, 50, 150)' }}>David Sanchez</span><Translate>, a developer and technology passionate.</Translate>
        </h2>        
        <img id="homepageImage"
          src="/img/Profile.jpg"
        />
        <br/>
        <Link
            className="button button--secondary button--lg"
            to="pathname:///Resume_David_Sanchez.pdf">
            Download my resume
        </Link>
        or 
        <Link
            className="button button--secondary button--lg"
            to="/blog">
            <Translate>
            Check out my blog
            </Translate>  
        </Link>
          
      </main>
      </div> 
    </Layout>
  );
}