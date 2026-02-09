import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getFirestore } from 'firebase/firestore';
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

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const realtimeDb = getDatabase(app);

export { auth, db, realtimeDb, storage };
export default app;