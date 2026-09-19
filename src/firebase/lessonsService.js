import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
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
 * إنشاء طلب وصول — معرّف المستند ثابت: `${uid}_${groupKey}` (تفرضه القواعد)
 * فلا يمكن للطالب إرسال أكثر من طلب واحد لنفس القسم؛ طلب مرفوض يمكن إعادة إرساله.
 * - غير البكالوريا: { uid, name, email, level, module, trimester, status, createdAt }
 * - البكالوريا:     { uid, name, email, level, module, unit, status, createdAt }
 * يرمي خطأ بكود 'duplicate' إذا كان هناك طلب قيد المراجعة (أو مقبول) لنفس القسم.
 */
export async function submitAccessRequest({ uid, name, email, phone, level, module, trimester, unit, groupKey, scope }) {
  if (!uid) throw Object.assign(new Error('auth'), { code: 'auth' });
  if (!groupKey) throw Object.assign(new Error('groupKey'), { code: 'invalid' });
  const payload = {
    name: name.trim(),
    email: email.trim(),
    level,
    module,
    status: 'pending',
    createdAt: serverTimestamp(),
  };
  // معرّف الحساب حتى يربط المشرف الطلب بالطالب، ويفتح له القسم مباشرة عند الموافقة
  if (uid) payload.uid = uid;
  // رقم الهاتف (واتساب) — للتواصل وتأكيد الدفع
  if (phone) payload.phone = String(phone).replace(/\s+/g, '');
  // مفتاح المجموعة المطلوبة (level_module_group) لمطابقة الحالة في واجهة الطالب
  if (groupKey) payload.groupKey = groupKey;
  // scope: 'module' = طلب المادة كاملة (كل الفصول/الوحدات) — بلا trimester/unit
  if (scope === 'module') payload.scope = 'module';
  if (level === 'bac') {
    if (unit) payload.unit = unit;
  } else if (trimester) {
    payload.trimester = trimester;
  }
  const ref = doc(db, 'accessRequests', `${uid}_${groupKey}`);
  try {
    // setDoc بلا merge: إنشاء، أو استبدال طلب مرفوض (القواعد ترفض لمس طلب pending/approved)
    await setDoc(ref, payload);
  } catch (e) {
    if (e?.code === 'permission-denied') throw Object.assign(new Error('duplicate'), { code: 'duplicate' });
    throw e;
  }
  return ref;
}
/**
 * طلبات الوصول الخاصة بالمستخدم (لعرض «قيد المراجعة» ومنع التكرار).
 * القواعد تسمح للطالب بقراءة طلباته فقط (uid == auth.uid).
 */
export async function fetchMyAccessRequests(uid) {
  if (!uid) return [];
  const q = query(collection(db, 'accessRequests'), where('uid', '==', uid));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
