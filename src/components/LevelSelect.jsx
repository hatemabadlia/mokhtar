import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { saveUserToFirestore } from '../firebase/userService';
import { getSavedLevel, saveSavedLevel } from '../utils/localLevel';

const LEVELS = [
  {
    id: 'BEM',
    code: 'LEVEL · BEM',
    name: 'الرابعة متوسط',
    hint: 'تحضير مكثف لشهادة التعليم المتوسط',
    group: 'ثلاثة فصول دراسية',
    icon: '🎓',
  },
  {
    id: '1AS',
    code: 'LEVEL · 1AS',
    name: 'السنة أولى ثانوي',
    hint: 'بناء الأساس لكل الشعب',
    group: 'ثلاثة فصول دراسية',
    icon: '📗',
  },
  {
    id: '2AS',
    code: 'LEVEL · 2AS',
    name: 'السنة ثانية ثانوي',
    hint: 'تعميق المفاهيم استعدادًا للسنة النهائية',
    group: 'ثلاثة فصول دراسية',
    icon: '📘',
  },
  {
    id: 'BAC',
    code: 'LEVEL · BAC',
    name: 'البكالوريا',
    hint: 'مراجعة شاملة ومواضيع سابقة مع الحلول',
    group: 'منظم حسب الوحدات',
    icon: '🏆',
  },
];

