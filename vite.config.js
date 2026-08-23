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

export default defineConfig({
  root: siteDir,
  base: '/',
  publicDir: resolve(siteDir, 'public'),
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
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
