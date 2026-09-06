/**
 * حفظ مستوى المستخدم (السنة) محليًا — بمعرّف مفتاح لكل مستخدم.
 * يُستخدم كمخزّن احتياطي يعمل حتى لو تعذّر الوصول إلى Firestore:
 * بفضله يتمكن المستخدم من اختيار سنته والمتابعة إلى لوحة التحكم
 * دون أن يعتمد على الاتصال بالخادم. المزامنة مع Firestore تتم لاحقًا.
 */

const KEY = (uid) => `almokh_level_${uid || 'anon'}`;
const LEGACY_KEY = (uid) => `najah_level_${uid || 'anon'}`;

export function getSavedLevel(uid) {
  try {
    return localStorage.getItem(KEY(uid)) || localStorage.getItem(LEGACY_KEY(uid)) || '';
  } catch {
    return '';
  }
}

export function saveSavedLevel(uid, level) {
  if (!level) return;
  try {
    localStorage.setItem(KEY(uid), level);
  } catch {
    // ignore
  }
}