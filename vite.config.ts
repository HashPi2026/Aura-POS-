import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { backendApp } from './backend/server';

function expressApiPlugin(): Plugin {
  return {
    name: 'express-api-plugin',
    configureServer(server) {
      server.middlewares.use(backendApp);
    },
  };
}

export default defineConfig({
  plugins: [react(), expressApiPlugin()],
  server: {
    port: 3000,
    host: true,
  },
});
