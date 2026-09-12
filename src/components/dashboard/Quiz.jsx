import React, { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { SERVICES } from './services';
import {
  normalizeLessonsLevel,
  MODULE_LABELS,
  MODULE_ICONS,
  TRIMESTER_LABELS,
  TRIMESTERS,
  unitSortValue,
  lessonCreatedAtMs,
} from '../../data/platform';

const MODULES = ['math', 'physics'];

/**
 * الاختبارات التفاعلية — /app/quiz
 * يقرأ quizzes (منشورة فقط) لمستوى الطالب، مجمّعة حسب الفصل/الوحدة داخل المادة،
 * ويعرض أفضل نتيجة سابقة من quizResults/{uid}_{quizId}.
 */
export default function Quiz() {
  const serviceMeta = SERVICES.find((x) => x.id === 'quiz');
  const { user, level: rawLevel } = useOutletContext() || {};
  const level = normalizeLessonsLevel(rawLevel);
  const isBac = level === 'bac';

  const [module, setModule] = useState('math');
  const [quizzes, setQuizzes] = useState([]);
  const [results, setResults] = useState({}); // quizId → result
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!level || !user) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    setError('');
    (async () => {
      try {
        const [qSnap, rSnap] = await Promise.all([
          getDocs(query(collection(db, 'quizzes'), where('level', '==', level))),
          getDocs(query(collection(db, 'quizResults'), where('uid', '==', user.uid))),
        ]);
        if (cancelled) return;
        const items = qSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((q) => q.published !== false)
          .sort((a, b) => lessonCreatedAtMs(b) - lessonCreatedAtMs(a));
        setQuizzes(items);
        const map = {};
        rSnap.docs.forEach((d) => { const r = d.data(); map[r.quizId] = r; });
        setResults(map);
      } catch {
        if (!cancelled) setError('تعذّر تحميل الاختبارات — حاول مرة أخرى.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [level, user]);

  const moduleQuizzes = useMemo(() => quizzes.filter((q) => q.module === module), [quizzes, module]);

  const groups = useMemo(() => {
    if (isBac) {
      const map = new Map();
      for (const q of moduleQuizzes) {
        const u = String(q.unit || '').trim() || 'اختبارات أخرى';
        if (!map.has(u)) map.set(u, []);
        map.get(u).push(q);
      }
      return Array.from(map.entries())
        .map(([label, items]) => ({ key: label, label, items }))
        .sort((a, b) => unitSortValue(a.label) - unitSortValue(b.label));
    }
    return TRIMESTERS.map((t) => ({
      key: t, label: TRIMESTER_LABELS[t], items: moduleQuizzes.filter((q) => q.trimester === t),
    })).filter((g) => g.items.length > 0);
  }, [moduleQuizzes, isBac]);

  const doneCount = moduleQuizzes.filter((q) => results[q.id]).length;

  return (
    <div className="qz" dir="rtl">
      <style>{css}</style>

      <header className="qz-head">
        <div className="qz-mark">{serviceMeta?.icon || '🧠'}</div>
        <div>
          <div className="qz-sub">{serviceMeta?.code || 'QUIZ'} · {serviceMeta?.name || 'الاختبارات'}</div>
          <h1>{serviceMeta?.name || 'الاختبارات'}</h1>
        </div>
      </header>

      {!level && (
        <div className="notice">حدّد مستواك الدراسي أولاً من صفحة الملف الشخصي لعرض الاختبارات المناسبة لك.</div>
      )}

      {level && (
        <>
          <p className="qz-intro">اختبارات قصيرة بتصحيح فوري — اختر المادة ثم ابدأ.</p>
          <div className="qz-tabs">
            {MODULES.map((m) => (
              <button key={m} type="button" className={`qz-tab${module === m ? ' active' : ''}`} onClick={() => setModule(m)}>
                {MODULE_ICONS[m]} {MODULE_LABELS[m]}
              </button>
            ))}
          </div>

          {loading && <div className="state-box"><span className="spinner" /> جارٍ التحميل…</div>}
          {!loading && error && <div className="state-box state-error">{error}</div>}

          {!loading && !error && moduleQuizzes.length === 0 && (
            <div className="empty">
              <div className="empty-ico">🧠</div>
              <h3>لا توجد اختبارات بعد</h3>
              <p>لم تُنشر اختبارات في {MODULE_LABELS[module]} لمستواك بعد — ترقّب قريبًا.</p>
            </div>
          )}

          {!loading && !error && moduleQuizzes.length > 0 && (
            <>
              <div className="qz-summary">
                أنجزت <b>{doneCount}</b> من <b>{moduleQuizzes.length}</b> اختبارًا في {MODULE_LABELS[module]}
              </div>
              {groups.map((g) => (
                <section className="qz-group" key={g.key}>
                  <h2 className="qz-group-title">{g.label}</h2>
                  <div className="qz-list">
                    {g.items.map((q) => {
                      const r = results[q.id];
                      const n = (q.questions || []).length;
                      return (
                        <Link to={`/app/quiz/${q.id}`} className="qz-card" key={q.id}>
                          <div className="qz-card-top">
                            <span className="qz-card-title">{q.title}</span>
                            {r ? (
                              <span className={`qz-score${r.pct >= 50 ? ' ok' : ' low'}`}>{r.pct}%</span>
                            ) : (
                              <span className="qz-new">جديد</span>
                            )}
                          </div>
                          {q.description && <p className="qz-card-desc">{q.description}</p>}
                          <div className="qz-card-meta">
                            <span>{n} سؤال</span>
                            {r && <span>أفضل نتيجة: {r.score}/{r.total} · {r.attempts || 1} محاولة</span>}
                            <span className="qz-cta">{r ? 'أعد المحاولة' : 'ابدأ الاختبار'} ←</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}

const css = `
.qz{max-width:900px;margin:0 auto;font-family:'IBM Plex Sans Arabic',sans-serif;}
.qz-head{display:flex;align-items:center;gap:16px;margin-bottom:22px;}
.qz-mark{width:52px;height:52px;border-radius:14px;flex-shrink:0;background:var(--ink-teal);color:var(--gold-bright);display:flex;align-items:center;justify-content:center;font-size:24px;}
.qz-head h1{font-family:'Aref Ruqaa',serif;font-size:28px;color:var(--ink-teal);font-weight:700;margin:0;}
.qz-sub{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.12em;color:var(--gold);margin-bottom:4px;}
.notice{background:rgba(227,162,60,0.12);border:1px solid rgba(227,162,60,0.4);color:#7a5612;border-radius:12px;padding:14px 18px;font-size:14px;}
.qz-intro{font-size:14px;color:#5c584c;margin:0 0 14px;}
.qz-tabs{display:flex;gap:8px;margin-bottom:20px;background:var(--parchment-dim);padding:5px;border-radius:999px;width:fit-content;}
.qz-tab{border:0;background:transparent;cursor:pointer;font-family:inherit;font-weight:600;font-size:14px;padding:9px 22px;border-radius:999px;color:#5c584c;transition:all .2s;}
.qz-tab.active{background:var(--ink-teal);color:var(--parchment);}
.qz-summary{font-size:13.5px;color:#5c584c;background:#fffdf6;border:1px solid var(--line);border-radius:12px;padding:12px 16px;margin-bottom:20px;}
.qz-summary b{color:var(--ink-teal);}
.qz-group{margin-bottom:24px;}
.qz-group-title{font-family:'Aref Ruqaa',serif;font-size:19px;color:var(--ink-teal);margin:0 0 12px;}
.qz-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(280px,100%),1fr));gap:14px;}
.qz-card{background:#fffdf6;border:1.5px solid var(--line);border-radius:16px;padding:16px 18px;display:flex;flex-direction:column;gap:8px;transition:all .22s;color:inherit;}
.qz-card:hover{border-color:var(--gold);transform:translateY(-2px);box-shadow:0 12px 26px rgba(28,26,21,0.08);}
.qz-card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;}
.qz-card-title{font-weight:700;font-size:15px;color:var(--text-dark);line-height:1.5;}
.qz-score{font-family:'IBM Plex Mono',monospace;font-size:12.5px;font-weight:700;border-radius:999px;padding:4px 12px;flex-shrink:0;}
.qz-score.ok{background:rgba(46,139,87,.12);color:#1f6b41;}
.qz-score.low{background:rgba(178,58,46,.1);color:#8c2a20;}
.qz-new{font-size:11.5px;font-weight:700;border-radius:999px;padding:4px 12px;background:rgba(227,162,60,.16);color:#7a5612;flex-shrink:0;}
.qz-card-desc{font-size:12.5px;color:#5c584c;line-height:1.7;margin:0;}
.qz-card-meta{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:12px;color:#8a7a4e;margin-top:auto;}
.qz-cta{margin-inline-start:auto;font-weight:700;color:var(--crimson);}
.state-box{display:flex;align-items:center;gap:10px;justify-content:center;padding:40px 20px;color:#8a7a4e;font-size:14px;}
.state-error{color:#8c2a20;}
.spinner{display:inline-block;width:18px;height:18px;border:3px solid rgba(14,59,54,0.2);border-top-color:var(--ink-teal);border-radius:50%;animation:qz-spin .7s linear infinite;}
@keyframes qz-spin{to{transform:rotate(360deg);}}
.empty{text-align:center;background:#fffdf6;border:1.5px solid var(--line);border-radius:20px;padding:48px 28px;}
.empty-ico{font-size:44px;margin-bottom:10px;}
.empty h3{font-family:'Aref Ruqaa',serif;font-size:22px;color:var(--ink-teal);margin:0 0 8px;}
.empty p{font-size:14px;color:#5c584c;margin:0;line-height:1.8;}
`;
