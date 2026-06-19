import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail as fbSendPasswordResetEmail } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, Firestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Safe synchronous initialization of Firebase App using singleton pattern
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);

// Initialize Firestore synchronously once, with multi-tab persistence, falling back safely on error
export const db: Firestore = (() => {
  const dbId = (firebaseConfig as any).firestoreDatabaseId;
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    }, dbId);
  } catch (error: any) {
    console.warn("Firestore offline cache initialization failed, falling back to standard Firestore:", error);
    try {
      return getFirestore(app, dbId);
    } catch {
      return getFirestore(app);
    }
  }
})();

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
