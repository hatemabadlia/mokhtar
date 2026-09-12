/**
 * واتساب — قناة التواصل لطلب الرموز وتأكيد الدفع.
 * الرقم نفسه الظاهر في «تواصل معنا» بالصفحة الرئيسية (0557740360)
 * مكتوب بالصيغة الدولية (213 للجزائر) كما يطلبها رابط wa.me.
 */
export const WHATSAPP_NUMBER = '213557740360';
export const WHATSAPP_DISPLAY = '0557740360';

/** رابط محادثة واتساب مع نص جاهز (اختياري). */
export function whatsappLink(message = '') {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/**
 * نص الرسالة الجاهز عند طلب الوصول: يحمل كل ما يحتاجه المشرف
 * للتحقق من الدفع وإرسال الرمز الصحيح (المستوى · المادة · الفصل/الوحدة).
 */
export function accessRequestMessage({ name, email, levelLabel, moduleLabel, groupLabel }) {
  const lines = [
    'السلام عليكم، أرسلت طلب وصول عبر منصة المخ وأودّ الحصول على رمز الدخول.',
    '',
    `👤 الاسم: ${name || '—'}`,
    `📧 البريد: ${email || '—'}`,
    `🎓 المستوى: ${levelLabel || '—'}`,
    `📚 المادة: ${moduleLabel || '—'}`,
    `📖 القسم: ${groupLabel || '—'}`,
    '',
    'سأرسل إثبات الدفع هنا، وأنتظر الرمز بعد التأكيد. شكرًا 🙏',
  ];
  return lines.join('\n');
}

/** رسالة قصيرة عندما يملك الطالب رمزًا لكنه لم يستلمه أو لا يعمل. */
export function codeHelpMessage({ name, email, levelLabel, moduleLabel, groupLabel }) {
  return [
    'السلام عليكم، أحتاج مساعدة بخصوص رمز الدخول على منصة المخ.',
    '',
    `👤 الاسم: ${name || '—'}`,
    `📧 البريد: ${email || '—'}`,
    `🎓 المستوى: ${levelLabel || '—'}`,
    `📚 المادة: ${moduleLabel || '—'}`,
    `📖 القسم: ${groupLabel || '—'}`,
  ].join('\n');
}
