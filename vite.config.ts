import vue from '@vitejs/plugin-vue';
import path from 'path';
import { defineConfig } from 'vite';

// Configuració de Vite per a l'aplicació ObjectLent
// Utilitza el plugin de Vue 3 i configura els àlies de ruta
export default defineConfig({
  plugins: [
    vue(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // Port per defecte d'Ionic per a desenvolupament local
    port: 8100,
  },
});
