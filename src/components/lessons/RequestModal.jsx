import React, { useState } from 'react';
import { submitAccessRequest } from '../../firebase/lessonsService';
import Modal from './Modal';
import './lessons.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * نافذة "اطلب الوصول" — طلب خاص بمجموعة واحدة داخل مادة واحدة:
 * - غير البكالوريا: { level, module, trimester }
 * - البكالوريا:     { level, module, unit }
 * group = { label, moduleLabel, levelLabel, level, module, field, fieldValue }
 */
export default function RequestModal({ group, onClose }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

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

    setLoading(true);
    try {
      await submitAccessRequest({
        name,
        email,
        level: group.level,
        module: group.module,
        [group.field]: group.fieldValue,
      });
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
          <div className="naj-done-ico">✅</div>
          <p>تم إرسال طلب الوصول</p>
          <p className="naj-done-sub">
            سيتم فتح التعلم بعد موافقة المشرف أو إرسال رمز لك.
          </p>
          <button type="button" className="naj-btn naj-btn-gold" onClick={onClose}>
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