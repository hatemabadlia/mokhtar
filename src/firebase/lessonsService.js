import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';

/**
 * قراءة دروس مستوى معيّن (4am / 1as / 2as / bac).
 * يتم الترتيب حسب createdAt في المتصل للحفاظ على مرونة الاستعلام
 * وعدم الحاجة لفهرسة مركّبة في قواعد Firestore.
 */
export async function fetchLessonsByLevel(level) {
  const q = query(collection(db, 'lessons'), where('level', '==', level));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** قراءة درس واحد بالمعرّف — تُرجع null إذا لم يوجد. */
export async function fetchLessonById(id) {
  const snap = await getDoc(doc(db, 'lessons', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * إنشاء طلب وصول (كتابة عامة — مسموحة في القواعد):
 * - غير البكالوريا: { name, email, level, module, trimester, status, createdAt }
 * - البكالوريا:     { name, email, level, module, unit, status, createdAt }
 */
export async function submitAccessRequest({ name, email, level, module, trimester, unit }) {
  const payload = {
    name: name.trim(),
    email: email.trim(),
    level,
    module,
    status: 'pending',
    createdAt: serverTimestamp(),
  };
  if (level === 'bac') {
    if (unit) payload.unit = unit;
  } else if (trimester) {
    payload.trimester = trimester;
  }
  return addDoc(collection(db, 'accessRequests'), payload);
}