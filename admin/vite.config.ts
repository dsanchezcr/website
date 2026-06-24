import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The admin SPA is served from /admin on the Static Web App. It is built into the Docusaurus
// output (../build/admin) so it ships with the existing single SWA deployment. It uses
// HashRouter (see src/main.tsx) so the server only ever needs to serve /admin/index.html.
export default defineConfig({
  base: '/admin/',
  plugins: [react()],
  build: {
    outDir: '../build/admin',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    // For local component iteration. Full auth flow requires the SWA CLI (`swa start`).
    proxy: {
      '/api': { target: 'http://localhost:7071', changeOrigin: true },
    },
  },
});
