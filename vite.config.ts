import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";
import { version } from './package.json';

// https://vite.dev/config/
export default defineConfig({
  base: '/md2post/',
  build: {
    sourcemap: 'hidden',
    outDir: 'docs',
  },
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  plugins: [
    react({
      babel: {
        plugins: [
          'react-dev-locator',
        ],
      },
    }),
    tsconfigPaths()
  ],
})
