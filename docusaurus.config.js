const config = {
  title: 'David Sanchez',
  tagline: 'Helping people to build innovative solutions with technology. 🚀',
  url: 'https://dsanchezcr.com',
  staticDirectories: ['public', 'static'],
  baseUrl: '/',
  onBrokenLinks: 'throw',
  onBrokenAnchors: 'throw',
  favicon: 'img/favicon.ico',

  // Client modules for global initializations
  clientModules: [
    require.resolve('./src/clientModules/aosInit.js'),
    require.resolve('./src/clientModules/jsonLd.js'),
  ],

  // Enables future flags for performance and compatibility
  future: {
    v4: true,
  },

  // SEO and social sharing metadata
  headTags: [
    {
      tagName: 'meta',
      attributes: {
        name: 'keywords',
        content: 'David Sanchez, software development, Azure, GitHub, Microsoft, blog, technology, cloud computing, developer productivity',
      },
    },
    {
      tagName: 'meta',
      attributes: {
        name: 'author',
        content: 'David Sanchez',
      },
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'preconnect',
        href: 'https://fonts.googleapis.com',
      },
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossorigin: 'anonymous',
      },
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&display=swap',
      },
    },
  ],

  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },
  organizationName: 'dsanchezcr',
  projectName: 'website',

  plugins: [
    // Suppress harmless "Critical dependency" warning from vscode-languageserver-types
    // (transitive dep: theme-mermaid → mermaid → langium → vscode-languageserver-types)
    function ignoreVscodeLanguageServerWarning() {
      return {
        name: 'ignore-vscode-languageserver-warning',
        configureWebpack() {
          return {
            ignoreWarnings: [
              {
                module: /vscode-languageserver-types/,
                message: /Critical dependency/,
              },
            ],
          };
        },
      };
    },
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
    ],
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'gaming',
        path: 'gaming',
        routeBasePath: 'gaming'
      },
    ],
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'movies-tv',
        path: 'movies-tv',
        routeBasePath: 'movies-tv'
      },
    ],
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'projects',
        path: 'projects',
        routeBasePath: 'projects',
      },
    ],
    [
      '@docusaurus/plugin-sitemap',
      {
        lastmod: 'date',
        changefreq: 'weekly',
        priority: 0.5,
        ignorePatterns: ['/tags/**'],
        filename: 'sitemap.xml',
        createSitemapItems: async (params) => {
          const {defaultCreateSitemapItems, ...rest} = params;
          const items = await defaultCreateSitemapItems(rest);
          return items.filter((item) => !item.url.includes('/page/'));
        },
      },
    ],
  ],

  themes: [
    'docusaurus-theme-github-codeblock',
    '@docusaurus/theme-mermaid',
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
          blogTitle: 'David Sanchez Blog',
          blogDescription: 'Thoughts on software development, Azure, GitHub, and technology',
          blogSidebarTitle: 'Recent posts',
          blogSidebarCount: 'ALL',
          showReadingTime: true,
          readingTime: ({content, frontMatter, defaultReadingTime}) =>
            frontMatter.hide_reading_time
              ? undefined
              : defaultReadingTime({content, options: {wordsPerMinute: 200}}),
          postsPerPage: 10,
          // Enable blog archive page
          archiveBasePath: 'archive',
          // Tags page configuration
          tagsBasePath: 'tags',
          // Blog authors
          authorsMapPath: 'authors.yml',
          feedOptions: {
            type: 'all',
            title: 'David Sanchez Blog',
            description: 'Stay up to date with the latest posts from David Sanchez',
            copyright: `Copyright © ${new Date().getFullYear()} David Sanchez.`,
            language: 'en',
            createFeedItems: async (params) => {
              const {blogPosts, defaultCreateFeedItems, ...rest} = params;
              return defaultCreateFeedItems({
                blogPosts: blogPosts.filter((item, index) => index < 20),
                ...rest,
              });
            },
          },
          // Add edit URL for blog posts
          editUrl: 'https://github.com/dsanchezcr/website/edit/main/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
        // Sitemap is now configured separately for more control
        sitemap: false,
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
        path: 'es',
      },
      pt: {
        label: 'Português',
        direction: 'ltr',
        htmlLang: 'pt-BR',
        calendar: 'gregory',
        path: 'pt',
      }
    },
  },

  themeConfig:
    ({
      // Site metadata for SEO
      metadata: [
        {name: 'twitter:card', content: 'summary_large_image'},
        {name: 'twitter:site', content: '@dsanchezcr'},
        {name: 'twitter:creator', content: '@dsanchezcr'},
        {property: 'og:type', content: 'website'},
        {property: 'og:site_name', content: 'David Sanchez'},
      ],
      // Color mode configuration
      colorMode: {
        defaultMode: 'light',
        disableSwitch: false,
        respectPrefersColorScheme: true,
      },
      // Table of Contents configuration
      tableOfContents: {
        minHeadingLevel: 2,
        maxHeadingLevel: 4,
      },
      // Image zoom on click
      image: 'img/logo.svg',
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
        hideOnScroll: true,
        logo: {
          alt: 'David Sanchez - Website',
          src: 'img/logo.svg',
        },
        items: [
          {to: '/blog', label: 'Blog', position: 'left'},
          {to: '/projects', label: 'Projects', position: 'left'},
          {to: '/about', label: 'About', position: 'left'},
          {to: '/contact', label: 'Contact', position: 'left'},
          {
            type: 'dropdown',
            label: 'Interests',
            position: 'left',
            items: [
              {to: '/gaming', label: 'Gaming'},
              {to: '/movies-tv', label: 'Movies & TV'},
              {to: '/3dprinting', label: '3D Printing'},
              {to: '/volunteering', label: 'Volunteering'},
            ],
          },
          {to: '/sponsors', label: 'Sponsors', position: 'right'},
          {
            type: 'localeDropdown',
            position: 'right',
          },  
        ],
      },
      // Prism code highlighting configuration
      prism: {
        additionalLanguages: ['bash', 'csharp', 'json', 'yaml', 'powershell', 'bicep'],
      },
      footer: {
        style: "dark",
        links: [
          {
            title: 'Content',
            items: [
              {
                label: 'Blog',
                to: '/blog',
              },
              {
                label: 'Projects',
                to: '/projects',
              },
              {
                label: 'About',
                to: '/about',
              }
            ],
          },
          {
            title: 'Social',
            items: [
              {
                label: 'GitHub',
                href: 'https://github.com/dsanchezcr',
              },
              {
                label: 'LinkedIn',
                href: 'https://linkedin.com/in/dsanchezcr',
              },
              {
                label: 'X (Twitter)',
                href: 'https://twitter.com/dsanchezcr',
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'YouTube',
                href: 'https://youtube.com/@dsanchezcr',
              },
              {
                label: 'Sessionize',
                href: 'https://sessionize.com/dsanchezcr',
              },
              {
                label: 'GoodReads',
                href: 'https://goodreads.com/dsanchezcr',
              },
            ],
          },
        ],                      
        copyright: `Copyright © ${new Date().getFullYear()} David Sanchez. Built with <a href='https://docusaurus.io' target='_blank'>Docusaurus</a> · <a href='https://learn.microsoft.com/azure/static-web-apps/overview' target='_blank'>Azure Static Web Apps</a> · <a href='https://github.com/dsanchezcr/website' target='_blank'>Source on GitHub</a><br />The views expressed on this site are my own and do not necessarily reflect the views of my employer.`,
      },
    }),
};
module.exports = config;