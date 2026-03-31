import { describe, it, expect } from 'vitest';
import {
  platformColors,
  platformLabels,
  statusLabelsByLocale,
  getLocaleKey,
} from '../gameCardConstants';

describe('gameCardConstants', () => {
  describe('platformColors', () => {
    it('defines colors for all platforms', () => {
      const expectedPlatforms = [
        'xbox', 'pc', 'playstation', 'nintendo-switch',
        'meta-quest', 'phone-mobile', 'board-games', 'chess',
      ];
      for (const platform of expectedPlatforms) {
        expect(platformColors, `Missing color for "${platform}"`).toHaveProperty(platform);
        expect(platformColors[platform]).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    });
  });

  describe('platformLabels', () => {
    it('defines labels for all platforms with colors', () => {
      for (const platform of Object.keys(platformColors)) {
        expect(platformLabels, `Missing label for "${platform}"`).toHaveProperty(platform);
        expect(platformLabels[platform]).toBeTruthy();
      }
    });
  });

  describe('statusLabelsByLocale', () => {
    const requiredStatuses = ['completed', 'playing', 'backlog', 'dropped'];
    const requiredLocales = ['en', 'es', 'pt'];

    it('supports all required locales', () => {
      for (const locale of requiredLocales) {
        expect(statusLabelsByLocale).toHaveProperty(locale);
      }
    });

    it('defines all status labels for each locale', () => {
      for (const locale of requiredLocales) {
        for (const status of requiredStatuses) {
          expect(
            statusLabelsByLocale[locale],
            `Missing status "${status}" for locale "${locale}"`
          ).toHaveProperty(status);
          expect(statusLabelsByLocale[locale][status]).toBeTruthy();
        }
      }
    });
  });

  describe('getLocaleKey', () => {
    it('returns "en" for null or undefined', () => {
      expect(getLocaleKey(null)).toBe('en');
      expect(getLocaleKey(undefined)).toBe('en');
    });

    it('returns correct locale for exact matches', () => {
      expect(getLocaleKey('en')).toBe('en');
      expect(getLocaleKey('es')).toBe('es');
      expect(getLocaleKey('pt')).toBe('pt');
    });

    it('returns correct locale for prefixed matches', () => {
      expect(getLocaleKey('es-ES')).toBe('es');
      expect(getLocaleKey('pt-BR')).toBe('pt');
    });

    it('falls back to "en" for unknown locales', () => {
      expect(getLocaleKey('fr')).toBe('en');
      expect(getLocaleKey('de')).toBe('en');
    });
  });
});
