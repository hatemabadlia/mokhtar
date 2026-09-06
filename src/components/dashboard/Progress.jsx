import React, { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { fetchLessonsByLevel } from '../../firebase/lessonsService';
import { SERVICES } from './services';
import {
  normalizeLessonsLevel,
  LEVEL_FULL_LABELS,
  TRIMESTER_LABELS,
  TRIMESTERS,
  unitSortValue,
  MODULE_LABELS,
  MODULE_ICONS,
} from '../../data/platform';
import { getWatchedLessonIds, getWatchedLessonIdSet } from '../../utils/watchHistory';
import { isGroupUnlocked as isLocalUnlock } from '../../firebase/access';

const RING_R = 52;
const RING_CIRC = 2 * Math.PI * RING_R;

function formatWhen(ts) {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleString('ar-DZ', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export default function Progress() {
  const serviceMeta = SERVICES.find((x) => x.id === 'progress');
  const { user, level = '' } = useOutletContext() || {};
  const lessonsLevel = normalizeLessonsLevel(level);
  const isBac = lessonsLevel === 'bac';

  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unlockedGroups, setUnlockedGroups] = useState([]); // مفاتيح النظام الجديد من Firestore

  useEffect(() => {
    if (!user || !lessonsLevel) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');

    (async () => {
      // المفاتيح الجديدة (per module): تُحفظ في users/{uid}.unlockedGroups
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (!cancelled && snap.exists() && Array.isArray(snap.data().unlockedGroups)) {
          setUnlockedGroups(snap.data().unlockedGroups);
        }
      } catch {
        // دون اتصال / صلاحيات — نعتمد على localStorage فقط
      }

      try {
        const items = await fetchLessonsByLevel(lessonsLevel);
        if (!cancelled) setLessons(items);
      } catch {
        if (!cancelled) setError('تعذّر تحميل بيانات التقدّم — حاول مرة أخرى.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, lessonsLevel]);

  // سجل المشاهدة المحلي + مجموعات فك التشفير (النظام الأقدم في localStorage)
  const watchedList = useMemo(() => getWatchedLessonIds(user?.uid), [user]);
  const watchedSet = useMemo(() => getWatchedLessonIdSet(user?.uid), [user]);

  // هل مجموعة (فصل/وحدة) مفتوحة؟ تغطي كلا النظامين: localStorage والنظام الجديد،
  // مع مفتاح «مادة كاملة» (level_module) الذي يفتح كل مجموعات المادة.
  const isGroupUnlocked = (groupValue) => {
    const matches = lessons.filter((l) => {
      const gv = String(isBac ? l.unit : l.trimester || '').trim();
      return gv === groupValue;
    });
    return matches.some((l) => {
      const groupKeyValue = `${lessonsLevel}_${l.module}_${groupValue}`;
      const moduleKeyValue = `${lessonsLevel}_${l.module}`;
      return (
        isLocalUnlock(groupKeyValue) ||
        isLocalUnlock(moduleKeyValue) ||
        unlockedGroups.includes(groupKeyValue) ||
        unlockedGroups.includes(moduleKeyValue)
      );
    });
  };

  const groups = useMemo(() => {
    if (isBac) {
      const map = new Map();
      for (const l of lessons) {
        const unit = String(l.unit || '').trim() || 'دروس أخرى';
        if (!map.has(unit)) map.set(unit, []);
        map.get(unit).push(l);
      }
      return Array.from(map.entries())
        .map(([unit, items]) => ({ value: unit, label: unit, items }))
        .sort((a, b) => unitSortValue(a.value) - unitSortValue(b.value));
    }
    return TRIMESTERS.map((t) => ({
      value: t,
      label: TRIMESTER_LABELS[t],
      items: lessons.filter((l) => l.trimester === t),
    }));
  }, [lessons, isBac]);

  const totalLessons = lessons.length;
  const watchedCount = lessons.filter((l) => watchedSet.has(l.id)).length;
  const overallPct = totalLessons ? Math.round((watchedCount / totalLessons) * 100) : 0;
  const unlockedGroupsCount = groups.filter((g) => isGroupUnlocked(g.value)).length;
  const totalGroups = groups.length;
  const readinessPct = totalGroups ? Math.round((unlockedGroupsCount / totalGroups) * 100) : 0;

  const modules = ['math', 'physics'].map((m) => {
    const items = lessons.filter((l) => l.module === m);
    const watched = items.filter((l) => watchedSet.has(l.id)).length;
    return {
      id: m,
      name: MODULE_LABELS[m] || m,
      icon: MODULE_ICONS[m] || '📘',
      total: items.length,
      watched,
      pct: items.length ? Math.round((watched / items.length) * 100) : 0,
    };
  });

  const recent = watchedList
    .slice(0, 5)
    .map((w) => ({ ...w, lesson: lessons.find((l) => l.id === w.lessonId) }))
    .filter((r) => r.lesson);

  const levelFull = LEVEL_FULL_LABELS[lessonsLevel] || '';

  return (
<div className="progress" dir="rtl">
      <style>{css}</style>

      <header className="pr-head">
        <div className="pr-mark">{serviceMeta?.icon || '📈'}</div>
        <div>
          <div className="pr-sub">
            {serviceMeta?.code || 'PROGRESS'} · {serviceMeta?.name || 'التقدّم'}
          </div>
          <h1>{serviceMeta?.name || 'التقدّم'}</h1>
        </div>
        {levelFull && <span className="pr-level-chip">{levelFull}</span>}
      </header>

      {!lessonsLevel && (
        <div className="notice">
          <p>حدّد مستواك الدراسي أولاً من صفحة الملف الشخصي لنعرض لك تقدّمك: الدروس، المجموعات، ونسبة تحضيرك للامتحان.</p>
          <Link className="notice-link" to="/app/profile">اختر مستواك الآن ←</Link>
        </div>
      )}

      {lessonsLevel && loading && (
        <div className="state-box">
          <span className="spinner" />
          <span>جارٍ تحميل بيانات التقدّم...</span>
        </div>
      )}

      {lessonsLevel && !loading && error && (
        <div className="state-box state-error">{error}</div>
      )}

      {lessonsLevel && !loading && !error && totalLessons === 0 && (
        <div className="empty">
          <div className="empty-ico">📈</div>
          <h3>لا توجد دروس بعد</h3>
          <p>لم تُنشر دروس لمستواك بعد — عندما تتوفر ستظهر إحصاءات تقدّمك هنا تلقائيًا.</p>
        </div>
      )}

      {lessonsLevel && !loading && !error && totalLessons > 0 && (
        <>
          <section className="pr-hero">
            <div className="ring-wrap">
              <svg className="ring" viewBox="0 0 120 120" aria-hidden="true">
                <circle className="ring-bg" cx="60" cy="60" r={RING_R} />
                <circle
                  className="ring-fg"
                  cx="60"
                  cy="60"
                  r={RING_R}
                  style={{
                    strokeDasharray: RING_CIRC,
                    strokeDashoffset: RING_CIRC - (RING_CIRC * overallPct) / 100,
                  }}
                />
              </svg>
              <div className="ring-num">
                {overallPct}
                <small>%</small>
              </div>
            </div>

            <div className="pr-hero-body">
              <div className="pr-hero-label">نسبة الإنجاز العامة</div>
              <h2>
                تقدّمك في <em>{levelFull}</em>
              </h2>
              <p>
                شاهدت {watchedCount} من {totalLessons} درسًا في مستواك الحالي
                {unlockedGroupsCount > 0
                  ? `، وفككت ${unlockedGroupsCount} من أصل ${totalGroups} مجموعة.`
                  : ' — افتح مجموعاتك بالرموز لتبدأ المشاهدة.'}
              </p>
              <Link className="pr-cta" to="/app/lessons">
                متابعة الدروس ←
              </Link>
            </div>
          </section>

          <section className="pr-stats">
            <div className="stat">
              <div className="stat-icon">📚</div>
              <div className="stat-num">{totalLessons}</div>
              <div className="stat-label">إجمالي الدروس</div>
            </div>
            <div className="stat">
              <div className="stat-icon">✅</div>
              <div className="stat-num">{watchedCount}</div>
              <div className="stat-label">دروس شاهدتها</div>
            </div>
            <div className="stat">
              <div className="stat-icon">🔓</div>
              <div className="stat-num">
                {unlockedGroupsCount}
                <span className="stat-sep"> / {totalGroups}</span>
              </div>
              <div className="stat-label">مجموعات مفتوحة</div>
            </div>
            <div className="stat">
              <div className="stat-icon">🎯</div>
              <div className="stat-num">{readinessPct}%</div>
              <div className="stat-label">نسبة التحضير للامتحان</div>
            </div>
          </section>
<section className="pr-card">
            <div className="pr-card-title">
              <span className="ct-ico">📖</span>
              <h2>التقدّم حسب المادة</h2>
            </div>
            <div className="mod-list">
              {modules.map((m) => (
                <div className="mod-row" key={m.id}>
                  <div className="mod-name">
                    <span className="mod-ico">{m.icon}</span>
                    {m.name}
                  </div>
                  <div className="mod-bar">
                    <span className="mod-fill" style={{ width: `${m.pct}%` }} />
                  </div>
                  <div className="mod-count">
                    {m.watched}/{m.total}
                    {m.total > 0 ? ` · ${m.pct}%` : ''}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="pr-card">
            <div className="pr-card-title">
              <span className="ct-ico">🗂️</span>
              <h2>{isBac ? 'التقدّم حسب الوحدات' : 'التقدّم حسب الفصول'}</h2>
            </div>
            <div className="group-list">
              {groups.map((g) => {
                const unlocked = isGroupUnlocked(g.value);
                const gWatched = g.items.filter((l) => watchedSet.has(l.id)).length;
                const gpct = g.items.length ? Math.round((gWatched / g.items.length) * 100) : 0;
                return (
                  <div className="group-row" key={g.value}>
                    <div className="group-top">
                      <span className="group-name">{g.label}</span>
                      <span className={`group-badge${unlocked ? ' open' : ''}`}>
                        {unlocked ? '🔓 مفتوح' : '🔒 مغلق'}
                      </span>
                    </div>
                    <div className="mod-bar">
                      <span className="mod-fill" style={{ width: `${gpct}%` }} />
                    </div>
                    <div className="group-meta">
                      <span>
                        {gWatched}/{g.items.length} درس
                        {g.items.length > 0 ? ` · ${gpct}%` : ''}
                      </span>
                      <Link className="group-link" to="/app/lessons">
                        {unlocked ? 'تصفّح الدروس' : 'طلب الوصول'} ←
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="pr-card">
            <div className="pr-card-title">
              <span className="ct-ico">🕘</span>
              <h2>آخر ما شاهدته</h2>
            </div>
            {recent.length === 0 ? (
              <div className="recent-empty">
                لم تشاهد أي درس بعد — ابدأ رحلتك من صفحة الدروس وفكّ رموز مجموعاتك.
              </div>
            ) : (
              <ul className="recent-list">
                {recent.map((r) => (
                  <li key={r.lesson.id} className="recent-item">
                    <Link to={`/watch/${r.lesson.id}`} className="recent-link">
                      <span className="recent-dot" />
                      <span className="recent-name">{r.lesson.title}</span>
                      <span className="recent-time">{formatWhen(r.watchedAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="pr-foot">
            <Link to="/app/lessons">← العودة إلى الدروس</Link>
          </div>
        </>
      )}
    </div>
  );
}

const css = `
.progress{max-width:960px;margin:0 auto;}

.pr-head{display:flex;align-items:center;gap:16px;margin-bottom:24px;flex-wrap:wrap;}
.pr-mark{width:52px;height:52px;border-radius:14px;flex-shrink:0;background:var(--ink-teal,#0E3B36);color:var(--gold-bright,#F0B85C);display:flex;align-items:center;justify-content:center;font-size:24px;}
.pr-head h1{font-family:'Aref Ruqaa',serif;font-size:28px;color:var(--ink-teal,#0E3B36);font-weight:700;margin:0;}
.pr-sub{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.12em;color:var(--gold,#E3A23C);margin-bottom:4px;}
.pr-level-chip{font-family:'Aref Ruqaa',serif;font-size:13px;color:var(--gold,#E3A23C);border:1px solid rgba(227,162,60,.5);border-radius:999px;padding:7px 16px;margin-inline-start:auto;background:rgba(227,162,60,.08);}

.notice{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;background:rgba(227,162,60,.12);border:1px solid rgba(227,162,60,.4);color:#7a5612;border-radius:12px;padding:14px 18px;font-size:14px;}
.notice p{flex:1;min-width:220px;margin:0;line-height:1.8;}
.notice-link{background:var(--crimson,#B23A2E);color:var(--parchment,#F6EEDC);font-weight:700;font-size:13px;padding:9px 20px;border-radius:999px;transition:all .25s;}
.notice-link:hover{opacity:.9;}

.state-box{display:flex;align-items:center;gap:10px;justify-content:center;padding:50px 20px;color:#8a7a4e;font-size:14px;text-align:center;}
.state-error{color:#8c2a20;}
.spinner{display:inline-block;width:18px;height:18px;border:3px solid rgba(14,59,54,.2);border-top-color:var(--ink-teal,#0E3B36);border-radius:50%;animation:pr-spin .7s linear infinite;}
@keyframes pr-spin{to{transform:rotate(360deg);}}

.empty{text-align:center;background:#fffdf6;border:1.5px solid var(--line,#e2d9c8);border-radius:20px;padding:52px 28px;}
.empty-ico{font-size:44px;margin-bottom:10px;}
.empty h3{font-family:'Aref Ruqaa',serif;font-size:22px;color:var(--ink-teal,#0E3B36);margin:0 0 8px;font-weight:700;}
.empty p{font-size:14px;color:#5c584c;margin:0;line-height:1.8;}

.pr-hero{display:flex;align-items:center;gap:30px;background:linear-gradient(150deg,var(--ink-teal-deep,#092824) 0%,var(--ink-teal,#0E3B36) 60%,#14534C 100%);border-radius:20px;padding:32px 36px;color:var(--parchment,#F6EEDC);margin-bottom:26px;flex-wrap:wrap;overflow:hidden;position:relative;}
.pr-hero::before{content:'';position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse 480px 340px at 90% 10%,rgba(227,162,60,.18),transparent 60%);}
.pr-hero>*{position:relative;z-index:2;}

.ring-wrap{position:relative;width:150px;height:150px;flex-shrink:0;}
.ring{width:100%;height:100%;transform:rotate(-90deg);}
.ring-bg{fill:none;stroke:rgba(246,238,220,.18);stroke-width:11;}
.ring-fg{fill:none;stroke:var(--gold-bright,#F0B85C);stroke-width:11;stroke-linecap:round;transition:stroke-dashoffset .8s ease;}
.ring-num{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:'Aref Ruqaa',serif;font-size:34px;color:var(--parchment,#F6EEDC);font-weight:700;}
.ring-num small{font-size:16px;color:var(--gold-bright,#F0B85C);margin-inline-start:2px;align-self:center;}

.pr-hero-body{flex:1;min-width:240px;}
.pr-hero-label{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.14em;color:var(--gold-bright,#F0B85C);margin-bottom:10px;}
.pr-hero h2{font-family:'Aref Ruqaa',serif;font-size:25px;color:var(--parchment,#F6EEDC);margin:0 0 8px;font-weight:700;}
.pr-hero h2 em{font-style:normal;color:var(--gold-bright,#F0B85C);}
.pr-hero p{font-size:14px;color:rgba(246,238,220,.82);line-height:1.9;margin:0 0 18px;max-width:560px;}
.pr-cta{display:inline-flex;align-items:center;gap:8px;background:var(--gold,#E3A23C);color:var(--ink-teal-deep,#092824);font-weight:700;font-size:13.5px;padding:11px 22px;border-radius:999px;transition:all .25s;box-shadow:0 8px 24px rgba(227,162,60,.25);}
.pr-cta:hover{background:var(--gold-bright,#F0B85C);transform:translateY(-1px);}

.pr-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:26px;}
.stat{background:#fffdf6;border:1.5px solid var(--line,#e2d9c8);border-radius:16px;padding:20px 14px;text-align:center;transition:transform .2s,border-color .2s;}
.stat:hover{transform:translateY(-2px);border-color:var(--gold,#E3A23C);}
.stat-icon{font-size:22px;margin-bottom:6px;}
.stat-num{font-family:'Aref Ruqaa',serif;font-size:27px;color:var(--ink-teal,#0E3B36);font-weight:700;line-height:1.2;}
.stat-sep{font-size:14px;color:#8a7a4e;}
.stat-label{font-size:12.5px;color:#5c584c;margin-top:5px;font-weight:600;}
.pr-card{background:#fffdf6;border:1.5px solid var(--line,#e2d9c8);border-radius:18px;padding:22px 24px;margin-bottom:22px;}
.pr-card-title{display:flex;align-items:center;gap:10px;margin-bottom:18px;}
.pr-card-title h2{font-family:'Aref Ruqaa',serif;font-size:20px;color:var(--ink-teal,#0E3B36);font-weight:700;margin:0;}
.ct-ico{width:36px;height:36px;border-radius:10px;background:var(--ink-teal,#0E3B36);color:var(--gold-bright,#F0B85C);display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0;}

.mod-list{display:flex;flex-direction:column;gap:16px;}
.mod-row{display:grid;grid-template-columns:150px 1fr 100px;gap:14px;align-items:center;}
.mod-name{font-size:14px;font-weight:700;color:var(--text-dark,#1C1A15);display:flex;align-items:center;gap:8px;}
.mod-ico{width:30px;height:30px;border-radius:8px;background:rgba(14,59,54,.08);display:flex;align-items:center;justify-content:center;color:var(--ink-teal,#0E3B36);font-weight:700;flex-shrink:0;}
.mod-bar{height:10px;border-radius:999px;background:var(--parchment-dim,#EFE3C8);overflow:hidden;}
.mod-fill{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,var(--ink-teal,#0E3B36),var(--gold,#E3A23C));transition:width .6s ease;}
.mod-count{font-family:'IBM Plex Mono',monospace;font-size:11.5px;color:#5c584c;direction:ltr;text-align:left;white-space:nowrap;}

.group-list{display:flex;flex-direction:column;gap:18px;}
.group-row{background:#fffdf6;border:1px solid var(--line,#e2d9c8);border-radius:14px;padding:14px 18px;}
.group-top{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;}
.group-name{font-family:'Aref Ruqaa',serif;font-size:17px;color:var(--ink-teal,#0E3B36);font-weight:700;}
.group-badge{font-size:11.5px;font-weight:700;padding:4px 12px;border-radius:999px;background:rgba(178,58,46,.1);color:#8c2a20;flex-shrink:0;}
.group-badge.open{background:rgba(47,110,79,.1);color:#255c41;}
.group-meta{display:flex;align-items:center;justify-content:space-between;margin-top:9px;font-size:12.5px;color:#5c584c;gap:10px;flex-wrap:wrap;font-family:'IBM Plex Mono',monospace;direction:ltr;}
.group-link{font-family:'IBM Plex Sans Arabic',sans-serif;direction:rtl;font-weight:700;color:var(--crimson,#B23A2E);}

.recent-list{list-style:none;margin:0;padding:0;}
.recent-item{border-bottom:1px dashed var(--line,#e2d9c8);}
.recent-item:last-child{border-bottom:0;}
.recent-link{display:flex;align-items:center;gap:10px;padding:12px 6px;border-radius:8px;transition:background .2s;}
.recent-link:hover{background:rgba(227,162,60,.08);}
.recent-dot{width:8px;height:8px;border-radius:50%;background:var(--gold,#E3A23C);flex-shrink:0;}
.recent-name{flex:1;font-size:14px;font-weight:600;color:var(--text-dark,#1C1A15);}
.recent-time{font-family:'IBM Plex Mono',monospace;font-size:11px;color:#8a7a4e;direction:ltr;}
.recent-empty{font-size:13.5px;color:#5c584c;text-align:center;padding:22px;line-height:1.8;}

.pr-foot{text-align:center;padding:8px 0 12px;}
.pr-foot a{font-size:13px;font-weight:700;color:var(--ink-teal,#0E3B36);}

@media(max-width:760px){.pr-stats{grid-template-columns:1fr 1fr;}.mod-row{grid-template-columns:1fr;gap:8px;}.mod-count{text-align:right;direction:rtl;}}
@media(max-width:520px){.pr-stats{grid-template-columns:1fr 1fr;}.pr-hero{padding:26px 22px;gap:20px;}.ring-wrap{width:124px;height:124px;margin:0 auto;}.pr-head h1{font-size:24px;}.pr-card{padding:18px 16px;}}
@media(prefers-reduced-motion:reduce){.ring-fg,.mod-fill,.stat{transition:none;}.spinner{animation-duration:1.4s;}}
`;