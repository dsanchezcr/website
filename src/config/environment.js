// Environment configuration for the website
export const config = {
  // API endpoints
  api: {
    production: 'https://dsanchezcr.azurewebsites.net',
    qa: 'https://dsanchezcr-qa.azurewebsites.net',
  },
  
  // Production domains
  productionDomains: [
    'dsanchezcr.com',
    'www.dsanchezcr.com'
  ],

  // Get the appropriate API endpoint based on environment
  getApiEndpoint: () => {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      // Hostname-based detection only (avoid process.env in browser)
      const hostname = window.location.hostname;
      const isProduction = config.productionDomains.includes(hostname);
      return isProduction ? config.api.production : config.api.qa;
    }
    // Fallback for server-side rendering
    return config.api.production;
  }
};
