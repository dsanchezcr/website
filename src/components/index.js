import React from 'react';
import clsx from 'clsx';
import styles from './styles.module.css';
import Link from '@docusaurus/Link';

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
    Svg: require('@site/static/img//home/projects.svg').default,
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
          <Svg className={styles.featureSvg} role="img" />
          </div>
          <div className="text--center padding-horiz--md">
            <h3>{title}</h3>
            <p>{description}</p>
          </div>
        </Link>  
      </div>      
  );
}

export default function HomepageFeatures() {
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