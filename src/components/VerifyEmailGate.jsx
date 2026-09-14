import React, { useState } from 'react';
import { sendEmailVerification, signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase/config';

/** هل يحتاج هذا المستخدم إلى تأكيد بريده؟ (حساب بكلمة مرور فقط، غير مؤكَّد) */
export function needsEmailVerification(user) {
  if (!user || user.emailVerified) return false;
  const providers = (user.providerData || []).map((p) => p.providerId);
  // حسابات Google وغيرها مؤكَّدة من المزوّد؛ نطلب التأكيد لحسابات كلمة المرور فقط
  return providers.length === 0 || providers.every((p) => p === 'password');
}

/**
 * شاشة «أكّد بريدك» — تمنع الوصول إلى لوحة التحكم والدروس حتى تأكيد البريد.
 * تحدّ من الحسابات المزيفة وتضمن إمكانية استرجاع كلمة المرور.
 */
export default function VerifyEmailGate({ user }) {
  const navigate = useNavigate();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const resend = async () => {
    setBusy(true); setMsg('');
    try {
      await sendEmailVerification(user);
      setSent(true);
      setMsg('أُرسلت رسالة جديدة — تحقق من صندوق الوارد أو البريد غير المرغوب.');
    } catch (e) {
      setMsg(e?.code === 'auth/too-many-requests' ? 'محاولات كثيرة — انتظر دقيقة ثم أعد المحاولة.' : 'تعذّر الإرسال — أعد المحاولة.');
    } finally { setBusy(false); }
  };

  const check = async () => {
    setBusy(true); setMsg('');
    try {
      await user.reload();
      if (auth.currentUser?.emailVerified) {
        // إعادة التحميل تُحدّث الحالة في كل الصفحات
        window.location.reload();
        return;
      }
      setMsg('لم يُؤكَّد البريد بعد — افتح الرابط في الرسالة ثم اضغط «تحققت».');
    } catch {
      setMsg('تعذّر التحقق — أعد المحاولة.');
    } finally { setBusy(false); }
  };

  const logout = async () => { await signOut(auth); navigate('/auth', { replace: true }); };

  return (
    <div dir="rtl" className="vg">
      <style>{`
        .vg{min-height:100svh;display:flex;align-items:center;justify-content:center;background:#F6EEDC;padding:24px;font-family:'IBM Plex Sans Arabic',sans-serif;}
        .vg-card{max-width:460px;width:100%;background:#fffdf6;border:1.5px solid rgba(28,26,21,0.14);border-radius:22px;padding:40px 30px;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,0.04);}
        .vg-ico{width:70px;height:70px;border-radius:20px;margin:0 auto 16px;background:#0E3B36;color:#F0B85C;display:flex;align-items:center;justify-content:center;font-size:32px;}
        .vg h2{font-family:'Aref Ruqaa',serif;font-size:25px;color:#0E3B36;margin:0 0 8px;}
        .vg p{font-size:14px;color:#5c584c;line-height:1.8;margin:0 0 8px;}
        .vg .mail{font-family:'IBM Plex Mono',monospace;direction:ltr;color:#0E3B36;font-weight:700;}
        .vg-actions{display:flex;flex-direction:column;gap:10px;margin-top:20px;}
        .vg-btn{border:0;cursor:pointer;font-family:inherit;font-weight:700;font-size:14px;padding:12px 22px;border-radius:999px;transition:all .2s;}
        .vg-btn.primary{background:#E3A23C;color:#092824;}
        .vg-btn.primary:hover{background:#F0B85C;}
        .vg-btn.ghost{background:transparent;border:1.5px solid rgba(28,26,21,0.14);color:#0E3B36;}
        .vg-btn:disabled{opacity:.6;cursor:not-allowed;}
        .vg-msg{font-size:13px;color:#7a5612;background:rgba(227,162,60,.12);border:1px solid rgba(227,162,60,.4);border-radius:10px;padding:10px 12px;margin-top:14px;}
        .vg-out{margin-top:16px;font-size:12.5px;color:#8c2a20;background:none;border:0;cursor:pointer;font-family:inherit;text-decoration:underline;}
      `}</style>
      <div className="vg-card">
        <div className="vg-ico">✉️</div>
        <h2>أكّد بريدك الإلكتروني</h2>
        <p>أرسلنا رابط تفعيل إلى</p>
        <p className="mail">{user?.email}</p>
        <p>افتح الرسالة واضغط رابط التأكيد، ثم عد هنا واضغط «تحققت».</p>
        <div className="vg-actions">
          <button type="button" className="vg-btn primary" onClick={check} disabled={busy}>تحققت — تابع إلى المنصة</button>
          <button type="button" className="vg-btn ghost" onClick={resend} disabled={busy || sent}>{sent ? 'تم الإرسال ✓' : 'إعادة إرسال رسالة التأكيد'}</button>
        </div>
        {msg && <div className="vg-msg">{msg}</div>}
        <button type="button" className="vg-out" onClick={logout}>تسجيل الخروج / استخدام حساب آخر</button>
      </div>
    </div>
  );
}
