import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mappetite.app',
  appName: 'Mappetite',
  webDir: 'out',
  plugins: {
    SplashScreen: {
      backgroundColor: '#FCFFFF',
    },
  },
};

export default config;
