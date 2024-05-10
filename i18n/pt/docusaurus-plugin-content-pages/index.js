import React from 'react';
import clsx from 'clsx';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import Svg from '@site/static/img/logo.svg';
import styles from './index.module.css';

const FeatureList = [
  {
    title: 'Sobre',
    link: '/about',
    Svg: require('@site/static/img/about.svg').default,
    description: (
      <>
        Saiba sobre mim, minha carreira e meus hobbies.
      </>
    ),
  },
  {
    title: 'Confira meus projetos',
    link: '/projects',
    Svg: require('@site/static/img/projects.svg').default,
    description: (
      <>
        Todos de código aberto e disponíveis no GitHub.
      </>
    ),
  },
  {
    title: 'Visite meu blog',
    link: '/blog',
    Svg: require('@site/static/img/blog.svg').default,
    description: (
      <>
        Adoro escrever e compartilhar sobre tecnologia.
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
        <Svg className={styles.featureSvg} role="img" />
        <h1 className="hero__title">Oi, eu sou {siteConfig.title}.</h1>
        <p className="hero__subtitle">Desenvolvedor e apaixonado por tecnologia.</p>
        <p className="hero__subtitle">Global Black Belt Sales Specialist - Azure Developer Audience na Microsoft.</p>
        <p className="hero__subtitle">Ajudar as pessoas a construir soluções inovadoras com tecnologia. 🚀</p>
        <p className="hero__subtitle">As opiniões expressas neste site são minhas e não refletem necessariamente as opiniões do meu empregador.</p>
      </div>
    </header>
  );
}

export default function Home() {
  return (
    <Layout 
      title={`Inicio`}
      description="David Sanchez website pessoal"> 
      <HomepageHeader />   
        <main>        
      <HomepageFeatures /> 
      </main>   
    </Layout>    
  );
}