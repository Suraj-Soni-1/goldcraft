import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.goldcraft.billing',
  appName: 'GoldCraft',
  webDir: 'dist',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '317628461401-7gnr96nupjh966ci45abis8ngc6ec37h.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
