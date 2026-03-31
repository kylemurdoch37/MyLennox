/// <reference types="vite/client" />
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.republicoflennox.mylennox',
  appName: 'MyLennox',
  webDir: 'dist',
  server: {
    // Required for Firebase Auth (signInWithEmailAndPassword requires a secure context).
    // On Android, this makes the WebView use https://localhost instead of http://localhost.
    androidScheme: 'https',
  },
  android: {
    // Allow cleartext (HTTP) traffic to the local PocketBase server during development.
    // This is needed when VITE_PB_URL points to http://192.168.x.x:8090.
    // Remove or set to false for production builds.
    allowMixedContent: true,
  },
  plugins: {
    // @capgo/capacitor-nfc registers itself as 'CapacitorNfc' via npx cap sync.
    // No additional config needed here; Android manifest permissions are injected automatically.
  },
};

export default config;
