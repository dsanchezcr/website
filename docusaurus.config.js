const config = {
  title: 'David Sanchez',
  tagline: 'Helping people to build innovative solutions with technology. 🚀',
  url: 'https://dsanchezcr.com',
  staticDirectories: ['public', 'static'],
  baseUrl: '/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',
  organizationName: 'dsanchezcr',
  projectName: 'website',

  plugins: [
    [
      '@docusaurus/plugin-google-gtag',
      {
        trackingID: 'G-18J431S7WG',
        anonymizeIP: true,
      },      
    ],
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'disney',
        path: 'disney',
        routeBasePath: 'disney'
      },
    ]
  ],

  themes: [
    'docusaurus-theme-github-codeblock'
  ],

  presets: [
    [
      '@docusaurus/preset-classic',
      { 
        docs: {
          id: 'universal',
          path: 'universal',
          routeBasePath: 'universal'
        },      
        blog: {
          blogSidebarTitle: 'Recent posts',
          blogSidebarCount: 0,
          showReadingTime: true,
          blogDescription: 'David Sanchez`s Blog',
          postsPerPage: 10,
          feedOptions: {
            type: 'all',
            copyright: `Copyright © ${new Date().getFullYear()} David Sanchez.`            
          }
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        }      
      }      
    ],
  ],

  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es', 'pt'],
    localeConfigs: {
      en: {
        label: 'English',
        direction: 'ltr',
        htmlLang: 'en-US',
        calendar: 'gregory',
      },
      es: {
        label: 'Español',
        direction: 'ltr',
        htmlLang: 'es-ES',
        calendar: 'gregory',
      },
      pt: {
        label: 'Português',
        direction: 'ltr',
        htmlLang: 'pt-BR',
        calendar: 'gregory',
      }
    },
  },

  themeConfig:
    ({
      codeblock: {
        showGithubLink: true,
        githubLinkLabel: 'View on GitHub',
        showRunmeLink: false,
        runmeLinkLabel: 'Checkout via Runme'
      },
      algolia: {
        appId: 'LWWNAESQKU',  
        apiKey: 'a5655e2fc0273d04024cc3d290bf2664',  
        indexName: 'dsanchezcr',  
        contextualSearch: true,  
        externalUrlRegex: 'external\\.com|dsanchezcr\\.com',
        searchParameters: {},
        searchPagePath: 'search',
      },
      navbar: {
        title: 'Home',
        logo: {
          alt: 'David Sanchez - Website',
          src: 'img/logo.svg',
        },
        items: [
          {to: '/blog', label: 'Blog', position: 'left'},
          {to: '/projects', label: 'Projects', position: 'left'},    
          {to: '/about', label: 'About', position: 'left'},
          {to: '/contact', label: 'Contact', position: 'left'},
          {to: '/sponsors', label: 'Sponsors', position: 'right'},
          {
            type: 'localeDropdown',
            position: 'right',
          },  
        ],
      },
      footer: {
        style: "dark",
        links: [
          {
            href: 'https://sessionize.com/dsanchezcr', 
            label: 'Sessionize', 
          },
          {
            href: 'https://goodreads.com/dsanchezcr',
            label: 'GoodReads',
          },
          {
            href: 'https://fb.com/dsanchezcr',
            label: 'Facebook',
          },
          {
            href: 'https://twitter.com/dsanchezcr',
            label: 'Twitter',
          },        
          {
            href: 'https://youtube.com/@dsanchezcr',
            label: 'YouTube',
          },
          {
            href: 'https://github.com/dsanchezcr',
            label: 'GitHub',
          },
          {
            href: 'https://linkedin.com/in/dsanchezcr',
            label: 'LinkedIn',
          }
        ],                      
        copyright: `Copyright © ${new Date().getFullYear()} David Sanchez. Built with <a href='https://docusaurus.io' target='_blank'>Docusaurus</a>. Running on <a href='https://learn.microsoft.com/azure/static-web-apps/overview' target='_blank'>Azure Static Web Apps</a>. Deployed with <a href='https://github.com/dsanchezcr/website/actions/workflows/azure-static-web-apps-delightful-moss-07d95f50f.yml' target='_blank'>GitHub Actions</a>. <br />The views expressed on this site are my own and do not necessarily reflect the views of my employer.`,
      },
    }),
};
module.exports = config;