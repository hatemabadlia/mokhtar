import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';
import { redeemAccessCode, groupKey, normalizeLevel } from '../../lib/access';
import { bunnyThumbnailUrl } from '../../lib/bunny';

const MODULES = [
  { value: 'math', label: 'رياضيات' },
  { value: 'physics', label: 'فيزياء' },
];

const TRIMESTER_LABELS = { t1: 'الفصل الأول', t2: 'الفصل الثاني', t3: 'الفصل الثالث' };
const TRIMESTER_ORDER = ['t1', 't2', 't3'];

const LEVEL_LABELS = { '4am': 'الرابعة متوسط', '1as': 'الأولى ثانوي', '2as': 'الثانية ثانوي', bac: 'البكالوريا' };

export default function LevelLessonsPage() {
  const { level: rawLevel } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const level = normalizeLevel(rawLevel);
  const isBac = level === 'bac';

  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  // المادة تُقرأ من رابط ?module= حتى نعود من صفحة المشاهدة إلى نفس المادة
  // (لا تظهر الرياضيات والفيزياء معًا — تبويب واحد نشط).
  const [module, setModule] = useState(() => {
    const m = searchParams.get('module');
    return MODULES.some((x) => x.value === m) ? m : 'math';
  });
  const [lessons, setLessons] = useState([]);
  const [loadingLessons, setLoadingLessons] = useState(true);
  const [unlockedGroups, setUnlockedGroups] = useState([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        navigate('/auth', { replace: true });
        return;
      }
      setUser(u);
      try {
        const snap = await getDoc(doc(db, 'users', u.uid));
        setUnlockedGroups(snap.exists() ? snap.data().unlockedGroups || [] : []);
      } catch {
        setUnlockedGroups([]);
      }
      setChecking(false);
    });
    return unsub;
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    const loadLessons = async () => {
      setLoadingLessons(true);
      try {
        const q = query(
          collection(db, 'lessons'),
          where('level', '==', level),
          where('module', '==', module)
        );
        const snap = await getDocs(q);
        setLessons(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Failed to load lessons:', err);
        setLessons([]);
      } finally {
        setLoadingLessons(false);
      }
    };
    loadLessons();
  }, [user, level, module]);

  // group lessons by trimester (t1/t2/t3) or by unit (free text from admin)
  const groups = useMemo(() => {
    if (isBac) {
      const byUnit = {};
      lessons.forEach((l) => {
        const key = l.unit || 'غير محدد';
        if (!byUnit[key]) byUnit[key] = [];
        byUnit[key].push(l);
      });
      return Object.entries(byUnit).map(([groupValue, items]) => ({
        groupValue,
        label: groupValue,
        items,
      }));
    }
    return TRIMESTER_ORDER.map((t) => ({
      groupValue: t,
      label: TRIMESTER_LABELS[t],
      items: lessons.filter((l) => l.trimester === t),
    })).filter((g) => g.items.length > 0 || true); // keep all 3 trimesters visible even if empty
  }, [lessons, isBac]);

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
        href="https://fonts.googleapis.com/css2?family=Aref+Ruqaa:wght@700&family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap"
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
      body{background:var(--parchment-dim);}

      .llp-body{padding:32px;max-width:960px;margin:0 auto;}
      .llp-title{font-family:'Aref Ruqaa',serif;font-size:26px;color:var(--ink-teal);margin-bottom:6px;}
      .llp-sub{font-size:13.5px;color:#5c584c;margin-bottom:22px;}

      .tabs{display:flex;gap:8px;margin-bottom:26px;background:var(--parchment-dim);padding:5px;border-radius:999px;width:fit-content;}
      .tab{border:0;background:transparent;cursor:pointer;font-family:inherit;font-weight:600;font-size:14px;
        padding:9px 22px;border-radius:999px;color:#5c584c;transition:all .2s;}
      .tab.active{background:var(--ink-teal);color:var(--parchment);}

      .group{background:#fffdf6;border:1px solid var(--line);border-radius:16px;margin-bottom:18px;overflow:hidden;}
      .group-head{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;background:var(--parchment-dim);}
      .group-title{font-family:'Aref Ruqaa',serif;font-size:18px;color:var(--ink-teal);}
      .lock-badge{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:var(--crimson);}
      .unlock-badge{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:#2e8b57;}

      .locked-panel{padding:20px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;}
      .code-input{flex:1;min-width:180px;background:#fffdf6;border:1.5px solid var(--line);border-radius:10px;
        padding:11px 14px;font-family:inherit;font-size:14px;outline:0;}
      .code-input:focus{border-color:var(--gold);}
      .redeem-btn{border:0;cursor:pointer;background:var(--gold);color:var(--ink-teal-deep);font-weight:700;
        font-size:13.5px;font-family:inherit;padding:11px 22px;border-radius:10px;transition:all .2s;}
      .redeem-btn:hover{background:var(--gold-bright);}
      .redeem-btn:disabled{opacity:0.6;cursor:not-allowed;}
      .code-error{width:100%;font-size:12.5px;color:var(--crimson);margin-top:2px;}

      .lessons-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;padding:18px 20px;}
      .lesson-card{border:1px solid var(--line);border-radius:12px;overflow:hidden;transition:all .2s;}
      .lesson-card:hover{border-color:var(--gold);transform:translateY(-2px);}
      .lesson-thumb{width:100%;aspect-ratio:16/9;object-fit:cover;background:var(--parchment-dim);display:block;}
      .lesson-body{padding:12px 14px;}
      .lesson-title{font-size:14px;font-weight:700;color:var(--text-dark);margin-bottom:4px;}
      .lesson-desc{font-size:12px;color:#8a8574;line-height:1.5;}

      .empty-note{padding:20px;text-align:center;font-size:13px;color:#9a918a;}
      .loading{text-align:center;padding:40px;color:#9a918a;font-size:14px;}
      `}</style>

      <main className="llp-body">
        <h1 className="llp-title">{LEVEL_LABELS[level] || level}</h1>
        <p className="llp-sub">اختر المادة، ثم افتح الفصل أو الوحدة برمز الدخول للوصول إلى الدروس</p>

        <div className="tabs">
          {MODULES.map((m) => (
            <button
              key={m.value}
              className={`tab${module === m.value ? ' active' : ''}`}
              onClick={() => setModule(m.value)}
              type="button"
            >
              {m.label}
            </button>
          ))}
        </div>

        {loadingLessons ? (
          <div className="loading">...جارٍ التحميل</div>
        ) : (
          groups.map((g) => (
            <LessonGroup
              key={g.groupValue}
              group={g}
              level={level}
              module={module}
              isBac={isBac}
              user={user}
              unlockedGroups={unlockedGroups}
              onUnlock={(key) => setUnlockedGroups((prev) => [...prev, key])}
            />
          ))
        )}
      </main>
    </div>
  );
}

function LessonGroup({ group, level, module, isBac, user, unlockedGroups, onUnlock }) {
  const key = groupKey(level, module, group.groupValue);
  // رمز «مادة كاملة» (level_module) يفتح كل مجموعات المادة أيضًا.
  const moduleKey = groupKey(level, module);
  const isUnlocked = unlockedGroups.includes(key) || unlockedGroups.includes(moduleKey);

  const [code, setCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [error, setError] = useState('');

  const handleRedeem = async () => {
    setError('');
    setRedeeming(true);
    try {
      const unlockedKey = await redeemAccessCode({
        user,
        code,
        level,
        module,
        groupValue: group.groupValue,
        isBac,
      });
      onUnlock(unlockedKey);
      setCode('');
    } catch (err) {
      setError(err.message);
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <div className="group">
      <div className="group-head">
        <span className="group-title">{group.label}</span>
        {isUnlocked ? (
          <span className="unlock-badge">🔓 مفتوح</span>
        ) : (
          <span className="lock-badge">🔒 مغلق</span>
        )}
      </div>

      {!isUnlocked ? (
        <div className="locked-panel">
          <input
            className="code-input"
            type="text"
            placeholder="أدخل رمز الدخول..."
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button className="redeem-btn" onClick={handleRedeem} disabled={redeeming} type="button">
            {redeeming ? '...' : 'فتح'}
          </button>
          {error && <div className="code-error">{error}</div>}
        </div>
      ) : group.items.length === 0 ? (
        <div className="empty-note">لا توجد دروس بعد في هذا القسم</div>
      ) : (
        <div className="lessons-grid">
          {group.items.map((lesson) => (
            <Link key={lesson.id} to={`/watch/${lesson.id}`} className="lesson-card">
              <img
                className="lesson-thumb"
                src={bunnyThumbnailUrl(lesson.bunnyVideoId)}
                alt={lesson.title}
                onError={(e) => { e.target.style.opacity = 0; }}
              />
              <div className="lesson-body">
                <div className="lesson-title">{lesson.title}</div>
                {lesson.description && <div className="lesson-desc">{lesson.description}</div>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}