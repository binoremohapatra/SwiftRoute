import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getMessaging } from "firebase/messaging";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAcSg_6ZjmXmkXNR5f0w6hTf2scf7axMbw",
  authDomain: "delivery-6b7ae.firebaseapp.com",
  projectId: "delivery-6b7ae",
  storageBucket: "delivery-6b7ae.firebasestorage.app",
  messagingSenderId: "342021016366",
  appId: "1:342021016366:web:fc06fa4784b212fb1308bf",
  measurementId: "G-JCFD9FXECP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

let messaging = null;
if (typeof window !== 'undefined') {
  messaging = getMessaging(app);
}

export { app, analytics, messaging };
