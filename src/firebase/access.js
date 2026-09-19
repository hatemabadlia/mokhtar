import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './config';
import { PREFIX, groupKey, groupKeyForLesson, isGroupUnlocked, unlockGroup } from '../lib/access';

// هذه الطبقة (المتوافقة) تُعيد تصدير منطق الوصول الموحَّد من lib/access
// معًا بأسماء قديمة، وتحتفظ بالتحقق من الرمز مع نطاق المادة/المجموعة.
export { PREFIX, groupKey, groupKeyForLesson as getGroupKeyForLesson, isGroupUnlocked, unlockGroup };

/** تحويل expiresAt (Timestamp / Date / عدد) إلى milliseconds. */
function toMillis(value) {
  if (!value) return 0;
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') {
    // أعداد كبيرة تُفسَّر كـ ms (حوالي 2026 = 1.7e12)، والأصغر كـ ثواني.
    return value > 100000000000 ? value : value * 1000;
  }
  if (typeof value === 'string') return Date.parse(value) || 0;
  return 0;
}

/**
 * التحقق من رمز الوصول بوثيقة واحدة:
 * getDoc(doc(db, 'accessCodes', CODE.toUpperCase()))
 * صالح فقط إذا active === true و (لا يوجد expiresAt أو expiresAt > الآن).
 *
 * scope (اختياري): { level, module, groupValue, isBac } لضمان أن الرمز
 * يفتح المادة المطلوبة (وليس المادة المجاورة):
 * - رمز بدون ""module"" → مرفوض (كل رمز الآن خاص بمادة واحدة).
 * - رمز بحقل unit/trimester → يجب أن يطابق groupValue.
 * - رمز بلا unit/trimester → رمز «مادة كاملة» يفتح المادة كلها.
 */
export async function validateAccessCode(rawCode, scope = {}) {
  const code = (rawCode || '').trim().replace(/\s+/g, '').toUpperCase();
  if (!code) return { ok: false, code: '' };

  let snap;
  try {
    snap = await getDoc(doc(db, 'accessCodes', code));
  } catch (e) {
    // قواعد Firestore ترفض قراءة رمز غير موجود / معطّل / منتهٍ بـ permission-denied —
    // هذا يعني «رمز غير صحيح» وليس مشكلة اتصال.
    if (e?.code === 'permission-denied') return { ok: false, code };
    return { ok: false, code, error: 'network' };
  }

  if (!snap.exists()) return { ok: false, code };

  const data = snap.data();
  if (data.active !== true) return { ok: false, code };

  const expires = toMillis(data.expiresAt);
  if (expires && expires <= Date.now()) return { ok: false, code };

  // حدّ الاستعمال: رمز محدود العدد استُهلك من قِبل طلاب آخرين
  const usedBy = Array.isArray(data.usedBy) ? data.usedBy : [];
  const uid = auth.currentUser?.uid;
  if (data.maxUses != null && usedBy.length >= data.maxUses && !(uid && usedBy.includes(uid))) {
    return { ok: false, code, error: 'exhausted' };
  }

  // النطاق: كل رمز يجب أن يخص مادة واحدة بالضبط.
  if (!data.module) return { ok: false, code, error: 'scope' };
  if (scope.module && data.module !== scope.module) return { ok: false, code, error: 'scope' };
  if (scope.level && data.level && data.level !== scope.level) return { ok: false, code, error: 'scope' };

  const codeIsBac = scope.isBac !== undefined ? scope.isBac : (String(data.level) === 'bac' || !!data.unit);
  const codeGroupValue = codeIsBac ? String(data.unit || '').trim() : (data.trimester || '');

  if (scope.groupValue && codeGroupValue && String(scope.groupValue).trim() !== codeGroupValue) {
    return { ok: false, code, error: 'scope' };
  }

  const level = scope.level || data.level;
  const module = scope.module || data.module;
  const key = codeGroupValue ? groupKey(level, module, codeGroupValue) : groupKey(level, module);

  return { ok: true, code, key, data };
}