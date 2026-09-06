/**
 * تتبّع الدروس التي شاهدها الطالب — محليًا في المتصفح.
 *
 * المفتاح: almokh_watched_<uid>_<lessonId> → قيمة الطابع الزمني (ms).
 * البادئة لكل مستخدم تمنع خلط سجل المشاهدة بين الحسابات على نفس الجهاز.
 * (نقرأ أيضًا مفاتيح najah_watched_ القديمة حتى لا يفقد المستخدمون سجلّهم.)
 * هذا ليس مصدر الحقيقة النهائي للمشاهدة — يكفي حاليًا لعرض
 * «الدروس المكملة» في صفحة التقدّم دون الحاجة إلى خادم.
 */

const KEY_PREFIX = 'almokh_watched_';
const LEGACY_PREFIX = 'najah_watched_';

const keyFor = (uid, lessonId) => `${KEY_PREFIX}${uid}_${lessonId}`;

/** تسجيل مشاهدة درس (يستبدل الطابع الزمني عند كل زيارة). */
export function markLessonWatched(uid, lessonId) {
  if (!uid || !lessonId) return;
  try {
    localStorage.setItem(keyFor(uid, lessonId), String(Date.now()));
  } catch {
    // التخزين غير متاح — تجاهل بهدوء
  }
}

/** قائمة الدروس الموشاهدة مرتبة تنازليًا حسب وقت المشاهدة (من البادئتين). */
export function getWatchedLessonIds(uid) {
  const out = [];
  if (!uid) return out;
  const prefixes = [`${KEY_PREFIX}${uid}_`, `${LEGACY_PREFIX}${uid}_`];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      for (const prefix of prefixes) {
        if (k.startsWith(prefix)) {
          out.push({
            lessonId: k.slice(prefix.length),
            watchedAt: Number(localStorage.getItem(k)) || 0,
          });
          break;
        }
      }
    }
  } catch {
    // ignore
  }
  // نفضّل النسخة الجديدة عند التكرار (ظهر نفس الدرس ببادئة قديمة وجديدة)
  const byLesson = new Map();
  for (const w of out) {
    const prev = byLesson.get(w.lessonId);
    if (!prev || w.watchedAt > prev.watchedAt) byLesson.set(w.lessonId, w);
  }
  return Array.from(byLesson.values()).sort((a, b) => b.watchedAt - a.watchedAt);
}

/** مجموعة معرّفات الدروس الموشاهدة للبحث السريع. */
export function getWatchedLessonIdSet(uid) {
  return new Set(getWatchedLessonIds(uid).map((w) => w.lessonId));
}