export default function LevelSelect() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [selected, setSelected] = useState('');
  const [loadingDoc, setLoadingDoc] = useState(true);
  const [error, setError] = useState('');

  // auth guard + prefill user's saved level
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        navigate('/auth', { replace: true });
        return;
      }
      setUser(u);

      // ابدأ فورًا من التخزين المحلي حتى لا يُحجب الاختيار إذا تعذّر الوصول لـ Firestore
      setSelected(getSavedLevel(u.uid));
      setLoadingDoc(false);

      try {
        const snap = await getDoc(doc(db, 'users', u.uid));
        if (snap.exists() && snap.data().level) {
          setSelected(snap.data().level);
          saveSavedLevel(u.uid, snap.data().level);
        }
      } catch (e) {
        // offline / permission — the picker already has the local choice
      }
    });
    return unsub;
  }, [navigate]);

  const handleSave = () => {
    if (!selected) {
      setError('اختر مستواك الدراسي أولًا.');
      return;
    }
    setError('');
    // احفظ محليًا أولًا ثم انتقل فورًا — المزامنة مع Firestore لا تُعطّل الاختيار
    saveSavedLevel(user?.uid, selected);
    saveUserToFirestore(user, { level: selected }).catch(() => {
      // تم الحفظ محليًا — تجاهل فشل المزامنة لحين عودة الاتصال
    });
    navigate('/app');
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      // ignore
    }
  };

  return (
    <div dir="rtl" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
      <link
        href="https://fonts.googleapis.com/css2?family=Aref+Ruqaa:wght@400;700&family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />
      <style>{`
        :root{
          --ink-teal:#0E3B36;
          --ink-teal-deep:#092824;
          --parchment:#F6EEDC;
          --parchment-dim:#EFE3C8;
          --gold:#E3A23C;
          --gold-bright:#F0B85C;
          --crimson:#B23A2E;
          --text-dark:#1C1A15;
          --line:rgba(28,26,21,0.14);
        }
        *{margin:0;padding:0;box-sizing:border-box;}
        body{background:var(--parchment); color:var(--text-dark);}
        a{color:inherit; text-decoration:none;}
        .grain{
          position:fixed; inset:0; pointer-events:none; z-index:1; opacity:0.05; mix-blend-mode:multiply;
          background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
        }
        .lv-page{min-height:100svh;display:grid;grid-template-columns:1.02fr 1fr;}
        .brand{
          position:relative;overflow:hidden;z-index:2;min-height:100svh;padding:56px 60px;
          background:linear-gradient(150deg,var(--ink-teal-deep) 0%,var(--ink-teal) 60%,#14534C 100%);
          color:var(--parchment);display:flex;flex-direction:column;justify-content:space-between;
        }
        .brand::before{
          content:'';position:absolute;inset:0;pointer-events:none;
          background:
            radial-gradient(ellipse 620px 460px at 85% 12%,rgba(227,162,60,0.18),transparent 60%),
            radial-gradient(ellipse 500px 420px at 8% 92%,rgba(178,58,46,0.16),transparent 60%);
        }
        .brand-top{position:relative;z-index:2;display:flex;align-items:center;justify-content:space-between;}
        .logo{display:flex;align-items:center;gap:12px;}
        .logo-mark{
          width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;
          background:var(--gold);color:var(--ink-teal-deep);
          font-family:'Aref Ruqaa',serif;font-size:22px;font-weight:700;border:2px solid var(--gold-bright);
        }
        .logo-text{font-family:'Aref Ruqaa',serif;font-size:26px;font-weight:700;color:var(--parchment);}
        .signout{
          border:1px solid rgba(246,238,220,0.35);background:rgba(246,238,220,0.06);color:var(--parchment);
          font-family:'IBM Plex Sans Arabic',sans-serif;font-size:13px;font-weight:600;padding:9px 20px;
          border-radius:999px;cursor:pointer;transition:all .25s;
        }
        .signout:hover{border-color:var(--gold);color:var(--gold-bright);}

        .brand-mid{position:relative;z-index:2;}
        .eyebrow{
          display:inline-flex;align-items:center;gap:10px;
          font-family:'IBM Plex Mono',monospace;font-size:11.5px;letter-spacing:0.12em;
          color:var(--gold-bright);border:1px solid rgba(227,162,60,0.4);border-radius:999px;
          padding:7px 16px;margin-bottom:30px;
        }
        .eyebrow::before{content:'';width:6px;height:6px;border-radius:50%;background:var(--gold-bright);}
        .brand-mid h1{font-family:'Aref Ruqaa',serif;font-weight:700;font-size:46px;line-height:1.3;margin-bottom:22px;}
        .brand-mid h1 em{font-style:normal;color:var(--gold-bright);}
        .brand-mid p.lead{font-size:16.5px;color:rgba(246,238,220,0.78);font-weight:300;max-width:460px;}
        .brand-bottom{position:relative;z-index:2;font-size:13px;color:rgba(246,238,220,0.6);}

        .content{
          position:relative;z-index:2;background:var(--parchment);min-height:100svh;
          display:flex;align-items:center;justify-content:center;padding:48px 40px;
        }
        .content-inner{width:100%;max-width:520px;}
        .stepper{font-family:'IBM Plex Mono',monospace;font-size:11.5px;letter-spacing:0.12em;color:var(--crimson);margin-bottom:10px;}
        .card-head{margin-bottom:26px;}
        .card-head h2{font-family:'Aref Ruqaa',serif;font-size:30px;color:var(--ink-teal);margin-bottom:8px;}
        .card-head p{font-size:14.5px;color:#5c584c;}

        .levels{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:26px;}
        .level-card{
          position:relative;text-align:right;cursor:pointer;border-radius:16px;padding:20px 18px;
          background:#fffdf6;border:1.5px solid var(--line);transition:all .25s;font-family:'IBM Plex Sans Arabic',sans-serif;
        }
        .level-card:hover{border-color:var(--gold);transform:translateY(-2px);box-shadow:0 10px 24px rgba(28,26,21,0.08);}
        .level-card.active{border-color:var(--gold);background:rgba(227,162,60,0.08);box-shadow:0 10px 24px rgba(227,162,60,0.16);}
        .lv-icon{background:var(--ink-teal);color:var(--gold-bright);width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;margin-bottom:14px;}
        .level-card.active .lv-icon{background:var(--gold);color:var(--ink-teal-deep);}
        .lv-code{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:0.16em;color:var(--gold);}
        .level-card.active .lv-code{color:var(--crimson);}
        .lv-name{font-family:'Aref Ruqaa',serif;font-size:22px;color:var(--ink-teal);margin:4px 0 4px;font-weight:700;}
        .lv-hint{font-size:12.5px;color:#5c584c;line-height:1.6;margin-bottom:10px;}
        .lv-group{display:inline-block;font-size:11px;font-weight:600;color:#7a5612;background:rgba(227,162,60,0.14);border-radius:999px;padding:4px 12px;}
        .lv-check{
          position:absolute;top:16px;left:16px;width:26px;height:26px;border-radius:50%;
          border:2px solid var(--line);color:transparent;display:flex;align-items:center;justify-content:center;
          font-size:14px;font-weight:700;background:#fffdf6;
        }
        .level-card.active .lv-check{background:var(--gold);border-color:var(--gold);color:var(--ink-teal-deep);}

        .message{border-radius:12px;padding:12px 16px;font-size:13.5px;margin-bottom:18px;line-height:1.6;text-align:right;}
        .message.error{background:rgba(178,58,46,0.08);border:1px solid rgba(178,58,46,0.3);color:#8c2a20;}

        .btn-primary{
          width:100%;border:0;cursor:pointer;
          background:var(--gold);color:var(--ink-teal-deep);font-weight:700;font-size:16px;
          font-family:'IBM Plex Sans Arabic',sans-serif;padding:15px 0;border-radius:999px;
          transition:all .25s;box-shadow:0 8px 24px rgba(227,162,60,0.28);
        }
        .btn-primary:hover{background:var(--gold-bright);transform:translateY(-2px);box-shadow:0 12px 30px rgba(227,162,60,0.38);}
        .btn-primary:disabled{opacity:0.6;cursor:not-allowed;transform:none;}
        .spinner{display:inline-block;width:18px;height:18px;border:3px solid rgba(14,59,54,0.25);border-top-color:var(--ink-teal-deep);border-radius:50%;animation:spin .7s linear infinite;vertical-align:middle;}
        @keyframes spin{to{transform:rotate(360deg);}}

        .later{display:block;text-align:center;margin-top:20px;font-size:13.5px;font-weight:600;color:#9a9183;}
        .later:hover{color:var(--ink-teal);}
        .save-hint{text-align:center;font-size:12.5px;color:#9a9183;margin-top:10px;}

        @media (max-width:900px){
          .lv-page{grid-template-columns:1fr;}
          .brand{padding:40px 28px;min-height:auto;}
          .brand-bottom{display:none;}
          .brand-mid{padding-bottom:26px;}
          .content{padding:36px 20px;min-height:auto;}
          .levels{grid-template-columns:1fr;}
          .brand-mid h1{font-size:36px;}
        }
        @media (prefers-reduced-motion:reduce){.spinner{animation-duration:1.4s;}}
      `}</style>
      <div className="grain"></div>

      <div className="lv-page">
      <div className="brand">
        <div className="brand-top">
          <Link to="/" className="logo">
            <div className="logo-mark">م</div>
            <div className="logo-text">المخ</div>
          </Link>
          <button className="signout" onClick={handleSignOut} type="button">تسجيل الخروج</button>
        </div>

        <div className="brand-mid">
          <div className="eyebrow">ريض | فيز · من 4م إلى البكالوريا</div>
          <h1>
            أهلاً <em>{(user?.displayName || 'بك')}</em>
            <br />
            اختر مستواك الدراسي
          </h1>
          <p className="lead">
            سنركّب لك المحتوى حسب مستواك — الدروس، التمارين، والحصص المباشرة. يمكنك تغيير المستوى لاحقًا في أي وقت.
          </p>
        </div>

        <div className="brand-bottom">إهداءً لكل أستاذ آمن بطلابه — © المخ 2026</div>
      </div>

      <div className="content">
        <div className="content-inner">
          <div className="card-head">
            <div className="stepper">الخطوة ١ من ١ · المستوى الدراسي</div>
            <h2>في أي مستوى تدرس؟</h2>
            <p>اختر المستوى الذي يناسبك وسنعرض الفصول أو الوحدات الخاصة به.</p>
          </div>

          {error && <div className="message error">{error}</div>}

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
                  <div className="lv-body">
                    <span className="lv-code">{lv.code}</span>
                    <div className="lv-name">{lv.name}</div>
                    <div className="lv-hint">{lv.hint}</div>
                    <span className="lv-group">◆ {lv.group}</span>
                  </div>
                  <div className="lv-check">{active ? '✓' : ''}</div>
                </button>
              );
            })}
          </div>

          <button className="btn-primary" onClick={handleSave} disabled={loadingDoc}>
            حفظ ومتابعة
          </button>
          {!selected && <div className="save-hint">اختر مستوى أولًا لتفعيل الزر</div>}

          <Link to="/" className="later">لاحقًا — العودة للرئيسية</Link>
        </div>
      </div>
      </div>
    </div>
  );
}