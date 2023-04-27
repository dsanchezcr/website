const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

const config = {
  title: 'David Sanchez',
  tagline: 'Helping developers building the top innovation solutions with the cloud.',
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
  ],

  themes: [
    'docusaurus-theme-github-codeblock'
  ],

  presets: [
    [
      '@docusaurus/preset-classic',
      { 
        docs: false,       
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
      },
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
  
        // Optional: Replace parts of the item URLs from Algolia. Useful when using the same search index for multiple deployments using a different baseUrl. You can use regexp or string in the `from` param. For example: localhost:3000 vs myCompany.com/docs
        replaceSearchResultPathname: {
          from: '/docs/', // or as RegExp: /\/docs\//
          to: '/',
        },
  
        // Optional: Algolia search parameters
        searchParameters: {},
  
        // Optional: path for search page that enabled by default (`false` to disable it)
        searchPagePath: 'search',
      },
      navbar: {
        title: 'Home',
        logo: {
          alt: 'David Sanchez - Website',
          src: 'img/logo.png',
        },

        items: [
          {to: '/blog', label: 'Blog', position: 'left'},
          {to: '/projects', label: 'Projects', position: 'left'},          
          {to: '/contact', label: 'Contact', position: 'left'},
          {to: '/about', label: 'About', position: 'left'},
          {
            to: 'https://sessionize.com/dsanchezcr', 
            label: 'Sessionize', 
            position: 'right'
          },
          {
            to: 'https://goodreads.com/dsanchezcr',
            label: 'GoodReads',
            position: 'right',
          },
          {
            to: 'https://fb.com/dsanchezcr',
            label: 'Facebook',
            position: 'right',
          },
          {
            to: 'https://twitter.com/dsanchezcr',
            label: 'Twitter',
            position: 'right',
          },
          {
            to: 'https://linkedin.com/in/dsanchezcr',
            label: 'LinkedIn',
            position: 'right',
          },
          {
            to: 'https://github.com/dsanchezcr',
            label: 'GitHub',
            position: 'right',
          },
          {
            to: 'https://youtube.com/@dsanchezcr',
            label: 'YouTube',
            position: 'right',
          },
          {
            type: 'localeDropdown',
            position: 'right',
          },        
        ],
      },
      footer: {
        style: "dark",        
        copyright: `Copyright © ${new Date().getFullYear()} David Sanchez. Built with Docusaurus.`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
    }),
};
module.exports = config;