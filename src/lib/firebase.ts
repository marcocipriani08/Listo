import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail as fbSendPasswordResetEmail } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}, (firebaseConfig as any).firestoreDatabaseId);

export const auth = getAuth(app);

export const provider = new GoogleAuthProvider();

export async function loginWithGoogle() {
  return await signInWithPopup(auth, provider);
}

export async function loginWithEmail(email: string, pass: string) {
  return await signInWithEmailAndPassword(auth, email, pass);
}

export async function registerWithEmail(email: string, pass: string) {
  return await createUserWithEmailAndPassword(auth, email, pass);
}

export async function sendPasswordResetEmail(email: string) {
  return await fbSendPasswordResetEmail(auth, email);
}

export async function logout() {
  return await signOut(auth);
}

// Database initialized and exported successfully
