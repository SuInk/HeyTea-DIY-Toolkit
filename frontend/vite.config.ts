import { fileURLToPath, URL } from 'node:url';

import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    base: env.VITE_CDN_BASE || '/',
    plugins: [vue()],
    server: {
      host: '127.0.0.1',
      allowedHosts: ['localhost', '127.0.0.1'],
      proxy: {
        '/api': {
          target: env.VITE_DEV_PROXY_TARGET || 'http://127.0.0.1:8787',
          changeOrigin: true,
        },
      },
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  };
});
