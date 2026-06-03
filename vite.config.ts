import { defineConfig } from 'vite';

// Relative base ("./") so the build works whether it is served from the domain
// root (local `vite preview`) or from a GitHub Pages project subpath
// (https://<user>.github.io/<repo>/) without hard-coding the repo name.
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1600, // Phaser is a large single dependency; silence the noise.
  },
});
