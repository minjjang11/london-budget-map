import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.londonbudgetmap.app',
  appName: 'LondonBudgetMap',
  webDir: 'public',
  plugins: {
    SplashScreen: {
      backgroundColor: '#FCFFFF',
    },
  },
};

export default config;
