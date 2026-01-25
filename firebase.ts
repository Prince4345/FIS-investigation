import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBjViwnKWqFEkSELh_gQYyzgSCvYS86k4w",
  authDomain: "crime-d481f.firebaseapp.com",
  projectId: "crime-d481f",
  storageBucket: "crime-d481f.firebasestorage.app",
  messagingSenderId: "52133659498",
  appId: "1:52133659498:web:8408d507721954157b5b13",
  measurementId: "G-950WKXDSJN"
};

const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
