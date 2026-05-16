import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.maimo.app',
  appName: 'Maimo Map',
  webDir: 'out',
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
  },
  plugins: {
    SplashScreen: {
      backgroundColor: '#FCFFFF',
      launchShowDuration: 0,
      launchAutoHide: true,
    },
  },
};

export default config;
