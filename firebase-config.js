// Firebase Web SDK Configuration
// Use this in your frontend/mobile app

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBt6ii7LIVEoomdw7B_SVY1veT6KmtEa1M",
  authDomain: "thematic-grin-482015-a3.firebaseapp.com",
  projectId: "thematic-grin-482015-a3",
  storageBucket: "thematic-grin-482015-a3.firebasestorage.app",
  messagingSenderId: "158906201698",
  appId: "1:158906201698:web:99c416ae5ef700659f033b",
  measurementId: "G-SK0B9CD4TT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const analytics = getAnalytics(app);

export { app, auth, db, storage, analytics };
