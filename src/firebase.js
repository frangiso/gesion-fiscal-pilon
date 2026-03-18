import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyCxryCVy9EKXCe9Xq5-Ow4DcgP8YkA8Gb8",
  authDomain: "gestion-fiscal-pilon-be478.firebaseapp.com",
  projectId: "gestion-fiscal-pilon-be478",
  storageBucket: "gestion-fiscal-pilon-be478.firebasestorage.app",
  messagingSenderId: "79462053757",
  appId: "1:79462053757:web:641d2eaefaf524dc8f3e14"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
