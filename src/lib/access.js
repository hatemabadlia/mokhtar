import { doc, getDoc, writeBatch, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

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
 * حفظ الفتح: localStorage دائمًا + Firestore (users/{uid}) بأفضل جهد.
 * قواعد Firestore لا تقبل إضافة مفتاح إلى unlockedGroups إلا مع
 * lastRedeem: { code, key } — وتتحقق هي بنفسها من أن الرمز صالح ويطابق المفتاح
 * (فلا يمكن للطالب فتح قسم من المتصفح بلا رمز حقيقي).
 */
export async function persistUnlock(user, key, code) {
  unlockGroup(key);
  if (!user?.uid || !key || !code) return;
  const userRef = doc(db, 'users', user.uid);
  const normalized = String(code).trim().replace(/\s+/g, '').toUpperCase();
  const codeRef = doc(db, 'accessCodes', normalized);
  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) return; // الملف يُنشأ في الإعداد الأول — لا نفتح قبل ذلك
    const before = Array.isArray(snap.data().unlockedGroups) ? snap.data().unlockedGroups : [];
    if (before.includes(key)) return;
    // دفعة واحدة: فتح القسم + تسجيل استعمال الرمز (القواعد تتحقق من الاثنين معًا)
    const batch = writeBatch(db);
    batch.update(userRef, {
      unlockedGroups: [...before, key],
      lastRedeem: { code: normalized, key },
      updatedAt: serverTimestamp(),
    });
    batch.update(codeRef, { usedBy: arrayUnion(user.uid), lastUsedAt: serverTimestamp() });
    await batch.commit();
  } catch {
    // القواعد/الشبكة — الفتح المحلي يكفي للاستمرار على هذا الجهاز
  }
}

/**
 * استعمال رمز الوصول لمادة محددة (أو لمجموعة محددة داخل المادة).
 * رمز «مادة كاملة» (بلا فصل/وحدة) يفتح كل دروس المادة؛ يرمي رسالة
 * واضحة إذا حاول مستخدم استعمال رمز مادة أخرى.
 */
export async function redeemAccessCode({ user, code, level, module, groupValue, isBac }) {
  const trimmed = (code || '').trim();
  if (!trimmed) throw new Error('أدخل رمز الدخول.');

  const ref = doc(db, 'accessCodes', trimmed);
  let snap;
  try {
    snap = await getDoc(ref);
  } catch (e) {
    // قواعد Firestore ترفض `get` عندما لا يوجد المستند أو معطّل أو منتهي —
    // كلها تنضمّ هنا كخطأ صلاحيات.
    throw new Error('الرمز غير صالح أو منتهي الصلاحية.');
  }
  if (!snap.exists()) throw new Error('الرمز غير صالح.');

  const data = snap.data();
  if (data.level && data.level !== level) throw new Error('هذا الرمز لا يخص هذا المستوى.');
  if (!data.module || data.module !== module) {
    throw new Error('هذا الرمز لا يخص هذه المادة — كل مادة لها رمزها الخاص.');
  }

  const codeGroupValue = isBac ? String(data.unit || '').trim() : (data.trimester || '');
  const askedGroup = groupValue == null ? '' : String(groupValue).trim();

  if (codeGroupValue && askedGroup !== codeGroupValue) {
    throw new Error(isBac ? 'هذا الرمز يخص وحدة أخرى.' : 'هذا الرمز يخص فصلاً آخر.');
  }

  const key = codeGroupValue ? groupKey(level, module, codeGroupValue) : groupKey(level, module);
  await persistUnlock(user, key, trimmed);
  return key;
}