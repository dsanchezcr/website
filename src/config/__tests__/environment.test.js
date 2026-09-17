import { describe, it, expect } from 'vitest';
import { config } from '../../config/environment';
import swa from '../../../static/staticwebapp.config.json';

describe('environment config', () => {
  describe('config.routes', () => {
    it('defines all required API routes', () => {
      const requiredRoutes = [
        'contact',
        'verify',
        'weather',
        'chat',
        'health',
        'healthConfig',
        'xboxProfile',
        'playstationProfile',
        'gamingRefresh',
        'adminOmdb',
      ];

      for (const route of requiredRoutes) {
        expect(config.routes).toHaveProperty(route);
        expect(config.routes[route]).toBeTruthy();
      }
    });

    it('all routes start with /api/', () => {
      for (const [key, route] of Object.entries(config.routes)) {
        expect(route, `Route "${key}" should start with /api/`).toMatch(/^\/api\//);
      }
    });

    it('protects OMDb with the admin rule rather than the anonymous API fallback', () => {
      const route = swa.routes.find(rule =>
        rule.route === config.routes.adminOmdb ||
        (rule.route.endsWith('*') && config.routes.adminOmdb.startsWith(rule.route.slice(0, -1))));
      expect(route.allowedRoles).toEqual(['admin']);
      expect(swa.routes.some(rule => rule.route.includes('/tmdb/'))).toBe(false);
      expect(config.routes).not.toHaveProperty('adminTmdbSync');
    });
  });

  describe('config.features', () => {
    it('defines feature flags as booleans', () => {
      expect(typeof config.features.weather).toBe('boolean');
      expect(typeof config.features.aiChat).toBe('boolean');
    });
  });

  describe('config.api', () => {
    it('defines production, qa, and local endpoints', () => {
      expect(config.api).toHaveProperty('production');
      expect(config.api).toHaveProperty('qa');
      expect(config.api).toHaveProperty('local');
    });

    it('local endpoint points to function host', () => {
      expect(config.api.local).toBe('http://localhost:7071');
    });

    it('production endpoint is empty (relative paths for SWA)', () => {
      expect(config.api.production).toBe('');
    });
  });

  describe('config.recaptchaSiteKey', () => {
    it('is a non-empty string', () => {
      expect(config.recaptchaSiteKey).toBeTruthy();
      expect(typeof config.recaptchaSiteKey).toBe('string');
    });
  });

  describe('config.getApiEndpoint', () => {
    it('is a function', () => {
      expect(typeof config.getApiEndpoint).toBe('function');
    });
  });
});
