import React, { useState } from 'react';
import { validateAccessCode } from '../../firebase/access';
import './lessons.css';

/**
 * نموذج إدخال رمز الوصول — يُستعمل داخل النافذة المنبثقة
 * وداخل بوابة صفحة المشاهدة.
 * - LTR، أوسط، بأحرف كبيرة.
 * - عند نجاح التحقق يُستدعى onSuccess(res) — وres.key هو مفتاح الفتح.
 * - scope (اختياري): { level, module, groupValue, isBac } لضمان أن الرمز
 *   يخص هذه المادة/المجموعة وليس مادة أخرى.
 */
export default function CodeForm({ groupLabel, scope, onSuccess, onCancel }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!code.trim()) {
      setError('من فضلك أدخل رمز الوصول.');
      return;
    }
    setLoading(true);
    const res = await validateAccessCode(code, scope);
    if (res.ok) {
      onSuccess(res);
    } else if (res.error === 'network') {
      setError('تعذّر التحقق من الرمز — تحقق من اتصالك بالإنترنت.');
    } else if (res.error === 'exhausted') {
      setError('هذا الرمز استُعمل بالكامل — كل رمز مخصّص لعدد محدود من الطلاب. تواصل معنا للحصول على رمزك.');
    } else if (res.error === 'scope') {
      setError('هذا الرمز لا يخص هذه المادة/القسم — كل مادة لها رمزها الخاص.');
    } else {
      setError('الرمز غير صحيح أو منتهي الصلاحية');
    }
    setLoading(false);
  }

  return (
    <form className="naj-form" onSubmit={handleSubmit} noValidate>
      <label className="naj-field">
        <span className="naj-label">رمز الوصول لـ «{groupLabel}»</span>
        <input
          className="naj-code-input"
          type="text"
          dir="ltr"
          autoComplete="off"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck="false"
          placeholder="ABCD123"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\s+/g, '').toUpperCase())}
        />
      </label>

      {error && <p className="naj-msg naj-msg-error">{error}</p>}

      <div className="naj-form-actions">
        {onCancel && (
          <button type="button" className="naj-btn naj-btn-ghost" onClick={onCancel}>
            إلغاء
          </button>
        )}
        <button type="submit" className="naj-btn naj-btn-gold" disabled={loading}>
          {loading ? <span className="naj-spinner" /> : 'فتح الوصول'}
        </button>
      </div>
    </form>
  );
}