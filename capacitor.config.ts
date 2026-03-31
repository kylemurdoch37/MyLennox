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
  plugins: {
    // @capawesome-team/capacitor-nfc registers itself as 'Nfc' via npx cap sync.
    // No additional config needed here; Android manifest permissions are injected automatically.
  },
};

export default config;
