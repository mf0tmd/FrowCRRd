import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
    return {
      base: './',
      server: {
        port: 3000,
        strictPort: true,
        host: '0.0.0.0',
      },
      plugins: [react()],
      build: {
        modulePreload: {
          polyfill: false,
        },
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
