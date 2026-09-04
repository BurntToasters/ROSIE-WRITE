import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// Source lives in site/; tooling + build output live at the repo root.
// root: site/   -> Vite serves/builds from site/ (HTML + src + public/)
// build.outDir  -> emit to /dist at the repo root (one level up from root)
const configDir = fileURLToPath(new URL('.', import.meta.url));
const siteDir = resolve(configDir, 'site');
const { version: appVersion } = JSON.parse(
  readFileSync(resolve(configDir, 'package.json'), 'utf8')
);

// Cloudflare Pages already serves about.html at /about (Pretty URLs). Vite
// does not, so map the pretty path in dev/preview. Do not put this in
// _redirects — a 200 rewrite there fights Pages and 308-loops /about.
function aboutPrettyUrl() {
  function rewrite(req, _res, next) {
    const url = req.url || '';
    if (url === '/about' || url.startsWith('/about?')) {
      req.url = url.replace(/^\/about/, '/about.html');
    }
    next();
  }
  return {
    name: 'about-pretty-url',
    configureServer(server) {
      server.middlewares.use(rewrite);
    },
    configurePreviewServer(server) {
      server.middlewares.use(rewrite);
    },
  };
}

export default defineConfig({
  root: siteDir,
  base: '/',
  appType: 'mpa',
  publicDir: resolve(siteDir, 'public'),
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  plugins: [aboutPrettyUrl()],
  build: {
    outDir: resolve(configDir, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(siteDir, 'index.html'),
        about: resolve(siteDir, 'about.html'),
        notfound: resolve(siteDir, '404.html'),
      },
    },
  },
});
