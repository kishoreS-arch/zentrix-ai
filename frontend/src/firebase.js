// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInAnonymously, 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult, 
  signOut, 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile,
  browserLocalPersistence,
  setPersistence
} from "firebase/auth";
import { getFirestore, collection, addDoc, query, where, getDocs, orderBy, serverTimestamp, doc, setDoc } from "firebase/firestore";

// Firebase project configuration
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

// 🔐 Set persistence to LOCAL so users stay logged in on mobile
setPersistence(auth, browserLocalPersistence).catch(console.error);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' }); // Force account picker
googleProvider.addScope('email');
googleProvider.addScope('profile');

const db = getFirestore(app);

export { 
  auth, 
  googleProvider, 
  db, 
  signInAnonymously,
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
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
