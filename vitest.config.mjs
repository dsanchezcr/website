import { defineConfig } from 'vitest/config';
import { transformWithOxc } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    {
      name: 'docusaurus-jsx-in-js',
      enforce: 'pre',
      transform(code, id) {
        const filename = id.split('?')[0];
        if (!filename.endsWith('.js') || filename.includes('/node_modules/')) {
          return null;
        }
        // Docusaurus uses JSX in .js; leave .ts/.tsx to Vite's native loader.
        return transformWithOxc(code, filename, {
          lang: 'jsx',
          jsx: { runtime: 'automatic' },
          sourcemap: true,
        });
      },
    },
  ],
  oxc: {
    jsx: { runtime: 'automatic' },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.js'],
    include: ['src/**/__tests__/**/*.test.{js,jsx}'],
    exclude: ['node_modules', 'build', '.docusaurus'],
  },
  resolve: {
    // Root tests also render admin components, which have a separate node_modules.
    dedupe: ['react', 'react-dom'],
    alias: {
      '@site': path.resolve(__dirname),
      '@docusaurus/useDocusaurusContext': path.resolve(__dirname, 'src/__tests__/mocks/useDocusaurusContext.js'),
      '@docusaurus/router': path.resolve(__dirname, 'src/__tests__/mocks/router.js'),
      '@docusaurus/Translate': path.resolve(__dirname, 'src/__tests__/mocks/Translate.js'),
      '@docusaurus/BrowserOnly': path.resolve(__dirname, 'src/__tests__/mocks/BrowserOnly.js'),
      '@docusaurus/Link': path.resolve(__dirname, 'src/__tests__/mocks/Link.js'),
    },
  },
});
