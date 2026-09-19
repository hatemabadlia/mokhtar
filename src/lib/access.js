import { doc, getDoc, writeBatch, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { saveUserToFirestore } from '../firebase/userService';

// Prefix used for the offline grant in localStorage.
export const PREFIX = 'almokh_unlocked_';
// Legacy prefix from the «نجاح» era — kept so users' old unlocks still work.
const LEGACY_PREFIX = 'najah_unlocked_';

// One key per (level, module) OR per (level, module, trimester-or-unit).
// This key is what gets saved to the student's `unlockedGroups` array
// (Firestore) and mirrored into localStorage as `${PREFIX}${key}`.
//
// A key WITHOUT a group value means the WHOLE module for that level
// (e.g. `1as_math` unlocks ALL 1AS maths lessons).
export const groupKey = (level, module, groupValue) => {
  const m = String(module || '').trim();
  const g = groupValue == null ? '' : String(groupValue).trim();
  return g ? `${level}_${m}_${g}` : `${level}_${m}`;
};

/**
 * IMPORTANT: the admin lesson-upload form saves `level` as one of
 * '4am' | '1as' | '2as' | 'bac' (lowercase), but the student onboarding
 * flow currently saves the chosen level as 'BEM' | '1AS' | '2AS' | 'BAC'.
 * This normalizer bridges that mismatch so lesson queries actually match.
 * Fixing the onboarding LEVELS ids to the lowercase codes directly is the
 * cleaner long-term fix — this is a safety net either way.
 */
export const normalizeLevel = (raw) => {
  const map = {
    BEM: '4am', '4AM': '4am', '4am': '4am',
    '1AS': '1as', '1as': '1as',
    '2AS': '2as', '2as': '2as',
    BAC: 'bac', 'bac': 'bac',
  };
  return map[raw] || (raw || '').toLowerCase();
};

/** قيمة المجموعة (فصل/وحدة) لدرس معيّن. */
export const groupValueForLesson = (lesson) => {
  if (!lesson) return '';
  if (String(lesson.level) === 'bac') return String(lesson.unit || '').trim();
  return lesson.trimester || '';
};

/** مفتاح الفتح لدرس معيّن — يشمل المادة (رياضيات/فيزياء) حتى لا يفتح رمزٌ مادة أخرى. */
export const groupKeyForLesson = (lesson) => {
  if (!lesson || !lesson.level || !lesson.module) return '';
  return groupKey(lesson.level, lesson.module, groupValueForLesson(lesson));
};

/** هل مفتاح (افتح المفتاح أدناه) بوصول محلي في المتصفح؟ (التحقق من البادئة الجديدة والقديمة) */
export function isGroupUnlocked(key) {
  if (!key) return false;
  try {
    return (
      localStorage.getItem(`${PREFIX}${key}`) === 'granted' ||
      localStorage.getItem(`${LEGACY_PREFIX}${key}`) === 'granted'
    );
  } catch {
    return false;
  }
}

/** حفظ فتحٍ محلي (أوفلاين) لمفتاح معيّن. */
export function unlockGroup(key) {
  if (!key) return;
  try {
    localStorage.setItem(`${PREFIX}${key}`, 'granted');
  } catch {
    // مساحة التخزين غير متاحة — تجاهل
  }
}

/**
 * مزامنة النسخة المحلية مع Firestore (المصدر الوحيد للحقيقة):
 * تُستدعى بعد كل قراءة ناجحة لـ users/{uid}.unlockedGroups —
 * تُزيل أي مفتاح محلي غير موجود في الحساب (بما فيها مفاتيح najah_ القديمة)
 * حتى لا تعرض الواجهة 🔓 بينما الخادم يرفض المشاهدة.
 */
export function syncLocalUnlocks(unlockedGroups = []) {
  const server = new Set(Array.isArray(unlockedGroups) ? unlockedGroups : []);
  try {
    const stale = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      const prefix = k.startsWith(PREFIX) ? PREFIX : k.startsWith(LEGACY_PREFIX) ? LEGACY_PREFIX : '';
      if (prefix && !server.has(k.slice(prefix.length))) stale.push(k);
    }
    stale.forEach((k) => localStorage.removeItem(k));
    server.forEach((key) => localStorage.setItem(`${PREFIX}${key}`, 'granted'));
  } catch {
    // التخزين غير متاح — تجاهل
  }
}

/**
 * هل درسٌ ما مفتوح؟ يغطي:
 * - مفتاح المجموعة: level_module_trimester | level_module_unit
 * - مفتاح المادة كاملة: level_module (يفتح كل دروس المادة بمفتاح واحد)
 * من كلا المخزنين: unlockedGroups (Firestore — النظام الحالي) و localStorage.
 */
export function isLessonUnlocked(lesson, { unlockedGroups = [] } = {}) {
  const group = groupKeyForLesson(lesson);
  if (!group) return false;
  const moduleKey = lesson?.level && lesson?.module ? `${lesson.level}_${lesson.module}` : '';
  if (isGroupUnlocked(group)) return true;
  if (moduleKey && isGroupUnlocked(moduleKey)) return true;
  if (unlockedGroups.includes(group)) return true;
  if (moduleKey && unlockedGroups.includes(moduleKey)) return true;
  return false;
}

/**
 * حفظ الفتح: Firestore (users/{uid}) أولًا ثم localStorage كنسخة محلية.
 * قواعد Firestore لا تقبل إضافة مفتاح إلى unlockedGroups إلا مع
 * lastRedeem: { code, key } — وتتحقق هي بنفسها من أن الرمز صالح ويطابق المفتاح
 * (فلا يمكن للطالب فتح قسم من المتصفح بلا رمز حقيقي).
 * يرمي خطأً إذا فشل الحفظ على الخادم — لأن الـ Worker لا يمنح رابط المشاهدة
 * إلا بما هو مسجّل في الحساب، فلا معنى لفتح محلي بلا فتح حقيقي.
 */
export async function persistUnlock(user, key, code) {
  if (!user?.uid || !key || !code) throw new Error('يجب تسجيل الدخول لاستعمال الرمز.');
  const userRef = doc(db, 'users', user.uid);
  const normalized = String(code).trim().replace(/\s+/g, '').toUpperCase();
  const codeRef = doc(db, 'accessCodes', normalized);

  let snap = await getDoc(userRef);
  if (!snap.exists()) {
    // الملف لم يُنشأ بعد (مثلًا دخول بجوجل ثم رمز مباشرة) — ننشئه ثم نفتح
    await saveUserToFirestore(user);
    snap = await getDoc(userRef);
    if (!snap.exists()) throw new Error('تعذّر تجهيز حسابك — أعد تحميل الصفحة ثم حاول.');
  }
  const before = Array.isArray(snap.data().unlockedGroups) ? snap.data().unlockedGroups : [];
  if (!before.includes(key)) {
    // دفعة واحدة: فتح القسم + تسجيل استعمال الرمز (القواعد تتحقق من الاثنين معًا)
    const batch = writeBatch(db);
    batch.update(userRef, {
      unlockedGroups: [...before, key],
      lastRedeem: { code: normalized, key },
      updatedAt: serverTimestamp(),
    });
    batch.update(codeRef, { usedBy: arrayUnion(user.uid), lastUsedAt: serverTimestamp() });
    await batch.commit();
  }
  unlockGroup(key);
}
