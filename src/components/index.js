import React from 'react';
import clsx from 'clsx';
import styles from './styles.module.css';

const FeatureList = [
  {
    title: 'About me',
    Svg: require('@site/static/img/logo.svg').default,
    description: (
      <>
        In the about section you can find more information about me, my career and my hobbies.
      </>
    ),
  },
  {
    title: 'Learn about my projects',
    Svg: require('@site/static/img/logo.svg').default,
    description: (
      <>
        In the project section you can find more information about my projects, all of them are open source.
      </>
    ),
  },
  {
    title: 'Visit my blog',
    Svg: require('@site/static/img/logo.svg').default,
    description: (
      <>
        I love to write about technology, you can find my blog posts in the blog section.
      </>
    ),
  },
];

function Feature({Svg, title, description}) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
      <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
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
