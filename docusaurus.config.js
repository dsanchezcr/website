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

  presets: [
    [
      '@docusaurus/preset-classic',
      { 
        docs: false,       
        blog: {
          showReadingTime: true,
          blogDescription: 'David Sanchez Blog',
          postsPerPage: 10,
          feedOptions: {
            type: 'all'
          }
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
        googleAnalytics: {
          trackingID: 'G-18J431S7WG',
          anonymizeIP: true,
        },
        
      },
    ],
  ],

  plugins: [
    [
      require.resolve("@cmfcmf/docusaurus-search-local"),
      {
        indexDocs: false,
        indexBlog: true,
        language: ['en', 'es', 'pt']
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
      navbar: {
        title: 'Home',
        logo: {
          alt: 'David Sanchez - Website',
          src: 'img/logo.png',
        },
        items: [
          {to: '/blog', label: 'Blog', position: 'left'},
          {to: '/projects', label: 'Projects', position: 'left'},
          {to: '/volunteering', label: 'Volunteering', position: 'left'},
          {to: '/speaking', label: 'Speaking', position: 'left'},
          {to: '/contact', label: 'Contact', position: 'left'},
          {to: '/about', label: 'About', position: 'left'},
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
            type: 'localeDropdown',
            position: 'right',
          },        
        ],
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
    }),
};
module.exports = config;