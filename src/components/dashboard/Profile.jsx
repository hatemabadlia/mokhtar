import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { onAuthStateChanged, signOut, updateProfile } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';
import { saveUserToFirestore } from '../../firebase/userService';
import { LEVELS, getLevel } from './services';
import { getSavedLevel, saveSavedLevel } from '../../utils/localLevel';

const ERROR_MESSAGES = {
  'permission-denied': 'ليس لديك صلاحية — تأكد من قواعد Firestore.',
  'auth/network-request-failed': 'تعذّر الاتصال — تأكد من الإنترنت.',
  'auth/requires-recent-login': 'أعد تسجيل الدخول ثم حاول.',
};

function toErrorMessage(code) {
  return ERROR_MESSAGES[code] || 'تعذّرت العملية — حاول مرة أخرى.';
}

function formatDate(seconds) {
  if (!seconds) return '';
  try {
    return new Date(seconds * 1000).toLocaleDateString('ar-DZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

function getInitials(name) {
  return (name || 'ط')
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('');
}

export default function Profile() {
  const navigate = useNavigate();
  // مُحدِّث المستوى في DashboardLayout — حتى تنعكس التغييرات فورًا على الدروس/الاختبارات/الامتحانات
  const { setLevel: setLayoutLevel } = useOutletContext() || {};
  const mountedRef = useRef(true);

  const [user, setUser] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [levelId, setLevelId] = useState('');
  const [createdAt, setCreatedAt] = useState(null);

  const [pickedLevel, setPickedLevel] = useState('');
  const [levelPickerOpen, setLevelPickerOpen] = useState(false);

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);

  const [msg, setMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const flash = useCallback((text, type = 'success') => {
    if (!mountedRef.current) return;
    setMsg({ type, text });
    setTimeout(() => {
      if (mountedRef.current) setMsg({ type: '', text: '' });
    }, 2600);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        navigate('/auth', { replace: true });
        return;
      }

      setUser(firebaseUser);
      setNameInput(firebaseUser.displayName || '');

      // ابدأ فورًا من التخزين المحلي حتى لا يُحجب العرض إذا تعذّر الوصول لـ Firestore
      setLevelId(getSavedLevel(firebaseUser.uid));
      setPickedLevel(getSavedLevel(firebaseUser.uid));

      try {
        const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (!mountedRef.current) return;

        if (snap.exists()) {
          const data = snap.data();
          if (data.level) {
            setLevelId(data.level);
            setPickedLevel(data.level);
            saveSavedLevel(firebaseUser.uid, data.level);
          }
          if (data.createdAt?.seconds) setCreatedAt(data.createdAt.seconds);
        }
      } catch (err) {
        // offline — keep the locally saved level; only warn for a genuine rules failure
        if (mountedRef.current && err?.code === 'permission-denied') {
          flash(toErrorMessage(err.code), 'error');
        }
      } finally {
        if (mountedRef.current) setLoadingProfile(false);
      }
    });

    return unsubscribe;
  }, [navigate, flash]);

  function handleSaveLevel() {
    if (!pickedLevel || pickedLevel === levelId) {
      setLevelPickerOpen(false);
      return;
    }
    // احفظ محليًا أولًا ثم زامن — الاختيار يعمل حتى لو تعذّر الوصول لـ Firestore
    saveSavedLevel(user?.uid, pickedLevel);
    setLevelId(pickedLevel);
    setLayoutLevel?.(pickedLevel);
    setLevelPickerOpen(false);
    flash('تم تحديث مستواك ✓');
    saveUserToFirestore(user, { level: pickedLevel }).catch(() => {
      // تم الحفظ محليًا — تجاهل فشل المزامنة لحين عودة الاتصال
    });
  }

  async function handleSaveName() {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      flash('الاسم لا يمكن أن يكون فارغًا.', 'error');
      return;
    }
    setSavingName(true);
    try {
      await updateProfile(auth.currentUser, { displayName: trimmed });
      // Save the FULL profile with the updated name (best-effort — preserves createdAt)
      saveUserToFirestore(user, { name: trimmed }).catch(() => {
        // ignore: the display name is already updated on Firebase Auth
      });
      if (!mountedRef.current) return;
      setUser((prev) => ({ ...prev, displayName: trimmed }));
      setEditingName(false);
      flash('تم حفظ اسمك ✓');
    } catch (err) {
      flash(toErrorMessage(err?.code), 'error');
    } finally {
      if (mountedRef.current) setSavingName(false);
    }
  }

  async function handleSignOut() {
    try {
      await signOut(auth);
      navigate('/auth', { replace: true });
    } catch {
      // sign-out failing silently just leaves the user on the page — acceptable
    }
  }

  function openLevelPicker() {
    setPickedLevel(levelId);
    setLevelPickerOpen(true);
  }

  // بلا مستوى محفوظ (وصل من «اختر مستواك الآن») → افتح المحدِّد مباشرة
  useEffect(() => {
    if (!loadingProfile && !levelId) setLevelPickerOpen(true);
  }, [loadingProfile, levelId]);

  const levelMeta = getLevel(levelId);

  if (loadingProfile) {
    return (
      <div className="profile" dir="rtl">
        <style>{css}</style>
        <div className="loading-state">
          <span className="spinner spinner-lg" />
          <span>جارٍ تحميل ملفك الشخصي...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="profile" dir="rtl">
      <style>{css}</style>

      <header className="p-head">
        <div className="p-mark">👤</div>
        <div>
          <div className="p-sub">PROFILE · الملف الشخصي</div>
          <h1>الملف الشخصي</h1>
        </div>
      </header>

      <section className="hero-card">
        <div className="hero-grid">
          <div className="hero-avatar">{getInitials(user?.displayName)}</div>
          <div className="hero-info">
            <div className="hero-name">{user?.displayName || 'طالب المخ'}</div>
            <span className="hero-mail">{user?.email || ''}</span>
            <div className="hero-chips">
              {levelMeta ? (
                <span className="chip">{levelMeta.name}</span>
              ) : (
                <span className="chip">لم تختر مستواك بعد</span>
              )}
              {user?.emailVerified && <span className="chip chip-ok">بريد مؤكَّد ✓</span>}
            </div>
          </div>
          <button type="button" className="hero-signout" onClick={handleSignOut}>
            تسجيل الخروج
          </button>
        </div>
      </section>

      {msg.text && <div className={`msg msg-${msg.type}`} role="status">{msg.text}</div>}

      <div className="grid-2">
        <section className="card">
          <div className="card-title">
            <div className="ct-ico">📇</div>
            <h2>معلومات الحساب</h2>
          </div>

          <div className="row">
            <span className="k">الاسم</span>
            {editingName ? (
              <span className="v v-input">
                <input
                  className="text-input"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                  aria-label="الاسم الكامل"
                  autoFocus
                />
              </span>
            ) : (
              <span className="v">{user?.displayName || '—'}</span>
            )}
          </div>

          {editingName && (
            <div className="btn-row btn-row-tight">
              <button type="button" className="btn btn-gold" onClick={handleSaveName} disabled={savingName}>
                {savingName ? <span className="spinner" /> : 'حفظ'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setEditingName(false)}>
                إلغاء
              </button>
            </div>
          )}

          <div className="row">
            <span className="k">البريد الإلكتروني</span>
            <span className="v mono">{user?.email || '—'}</span>
          </div>

          <div className="row">
            <span className="k">حالة البريد</span>
            <span className="v">{user?.emailVerified ? 'مؤكَّد ✓' : 'غير مؤكَّد'}</span>
          </div>

          {createdAt && (
            <div className="row">
              <span className="k">عضو منذ</span>
              <span className="v">{formatDate(createdAt)}</span>
            </div>
          )}

          <div className="row">
            <span className="k">المعرف (UID)</span>
            <span className="v mono v-uid">{user?.uid ? `${user.uid.slice(0, 16)}…` : '—'}</span>
          </div>

          {!editingName && (
            <div className="card-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setEditingName(true)}>
                ✏️ تعديل الاسم
              </button>
            </div>
          )}
        </section>

        <section className="card">
          <div className="card-title">
            <div className="ct-ico">🎓</div>
            <h2>المستوى الدراسي</h2>
          </div>

          <div className="row">
            <span className="k">المستوى الحالي</span>
            <span className="v">{levelMeta ? levelMeta.name : 'لم يُحدَّد بعد'}</span>
          </div>

          {levelMeta && (
            <div className="row">
              <span className="k">الرمز</span>
              <span className="v mono">{levelMeta.short}</span>
            </div>
          )}

          <div className="card-footer">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={levelPickerOpen ? () => setLevelPickerOpen(false) : openLevelPicker}
            >
              {levelPickerOpen ? 'إغلاق' : 'تغيير المستوى'}
            </button>
          </div>

          {levelPickerOpen && (
            <>
              <div className="level-cards">
                {LEVELS.map((lv) => (
                  <button
                    key={lv.id}
                    type="button"
                    className={`lvl-card${pickedLevel === lv.id ? ' active' : ''}`}
                    onClick={() => setPickedLevel(lv.id)}
                    aria-pressed={pickedLevel === lv.id}
                  >
                    <span className="lc-code">LEVEL · {lv.short}</span>
                    <div className="lc-name">{lv.name}</div>
                  </button>
                ))}
              </div>
              <div className="btn-row">
                <button
                  type="button"
                  className="btn btn-gold"
                  onClick={handleSaveLevel}
                  disabled={!pickedLevel || pickedLevel === levelId}
                >
                  حفظ المستوى
                </button>
              </div>
            </>
          )}

          <div className="section-note">BEM · 1AS · 2AS تُنظَّم حسب الفصول، BAC حسب الوحدات.</div>
        </section>
      </div>
    </div>
  );
}

