import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyBrNyA7KLgK6p-ElYFAqSgNaSNdn5Q134g",
  authDomain: "refineaiwatermark.firebaseapp.com",
  projectId: "refineaiwatermark",
  storageBucket: "refineaiwatermark.firebasestorage.app",
  messagingSenderId: "764634662018",
  appId: "1:764634662018:web:a00b45bfc1947499c9a09b",
  measurementId: "G-K6TXTVGEN6"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export { app, auth, analytics };
