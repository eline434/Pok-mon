import { defineConfig } from 'vite';

export default defineConfig({
  // Relatieve paden: werkt zowel op GitHub Pages (/Pok-mon/) als op Vercel/Netlify.
  base: './',
  build: {
    target: 'esnext', // nodig voor top-level await (renderer.init)
  },
});
