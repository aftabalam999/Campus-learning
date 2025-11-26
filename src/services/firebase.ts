import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

// Configuration for dharamshalacampus project (for database)
const dharamshalaConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyBaLncnVJzGRHxgpAhyl9IeX8dz2e3e-VA",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "dharamshalacampus.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "dharamshalacampus",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "dharamshalacampus.appspot.com",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "1061564721485",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:1061564721485:web:6a384c1e2f446ea154ef04",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-3E03XTJRT0"
};

// Initialize the main Firebase app (dharamshalacampus)
const app = initializeApp(dharamshalaConfig);

// Initialize Firebase services from dharamshalacampus
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

export default app;