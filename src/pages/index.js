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
          <Translate>I am </Translate><span className="intro__name" style={{ color: 'rgb(50, 50, 150)' }}>David Sanchez</span>. <Translate>A developer and technology passionated.</Translate>
        </h2>        
        <img id="homepageImage"
          src="/img/Profile.jpg"
        />
        <br/>
        <Link
            className="button button--secondary button--lg"
            to="pathname:///docs/Resume_David_sanchez.pdf">
            Download my resume
        </Link>
        <br />
        <Translate
          id="homepage.visitMyBlog"
          values={{
            blogLink: (
              <Link to="/blog">
                <Translate
                  id="homepage.visitMyBlog.linkLabel"
                  description="The label for the link to my blog">
                  blog
                </Translate>
              </Link>
            ),
          }}>
          {'Visit my {blogLink} to read my recent posts. '}
        </Translate>        
      </main>
      </div> 
    </Layout>
  );
}