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
        id: 'disneyworld',
        path: 'disneyworld',
        routeBasePath: 'disneyworld'
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
          id: 'universalstudios',
          path: 'universalstudios',
          routeBasePath: 'universalstudios'
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
          },
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
      // github codeblock theme configuration
      codeblock: {
        showGithubLink: true,
        githubLinkLabel: 'View on GitHub',
        showRunmeLink: false,
        runmeLinkLabel: 'Checkout via Runme'
      },
      algolia: {
        // The application ID provided by Algolia
        appId: 'LWWNAESQKU',
  
        // Public API key: it is safe to commit it
        apiKey: 'a5655e2fc0273d04024cc3d290bf2664',
  
        indexName: 'dsanchezcr',
  
        // Optional: see doc section below
        contextualSearch: true,
  
        // Optional: Specify domains where the navigation should occur through window.location instead on history.push. Useful when our Algolia config crawls multiple documentation sites and we want to navigate with window.location.href to them.
        externalUrlRegex: 'external\\.com|dsanchezcr\\.com',
  
        // Optional: Algolia search parameters
        searchParameters: {},
  
        // Optional: path for search page that enabled by default (`false` to disable it)
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
          },
        ],                      
        copyright: `Copyright © ${new Date().getFullYear()} David Sanchez. Built with Docusaurus. Running on Azure Static Web Apps. Deployed with GitHub Actions.`,
      },
    }),
};
module.exports = config;