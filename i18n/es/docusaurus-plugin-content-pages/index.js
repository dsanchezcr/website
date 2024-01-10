import React from 'react';
import clsx from 'clsx';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import Svg from '@site/static/img/logo.svg';
import styles from './index.module.css';

const FeatureList = [
  {
    title: 'Acerca de',
    link: '/about',
    Svg: require('@site/static/img/about.svg').default,
    description: (
      <>
        Conoce sobre mi, mi carrera y mis pasatiempos.
      </>
    ),
  },
  {
    title: 'Mira mis proyectos',
    link: '/projects',
    Svg: require('@site/static/img/projects.svg').default,
    description: (
      <>
        Todos de código abierto y disponibles en GitHub.
      </>
    ),
  },
  {
    title: 'Visita mi blog',
    link: '/blog',
    Svg: require('@site/static/img/blog.svg').default,
    description: (
      <>
        Me encanta escribir y compartir sobre tecnología.
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
        <h1 className="hero__title">Hola, soy {siteConfig.title}.</h1>
        <p className="hero__subtitle">Desarrollador y apasionado por la tecnología.</p>
        <p className="hero__subtitle">Global Black Belt Sales Specialist - Azure Developer Audience en Microsoft.</p>
        <p className="hero__subtitle">Ayudando a personas a construir soluciones innovadoras con tecnología. 🚀</p>
        <p className="hero__subtitle">Las opiniones expresadas en este sitio son mías y no reflejan necesariamente las opiniones de mi empleador.</p>
        <div className={styles.buttons}>
          <Link
              className="button button--secondary button--lg"
              to="pathname:///Resume_David_Sanchez.pdf">
              Descarga mi CV (inglés) 📃
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home() {
  return (
    <Layout 
      title={`Inicio`}
      description="David Sanchez sitio web personal"> 
      <HomepageHeader />   
        <main>        
      <HomepageFeatures /> 
      </main>   
    </Layout>    
  );
}