const css = `
.profile{max-width:960px;margin:0 auto;font-family:'IBM Plex Sans Arabic',sans-serif;}

.loading-state{
  display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px;
  min-height:50vh; color:var(--ink-teal); font-size:14.5px;
}
.spinner-lg{width:34px;height:34px;border-width:4px;}

.p-head{display:flex;align-items:center;gap:16px;margin-bottom:30px;}
.p-mark{width:52px;height:52px;border-radius:14px;flex-shrink:0;background:var(--ink-teal);color:var(--gold-bright);display:flex;align-items:center;justify-content:center;font-size:26px;}
.p-head h1{font-family:'Aref Ruqaa',serif;font-size:30px;color:var(--ink-teal);font-weight:700;}
.p-sub{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.14em;color:var(--gold);margin-bottom:4px;}

.hero-card{background:linear-gradient(150deg,var(--ink-teal-deep),var(--ink-teal));color:var(--parchment);border-radius:20px;padding:30px 32px;position:relative;overflow:hidden;margin-bottom:26px;}
.hero-card::before{content:'';position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 88% 12%,rgba(227,162,60,0.18),transparent 60%);}
.hero-grid{position:relative;z-index:2;display:flex;align-items:center;gap:22px;flex-wrap:wrap;}
.hero-avatar{width:88px;height:88px;border-radius:50%;background:var(--gold);color:var(--ink-teal-deep);display:flex;align-items:center;justify-content:center;font-family:'Aref Ruqaa',serif;font-size:38px;font-weight:700;border:3px solid var(--gold-bright);box-shadow:0 10px 28px rgba(0,0,0,.3);flex-shrink:0;}
.hero-info{flex:1;min-width:220px;}
.hero-name{font-family:'Aref Ruqaa',serif;font-size:30px;font-weight:700;margin-bottom:3px;}
.hero-mail{direction:ltr;text-align:right;font-size:13.5px;color:rgba(246,238,220,0.7);display:block;margin-bottom:10px;}
.hero-chips{display:flex;gap:10px;flex-wrap:wrap;}
.chip{display:inline-flex;align-items:center;gap:7px;font-family:'IBM Plex Mono',monospace;font-size:10.5px;letter-spacing:.1em;color:var(--gold-bright);border:1px solid rgba(227,162,60,0.4);border-radius:999px;padding:6px 14px;}
.chip::before{content:'';width:6px;height:6px;border-radius:50%;background:var(--gold-bright);}
.chip-ok{color:var(--parchment);border-color:rgba(246,238,220,0.3);}
.hero-signout{
  align-self:flex-start; background:transparent; border:1px solid rgba(246,238,220,0.3); color:var(--parchment);
  font-family:inherit; font-size:12.5px; font-weight:600; padding:8px 18px; border-radius:999px;
  cursor:pointer; transition:all .2s; position:relative; z-index:2; flex-shrink:0;
}
.hero-signout:hover{border-color:var(--gold); color:var(--gold-bright);}

.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:22px;margin-bottom:22px;}
.card{background:#fffdf6;border:1.5px solid var(--line);border-radius:18px;padding:24px;min-width:0;}
.card-title{display:flex;align-items:center;gap:10px;margin-bottom:18px;}
.card-title .ct-ico{width:38px;height:38px;border-radius:10px;background:var(--ink-teal);color:var(--gold-bright);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;}
.card-title h2{font-family:'Aref Ruqaa',serif;font-size:21px;color:var(--ink-teal);font-weight:700;}

.row{display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px dashed var(--line);gap:12px;}
.row:last-child{border-bottom:0;}
.row .k{font-size:13px;color:#5c584c;font-weight:500;flex-shrink:0;}
.row .v{font-size:14px;font-weight:700;color:var(--text-dark);text-align:left;}
.row .v.mono{font-family:'IBM Plex Mono',monospace;font-size:12px;direction:ltr;}
.row .v-input{flex:1;max-width:220px;}
.row .v-uid{font-size:10px;direction:ltr;}

.msg{border-radius:12px;padding:11px 16px;font-size:13.5px;margin-bottom:18px;line-height:1.6;text-align:right;}
.msg-success{background:rgba(47,110,79,0.1);border:1px solid rgba(47,110,79,0.3);color:#255c41;}
.msg-error{background:rgba(178,58,46,0.08);border:1px solid rgba(178,58,46,0.3);color:#8c2a20;}

.btn{border:0;cursor:pointer;font-family:'IBM Plex Sans Arabic',sans-serif;font-weight:700;font-size:13.5px;padding:10px 20px;border-radius:999px;transition:all .25s;}
.btn:focus-visible{outline:2px solid var(--gold);outline-offset:2px;}
.btn-gold{background:var(--gold);color:var(--ink-teal-deep);}
.btn-gold:hover:not(:disabled){background:var(--gold-bright);transform:translateY(-1px);}
.btn-ghost{border:1.5px solid var(--line);background:transparent;color:var(--ink-teal);}
.btn-ghost:hover{border-color:var(--gold);color:var(--crimson);}
.btn:disabled{opacity:.6;cursor:not-allowed;transform:none;}

.spinner{display:inline-block;width:16px;height:16px;border:3px solid rgba(14,59,54,0.25);border-top-color:var(--ink-teal-deep);border-radius:50%;animation:spin .7s linear infinite;vertical-align:middle;}
@keyframes spin{to{transform:rotate(360deg);}}

.text-input{width:100%;border:1.5px solid var(--line);border-radius:12px;background:#fffdf6;font-family:'IBM Plex Sans Arabic',sans-serif;font-size:14.5px;padding:12px 14px;color:var(--text-dark);outline:0;}
.text-input:focus{border-color:var(--gold);box-shadow:0 0 0 4px rgba(227,162,60,0.15);}

.card-footer{margin-top:14px;}
.btn-row{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px;}
.btn-row-tight{margin-top:12px;}

.level-cards{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px;}
.lvl-card{border:1.5px solid var(--line);border-radius:14px;padding:14px 16px;background:#fffdf6;cursor:pointer;text-align:right;font-family:'IBM Plex Sans Arabic',sans-serif;transition:all .22s;}
.lvl-card:hover{border-color:var(--gold);transform:translateY(-2px);box-shadow:0 8px 20px rgba(28,26,21,0.08);}
.lvl-card.active{border-color:var(--gold);background:rgba(227,162,60,0.1);box-shadow:0 8px 20px rgba(227,162,60,0.16);}
.lvl-card .lc-code{font-family:'IBM Plex Mono',monospace;font-size:9.5px;letter-spacing:.16em;color:var(--gold);}
.lvl-card.active .lc-code{color:var(--crimson);}
.lvl-card .lc-name{font-family:'Aref Ruqaa',serif;font-size:18px;color:var(--ink-teal);font-weight:700;margin-top:2px;}

.section-note{font-size:12px;color:#8a7a4e;margin-top:14px;font-family:'IBM Plex Mono',monospace;letter-spacing:.05em;}

@media(max-width:760px){.grid-2{grid-template-columns:1fr;}}
@media(max-width:600px){.level-cards{grid-template-columns:1fr;}.hero-signout{align-self:stretch;text-align:center;}}
@media(prefers-reduced-motion:reduce){.spinner{animation-duration:1.4s;}}
`;