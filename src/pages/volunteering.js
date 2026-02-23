import React from 'react';
import Layout from '@theme/Layout';
import { useLocale } from '@site/src/hooks';

const translations = {
  en: {
    title: 'Volunteering',
    description: 'My volunteering experience and projects',
    heroTitle: 'Volunteering Experience',
    heroSubtitle: 'Contributing to communities and making a meaningful impact through various volunteer roles',
    openTitle: 'Open to Volunteering Projects',
    openDescription: 'I am always interested in new volunteering opportunities. Feel free to use the contact form to reach out. Looking forward to contribute.',
    contactCTA: 'Get in Touch',
    contactSubject: 'Volunteering Opportunity',
    contactMessage: 'Hi David,\n\nWe\'re [ORGANIZATION NAME] and we have a volunteer project called [PROJECT NAME].\n\nProject Description: [BRIEF DESCRIPTION OF THE PROJECT]\n\nProject/Organization Link: [LINK]\n\nWe think your expertise and experience would be a great fit for our team. Would you be interested in learning more?\n\nThank you!',
    experiences: [
      {
        id: 'nemours',
        organization: 'Nemours',
        url: 'https://www.nemours.org',
        role: 'Gaming Specialist',
        period: 'Apr 2025 - Nov 2025 · 8 mos',
        category: 'Children',
        description: 'I supported young patients by bringing a bit of joy, connection, and comfort through video games, a powerful tool for healing, distraction, and play. 🎮'
      },
      {
        id: 'micromentor',
        organization: 'MicroMentor',
        url: 'https://www.micromentor.org',
        role: 'Mentor Volunteer',
        period: 'Oct 2018 - Sep 2022 · 4 yrs',
        category: 'Science and Technology',
        description: 'I was a mentor in MicroMentor the online platform that helps mentors and mentees create matches to develop a meaningful online mentoring relationship.'
      },
      {
        id: 'guatemala',
        organization: 'Guatemala Village Health',
        url: 'https://www.guatemalavillagehealth.org',
        role: 'Board Member',
        period: 'Jan 2021 - Jul 2021 · 7 mos',
        category: 'Health',
        description: 'As a board member I helped with fundraising activities to the group of health workers, engineers, teachers, administrators, college students and kids that are working to help improve the health of a group of villages in the Departamento Izabal in Guatemala.'
      },
      {
        id: 'fundavida',
        organization: 'FundaVida',
        url: 'https://www.fundavida.org',
        role: 'Trainer Kodu Video Game Design for kids',
        period: 'Sep 2012 - Nov 2014 · 2 yrs 3 mos',
        category: 'Education',
        description: 'I taught kids the basics of programming using www.kodugamelab.com'
      }
    ]
  },
  es: {
    title: 'Voluntariado',
    description: 'Mi experiencia de voluntariado y proyectos',
    heroTitle: 'Experiencia de Voluntariado',
    heroSubtitle: 'Contribuyendo a las comunidades e impactando significativamente a través de diversos roles de voluntariado',
    openTitle: 'Abierto a Proyectos de Voluntariado',
    openDescription: 'Siempre estoy interesado en nuevas oportunidades de voluntariado. Siéntete libre de usar el formulario de contacto para comunicarte conmigo. Espero con entusiasmo contribuir.',
    contactCTA: 'Contáctame',
    contactSubject: 'Oportunidad de Voluntariado',
    contactMessage: 'Hola David,\n\nSomos [NOMBRE DE LA ORGANIZACIÓN] y tenemos un proyecto de voluntariado llamado [NOMBRE DEL PROYECTO].\n\nDescripción del Proyecto: [BREVE DESCRIPCIÓN DEL PROYECTO]\n\nEnlace del Proyecto/Organización: [ENLACE]\n\nCreemos que tu experiencia sería una gran opción para nuestro equipo. ¿Te interesaría conocer más?\n\n¡Gracias!',
    experiences: [
      {
        id: 'nemours',
        organization: 'Nemours',
        url: 'https://www.nemours.org',
        role: 'Especialista en Videojuegos',
        period: 'Abr 2025 - Nov 2025 · 8 meses',
        category: 'Niños',
        description: 'Apoyé a jóvenes pacientes aportando un poco de alegría, conexión y comodidad a través de videojuegos, una herramienta poderosa para la sanación, distracción y juego. 🎮'
      },
      {
        id: 'micromentor',
        organization: 'MicroMentor',
        url: 'https://www.micromentor.org',
        role: 'Voluntario Mentor',
        period: 'Oct 2018 - Sep 2022 · 4 años',
        category: 'Ciencia y Tecnología',
        description: 'Fui mentor en MicroMentor la plataforma en línea que ayuda a mentores y aprendices a crear conexiones para desarrollar una relación de mentoría en línea significativa.'
      },
      {
        id: 'guatemala',
        organization: 'Guatemala Village Health',
        url: 'https://www.guatemalavillagehealth.org',
        role: 'Miembro de la Junta Directiva',
        period: 'Ene 2021 - Jul 2021 · 7 meses',
        category: 'Salud',
        description: 'Como miembro de la junta directiva ayudé con actividades de recaudación de fondos para el grupo de trabajadores de la salud, ingenieros, maestros, administradores, estudiantes universitarios y niños que trabajan para mejorar la salud de un grupo de aldeas en el Departamento Izabal en Guatemala.'
      },
      {
        id: 'fundavida',
        organization: 'FundaVida',
        url: 'https://www.fundavida.org',
        role: 'Instructor de Diseño de Videojuegos Kodu para Niños',
        period: 'Sep 2012 - Nov 2014 · 2 años 3 meses',
        category: 'Educación',
        description: 'Enseñé a niños los conceptos básicos de programación usando www.kodugamelab.com'
      }
    ]
  },
  pt: {
    title: 'Voluntariado',
    description: 'Minha experiência de voluntariado e projetos',
    heroTitle: 'Experiência de Voluntariado',
    heroSubtitle: 'Contribuindo para as comunidades e criando um impacto significativo através de vários papéis de voluntariado',
    openTitle: 'Aberto a Projetos de Voluntariado',
    openDescription: 'Estou sempre interessado em novas oportunidades de voluntariado. Sinta à vontade para usar o formulário de contato para me contactar. Fico feliz em contribuir.',
    contactCTA: 'Entre em Contato',
    contactSubject: 'Oportunidade de Voluntariado',
    contactMessage: 'Oi David,\n\nSomos [NOME DA ORGANIZAÇÃO] e temos um projeto de voluntariado chamado [NOME DO PROJETO].\n\nDescrição do Projeto: [BREVE DESCRIÇÃO DO PROJETO]\n\nLink do Projeto/Organização: [LINK]\n\nAcreditamos que sua experiência seria um ótimo fit para nosso time. Você estaria interessado em saber mais?\n\nObrigado!',
    experiences: [
      {
        id: 'nemours',
        organization: 'Nemours',
        url: 'https://www.nemours.org',
        role: 'Especialista em Videogames',
        period: 'Abr 2025 - Nov 2025 · 8 meses',
        category: 'Crianças',
        description: 'Apoiei jovens pacientes trazendo um pouco de alegria, conexão e conforto através de videogames, uma ferramenta poderosa para cura, distração e brincadeira. 🎮'
      },
      {
        id: 'micromentor',
        organization: 'MicroMentor',
        url: 'https://www.micromentor.org',
        role: 'Voluntário Mentor',
        period: 'Out 2018 - Set 2022 · 4 anos',
        category: 'Ciência e Tecnologia',
        description: 'Fui mentor no MicroMentor a plataforma online que ajuda mentores e aprendizes a criar conexões para desenvolver um relacionamento de mentoria online significativo.'
      },
      {
        id: 'guatemala',
        organization: 'Guatemala Village Health',
        url: 'https://www.guatemalavillagehealth.org',
        role: 'Membro do Conselho',
        period: 'Jan 2021 - Jul 2021 · 7 meses',
        category: 'Saúde',
        description: 'Como membro do conselho ajudei com atividades de arrecadação de fundos para o grupo de profissionais de saúde, engenheiros, professores, administradores, estudantes universitários e crianças que trabalham para melhorar a saúde de um grupo de aldeias no Departamento Izabal na Guatemala.'
      },
      {
        id: 'fundavida',
        organization: 'FundaVida',
        url: 'https://www.fundavida.org',
        role: 'Treinador de Design de Videogames Kodu para Crianças',
        period: 'Set 2012 - Nov 2014 · 2 anos 3 meses',
        category: 'Educação',
        description: 'Ensinei crianças o básico de programação usando www.kodugamelab.com'
      }
    ]
  }
};

