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
            <Translate id="homepage.header">Bienvenido a mi sitio web</Translate>
        </h1>
        <h2>
          <Translate>Gracias por visitar.</Translate>
        </h2>
        <Translate>Soy David, un desarrollador y apasionado por la tecnología.</Translate>
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
          {'Visita mi {blogLink} para leer las más recientes publicaciones.'}
        </Translate>        
      </main>
      </div> 
    </Layout>
  );
}