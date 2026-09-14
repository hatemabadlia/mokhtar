import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, Link, useNavigate, Navigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';
import { SERVICES, getLevel } from './services';
import { getSavedLevel, saveSavedLevel } from '../../utils/localLevel';
import useAuth from '../../hooks/useAuth';
import VerifyEmailGate, { needsEmailVerification } from '../VerifyEmailGate';

export default function DashboardLayout() {
  const navigate = useNavigate();
  const { user, ready: authReady } = useAuth();
  const [level, setLevel] = useState('');
  const [open, setOpen] = useState(false);

  // Load the saved level whenever a signed-in user is known
  // (covers both first login and full page refresh).
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLevel(getSavedLevel(user.uid));
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (!cancelled && snap.exists() && snap.data().level) {
          setLevel(snap.data().level);
          saveSavedLevel(user.uid, snap.data().level);
        }
      } catch (e) {
        // offline / permission — fall back to the locally saved level
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/auth', { replace: true });
    } catch (e) {
      // ignore
    }
  };

  const initials = (user?.displayName || 'ط')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('');

  const levelMeta = getLevel(level);

  // Wait until Firebase has restored the session before rendering anything —
  // this prevents a "refresh logs me out" flash. Only a real (null) session
  // sends the user to /auth; explicit logout is via the تسجيل الخروج button.
  if (!authReady) {
    return (
      <div
        dir="rtl"
        style={{
          minHeight: '100svh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#F6EEDC',
          fontFamily: "'IBM Plex Sans Arabic', sans-serif",
        }}
      >
        <style>{`@keyframes naj-spin{to{transform:rotate(360deg);}}`}</style>
        <div style={{ textAlign: 'center', color: '#0E3B36' }}>
          <div
            style={{
              width: 42,
              height: 42,
              margin: '0 auto 14px',
              borderRadius: '50%',
              border: '3px solid rgba(14,59,54,0.2)',
              borderTopColor: '#0E3B36',
              animation: 'naj-spin .8s linear infinite',
            }}
          />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#5c584c' }}>
            جارٍ التحقق من الجلسة…
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // حساب بكلمة مرور لم يؤكَّد بريده → لا وصول إلى المنصة قبل التأكيد
  if (needsEmailVerification(user)) {
    return <VerifyEmailGate user={user} />;
  }

  return (
    <div dir="rtl" className="dash" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
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
        .dash{min-height:100svh;display:flex;background:var(--parchment);color:var(--text-dark);text-align:right;line-height:1.7;}
        a{color:inherit;text-decoration:none;}

        .sidebar{
          width:272px;flex-shrink:0;min-height:100svh;
          background:linear-gradient(170deg,var(--ink-teal-deep) 0%,var(--ink-teal) 70%,#14534C 100%);
          color:var(--parchment);position:sticky;top:0;align-self:flex-start;
          display:flex;flex-direction:column;padding:30px 20px;z-index:40;
        }
        .sidebar::before{
          content:'';position:absolute;inset:0;pointer-events:none;
          background:radial-gradient(ellipse 420px 360px at 85% 8%,rgba(227,162,60,0.14),transparent 60%);
        }
        .side-inner{position:relative;z-index:2;display:flex;flex-direction:column;flex:1;gap:22px;}
        .brand{display:flex;align-items:center;gap:12px;padding:0 8px;margin-bottom:6px;}
        .brand-mark{
          width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;
          background:var(--gold);color:var(--ink-teal-deep);
          font-family:'Aref Ruqaa',serif;font-size:22px;font-weight:700;border:2px solid var(--gold-bright);
        }
        .brand-text{font-family:'Aref Ruqaa',serif;font-size:25px;font-weight:700;color:var(--parchment);}
        .level-chip{
          display:flex;align-items:center;gap:8px;
          font-family:'IBM Plex Mono',monospace;font-size:11.5px;letter-spacing:0.1em;
          color:var(--gold-bright);border:1px solid rgba(227,162,60,0.4);border-radius:999px;
          padding:8px 16px;margin:0 8px 4px;
        }
        .level-chip::before{content:'';width:6px;height:6px;border-radius:50%;background:var(--gold-bright);}
        .divider{height:1px;background:rgba(246,238,220,0.12);margin:2px 8px;}

        .nav{display:flex;flex-direction:column;gap:6px;}
        .nav-item{
          display:flex;align-items:center;gap:13px;padding:12px 14px;border-radius:12px;
          color:rgba(246,238,220,0.75);font-size:14.5px;font-weight:500;transition:all .2s;position:relative;
        }
        .nav-item:hover{background:rgba(246,238,220,0.08);color:var(--parchment);}
        .nav-item.active{background:var(--gold);color:var(--ink-teal-deep);font-weight:700;box-shadow:0 6px 18px rgba(227,162,60,0.3);}
        .nav-icon{width:24px;text-align:center;font-size:17px;}
        .nav-label{flex:1;}
        .nav-badge{
          font-size:9.5px;font-weight:700;padding:3px 9px;border-radius:999px;
          background:var(--crimson);color:var(--parchment);letter-spacing:0.04em;
        }
        .nav-item.active .nav-badge{background:var(--ink-teal);color:var(--gold-bright);}

        /* شرح سريع عند تمرير الماوس على عنصر القائمة */
        .nav-tip{
          position:absolute;z-index:200;width:264px;pointer-events:none;
          top:50%;right:calc(100% + 14px);transform:translateY(-50%) translateX(6px);
          background:var(--parchment);color:var(--text-dark);
          border:1px solid var(--gold);border-radius:12px;
          padding:12px 14px 14px;opacity:0;visibility:hidden;
          transition:opacity .22s ease,transform .22s ease,visibility .22s;
          box-shadow:0 18px 50px rgba(0,0,0,.28);
        }
        .nav-tip::before{
          content:'';position:absolute;top:50%;right:-7px;width:12px;height:12px;margin-top:-6px;
          background:var(--parchment);border:1px solid var(--gold);border-left:0;border-bottom:0;
          transform:rotate(45deg);
        }
        .nav-tip-name{
          display:flex;align-items:center;gap:6px;
          font-family:'Aref Ruqaa',serif;font-size:17px;font-weight:700;color:var(--ink-teal);margin-bottom:5px;
        }
        .nav-tip-name::after{content:'';flex:1;height:1px;background:rgba(227,162,60,0.35);}
        .nav-tip-body{font-size:12.5px;color:#5c584c;line-height:1.75;display:block;}
        .nav-item:hover .nav-tip{opacity:1;visibility:visible;transform:translateY(-50%) translateX(0);}

        .side-footer{display:flex;flex-direction:column;gap:12px;margin-top:auto;padding-top:18px;border-top:1px solid rgba(246,238,220,0.12);}
        .side-user{display:flex;align-items:center;gap:12px;padding:0 8px;}
        .avatar{
          width:42px;height:42px;border-radius:50%;flex-shrink:0;
          background:var(--gold);color:var(--ink-teal-deep);
          display:flex;align-items:center;justify-content:center;font-family:'Aref Ruqaa',serif;font-size:17px;font-weight:700;
        }
        .side-user-name{font-size:13.5px;font-weight:700;color:var(--parchment);display:block;line-height:1.3;}
        .side-user-mail{font-size:11px;color:rgba(246,238,220,0.55);direction:ltr;display:block;text-align:right;}
        .signout{
          border:1px solid rgba(246,238,220,0.3);background:transparent;color:rgba(246,238,220,0.8);
          font-family:'IBM Plex Sans Arabic',sans-serif;font-size:12.5px;font-weight:600;padding:9px 14px;
          border-radius:999px;cursor:pointer;transition:all .25s;
        }
        .signout:hover{border-color:var(--crimson);color:#ffd9d4;background:rgba(178,58,46,0.18);}

        .topbar{display:none;}
        .main{flex:1;min-width:0;padding:44px 48px;}
        .backdrop{display:none;}

        @media (max-width:960px){
          .dash{display:block;}
          .nav-tip{display:none;}
          .sidebar{
            position:fixed;inset-block:0;inset-inline-start:0;width:280px;min-height:100svh;
            transform:translateX(100%);transition:transform .3s ease;box-shadow:0 0 50px rgba(0,0,0,0.4);
          }
          .sidebar.open{transform:none;}
          .topbar{
            display:flex;align-items:center;gap:14px;height:60px;padding:0 18px;
            background:rgba(246,238,220,0.94);backdrop-filter:blur(8px);
            border-bottom:1px solid var(--line);position:sticky;top:0;z-index:30;
          }
          .burger{
            border:1.5px solid var(--line);background:#fffdf6;color:var(--ink-teal);
            width:40px;height:40px;border-radius:10px;font-size:20px;cursor:pointer;line-height:1;
          }
          .top-brand{font-family:'Aref Ruqaa',serif;font-size:20px;font-weight:700;color:var(--ink-teal);}
          .top-space{flex:1;}
          .top-level{
            font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:0.1em;
            color:var(--gold);border:1px solid rgba(227,162,60,0.5);border-radius:999px;padding:4px 12px;
          }
          .backdrop.show{display:block;position:fixed;inset:0;background:rgba(9,40,36,0.5);z-index:35;}
          .main{padding:28px 20px;}
        }
        @media (max-width:560px){
          .main{padding:22px 16px;}
        }
      `}</style>

      {/* NOTE: sidebar/topbar/main are now DIRECT children of .dash so its
          `display:flex` actually lays them out side-by-side on desktop.
          Previously these were nested inside an extra <div className="dash-mount">
          with no layout rules of its own, which broke the flex row on
          desktop (the sidebar's min-height:100svh made it a full-screen
          block sitting ABOVE the main content instead of beside it — that's
          the "blank on desktop" bug). On mobile this went unnoticed because
          the @media override sets .dash{display:block}, so normal block
          stacking worked regardless of the extra wrapper. */}

      <div className={`backdrop${open ? ' show' : ''}`} onClick={() => setOpen(false)}></div>

      <aside className={`sidebar${open ? ' open' : ''}`}>
        <div className="side-inner">
          <Link to="/" className="brand">
            <div className="brand-mark">م</div>
            <span className="brand-text">المخ</span>
          </Link>

          <div className="level-chip">{levelMeta ? levelMeta.name : 'لم تختر مستواك بعد'}</div>
          <div className="divider"></div>

          <nav className="nav">
            {SERVICES.map((s) => (
              <NavLink
                key={s.id}
                to={s.path}
                onClick={() => setOpen(false)}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                <span className="nav-icon">{s.icon}</span>
                <span className="nav-label">{s.name}</span>
                {s.badge && <span className="nav-badge">{s.badge}</span>}
                <span className="nav-tip">
                  <span className="nav-tip-name">{s.name}</span>
                  <span className="nav-tip-body">{s.desc}</span>
                </span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="side-footer">
          <div className="side-user">
            <div className="avatar">{initials}</div>
            <div>
              <span className="side-user-name">{user?.displayName || 'طالب المخ'}</span>
              <span className="side-user-mail">{user?.email || ''}</span>
            </div>
          </div>
          <button className="signout" onClick={handleSignOut} type="button">
            تسجيل الخروج
          </button>
        </div>
      </aside>

      <header className="topbar">
        <button className="burger" onClick={() => setOpen(!open)} type="button" aria-label="القائمة">
          {open ? '✕' : '☰'}
        </button>
        <div className="top-brand">المخ</div>
        <div className="top-space"></div>
        {levelMeta && <span className="top-level">{levelMeta.short}</span>}
      </header>

      <main className="main">
        <Outlet context={{ user, level, levelMeta }} />
      </main>
    </div>
  );
}