// Color scheme for categories
const categoryColors = {
  'Children': { bg: '#e8f4f8', color: '#0369a1', border: '#0284c7' },
  'Science and Technology': { bg: '#f0e7ff', color: '#6d28d9', border: '#7c3aed' },
  'Health': { bg: '#f0fdf4', color: '#15803d', border: '#22c55e' },
  'Education': { bg: '#fef3c7', color: '#b45309', border: '#f59e0b' },
  'Niños': { bg: '#e8f4f8', color: '#0369a1', border: '#0284c7' },
  'Ciencia y Tecnología': { bg: '#f0e7ff', color: '#6d28d9', border: '#7c3aed' },
  'Salud': { bg: '#f0fdf4', color: '#15803d', border: '#22c55e' },
  'Educación': { bg: '#fef3c7', color: '#b45309', border: '#f59e0b' },
  'Crianças': { bg: '#e8f4f8', color: '#0369a1', border: '#0284c7' },
  'Ciência e Tecnologia': { bg: '#f0e7ff', color: '#6d28d9', border: '#7c3aed' },
  'Saúde': { bg: '#f0fdf4', color: '#15803d', border: '#22c55e' },
  'Educação': { bg: '#fef3c7', color: '#b45309', border: '#f59e0b' }
};

function ExperienceCard({ experience, categoryColors }) {
  const colors = categoryColors[experience.category] || categoryColors['Education'];
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: '2rem',
        borderRadius: '12px',
        background: 'var(--ifm-background-color)',
        border: '1px solid var(--ifm-color-emphasis-300)',
        transition: 'all 0.3s ease',
        transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: isHovered
          ? '0 12px 24px rgba(0, 0, 0, 0.15)'
          : '0 2px 8px rgba(0, 0, 0, 0.08)',
        cursor: 'default'
      }}
    >
      {/* Category Badge */}
      <div style={{
        display: 'inline-flex',
        width: 'fit-content',
        marginBottom: '1rem',
        padding: '0.5rem 1rem',
        borderRadius: '8px',
        backgroundColor: colors.bg,
        color: colors.color,
        fontSize: '0.85rem',
        fontWeight: '600',
        border: `1px solid ${colors.border}`
      }}>
        {experience.category}
      </div>

      {/* Organization and Role */}
      <h3 style={{
        margin: '0 0 0.5rem 0',
        fontSize: '1.25rem',
        fontWeight: '700',
        color: 'var(--ifm-font-color-base)'
      }}>
        {experience.role}
      </h3>

      {/* Organization and Period */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '1rem',
        flexWrap: 'wrap'
      }}>
        <a
          href={experience.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: '0.95rem',
            fontWeight: '600',
            color: 'var(--ifm-color-primary)',
            textDecoration: 'none',
            borderBottom: '2px solid transparent',
            transition: 'border-bottom-color 0.2s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.target.style.borderBottomColor = 'var(--ifm-color-primary)';
          }}
          onMouseLeave={(e) => {
            e.target.style.borderBottomColor = 'transparent';
          }}
        >
          {experience.organization}
        </a>
        <span style={{
          fontSize: '0.85rem',
          color: 'var(--ifm-font-color-secondary)'
        }}>
          {experience.period}
        </span>
      </div>

      {/* Description */}
      <p style={{
        margin: 0,
        fontSize: '0.95rem',
        lineHeight: '1.6',
        color: 'var(--ifm-font-color-secondary)'
      }}>
        {experience.description}
      </p>
    </div>
  );
}

