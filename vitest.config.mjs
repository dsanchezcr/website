import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // Configure OXC to handle JSX in .js files (Docusaurus convention)
  oxc: {
    include: /\.[jt]sx?$/,
    exclude: [],
    jsx: { runtime: 'automatic' },
    lang: 'jsx',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.js'],
    include: ['src/**/__tests__/**/*.test.{js,jsx}'],
    exclude: ['node_modules', 'build', '.docusaurus'],
  },
  resolve: {
    alias: {
      '@site': path.resolve(__dirname),
      '@docusaurus/useDocusaurusContext': path.resolve(__dirname, 'src/__tests__/mocks/useDocusaurusContext.js'),
      '@docusaurus/router': path.resolve(__dirname, 'src/__tests__/mocks/router.js'),
      '@docusaurus/Translate': path.resolve(__dirname, 'src/__tests__/mocks/Translate.js'),
    },
  },
});
