import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import Translate, {translate} from '@docusaurus/Translate';

export default function Home() {
  return (
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