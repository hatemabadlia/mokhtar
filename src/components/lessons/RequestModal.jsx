import React, { useEffect, useState } from 'react';
import { submitAccessRequest } from '../../firebase/lessonsService';
import useAuth from '../../hooks/useAuth';
import Modal from './Modal';
import { whatsappLink } from '../../lib/whatsapp';
import './lessons.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// هاتف جزائري: 10 أرقام يبدأ بـ 05/06/07 (مع قبول +213)
const PHONE_RE = /^(0[5-7]\d{8}|(\+|00)?213[5-7]\d{8})$/;

// واتساب — هنا يتواصل الطالب معنا لتأكيد الدفع واستلام رمز التفعيل
const WHATSAPP_URL = whatsappLink();

/**
 * نافذة "اطلب الوصول" — طلب خاص بمجموعة واحدة داخل مادة واحدة:
 * - غير البكالوريا: { level, module, trimester }
 * - البكالوريا:     { level, module, unit }
 * group = { label, moduleLabel, levelLabel, level, module, field, fieldValue }
 */
export default function RequestModal({ group, existingRequest = null, onSubmitted, onClose }) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // إن كان هناك طلب سابق قيد المراجعة نعرض حالته مباشرة بدل نموذج جديد
  const [done, setDone] = useState(!!existingRequest);

  // تعبئة الاسم والبريد من الحساب المسجّل (تبقى قابلة للتعديل)
  useEffect(() => {
    if (!user) return;
    setName((v) => v || user.displayName || '');
    setEmail((v) => v || user.email || '');
  }, [user]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('من فضلك أدخل اسمك الكامل.');
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setError('من فضلك أدخل بريدًا إلكترونيًا صحيحًا.');
      return;
    }
    if (!PHONE_RE.test(phone.replace(/\s+/g, ''))) {
      setError('أدخل رقم هاتف (واتساب) صحيحًا — مثال: 0550123456');
      return;
    }

    setLoading(true);
    try {
      await submitAccessRequest({
        uid: user?.uid,
        name,
        email,
        phone,
        level: group.level,
        module: group.module,
        // طلب فصل/وحدة محددة، أو المادة كاملة (بلا field)
        ...(group.field ? { [group.field]: group.fieldValue } : { scope: 'module' }),
        groupKey: group.key,
      });
      onSubmitted?.(group.key);
      setDone(true);
    } catch {
      setError('تعذّر إرسال الطلب — حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="طلب الوصول" subtitle={`${group.levelLabel} · ${group.moduleLabel} · ${group.label}`} onClose={onClose}>
      {done ? (
        <div className="naj-done">
          <div className="naj-done-ico">{existingRequest ? '⏳' : '✅'}</div>
          <p>{existingRequest ? 'طلبك قيد المراجعة' : 'تم إرسال طلب الوصول'}</p>
          <p className="naj-done-sub">
            تواصل معنا على واتساب لتأكيد الدفع. بعد التأكيد يُفتح القسم في حسابك مباشرة
            (أو نرسل لك رمزًا تُدخله من «لدي رمز»).
          </p>
          <a
            className="naj-btn naj-btn-wa naj-btn-block"
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            💬 تواصل معنا عبر واتساب
          </a>
          <button type="button" className="naj-btn naj-btn-ghost" onClick={onClose}>
            حسنًا
          </button>
        </div>
      ) : (
        <form className="naj-form" onSubmit={handleSubmit} noValidate>
          <span className="naj-group-chip">
            {group.levelLabel} · {group.moduleLabel} · {group.label}
          </span>

          <label className="naj-field">
            <span className="naj-label">الاسم الكامل</span>
            <input
              className="naj-input"
              type="text"
              placeholder="مثال: محمد الأمين"
              value={name}
              onChange={(e) => {
                setError('');
                setName(e.target.value);
              }}
            />
          </label>

          <label className="naj-field">
            <span className="naj-label">البريد الإلكتروني</span>
            <input
              className="naj-input"
              type="email"
              dir="ltr"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setError('');
                setEmail(e.target.value);
              }}
            />
          </label>

          <label className="naj-field">
            <span className="naj-label">رقم الهاتف (واتساب)</span>
            <input
              className="naj-input"
              type="tel"
              dir="ltr"
              inputMode="numeric"
              placeholder="0550123456"
              value={phone}
              onChange={(e) => {
                setError('');
                setPhone(e.target.value);
              }}
            />
          </label>

          {error && <p className="naj-msg naj-msg-error">{error}</p>}

          <div className="naj-form-actions">
            <button type="button" className="naj-btn naj-btn-ghost" onClick={onClose}>
              إلغاء
            </button>
            <button type="submit" className="naj-btn naj-btn-gold" disabled={loading}>
              {loading ? <span className="naj-spinner" /> : 'إرسال الطلب'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}