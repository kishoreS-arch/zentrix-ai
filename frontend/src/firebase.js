// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { getFirestore, collection, addDoc, query, where, getDocs, orderBy, serverTimestamp, doc, setDoc } from "firebase/firestore";

// TODO: Replace the following with your app's Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyCiNzWxA6vrpihA8d8HfBzVAgs1wYwMtLU",
  authDomain: "sec-ai-agent.firebaseapp.com",
  projectId: "sec-ai-agent",
  storageBucket: "sec-ai-agent.firebasestorage.app",
  messagingSenderId: "949223259529",
  appId: "1:949223259529:web:e9b1d24f35a912a2dff558"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' }); // 🔐 Force account picker
const db = getFirestore(app);

export { 
  auth, 
  googleProvider, 
  db, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signOut, 
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  serverTimestamp,
  doc,
  setDoc
};
