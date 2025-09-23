import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiUrl = env.API_URL || env.VITE_API_URL || '';

  return {
    plugins: [react()],
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0'),
      'import.meta.env.VITE_API_URL': JSON.stringify(apiUrl)
    },
    envPrefix: ['VITE_', 'API_', 'APP_']
  };
});
