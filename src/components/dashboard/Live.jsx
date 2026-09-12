import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { SERVICES } from './services';
import { normalizeLessonsLevel, MODULE_LABELS, LEVEL_LABELS } from '../../data/platform';

const tsToMs = (v) => (v?.toMillis ? v.toMillis() : typeof v?.seconds === 'number' ? v.seconds * 1000 : 0);
const JOIN_EARLY_MS = 15 * 60000; // زر الدخول يظهر قبل البداية بـ 15 دقيقة

const statusOf = (s, now) => {
  const start = tsToMs(s.startAt);
  const end = start + (Number(s.durationMin) || 60) * 60000;
  if (now < start) return 'upcoming';
  if (now <= end) return 'live';
  return 'ended';
};

const fmtWhen = (ms) =>
  new Date(ms).toLocaleString('ar-DZ', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

const countdown = (ms) => {
  if (ms <= 0) return '';
  const m = Math.floor(ms / 60000);
  if (m < 60) return `بعد ${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `بعد ${h} ساعة${m % 60 ? ` و${m % 60} د` : ''}`;
  const d = Math.floor(h / 24);
  return `بعد ${d} يوم${d > 1 ? '' : ''}`;
};

/**
 * الحصص المباشرة — /app/live
 * يعرض حصص مستوى الطالب (أو «كل المستويات») من liveSessions:
 * مباشر الآن (زر الدخول) · قادمة (عدّ تنازلي) · سابقة (رابط التسجيل إن وُجد).
 */
export default function Live() {
  const s = SERVICES.find((x) => x.id === 'live');
  const { level: rawLevel } = useOutletContext() || {};
  const level = normalizeLessonsLevel(rawLevel);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    getDocs(query(collection(db, 'liveSessions'), orderBy('startAt', 'desc')))
      .then((snap) => { if (!cancelled) setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); })
      .catch(() => { if (!cancelled) setError('تعذّر تحميل الحصص — حاول مرة أخرى.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  const mine = useMemo(
    () => items.filter((x) => !x.level || x.level === 'all' || !level || x.level === level),
    [items, level]
  );
  const live = mine.filter((x) => statusOf(x, now) === 'live');
  const upcoming = mine.filter((x) => statusOf(x, now) === 'upcoming').sort((a, b) => tsToMs(a.startAt) - tsToMs(b.startAt));
  const ended = mine.filter((x) => statusOf(x, now) === 'ended').slice(0, 10);

  const Card = ({ x, kind }) => {
    const start = tsToMs(x.startAt);
    const canJoin = kind === 'live' || (kind === 'upcoming' && start - now <= JOIN_EARLY_MS);
    return (
      <div className={`lv-card ${kind}`}>
        <div className="lv-card-top">
          <span className={`lv-badge ${kind}`}>
            {kind === 'live' ? '🔴 مباشر الآن' : kind === 'upcoming' ? `🕒 ${countdown(start - now)}` : '✔ انتهت'}
          </span>
          <span className="lv-scope">
            {x.module && x.module !== 'all' ? MODULE_LABELS[x.module] : 'حصة عامة'}
            {x.level && x.level !== 'all' ? ` · ${LEVEL_LABELS[x.level] || x.level}` : ' · كل المستويات'}
          </span>
        </div>
        <h3 className="lv-title">{x.title}</h3>
        {x.description && <p className="lv-desc">{x.description}</p>}
        <div className="lv-meta">
          <span>📅 {fmtWhen(start)}</span>
          <span>⏱ {x.durationMin || 60} دقيقة</span>
        </div>
        <div className="lv-actions">
          {kind !== 'ended' && (
            canJoin ? (
              <a className="lv-btn primary" href={x.link} target="_blank" rel="noopener noreferrer">دخول الحصة ↗</a>
            ) : (
              <span className="lv-btn disabled">يُفتح الدخول قبل البداية بـ 15 دقيقة</span>
            )
          )}
          {kind === 'ended' && (
            x.recordingUrl
              ? <a className="lv-btn" href={x.recordingUrl} target="_blank" rel="noopener noreferrer">▶ مشاهدة التسجيل</a>
              : <span className="lv-btn disabled">التسجيل غير متاح</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="lv" dir="rtl">
      <style>{css}</style>
      <header className="lv-head">
        <div className="lv-mark">{s?.icon || '🔴'}</div>
        <div>
          <div className="lv-sub">{s?.code || 'LIVE'} · {s?.name}</div>
          <h1>{s?.name || 'الحصص المباشرة'}</h1>
        </div>
      </header>
      <p className="lv-intro">{s?.desc}</p>

      {loading && <div className="lv-state"><span className="lv-spinner" /> جارٍ التحميل…</div>}
      {!loading && error && <div className="lv-state lv-error">{error}</div>}

      {!loading && !error && mine.length === 0 && (
        <div className="lv-empty">
          <div className="lv-empty-ico">🔴</div>
          <h3>لا توجد حصص مجدولة حاليًا</h3>
          <p>عندما يحدّد الأستاذ حصة مباشرة لمستواك ستظهر هنا مع موعدها ورابط الدخول.</p>
        </div>
      )}

      {live.length > 0 && (
        <section className="lv-section">
          <h2>الآن على المباشر</h2>
          <div className="lv-grid">{live.map((x) => <Card key={x.id} x={x} kind="live" />)}</div>
        </section>
      )}
      {upcoming.length > 0 && (
        <section className="lv-section">
          <h2>الحصص القادمة</h2>
          <div className="lv-grid">{upcoming.map((x) => <Card key={x.id} x={x} kind="upcoming" />)}</div>
        </section>
      )}
      {ended.length > 0 && (
        <section className="lv-section">
          <h2>حصص سابقة</h2>
          <div className="lv-grid">{ended.map((x) => <Card key={x.id} x={x} kind="ended" />)}</div>
        </section>
      )}
    </div>
  );
}

const css = `
.lv{max-width:940px;margin:0 auto;font-family:'IBM Plex Sans Arabic',sans-serif;}
.lv-head{display:flex;align-items:center;gap:16px;margin-bottom:10px;}
.lv-mark{width:52px;height:52px;border-radius:14px;flex-shrink:0;background:var(--ink-teal);color:var(--gold-bright);display:flex;align-items:center;justify-content:center;font-size:24px;}
.lv-head h1{font-family:'Aref Ruqaa',serif;font-size:28px;color:var(--ink-teal);font-weight:700;margin:0;}
.lv-sub{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.12em;color:var(--gold);margin-bottom:4px;}
.lv-intro{font-size:14px;color:#5c584c;line-height:1.8;margin:0 0 24px;max-width:640px;}
.lv-section{margin-bottom:28px;}
.lv-section h2{font-family:'Aref Ruqaa',serif;font-size:20px;color:var(--ink-teal);margin:0 0 12px;}
.lv-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(300px,100%),1fr));gap:14px;}
.lv-card{background:#fffdf6;border:1.5px solid var(--line);border-radius:16px;padding:18px;display:flex;flex-direction:column;gap:8px;}
.lv-card.live{border-color:rgba(178,58,46,.5);box-shadow:0 10px 26px rgba(178,58,46,.1);}
.lv-card-top{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;}
.lv-badge{font-size:11.5px;font-weight:700;border-radius:999px;padding:4px 12px;}
.lv-badge.live{background:rgba(178,58,46,.12);color:#8c2a20;animation:lv-pulse 1.4s infinite;}
.lv-badge.upcoming{background:rgba(227,162,60,.16);color:#7a5612;}
.lv-badge.ended{background:rgba(28,26,21,.06);color:#6b675c;}
@keyframes lv-pulse{0%,100%{opacity:1}50%{opacity:.55}}
.lv-scope{font-size:11.5px;color:#8a7a4e;}
.lv-title{font-family:'Aref Ruqaa',serif;font-size:19px;color:var(--ink-teal);margin:0;}
.lv-desc{font-size:13px;color:#5c584c;line-height:1.7;margin:0;}
.lv-meta{display:flex;gap:14px;flex-wrap:wrap;font-size:12.5px;color:#5c584c;}
.lv-actions{margin-top:auto;padding-top:6px;}
.lv-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;font-size:13px;font-weight:700;border-radius:999px;padding:10px 20px;border:1.5px solid var(--line);color:var(--ink-teal);transition:all .2s;}
.lv-btn:hover{border-color:var(--gold);}
.lv-btn.primary{background:var(--crimson);border-color:var(--crimson);color:var(--parchment);}
.lv-btn.primary:hover{opacity:.92;transform:translateY(-1px);}
.lv-btn.disabled{color:#9a918a;cursor:default;font-weight:600;font-size:12px;}
.lv-state{display:flex;align-items:center;justify-content:center;gap:10px;padding:40px 20px;color:#8a7a4e;font-size:14px;}
.lv-error{color:#8c2a20;}
.lv-spinner{display:inline-block;width:18px;height:18px;border:3px solid rgba(14,59,54,0.2);border-top-color:var(--ink-teal);border-radius:50%;animation:lv-spin .7s linear infinite;}
@keyframes lv-spin{to{transform:rotate(360deg);}}
.lv-empty{text-align:center;background:#fffdf6;border:1.5px solid var(--line);border-radius:20px;padding:48px 28px;}
.lv-empty-ico{font-size:44px;margin-bottom:10px;}
.lv-empty h3{font-family:'Aref Ruqaa',serif;font-size:22px;color:var(--ink-teal);margin:0 0 8px;}
.lv-empty p{font-size:14px;color:#5c584c;margin:0;line-height:1.8;}
`;
