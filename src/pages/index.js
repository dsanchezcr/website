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
        <h1>
            <Translate id="homepage.header">Welcome to my website</Translate>
        </h1>
        <h2>
          <Translate>Thank you for visiting.</Translate>
        </h2>
        <Translate>I'm David, a developer and tech passionated.</Translate>
        <br/>
        <img id="homepageImage"
          src="/img/Profile.jpg"
        />
        <br/>
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
          {'Visit my {blogLink} to read my recent posts'}
        </Translate>        
      </main>
      </div> 
    </Layout>
  );
}