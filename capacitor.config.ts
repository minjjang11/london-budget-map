import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mappetite.app',
  appName: 'Mappetite',
  webDir: 'out',
  server: {
    url: 'http://192.168.1.61:3000',
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      backgroundColor: '#FCFFFF',
    },
  },
};

export default config;
