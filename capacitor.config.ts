import type { CapacitorConfig } from '@capacitor/cli';

// Configuració de Capacitor per a la compilació nativa (Android/iOS)
const config: CapacitorConfig = {
  appId: 'com.dam.objectlent',
  appName: 'ObjectLent',
  webDir: 'dist',
  server: {
    // Esquema HTTPS per a Android (requerit per a accés a càmera i APIs modernes)
    androidScheme: 'https'
  }
};

export default config;
