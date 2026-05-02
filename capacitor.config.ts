import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.48394b377ea44db3bfccb3841c91e5f8',
  appName: 'phantombet',
  webDir: 'dist',
  server: {
    url: 'https://48394b37-7ea4-4db3-bfcc-b3841c91e5f8.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;