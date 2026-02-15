import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { initializeAuth } from 'firebase/auth';
// @ts-ignore
import { getReactNativePersistence } from '@firebase/auth/dist/rn/index.js';
import { getDatabase } from 'firebase/database';
import { Firestore, getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
const firebaseConfig = {
  apiKey: "AIzaSyBmbgEyTbdFFFwpxaLYdX3rRwvoWSL1wQ0",
  authDomain: "bloodlink-app-b9297.firebaseapp.com",
  databaseURL: "https://bloodlink-app-b9297-default-rtdb.firebaseio.com",
  projectId: "bloodlink-app-b9297",
  storageBucket: "bloodlink-app-b9297.firebasestorage.app",
  messagingSenderId: "492859346824",
  appId: "1:492859346824:web:77dea9c3e8c6eb1376f43d",
  measurementId: "G-B55EDLVHF2"
};

// Initialize Firebase
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// Initialize Auth with persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

// Initialize Firestore with caching enabled
let db: Firestore;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
      cacheSizeBytes: 104857600, // 100 MB cache size
    }),
  });
} catch (e) {
  // Fallback if already initialized or error
  console.log('Using existing Firestore instance or fallback');
  db = getFirestore(app);
}

const storage = getStorage(app);
const realtimeDb = getDatabase(app);

export { auth, db, realtimeDb, storage };
export default app;