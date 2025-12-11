// Import the functions you need from the SDKs you need
// Using full URL imports to match the environment without npm install
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-analytics.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

// Your web app's Firebase configuration
// The previous apiKey "AIzaSyA3..." was expired. Switching to GOOGLE_MAPS_API_KEY.
const firebaseConfig = {
  apiKey: "AIzaSyBoa73MksZmYaFGna4zqQzrFA7d449O0o8", // "AIzaSyA3vpDfYh75Q7iIqMCKl7TdCZfju3i4yCI",
  authDomain: "gen-lang-client-0037518799.firebaseapp.com",
  projectId: "gen-lang-client-0037518799",
  storageBucket: "gen-lang-client-0037518799.firebasestorage.app",
  messagingSenderId: "564433146498",
  appId: "1:564433146498:web:be3caf8cb022242948da9b",
  measurementId: "G-6ERKHS4FXE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);

// Export so other components can use them
export { app, analytics, auth, signInAnonymously, onAuthStateChanged };