import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getAuth, GithubAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDYqNjPhWMP4Dq5JbyeRj8fDxBpMRb3CiA",
  authDomain: "ficflow-dee93.firebaseapp.com",
  projectId: "ficflow-dee93",
  storageBucket: "ficflow-dee93.firebasestorage.app",
  messagingSenderId: "925283793316",
  appId: "1:925283793316:web:687ed403cc62611fe56931",
  measurementId: "G-VJB5ZDTMMM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics (only in browser environment)
let analytics = null;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize GitHub Auth Provider
export const githubProvider = new GithubAuthProvider();
githubProvider.addScope('read:user');
githubProvider.addScope('repo'); // Add repo scope for write access

export { analytics };
export default app;

