import { defineConfig } from 'vite';
import { cpSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: './',
  publicDir: false,
  build: {
    outDir: 'dist',
    assetsDir: 'bundled',
  },
  plugins: [
    {
      name: 'copy-game-assets',
      writeBundle() {
        cpSync(
          resolve(__dirname, 'assets'),
          resolve(__dirname, 'dist/assets'),
          { recursive: true }
        );
      },
    },
  ],
});
