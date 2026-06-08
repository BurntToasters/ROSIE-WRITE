import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Source lives in site/; tooling + build output live at the repo root.
// root: site/   -> Vite serves/builds from site/ (HTML + src + public/)
// build.outDir  -> emit to /dist at the repo root (one level up from root)
const siteDir = resolve(__dirname, 'site');

export default defineConfig({
  root: siteDir,
  base: '/',
  publicDir: resolve(siteDir, 'public'),
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
