import React from 'react';
import Layout from '@theme/Layout';
import { HomepageHeader, HomepageFeatures, styles } from '@site/src/components/Homepage';

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

export default function Home() {
  return (
    <Layout
      title="Inicio"
      description="David Sanchez website pessoal">
      <div className={styles.homePageContainer}>
        <HomepageHeader
          greeting="Oi, eu sou"
          subtitle="Director Go-To-Market Developer Audience na Microsoft."
          tagline="Ajudar as pessoas a construir soluções inovadoras com tecnologia. 🚀"
        />
        <main>
          <HomepageFeatures features={FeatureList} />
        </main>
      </div>
    </Layout>
  );
}