export default function Volunteering() {
  const lang = useLocale();
  const t = translations[lang] || translations.en;

  return (
    <Layout title={t.title} description={t.description}>
      <div className="volunteering-page" style={{
        background: 'var(--ifm-background-color)',
        minHeight: 'calc(100vh - 60px)'
      }}>
        {/* Hero Section */}
        <div style={{
          background: 'linear-gradient(135deg, var(--ifm-color-primary) 0%, var(--ifm-color-primary-darker) 100%)',
          padding: '4rem 2rem',
          textAlign: 'center',
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Background decorative elements */}
          <div style={{
            position: 'absolute',
            top: '20%',
            left: '10%',
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.05)',
            pointerEvents: 'none'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '10%',
            right: '15%',
            width: '150px',
            height: '150px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.08)',
            pointerEvents: 'none'
          }} />

          <div className="container" style={{ position: 'relative', zIndex: 1 }}>
            <h1 style={{
              fontSize: '2.75rem',
              fontWeight: '800',
              marginBottom: '1rem',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
            }}>
              {t.heroTitle}
            </h1>
            <p style={{
              fontSize: '1.2rem',
              maxWidth: '700px',
              margin: '0 auto',
              opacity: '0.95',
              lineHeight: '1.7'
            }}>
              {t.heroSubtitle}
            </p>
          </div>
        </div>

        {/* Experiences Section */}
        <div className="container" style={{ padding: '4rem 2rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '2rem',
            maxWidth: '1200px',
            margin: '0 auto'
          }}>
            {t.experiences.map((experience) => (
              <ExperienceCard 
                key={experience.id} 
                experience={experience} 
                categoryColors={categoryColors}
              />
            ))}
          </div>
        </div>

        {/* Open to Volunteering Section */}
        <div style={{
          background: 'var(--ifm-color-emphasis-100)',
          padding: '4rem 2rem',
          textAlign: 'center'
        }}>
          <div className="container">
            <div style={{
              maxWidth: '600px',
              margin: '0 auto',
              padding: '3rem',
              background: 'var(--ifm-background-color)',
              borderRadius: '16px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
              border: '2px solid var(--ifm-color-emphasis-200)'
            }}>
              <span style={{ fontSize: '3rem' }} aria-label="Handshake">🤝</span>
              <h2 style={{
                marginTop: '1rem',
                marginBottom: '1rem',
                fontSize: '2rem',
                fontWeight: '700',
                color: 'var(--ifm-font-color-base)'
              }}>
                {t.openTitle}
              </h2>
              <p style={{
                color: 'var(--ifm-font-color-secondary)',
                fontSize: '1rem',
                lineHeight: '1.7',
                margin: '0 0 2rem 0'
              }}>
                {t.openDescription}
              </p>
              <a
                href={`/contact?subject=${encodeURIComponent(t.contactSubject)}&message=${encodeURIComponent(t.contactMessage)}`}
                style={{
                  display: 'inline-block',
                  padding: '0.75rem 2rem',
                  borderRadius: '8px',
                  background: 'var(--ifm-color-primary)',
                  color: '#ffffff',
                  textDecoration: 'none',
                  fontWeight: '600',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                }}
              >
                {t.contactCTA} →
              </a>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
