import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged, updateProfile } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { saveUserToFirestore } from '../firebase/userService';
import { getSavedLevel, saveSavedLevel } from '../utils/localLevel';

const LEVELS = [
  { id: 'BEM', code: 'LEVEL · BEM', name: 'الرابعة متوسط', hint: 'تحضير مكثف لشهادة التعليم المتوسط', group: 'ثلاثة فصول دراسية', icon: '🎓' },
  { id: '1AS', code: 'LEVEL · 1AS', name: 'السنة أولى ثانوي', hint: 'بناء الأساس لكل الشعب', group: 'ثلاثة فصول دراسية', icon: '📗' },
  { id: '2AS', code: 'LEVEL · 2AS', name: 'السنة ثانية ثانوي', hint: 'تعميق المفاهيم استعدادًا للسنة النهائية', group: 'ثلاثة فصول دراسية', icon: '📘' },
  { id: 'BAC', code: 'LEVEL · BAC', name: 'البكالوريا', hint: 'مراجعة شاملة ومواضيع سابقة مع الحلول', group: 'منظم حسب الوحدات', icon: '🏆' },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [name, setName] = useState('');
  const [selected, setSelected] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        navigate('/auth', { replace: true });
        return;
      }
      setUser(u);
      setName(u.displayName || '');

      // هل أكمل المستخدم الإعداد سابقًا (الاسم + المستوى)؟
      // إذا كان كذلك، نتخطى هذه الصفحة ونذهب مباشرة إلى لوحة التحكم —
      // حتى لو فتح /onboarding يدويًا عبر رابط قديم.
      let hasName = !!u.displayName;
      let hasLevel = !!getSavedLevel(u.uid);

      try {
        const snap = await getDoc(doc(db, 'users', u.uid));
        if (snap.exists()) {
          const data = snap.data();
          if (data.name) hasName = true;
          if (data.level) {
            hasLevel = true;
            saveSavedLevel(u.uid, data.level);
          }
        }
      } catch (e) {
        // offline / permission — نعتمد على ما هو محفوظ محليًا
      }

      if (hasName && hasLevel) {
        navigate('/app', { replace: true });
        return;
      }

      setChecking(false);
    });
    return unsub;
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('من فضلك أدخل اسمك.');
      return;
    }
    if (!selected) {
      setError('اختر مستواك الدراسي.');
      return;
    }

    setSaving(true);
    try {
      // update the Auth profile display name if it changed
      if (name.trim() !== (user.displayName || '')) {
        await updateProfile(user, { displayName: name.trim() });
      }

      // AWAIT the write — only navigate once it's confirmed, so failures surface instead of vanishing
      await saveUserToFirestore(user, { name: name.trim(), level: selected });

      saveSavedLevel(user.uid, selected);
      navigate('/app', { replace: true });
    } catch (err) {
      console.error('[Onboarding] فشل حفظ الملف الشخصي:', err);
      setError('تعذّر حفظ بياناتك — تأكد من اتصالك بالإنترنت وحاول مجددًا.');
    } finally {
      setSaving(false);
    }
  };

  if (checking) {
    return (
      <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F6EEDC' }}>
        <span style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", color: '#5c584c' }}>...جارٍ التحقق</span>
      </div>
    );
  }

  return (
    <div dir="rtl" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        href="https://fonts.googleapis.com/css2?family=Aref+Ruqaa:wght@400;700&family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />
      <style>{`
        :root{
          --ink-teal:#0E3B36; --ink-teal-deep:#092824;
          --parchment:#F6EEDC; --parchment-dim:#EFE3C8;
          --gold:#E3A23C; --gold-bright:#F0B85C; --crimson:#B23A2E;
          --text-dark:#1C1A15; --line:rgba(28,26,21,0.14);
        }
        *{margin:0;padding:0;box-sizing:border-box;}
        body{background:var(--parchment);}
        a{color:inherit;text-decoration:none;}

        .ob-page{min-height:100svh;display:flex;align-items:center;justify-content:center;padding:24px;
          background:linear-gradient(150deg,var(--ink-teal-deep) 0%,var(--ink-teal) 60%,#14534C 100%);}
        .ob-card{width:100%;max-width:560px;background:var(--parchment);border-radius:20px;padding:40px 36px;
          box-shadow:0 30px 70px rgba(0,0,0,0.35);}

        .ob-badge{display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:22px;}
        .logo-mark{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;
          background:var(--gold);color:var(--ink-teal-deep);font-family:'Aref Ruqaa',serif;font-size:20px;font-weight:700;border:2px solid var(--gold-bright);}
        .ob-badge-text{font-family:'Aref Ruqaa',serif;font-size:22px;font-weight:700;color:var(--ink-teal);}

        .ob-head{text-align:center;margin-bottom:26px;}
        .ob-head h2{font-family:'Aref Ruqaa',serif;font-size:26px;color:var(--ink-teal);margin-bottom:6px;}
        .ob-head p{font-size:13.5px;color:#5c584c;}

        .field{margin-bottom:22px;}
        .field label{display:block;font-size:13.5px;font-weight:600;margin-bottom:8px;color:var(--text-dark);}
        .input{background:#fffdf6;border:1.5px solid var(--line);border-radius:12px;padding:0 14px;display:flex;align-items:center;}
        .input:focus-within{border-color:var(--gold);box-shadow:0 0 0 4px rgba(227,162,60,0.15);}
        .input input{flex:1;border:0;outline:0;background:transparent;font-family:inherit;font-size:15px;padding:13px 4px;color:var(--text-dark);}

        .levels{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
        .level-card{position:relative;text-align:right;cursor:pointer;border-radius:14px;padding:16px;
          background:#fffdf6;border:1.5px solid var(--line);transition:all .2s;font-family:inherit;}
        .level-card:hover{border-color:var(--gold);}
        .level-card.active{border-color:var(--gold);background:rgba(227,162,60,0.08);}
        .lv-icon{background:var(--ink-teal);color:var(--gold-bright);width:36px;height:36px;border-radius:10px;
          display:flex;align-items:center;justify-content:center;font-size:18px;margin-bottom:10px;}
        .level-card.active .lv-icon{background:var(--gold);color:var(--ink-teal-deep);}
        .lv-name{font-family:'Aref Ruqaa',serif;font-size:18px;color:var(--ink-teal);font-weight:700;}
        .lv-hint{font-size:11.5px;color:#5c584c;margin-top:3px;}
        .lv-check{position:absolute;top:12px;left:12px;width:22px;height:22px;border-radius:50%;
          border:2px solid var(--line);color:transparent;display:flex;align-items:center;justify-content:center;
          font-size:12px;font-weight:700;background:#fffdf6;}
        .level-card.active .lv-check{background:var(--gold);border-color:var(--gold);color:var(--ink-teal-deep);}

        .message{border-radius:12px;padding:12px 16px;font-size:13.5px;margin-bottom:18px;text-align:right;}
        .message.error{background:rgba(178,58,46,0.08);border:1px solid rgba(178,58,46,0.3);color:#8c2a20;}

        .btn-primary{width:100%;border:0;cursor:pointer;background:var(--gold);color:var(--ink-teal-deep);
          font-weight:700;font-size:16px;font-family:inherit;padding:15px 0;border-radius:999px;
          transition:all .25s;box-shadow:0 8px 24px rgba(227,162,60,0.28);margin-top:24px;}
        .btn-primary:hover{background:var(--gold-bright);}
        .btn-primary:disabled{opacity:0.6;cursor:not-allowed;}

        @media (max-width:520px){.levels{grid-template-columns:1fr;}}
      `}</style>

      <div className="ob-page">
        <div className="ob-card">
          <div className="ob-badge">
            <div className="logo-mark">م</div>
            <div className="ob-badge-text">المخ</div>
          </div>
          <div className="ob-head">
            <h2>أكمل ملفك الشخصي</h2>
            <p>خطوة أخيرة قبل البدء — لن نطلبها منك مجددًا</p>
          </div>

          {error && <div className="message error">{error}</div>}

          <form onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label>الاسم الكامل</label>
              <div className="input">
                <input type="text" placeholder="مثال: محمد الأمين" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            </div>

            <div className="field">
              <label>المستوى الدراسي</label>
              <div className="levels">
                {LEVELS.map((lv) => {
                  const active = selected === lv.id;
                  return (
                    <button
                      key={lv.id}
                      type="button"
                      className={`level-card${active ? ' active' : ''}`}
                      onClick={() => setSelected(lv.id)}
                    >
                      <div className="lv-icon">{lv.icon}</div>
                      <div className="lv-name">{lv.name}</div>
                      <div className="lv-hint">{lv.hint}</div>
                      <div className="lv-check">{active ? '✓' : ''}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <button className="btn-primary" type="submit" disabled={saving}>
              {saving ? 'جارٍ الحفظ...' : 'حفظ ومتابعة'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}