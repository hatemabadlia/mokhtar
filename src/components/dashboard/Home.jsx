import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';
import { SERVICES, getLevel } from './services';
import { getSavedLevel, saveSavedLevel } from '../../utils/localLevel';

export default function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [level, setLevel] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        navigate('/auth', { replace: true });
        return;
      }
      setUser(u);
      setLevel(getSavedLevel(u.uid));
      try {
        const snap = await getDoc(doc(db, 'users', u.uid));
        if (snap.exists() && snap.data().level) {
          setLevel(snap.data().level);
          saveSavedLevel(u.uid, snap.data().level);
        }
      } catch (e) {
        // offline / permission — fall back to the locally saved level
      }
    });
    return unsub;
  }, [navigate]);

  const firstName = (user?.displayName || '').split(' ')[0] || 'طالب';
  const levelMeta = getLevel(level);
  const isNew = !levelMeta;

  return (
    <div className="home">
      <style>{`
        .hello{
          background:linear-gradient(150deg,var(--ink-teal-deep) 0%,var(--ink-teal) 60%,#14534C 100%);
          color:var(--parchment);border-radius:20px;padding:38px 36px;position:relative;overflow:hidden;margin-bottom:34px;
        }
        .hello::before{
          content:'';position:absolute;inset:0;pointer-events:none;
          background:radial-gradient(ellipse 460px 340px at 90% 10%,rgba(227,162,60,0.18),transparent 60%);
        }
        .hello .wrap{position:relative;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap;}
        .mono-label{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:0.14em;color:var(--gold-bright);margin-bottom:14px;display:flex;align-items:center;gap:8px;}
        .mono-label::before{content:'';width:6px;height:6px;border-radius:50%;background:var(--gold-bright);}
        .hello h1{font-family:'Aref Ruqaa',serif;font-weight:700;font-size:34px;line-height:1.3;margin-bottom:10px;color:var(--parchment);}
        .hello h1 em{font-style:normal;color:var(--gold-bright);}
        .hello p{font-size:15px;color:rgba(246,238,220,0.78);font-weight:300;max-width:560px;}
        .hello-badge{background:var(--gold);color:var(--ink-teal-deep);font-weight:700;font-size:14px;padding:10px 22px;border-radius:999px;box-shadow:0 8px 24px rgba(227,162,60,0.3);}
        .level-tag{display:inline-flex;align-items:center;gap:8px;font-family:'IBM Plex Mono',monospace;font-size:12px;letter-spacing:0.12em;color:var(--gold-bright);border:1px solid rgba(227,162,60,0.4);border-radius:999px;padding:8px 18px;margin-top:6px;}
        .hello-hint{font-size:13.5px;color:rgba(246,238,220,0.6);margin-top:6px;font-weight:300;}
        .new-banner{
          display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;
          background:rgba(227,162,60,0.12);border:1px solid rgba(227,162,60,0.4);border-radius:16px;
          padding:18px 22px;margin-bottom:34px;color:#7a5612;
        }
        .new-banner p{font-size:14px;font-weight:600;}
        .new-banner a{background:var(--crimson);color:var(--parchment);font-weight:700;font-size:13.5px;padding:9px 20px;border-radius:999px;transition:all .25s;}
        .new-banner a:hover{transform:translateY(-1px);box-shadow:0 8px 20px rgba(178,58,46,0.3);}
      `}</style>

      <style>{`
        .sec-head{margin-bottom:22px;}
        .sec-head h2{font-family:'Aref Ruqaa',serif;font-size:26px;color:var(--ink-teal);margin-bottom:4px;}
        .sec-head p{font-size:14px;color:#5c584c;}

        .cards{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;}
        .sv-card{
          background:#fffdf6;border:1.5px solid var(--line);border-radius:18px;padding:22px 20px;
          display:flex;flex-direction:column;gap:14px;transition:all .25s;position:relative;overflow:hidden;
        }
        .sv-card:hover{border-color:var(--gold);transform:translateY(-3px);box-shadow:0 14px 30px rgba(28,26,21,0.1);}
        .sv-icon{background:var(--ink-teal);color:var(--gold-bright);width:48px;height:48px;border-radius:13px;display:flex;align-items:center;justify-content:center;font-size:24px;transition:all .25s;}
        .sv-card:hover .sv-icon{background:var(--gold);color:var(--ink-teal-deep);}
        .sv-code{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:0.16em;color:var(--gold);}
        .sv-card h3{font-family:'Aref Ruqaa',serif;font-size:21px;color:var(--ink-teal);font-weight:700;}
        .sv-card p{font-size:13px;color:#5c584c;line-height:1.7;flex:1;}
        .sv-foot{display:flex;align-items:center;justify-content:space-between;margin-top:4px;}
        .sv-explore{font-size:13px;font-weight:700;color:var(--crimson);display:inline-flex;align-items:center;gap:6px;}
        .sv-arrow{font-size:15px;color:var(--gold);transition:transform .25s;}
        .sv-card:hover .sv-arrow{transform:translateX(-6px);}
        .sv-badge{
          position:absolute;top:18px;left:18px;font-size:9.5px;font-weight:700;letter-spacing:0.04em;
          background:var(--crimson);color:var(--parchment);padding:4px 10px;border-radius:999px;
        }
        .hint-strip{
          display:flex;align-items:center;gap:10px;margin-top:4px;
          background:rgba(227,162,60,0.1);border:1px dashed rgba(227,162,60,0.5);border-radius:12px;
          padding:11px 16px;font-size:13px;color:#7a5612;font-weight:500;
        }
        .hint-strip .hint-ico{color:var(--gold);font-size:15px;}

        @media (max-width:900px){.cards{grid-template-columns:1fr 1fr;}}
        @media (max-width:600px){.cards{grid-template-columns:1fr;}.hello h1{font-size:27px;}}
      `}</style>

      <section className="hello">
        <div className="wrap">
          <div>
            <div className="mono-label">لوحة التحكم · مرحبًا بك</div>
            <h1>أهلًا، <em>{firstName}</em> 👋</h1>
            <p>
              هذه نقطة انطلاقك في منصة المخ. من هنا تصل إلى كل خدماتك: الدروس، التقدّم، الحصص المباشرة،
              الاختبارات، التمارين والامتحانات السابقة، وملفك الشخصي.
            </p>
            {levelMeta ? (
              <span className="level-tag">◆ مستواك: {levelMeta.name}</span>
            ) : (
              <span className="level-tag">◆ لم تختار مستواك بعد</span>
            )}
            <div className="hello-hint">حرّك الماوس فوق أي خدمة في القائمة الجانبية لمعرفة ما تعنيه.</div>
          </div>
          <div className="hello-badge">ست خدمات بإنتظارك</div>
        </div>
      </section>

      {isNew && (
        <div className="new-banner">
          <p>أنت مستخدم جديد — لبدء رحلتك، اختر مستواك الدراسي أولًا (BEM · 1AS · 2AS · BAC).</p>
          <Link to="/app/profile">اختر مستواك الآن</Link>
        </div>
      )}

      <section>
        <div className="sec-head">
          <h2>ما الذي يمكنك فعله هنا؟</h2>
          <p>ست خدمات رئيسية — كل خدمة موضّحة عند تمرير الماوس عليها في القائمة الجانبية.</p>
        </div>

        <div className="cards">
          {SERVICES.map((s) => (
            <Link key={s.id} to={s.path} className="sv-card">
              {s.badge && <span className="sv-badge">{s.badge}</span>}
              <div className="sv-icon">{s.icon}</div>
              <div>
                <span className="sv-code">{s.code}</span>
                <h3>{s.name}</h3>
                <p>{s.desc}</p>
              </div>
              <div className="sv-foot">
                <span className="sv-explore">اكتشف الخدمة</span>
                <span className="sv-arrow">←</span>
              </div>
            </Link>
          ))}
        </div>

        <div className="hint-strip">
          <span className="hint-ico">💡</span>
          <span>لمحة سريعة: مرّر المؤشر على أي سطر في القائمة الجانبية (يمين الشاشة) لترى شرح الخدمة فورًا.</span>
        </div>
      </section>
    </div>
  );
}