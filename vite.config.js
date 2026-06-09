import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Source lives in site/; tooling + build output live at the repo root.
// root: site/   -> Vite serves/builds from site/ (HTML + src + public/)
// build.outDir  -> emit to /dist at the repo root (one level up from root)
const siteDir = resolve(__dirname, 'site');
const { version: appVersion } = JSON.parse(
  readFileSync(resolve(__dirname, 'package.json'), 'utf8')
);

export default defineConfig({
  root: siteDir,
  base: '/',
  publicDir: resolve(siteDir, 'public'),
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  build: {
    outDir: resolve(__dirname, 'dist'),
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
