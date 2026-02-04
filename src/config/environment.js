// Environment configuration for the website
export const config = {
  // Feature flags - toggle features on/off
  features: {
    recentVisits: false,    // OnlineStatusWidget - shows recent visitor count
    weather: true,          // WeatherWidget - shows weather on homepage
    aiChat: false,          // NLWebChat - AI assistant chat widget
  },

  // API endpoints
  // Note: When using Azure Static Web Apps managed API, the API is served
  // from the same domain, so we use relative paths in production.
  api: {
    // Production uses relative paths (SWA managed API)
    production: '',
    // QA environment (for staging slots or separate deployments)
    qa: '',
    // Local development with SWA CLI (swa start) uses relative paths
    // or direct function host for standalone development
    local: 'http://localhost:7071',
  },
  
  // Production domains
  productionDomains: [
    'dsanchezcr.com',
    'www.dsanchezcr.com'
  ],

  // reCAPTCHA v3 site key
  recaptchaSiteKey: '6LcGaAIsAAAAALzUAxzGFx5R1uJ2Wgxn4RmNsy2I',

  // Get the appropriate API endpoint based on environment
  getApiEndpoint: () => {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      
      // For localhost with direct function host development
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        // Check if we're running through SWA CLI (port 4280) or dev server (port 3000)
        const port = window.location.port;
        // SWA CLI serves on 4280 and proxies API calls, so use relative paths
        if (port === '4280') {
          return '';
        }
        // Direct development server - use function host
        return config.api.local;
      }
      
      // For deployed environments (both production and preview), use relative paths
      // Azure Static Web Apps serves the API from the same origin
      return '';
    }
    // Fallback for server-side rendering (relative paths work in SSR)
    return '';
  }
};

