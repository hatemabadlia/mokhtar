import React, { useEffect } from 'react';
import './lessons.css';

/**
 * نافذة منبثقة عامة (تُستعمل لطلب الوصول وإدخال الرمز).
 * تُغلق بمفتاح Esc أو بالنقر على الخلفية.
 */
export default function Modal({ title, subtitle, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="naj-modal-backdrop" onClick={onClose}>
      <div
        className="naj-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="naj-modal-close" onClick={onClose} aria-label="إغلاق">
          ✕
        </button>
        <h3 className="naj-modal-title">{title}</h3>
        {subtitle && <p className="naj-modal-sub">{subtitle}</p>}
        <div className="naj-modal-body">{children}</div>
      </div>
    </div>
  );
}