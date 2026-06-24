import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// --- Local dev auth mock -------------------------------------------------------------------
// The /admin app authenticates through Azure Static Web Apps (/.auth/*), and the Functions API
// authorizes via the SWA-injected `x-ms-client-principal` header. The SWA CLI emulator provides
// these locally, but it is unstable on Windows (libuv crash on Node 24; intermittent
// "unexpected response content-type" crashes serving 404/401). This dev-only mock reproduces the
// authenticated flow on the (reliable) Vite dev server so you can exercise the SPA + API + CRUD
// without the SWA CLI.
//
//   ADMIN_DEV_ROLES  comma-separated roles for the mock identity (default: "admin").
//                    Use "authenticated" to test the "access denied" screen, or "none"/"" to
//                    test the anonymous sign-in screen.
//   ADMIN_DEV_USER   userDetails for the mock identity (default: local-admin@dev.local).
//
// This ONLY runs under `npm run dev` (apply: 'serve'); `vite build` never includes it.
const devRoles = (process.env.ADMIN_DEV_ROLES ?? 'admin')
  .split(',')
  .map((r) => r.trim())
  .filter((r) => r && r !== 'none');

const clientPrincipal =
  devRoles.length === 0
    ? null
    : {
        identityProvider: 'aad',
        userId: 'local-dev-user',
        userDetails: process.env.ADMIN_DEV_USER ?? 'local-admin@dev.local',
        userRoles: Array.from(new Set(['anonymous', 'authenticated', ...devRoles])),
      };

const principalHeader = clientPrincipal
  ? Buffer.from(JSON.stringify(clientPrincipal)).toString('base64')
  : '';

function swaAuthMock(): Plugin {
  return {
    name: 'swa-auth-mock',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? '';
        if (url.startsWith('/.auth/me')) {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ clientPrincipal }));
          return;
        }
        if (url.startsWith('/.auth/login') || url.startsWith('/.auth/logout')) {
          res.statusCode = 302;
          res.setHeader('Location', '/admin/');
          res.end();
          return;
        }
        next();
      });
    },
  };
}

// The admin SPA is served from /admin on the Static Web App. It is built into the Docusaurus
// output (../build/admin) so it ships with the existing single SWA deployment. It uses
// HashRouter (see src/main.tsx) so the server only ever needs to serve /admin/index.html.
export default defineConfig({
  base: '/admin/',
  plugins: [react(), swaAuthMock()],
  build: {
    outDir: '../build/admin',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    // Reliable full local flow: mock /.auth/* above + inject the principal header into /api so
    // the Functions host authorizes admin calls exactly as SWA would in production.
    proxy: {
      '/api': {
        target: 'http://localhost:7071',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            if (principalHeader) {
              proxyReq.setHeader('x-ms-client-principal', principalHeader);
            }
          });
        },
      },
    },
  },
});
