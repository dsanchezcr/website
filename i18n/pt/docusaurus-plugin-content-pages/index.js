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
            <Translate id="homepage.header">Bem-vind@ ao meu site</Translate>
        </h1>
        <h2>
          <Translate>Obrigado pela visita.</Translate>
        </h2>
        <Translate>Sou David, desenvolvedor e apaixonado por tecnologia.</Translate>
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
          {'Visite meu {blogLink} para ler as postagens mais recentes.'}
        </Translate>        
      </main>
      </div> 
    </Layout>
  );
}