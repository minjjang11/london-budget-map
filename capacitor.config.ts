import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.maimo.app',
  appName: 'Maimo Map',
  webDir: 'out',
  plugins: {
    SplashScreen: {
      backgroundColor: '#FCFFFF',
    },
  },
};

export default config;
