import React from 'react';
import Layout from '@theme/Layout';
import { HomepageHeader, HomepageFeatures, styles } from '@site/src/components/Homepage';

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

export default function Home() {
  return (
    <Layout
      title="Home"
      description="David Sanchez personal website">
      <div className={styles.homePageContainer}>
        <HomepageHeader
          greeting="Hello, I am"
          subtitle="Director of Developer Audience at Microsoft."
          tagline="Helping people build innovative solutions with technology. 🚀"
        />
        <main>
          <HomepageFeatures features={FeatureList} />
        </main>
      </div>
    </Layout>
  );
}