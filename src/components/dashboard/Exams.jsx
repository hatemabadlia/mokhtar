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
  unitSortValue,
  lessonCreatedAtMs,
} from '../../data/platform';

// نوع الملف كما يرفعه المشرف (AdminExamUpload → exams.type)
const TYPE_LABELS = {
  exam: 'اختبار',
  quiz: 'فرض',
};

const SUBJECTS = ['math', 'physics'].map((id) => ({
  id,
  name: MODULE_LABELS[id],
  icon: MODULE_ICONS[id],
}));

/**
 * التمارين والامتحانات — /app/exams
 * يقرأ مجموعة `exams` التي يرفعها المشرف:
 *   { title, description, level ('4am'|'1as'|'2as'|'bac'), module ('math'|'physics'),
 *     type ('exam'|'quiz'), trimester | unit, pdfURL, createdAt }
 * المستوى المحفوظ للمستخدم (BEM/1AS/…) يُحوَّل إلى صيغة Firestore عبر normalizeLessonsLevel.
 */
export default function Exams() {
  const serviceMeta = SERVICES.find((x) => x.id === 'exams');
  const { level: rawLevel } = useOutletContext() || {};
  const level = normalizeLessonsLevel(rawLevel);
  const isBac = level === 'bac';

  const [subject, setSubject] = useState(null); // 'math' | 'physics' | null
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [typeFilter, setTypeFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all'); // فصل أو وحدة

  useEffect(() => {
    if (!subject || !level) return;

    let cancelled = false;
    setLoading(true);
    setError('');
    setTypeFilter('all');
    setGroupFilter('all');

    (async () => {
      try {
        const q = query(
          collection(db, 'exams'),
          where('module', '==', subject),
          where('level', '==', level)
        );
        const snap = await getDocs(q);
        if (cancelled) return;
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        items.sort((a, b) => lessonCreatedAtMs(b) - lessonCreatedAtMs(a));
        setPapers(items);
      } catch {
        if (!cancelled) setError('تعذّر تحميل المواضيع — حاول مرة أخرى.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [subject, level]);

  // قيمة المجموعة (فصل أو وحدة) وتسميتها لكل ملف
  const groupOf = (p) => (isBac ? String(p.unit || '').trim() : p.trimester || '');
  const groupLabel = (v) => (isBac ? v : TRIMESTER_LABELS[v] || v);

  const groups = useMemo(() => {
    const set = new Set(papers.map((p) => (isBac ? String(p.unit || '').trim() : p.trimester || '')).filter(Boolean));
    const arr = Array.from(set);
    return isBac ? arr.sort((a, b) => unitSortValue(a) - unitSortValue(b)) : arr.sort();
  }, [papers, isBac]);

  const filteredPapers = useMemo(() => {
    return papers.filter((p) => {
      if (typeFilter !== 'all' && p.type !== typeFilter) return false;
      const g = isBac ? String(p.unit || '').trim() : p.trimester || '';
      if (groupFilter !== 'all' && g !== groupFilter) return false;
      return true;
    });
  }, [papers, typeFilter, groupFilter, isBac]);

  return (
    <div className="exams" dir="rtl">
      <style>{css}</style>

      <header className="ex-head">
        <div className="ex-mark">{serviceMeta?.icon || '📝'}</div>
        <div>
          <div className="ex-sub">{serviceMeta?.code || 'EXAMS'} · {serviceMeta?.name || 'التمارين والمواضيع'}</div>
          <h1>{serviceMeta?.name || 'التمارين والمواضيع'}</h1>
        </div>
      </header>

      {!level && (
        <div className="notice">حدّد مستواك الدراسي أولاً من صفحة الملف الشخصي لعرض المواضيع المناسبة لك.</div>
      )}

      {level && !subject && (
        <>
          <p className="ex-intro">اختر المادة لعرض التمارين والمواضيع المتاحة.</p>
          <div className="subject-grid">
            {SUBJECTS.map((s) => (
              <button key={s.id} type="button" className="subject-card" onClick={() => setSubject(s.id)}>
                <span className="subject-icon">{s.icon}</span>
                <span className="subject-name">{s.name}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {level && subject && (
        <>
          <div className="toolbar">
            <button type="button" className="back-btn" onClick={() => setSubject(null)}>
              ← تغيير المادة
            </button>
            <span className="current-subject">
              {MODULE_ICONS[subject]} {MODULE_LABELS[subject]}
            </span>
          </div>

          <div className="filters">
            <div className="filter-group">
              <span className="filter-label">النوع</span>
              <div className="chip-row">
                <button
                  type="button"
                  className={`chip-btn${typeFilter === 'all' ? ' active' : ''}`}
                  onClick={() => setTypeFilter('all')}
                >
                  الكل
                </button>
                {Object.entries(TYPE_LABELS).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className={`chip-btn${typeFilter === key ? ' active' : ''}`}
                    onClick={() => setTypeFilter(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {groups.length > 0 && (
              <div className="filter-group">
                <span className="filter-label">{isBac ? 'الوحدة' : 'الفصل'}</span>
                <select className="unit-select" value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}>
                  <option value="all">{isBac ? 'كل الوحدات' : 'كل الفصول'}</option>
                  {groups.map((g) => (
                    <option key={g} value={g}>{groupLabel(g)}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {loading && (
            <div className="state-box">
              <span className="spinner" />
              <span>جارٍ تحميل المواضيع...</span>
            </div>
          )}

          {!loading && error && <div className="state-box state-error">{error}</div>}

          {!loading && !error && filteredPapers.length === 0 && (
            <div className="state-box">لا توجد مواضيع مطابقة لهذا الفلتر بعد.</div>
          )}

          {!loading && !error && filteredPapers.length > 0 && (
            <div className="papers-list">
              {filteredPapers.map((p) => (
                <div className="paper-card" key={p.id}>
                  <div className="paper-top">
                    <div className="paper-title">{p.title}</div>
                    {p.type && (
                      <span className={`type-tag type-${p.type}`}>
                        {TYPE_LABELS[p.type] || p.type}
                      </span>
                    )}
                  </div>
                  {p.description && <p className="paper-desc">{p.description}</p>}
                  <div className="paper-meta">
                    {groupOf(p) && <span className="meta-tag">{groupLabel(groupOf(p))}</span>}
                    {p.fileName && <span className="meta-tag" dir="ltr">PDF</span>}
                  </div>
                  <div className="paper-actions">
                    {p.pdfURL && (
                      <Link to={`/app/exams/${p.id}`} className="paper-btn primary">
                        📖 قراءة الموضوع
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const css = `
.exams{max-width:900px;margin:0 auto;font-family:'IBM Plex Sans Arabic',sans-serif;}

.ex-head{display:flex;align-items:center;gap:16px;margin-bottom:24px;}
.ex-mark{width:52px;height:52px;border-radius:14px;flex-shrink:0;background:var(--ink-teal);color:var(--gold-bright);display:flex;align-items:center;justify-content:center;font-size:24px;}
.ex-head h1{font-family:'Aref Ruqaa',serif;font-size:28px;color:var(--ink-teal);font-weight:700;}
.ex-sub{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.12em;color:var(--gold);margin-bottom:4px;}

.notice{
  background:rgba(227,162,60,0.12); border:1px solid rgba(227,162,60,0.4); color:#7a5612;
  border-radius:12px; padding:14px 18px; font-size:14px;
}

.ex-intro{font-size:14.5px;color:#5c584c;margin-bottom:22px;}

.subject-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;max-width:500px;}
.subject-card{
  background:#fffdf6;border:1.5px solid var(--line);border-radius:18px;padding:34px 20px;
  display:flex;flex-direction:column;align-items:center;gap:12px;cursor:pointer;
  font-family:inherit;transition:all .25s;
}
.subject-card:hover{border-color:var(--gold);transform:translateY(-3px);box-shadow:0 14px 30px rgba(28,26,21,0.1);}
.subject-icon{
  width:56px;height:56px;border-radius:50%;background:var(--ink-teal);color:var(--gold-bright);
  display:flex;align-items:center;justify-content:center;font-size:26px;
}
.subject-name{font-family:'Aref Ruqaa',serif;font-size:20px;color:var(--ink-teal);font-weight:700;}

.toolbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:22px;flex-wrap:wrap;gap:10px;}
.back-btn{
  background:transparent;border:1.5px solid var(--line);color:var(--ink-teal);font-family:inherit;
  font-size:13px;font-weight:600;padding:9px 18px;border-radius:999px;cursor:pointer;transition:all .2s;
}
.back-btn:hover{border-color:var(--gold);color:var(--crimson);}
.current-subject{
  font-family:'Aref Ruqaa',serif;font-size:19px;color:var(--ink-teal);display:flex;align-items:center;gap:8px;
}

.filters{
  display:flex;gap:24px;flex-wrap:wrap;margin-bottom:26px;padding:18px 20px;
  background:var(--parchment-dim);border-radius:14px;border:1px solid var(--line);
}
.filter-group{display:flex;flex-direction:column;gap:8px;}
.filter-label{font-size:12px;font-weight:700;color:var(--ink-teal);}
.chip-row{display:flex;gap:8px;flex-wrap:wrap;}
.chip-btn{
  background:#fffdf6;border:1.5px solid var(--line);color:#5c584c;font-family:inherit;
  font-size:12.5px;font-weight:600;padding:7px 16px;border-radius:999px;cursor:pointer;transition:all .2s;
}
.chip-btn:hover{border-color:var(--gold);}
.chip-btn.active{background:var(--ink-teal);color:var(--parchment);border-color:var(--ink-teal);}
.unit-select{
  background:#fffdf6;border:1.5px solid var(--line);border-radius:999px;color:var(--text-dark);
  font-family:inherit;font-size:12.5px;font-weight:600;padding:8px 16px;cursor:pointer;
}

.state-box{
  display:flex;align-items:center;gap:10px;justify-content:center;
  padding:40px 20px;color:#8a7a4e;font-size:14px;text-align:center;
}
.state-error{color:#8c2a20;}
.spinner{
  display:inline-block;width:18px;height:18px;border:3px solid rgba(14,59,54,0.2);
  border-top-color:var(--ink-teal);border-radius:50%;animation:ex-spin .7s linear infinite;
}
@keyframes ex-spin{to{transform:rotate(360deg);}}

.papers-list{display:flex;flex-direction:column;gap:12px;}
.paper-card{background:#fffdf6;border:1.5px solid var(--line);border-radius:14px;padding:18px 20px;}
.paper-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:8px;}
.paper-title{font-family:'Aref Ruqaa',serif;font-size:18px;color:var(--ink-teal);font-weight:700;}
.type-tag{
  font-size:11px;font-weight:700;padding:4px 12px;
  border-radius:999px;flex-shrink:0;
}
.type-exam{background:rgba(14,59,54,0.1);color:var(--ink-teal);}
.type-quiz{background:rgba(227,162,60,0.15);color:#7a5612;}
.paper-desc{font-size:13px;color:#5c584c;line-height:1.7;margin:0 0 10px;}

.paper-meta{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;}
.meta-tag{
  font-size:11.5px;color:#5c584c;background:var(--parchment-dim);border:1px solid var(--line);
  padding:3px 11px;border-radius:999px;
}

.paper-actions{display:flex;gap:10px;flex-wrap:wrap;}
.paper-btn{
  font-size:12.5px;font-weight:700;padding:9px 20px;border-radius:999px;text-align:center;transition:all .2s;
  border:1.5px solid var(--line);color:var(--ink-teal);
}
.paper-btn:hover{border-color:var(--gold);}
.paper-btn.primary{background:var(--gold);color:var(--ink-teal-deep);border-color:var(--gold);}
.paper-btn.primary:hover{background:var(--gold-bright);}

@media(max-width:520px){
  .subject-grid{grid-template-columns:1fr;max-width:100%;}
  .filters{flex-direction:column;gap:16px;}
}
@media(prefers-reduced-motion:reduce){.spinner{animation-duration:1.4s;}}
`;