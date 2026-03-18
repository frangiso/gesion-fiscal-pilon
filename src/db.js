import { collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc, query, where, orderBy, serverTimestamp, onSnapshot } from 'firebase/firestore'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { db, auth } from './firebase'

// AUTH
export async function loginUser(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password)
  return await getUserProfile(cred.user.uid)
}
export async function logoutUser() { await signOut(auth) }
export async function createAuthUser(email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  return cred.user.uid
}

// USUARIOS
export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}
export async function getAllClients() {
  const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'client')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}
export async function createClient(uid, data) {
  await setDoc(doc(db, 'users', uid), { ...data, role: 'client', createdAt: serverTimestamp() })
}
export async function updateClient(uid, data) {
  await updateDoc(doc(db, 'users', uid), data)
}
export async function deleteClient(uid) {
  await deleteDoc(doc(db, 'users', uid))
}

// FACTURACION
export async function getInvoices(userId) {
  const snap = await getDocs(query(collection(db, 'invoices'), where('userId', '==', userId), orderBy('per', 'desc')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}
export async function getAllInvoices() {
  const snap = await getDocs(query(collection(db, 'invoices'), orderBy('per', 'desc')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}
export async function upsertInvoice(userId, per, monto, desc = '') {
  const q = query(collection(db, 'invoices'), where('userId', '==', userId), where('per', '==', per))
  const snap = await getDocs(q)
  if (!snap.empty) {
    await updateDoc(snap.docs[0].ref, { monto, desc, updatedAt: serverTimestamp() })
  } else {
    await addDoc(collection(db, 'invoices'), { userId, per, monto, desc, createdAt: serverTimestamp() })
  }
}
export async function deleteInvoice(id) {
  await deleteDoc(doc(db, 'invoices', id))
}

// PAGOS
export async function getPayments(userId) {
  const snap = await getDocs(query(collection(db, 'payments'), where('userId', '==', userId), orderBy('per', 'desc')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}
export async function getAllPayments() {
  const snap = await getDocs(query(collection(db, 'payments'), orderBy('per', 'desc')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}
export async function createPayment(data) {
  await addDoc(collection(db, 'payments'), { ...data, createdAt: serverTimestamp() })
}
export async function updatePayment(id, data) {
  await updateDoc(doc(db, 'payments', id), data)
}
export async function deletePayment(id) {
  await deleteDoc(doc(db, 'payments', id))
}

// IIBB
export async function getIIBB(userId) {
  const snap = await getDocs(query(collection(db, 'iibb'), where('userId', '==', userId), orderBy('per', 'desc')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}
export async function getAllIIBB() {
  const snap = await getDocs(query(collection(db, 'iibb'), orderBy('per', 'desc')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}
export async function createIIBB(data) {
  await addDoc(collection(db, 'iibb'), { ...data, createdAt: serverTimestamp() })
}
export async function updateIIBBDoc(id, data) {
  await updateDoc(doc(db, 'iibb', id), data)
}

// MENSAJES
export function listenMessages(userId, callback) {
  return onSnapshot(
    query(collection(db, 'messages'), where('userId', '==', userId), orderBy('fecha', 'asc')),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  )
}
export async function sendMessage(userId, from, txt) {
  await addDoc(collection(db, 'messages'), { userId, from, txt, fecha: serverTimestamp(), leido: false })
}

// CALENDARIO
export async function getCalEvents() {
  const snap = await getDocs(collection(db, 'calEvents'))
  if (snap.empty) {
    // Inicializar eventos por defecto
    const defaults = [
      { dia: 20, mes: 0, tipo: 'mt', lbl: 'Vencimiento Monotributo', col: '#1B4FD8', recurrente: true, desc: 'Pago cuota mensual' },
      { dia: 15, mes: 0, tipo: 'ib', lbl: 'Vencimiento IIBB', col: '#0A6E3E', recurrente: true, desc: 'Declaracion jurada IIBB' },
      { dia: 20, mes: 0, tipo: 'rc', lbl: 'Recategorizacion Enero', col: '#C45A0A', recurrente: false, desc: 'Periodo enero' },
      { dia: 20, mes: 6, tipo: 'rc', lbl: 'Recategorizacion Julio', col: '#C45A0A', recurrente: false, desc: 'Periodo julio' },
    ]
    for (const ev of defaults) await addDoc(collection(db, 'calEvents'), ev)
    return defaults.map((ev, i) => ({ ...ev, id: 'default' + i }))
  }
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}
export async function createCalEvent(data) {
  const ref = await addDoc(collection(db, 'calEvents'), data)
  return ref.id
}
export async function updateCalEvent(id, data) {
  await updateDoc(doc(db, 'calEvents', id), data)
}
export async function deleteCalEvent(id) {
  await deleteDoc(doc(db, 'calEvents', id))
}

// INICIALIZAR ADMIN
export async function initAdmin() {
  try {
    const q = query(collection(db, 'users'), where('role', '==', 'admin'))
    const snap = await getDocs(q)
    if (!snap.empty) return
    const cred = await createUserWithEmailAndPassword(auth, 'franco@armandpilon.com.ar', 'Admin2026!')
    await setDoc(doc(db, 'users', cred.user.uid), {
      email: 'franco@armandpilon.com.ar', role: 'admin',
      nombre: 'Franco', apellido: 'Armand Pilon', createdAt: serverTimestamp()
    })
  } catch (e) { /* ya existe */ }
}
