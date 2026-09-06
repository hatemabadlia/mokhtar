// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBbgBgJoHBY0wFIsN7-Ayjn-mvqOi9XMoQ",
  authDomain: "sidmokhtar-b6532.firebaseapp.com",
  projectId: "sidmokhtar-b6532",
  storageBucket: "sidmokhtar-b6532.firebasestorage.app",
  messagingSenderId: "266001768183",
  appId: "1:266001768183:web:b02d64989fd8bbd5c1fdf2",
  measurementId: "G-T6RTBY1K0M"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Firebase Authentication
const auth = getAuth(app);

// Keep the user signed in across page refreshes and browser restarts —
// the session is stored in localStorage, and logging out ONLY happens
// via the explicit "تسجيل الخروج" button (which calls signOut).
setPersistence(auth, browserLocalPersistence).catch(() => {
  // persistence failure is rare; auth still works for the current tab
});

// Cloud Firestore
const db = getFirestore(app);

// Analytics is optional and can be disabled for privacy-sensitive setups
let analytics = null;
if (typeof window !== "undefined") {
  try {
    analytics = getAnalytics(app);
  } catch (e) {
    // analytics unavailable (e.g. blocked in some browsers) — ignore
  }
}

export { app, auth, db, analytics };