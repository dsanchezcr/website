import React from 'react';
import Layout from '@theme/Layout';
import { HomepageHeader, HomepageFeatures, styles } from '@site/src/components/Homepage';

const FeatureList = [
  {
    title: 'Visita mi blog',
    link: '/blog',
    Svg: require('@site/static/img/home/blog.svg').default,
    description: (
      <>
        Me encanta escribir y compartir sobre tecnología.
      </>
    ),
  },
  {
    title: 'Mira mis proyectos',
    link: '/projects',
    Svg: require('@site/static/img/home/projects.svg').default,
    description: (
      <>
        Todos de código abierto y disponibles en GitHub.
      </>
    ),
  },
  { 
    title: 'Acerca de',
    link: '/about',
    Svg: require('@site/static/img/home/about.svg').default,
    description: (
      <>
        Conoce sobre mi, mi carrera y mis pasatiempos.
      </>
    ),
  },
];

export default function Home() {
  return (
    <Layout
      title="Inicio"
      description="David Sanchez sitio web personal">
      <div className={styles.homePageContainer}>
        <HomepageHeader
          greeting="Hola, soy"
          subtitle="Director de Developer Audience en Microsoft."
          tagline="Ayudando a personas a construir soluciones innovadoras con tecnología. 🚀"
        />
        <main>
          <HomepageFeatures features={FeatureList} />
        </main>
      </div>
    </Layout>
  );
}