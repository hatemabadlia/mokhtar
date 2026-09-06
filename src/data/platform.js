/**
 * المخ — بيانات العرض الأساسية لِواجهة المتعلّم.
 * المصطلحات المطابقة لِلقيم المكتوبة في لوحة التحكم داخل Firestore.
 */

// المستويات المتاحة (القيم الحرفية المستخدمة في حقل level داخل lessons)
export const LEVELS = [
  {
    id: '4am',
    badge: '4AM',
    name: 'الرابعة متوسط',
    full: 'الرابعة متوسط (BEM)',
    sub: 'تحضير مكثف لشهادة التعليم المتوسط (BEM)',
    icon: '🎓',
  },
  {
    id: '1as',
    badge: '1AS',
    name: 'الأولى ثانوي',
    full: 'الأولى ثانوي',
    sub: 'بناء الأساس لكل الشعب العلمية',
    icon: '📗',
  },
  {
    id: '2as',
    badge: '2AS',
    name: 'الثانية ثانوي',
    full: 'الثانية ثانوي',
    sub: 'تعميق المفاهيم استعدادًا للبكالوريا',
    icon: '📘',
  },
  {
    id: 'bac',
    badge: 'BAC',
    name: 'البكالوريا',
    full: 'البكالوريا (الثالثة ثانوي)',
    sub: 'مراجعة شاملة — منظّمة حسب الوحدات',
    icon: '🏆',
  },
];

export const LEVEL_MAP = Object.fromEntries(LEVELS.map((l) => [l.id, l]));
export const LEVEL_LABELS = Object.fromEntries(LEVELS.map((l) => [l.id, l.name]));
export const LEVEL_FULL_LABELS = Object.fromEntries(LEVELS.map((l) => [l.id, l.full]));

// المواد الدراسية
export const MODULE_LABELS = { math: 'رياضيات', physics: 'فيزياء' };
export const MODULE_ICONS = { math: '∑', physics: '⚛' };

// الفصول الدراسية (للمستويات غير البكالوريا)
export const TRIMESTER_LABELS = { t1: 'الفصل الأول', t2: 'الفصل الثاني', t3: 'الفصل الثالث' };
export const TRIMESTERS = ['t1', 't2', 't3'];

/**
 * تحويل الأرقام العربية (٠-٩) إلى صحيحة لِترتيب الوحدات.
 */
const AR_DIGITS = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
};

export function unitSortValue(unit = '') {
  const match = String(unit).match(/[٠-٩0-9]+/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  return Number(match[0].replace(/[٠-٩]/g, (d) => AR_DIGITS[d] || d));
}

/**
 * وقت الإنشاء كـ milliseconds مع دعم كل صيغ createdAt الممكنة
 * (Timestamp، Date، كائن {seconds}). الدروس بدون createdAt تُعامَل كالأقدم.
 */
export function lessonCreatedAtMs(lesson) {
  const c = lesson?.createdAt;
  if (!c) return 0;
  if (typeof c.toDate === 'function') return c.toDate().getTime();
  if (c instanceof Date) return c.getTime();
  if (typeof c.seconds === 'number') return c.seconds * 1000;
  return 0;
}

/**
 * توحيد صيغة المستوى المحفوظ للمستخدم إلى صيغة الدروس في Firestore:
 * 'BEM' | '1AS' | '2AS' | 'BAC' (صيغة اختيار المستوى/الإعداد) →
 * '4am' | '1as' | '2as' | 'bac' (صيغة حقل level داخل lessons).
 * تتعامل أيضًا مع الصيغة السفلية نفسها، وتُرجع '' إذا كانت القيمة غير معروفة.
 */
export function normalizeLessonsLevel(value) {
  if (!value) return '';
  const raw = String(value).trim();
  const alias = { BEM: '4am', '1AS': '1as', '2AS': '2as', BAC: 'bac' };
  const upper = raw.toUpperCase();
  if (alias[upper]) return alias[upper];
  return LEVEL_FULL_LABELS[raw] ? raw : '';
}