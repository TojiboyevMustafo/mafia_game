import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

// Kalitlar Vercel Environment Variables'dan olinadi; bo'lmasa quyidagi qiymatlar ishlatiladi.
const env = import.meta.env;
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyCN9jnEdVbAvVXfAi8PZjI11uhz6pi8c-Y',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'mafia-game-304b1.firebaseapp.com',
  databaseURL: env.VITE_FIREBASE_DATABASE_URL || 'https://mafia-game-304b1-default-rtdb.firebaseio.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'mafia-game-304b1',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'mafia-game-304b1.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '487884571432',
  appId: env.VITE_FIREBASE_APP_ID || '1:487884571432:web:2ad3b6ceb12deed35c061d',
};

export const missingKeys = Object.entries({
  VITE_FIREBASE_API_KEY: firebaseConfig.apiKey,
  VITE_FIREBASE_DATABASE_URL: firebaseConfig.databaseURL,
  VITE_FIREBASE_PROJECT_ID: firebaseConfig.projectId,
  VITE_FIREBASE_APP_ID: firebaseConfig.appId,
}).filter(([, v]) => !v).map(([k]) => k);

const app = missingKeys.length ? null : initializeApp(firebaseConfig);
export const db = app ? getDatabase(app) : null;
export const auth = app ? getAuth(app) : null;

// Anonim kirish: har bir qurilma o'z noyob uid sini oladi. Rollar maxfiyligi shunga tayanadi.
export function ensureAuth() {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('auth/timeout')), 20000);
    const off = onAuthStateChanged(auth, (u) => {
      if (u) { clearTimeout(timer); off(); resolve(u.uid); }
      else signInAnonymously(auth).catch((e) => { clearTimeout(timer); off(); reject(e); });
    });
  });
}
