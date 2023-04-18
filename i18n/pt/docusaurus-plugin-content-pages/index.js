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
            <Translate id="homepage.header">Olá! Bem vindo ao meu site pessoal.</Translate>
        </h1>
        <h2>
          <Translate>Eu sou </Translate><span className="intro__name" style={{ color: 'rgb(50, 50, 150)' }}>David Sanchez</span>. <Translate>um desenvolvedor apaixonado por tecnologia.</Translate>
        </h2>        
        <img id="homepageImage"
          src="/img/Profile.jpg"
        />
        <br/>
        <Link
            className="button button--secondary button--lg"
            to="pathname:///Resume_David_Sanchez.pdf">
            Baixe meu CV (inglês)
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
          {'Visite meu {blogLink} para ler minhas postagens mais recentes.'}
        </Translate>        
      </main>
      </div> 
    </Layout>
  );
}