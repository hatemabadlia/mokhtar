import React, { useEffect, useState } from 'react';
import { Link, useParams, useOutletContext } from 'react-router-dom';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { MODULE_LABELS, LEVEL_FULL_LABELS, TRIMESTER_LABELS } from '../../data/platform';

/**
 * أداء الاختبار — /app/quiz/:id
 * سؤال واحد في كل مرة؛ عند اختيار الإجابة يظهر التصحيح فورًا (صحيح/خطأ + الشرح)،
 * وفي النهاية النتيجة تُحفظ في quizResults/{uid}_{quizId} (أفضل نتيجة + عدد المحاولات).
 */
export default function QuizPlay() {
  const { id } = useParams();
  const { user } = useOutletContext() || {};

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState([]); // فهرس الخيار المختار لكل سؤال (أو null)
  const [picked, setPicked] = useState(null); // اختيار السؤال الحالي
  const [finished, setFinished] = useState(false);
  const [saved, setSaved] = useState(null); // { score, total, pct, best }

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError('');
    getDoc(doc(db, 'quizzes', id))
      .then((snap) => {
        if (cancelled) return;
        if (!snap.exists() || snap.data().published === false) { setError('هذا الاختبار غير متاح.'); return; }
        const q = { id: snap.id, ...snap.data() };
        setQuiz(q);
        setAnswers(Array((q.questions || []).length).fill(null));
        setIndex(0); setPicked(null); setFinished(false); setSaved(null);
      })
      .catch(() => { if (!cancelled) setError('تعذّر تحميل الاختبار — حاول مرة أخرى.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  const questions = quiz?.questions || [];
  const total = questions.length;
  const current = questions[index];
  const score = answers.filter((a, i) => a !== null && a === questions[i]?.correct).length;

  const choose = (k) => {
    if (picked !== null) return; // لا تغيير بعد الإجابة
    setPicked(k);
    setAnswers((prev) => prev.map((a, i) => (i === index ? k : a)));
  };

  const next = async () => {
    if (index + 1 < total) {
      setIndex(index + 1);
      setPicked(null);
      return;
    }
    // النهاية — حفظ النتيجة
    const finalScore = answers.filter((a, i) => a !== null && a === questions[i].correct).length;
    const pct = total ? Math.round((finalScore / total) * 100) : 0;
    setFinished(true);
    if (!user?.uid) { setSaved({ score: finalScore, total, pct, best: pct }); return; }
    const ref = doc(db, 'quizResults', `${user.uid}_${quiz.id}`);
    try {
      const prev = await getDoc(ref).then((s) => (s.exists() ? s.data() : null)).catch(() => null);
      const attempts = (prev?.attempts || 0) + 1;
      const isBetter = !prev || pct >= (prev.pct || 0);
      await setDoc(ref, {
        uid: user.uid,
        quizId: quiz.id,
        level: quiz.level,
        module: quiz.module,
        title: quiz.title,
        // أفضل نتيجة تبقى؛ آخر محاولة تُسجَّل دائمًا
        score: isBetter ? finalScore : prev.score,
        total,
        pct: isBetter ? pct : prev.pct,
        lastScore: finalScore,
        lastPct: pct,
        attempts,
        answers,
        finishedAt: serverTimestamp(),
      }, { merge: true });
      setSaved({ score: finalScore, total, pct, best: isBetter ? pct : prev.pct, attempts });
    } catch {
      setSaved({ score: finalScore, total, pct, best: pct, unsaved: true });
    }
  };

  const restart = () => {
    setAnswers(Array(total).fill(null));
    setIndex(0); setPicked(null); setFinished(false); setSaved(null);
  };

  const groupText = quiz
    ? quiz.level === 'bac' ? quiz.unit : TRIMESTER_LABELS[quiz.trimester] || quiz.trimester
    : '';

  return (
    <div className="qp" dir="rtl">
      <style>{css}</style>

      <div className="qp-top">
        <Link to="/app/quiz" className="qp-back">← كل الاختبارات</Link>
        {quiz && (
          <div className="qp-meta">
            <span className="qp-chip">{MODULE_LABELS[quiz.module] || quiz.module}</span>
            {groupText && <span className="qp-chip">{groupText}</span>}
            <span className="qp-chip">{LEVEL_FULL_LABELS[quiz.level] || quiz.level}</span>
          </div>
        )}
      </div>

      {loading && <div className="qp-state"><span className="qp-spinner" /> جارٍ التحميل…</div>}
      {!loading && error && <div className="qp-state qp-error">{error}</div>}

      {!loading && !error && quiz && total === 0 && (
        <div className="qp-state">هذا الاختبار لا يحتوي على أسئلة بعد.</div>
      )}

      {!loading && !error && quiz && total > 0 && !finished && (
        <div className="qp-card">
          <h1 className="qp-title">{quiz.title}</h1>
          <div className="qp-progress">
            <span>السؤال {index + 1} من {total}</span>
            <span className="qp-score-live">النقاط: {score}</span>
          </div>
          <div className="qp-bar"><span style={{ width: `${((index + (picked !== null ? 1 : 0)) / total) * 100}%` }} /></div>

          <p className="qp-question">{current.text}</p>

          <div className="qp-options">
            {current.options.map((o, k) => {
              let cls = 'qp-opt';
              if (picked !== null) {
                if (k === current.correct) cls += ' correct';
                else if (k === picked) cls += ' wrong';
                else cls += ' muted';
              }
              return (
                <button key={k} type="button" className={cls} onClick={() => choose(k)} disabled={picked !== null}>
                  <span className="qp-opt-letter">{['أ', 'ب', 'ج', 'د'][k] || k + 1}</span>
                  <span className="qp-opt-text">{o}</span>
                  {picked !== null && k === current.correct && <span className="qp-opt-mark">✓</span>}
                  {picked !== null && k === picked && k !== current.correct && <span className="qp-opt-mark">✕</span>}
                </button>
              );
            })}
          </div>

          {picked !== null && (
            <div className={`qp-feedback${picked === current.correct ? ' ok' : ' bad'}`}>
              <b>{picked === current.correct ? '✅ إجابة صحيحة' : '❌ إجابة خاطئة'}</b>
              {picked !== current.correct && (
                <span> — الصحيح: <b>{current.options[current.correct]}</b></span>
              )}
              {current.explanation && <p>{current.explanation}</p>}
            </div>
          )}

          <div className="qp-actions">
            <button type="button" className="qp-btn" onClick={next} disabled={picked === null}>
              {index + 1 < total ? 'السؤال التالي ←' : 'إنهاء وعرض النتيجة'}
            </button>
          </div>
        </div>
      )}

      {finished && (
        <div className="qp-card qp-result">
          <div className="qp-result-ico">{(saved?.pct ?? 0) >= 50 ? '🏆' : '💪'}</div>
          <h2>{(saved?.pct ?? 0) >= 80 ? 'ممتاز!' : (saved?.pct ?? 0) >= 50 ? 'أحسنت!' : 'واصل المحاولة'}</h2>
          <div className="qp-result-num">{saved?.score ?? score}<small>/{total}</small></div>
          <p className="qp-result-pct">{saved?.pct ?? 0}%</p>
          {saved && !saved.unsaved && saved.best !== undefined && (
            <p className="qp-result-sub">
              أفضل نتيجة لك: {saved.best}% · عدد المحاولات: {saved.attempts || 1}
            </p>
          )}
          {saved?.unsaved && <p className="qp-result-sub">لم تُحفظ النتيجة (تحقق من الاتصال).</p>}
          {!saved && <p className="qp-result-sub">جارٍ حفظ النتيجة…</p>}

          <div className="qp-review">
            {questions.map((q, i) => {
              const ok = answers[i] === q.correct;
              return (
                <div className={`qp-review-row${ok ? ' ok' : ' bad'}`} key={i}>
                  <span className="qp-review-n">{i + 1}</span>
                  <span className="qp-review-q">{q.text}</span>
                  <span className="qp-review-mark">{ok ? '✓' : '✕'}</span>
                </div>
              );
            })}
          </div>

          <div className="qp-actions">
            <button type="button" className="qp-btn" onClick={restart}>🔁 إعادة المحاولة</button>
            <Link to="/app/quiz" className="qp-btn ghost">العودة إلى الاختبارات</Link>
          </div>
        </div>
      )}
    </div>
  );
}

const css = `
.qp{max-width:760px;margin:0 auto;font-family:'IBM Plex Sans Arabic',sans-serif;}
.qp-top{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:16px;}
.qp-back{font-size:13px;font-weight:700;color:var(--ink-teal);border:1.5px solid var(--line);border-radius:999px;padding:8px 16px;transition:all .2s;}
.qp-back:hover{border-color:var(--gold);color:var(--crimson);}
.qp-meta{display:flex;gap:6px;flex-wrap:wrap;}
.qp-chip{font-size:11.5px;font-weight:700;color:var(--ink-teal);background:rgba(14,59,54,0.08);border-radius:999px;padding:5px 12px;}
.qp-card{background:#fffdf6;border:1.5px solid var(--line);border-radius:20px;padding:26px 28px;}
.qp-title{font-family:'Aref Ruqaa',serif;font-size:24px;color:var(--ink-teal);margin:0 0 12px;}
.qp-progress{display:flex;justify-content:space-between;font-size:12.5px;color:#5c584c;margin-bottom:6px;}
.qp-score-live{font-family:'IBM Plex Mono',monospace;color:var(--ink-teal);font-weight:700;}
.qp-bar{height:8px;border-radius:999px;background:var(--parchment-dim);overflow:hidden;margin-bottom:22px;}
.qp-bar span{display:block;height:100%;background:linear-gradient(90deg,var(--ink-teal),var(--gold));transition:width .4s;}
.qp-question{font-size:17px;font-weight:700;color:var(--text-dark);line-height:1.8;margin:0 0 18px;}
.qp-options{display:flex;flex-direction:column;gap:10px;}
.qp-opt{display:flex;align-items:center;gap:12px;text-align:right;background:#fff;border:1.5px solid var(--line);border-radius:14px;padding:13px 16px;font-family:inherit;font-size:14.5px;color:var(--text-dark);cursor:pointer;transition:all .2s;}
.qp-opt:hover:not(:disabled){border-color:var(--gold);transform:translateX(-2px);}
.qp-opt:disabled{cursor:default;}
.qp-opt-letter{width:30px;height:30px;border-radius:50%;background:var(--parchment-dim);color:var(--ink-teal);font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:13px;}
.qp-opt-text{flex:1;line-height:1.6;}
.qp-opt-mark{font-weight:800;font-size:16px;}
.qp-opt.correct{border-color:#2e8b57;background:rgba(46,139,87,.08);color:#1f6b41;}
.qp-opt.correct .qp-opt-letter{background:#2e8b57;color:#fff;}
.qp-opt.wrong{border-color:#B23A2E;background:rgba(178,58,46,.07);color:#8c2a20;}
.qp-opt.wrong .qp-opt-letter{background:#B23A2E;color:#fff;}
.qp-opt.muted{opacity:.55;}
.qp-feedback{margin-top:16px;border-radius:12px;padding:12px 16px;font-size:13.5px;line-height:1.7;}
.qp-feedback.ok{background:rgba(46,139,87,.1);border:1px solid rgba(46,139,87,.3);color:#1f6b41;}
.qp-feedback.bad{background:rgba(178,58,46,.08);border:1px solid rgba(178,58,46,.3);color:#8c2a20;}
.qp-feedback p{margin:6px 0 0;color:var(--text-dark);}
.qp-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:22px;}
.qp-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:0;cursor:pointer;background:var(--ink-teal);color:var(--parchment);font-family:inherit;font-weight:700;font-size:14px;padding:12px 26px;border-radius:999px;transition:all .2s;}
.qp-btn:hover:not(:disabled){background:var(--ink-teal-deep);transform:translateY(-1px);}
.qp-btn:disabled{opacity:.5;cursor:not-allowed;}
.qp-btn.ghost{background:transparent;border:1.5px solid var(--line);color:var(--ink-teal);}
.qp-btn.ghost:hover{border-color:var(--gold);}
.qp-result{text-align:center;}
.qp-result-ico{font-size:52px;}
.qp-result h2{font-family:'Aref Ruqaa',serif;font-size:26px;color:var(--ink-teal);margin:6px 0 4px;}
.qp-result-num{font-family:'Aref Ruqaa',serif;font-size:48px;color:var(--ink-teal);line-height:1.1;}
.qp-result-num small{font-size:20px;color:#8a7a4e;}
.qp-result-pct{font-family:'IBM Plex Mono',monospace;font-size:16px;color:var(--gold);font-weight:700;margin:4px 0;}
.qp-result-sub{font-size:13px;color:#5c584c;margin:4px 0 0;}
.qp-review{margin-top:20px;text-align:right;display:flex;flex-direction:column;gap:6px;}
.qp-review-row{display:flex;align-items:center;gap:10px;border-radius:10px;padding:9px 12px;font-size:13px;}
.qp-review-row.ok{background:rgba(46,139,87,.08);color:#1f6b41;}
.qp-review-row.bad{background:rgba(178,58,46,.07);color:#8c2a20;}
.qp-review-n{width:24px;height:24px;border-radius:50%;background:rgba(0,0,0,.06);display:flex;align-items:center;justify-content:center;font-size:11.5px;font-weight:700;flex-shrink:0;}
.qp-review-q{flex:1;color:var(--text-dark);line-height:1.5;}
.qp-review-mark{font-weight:800;}
.qp-result .qp-actions{justify-content:center;}
.qp-state{display:flex;align-items:center;justify-content:center;gap:10px;padding:50px 20px;color:#8a7a4e;font-size:14px;}
.qp-error{color:#8c2a20;}
.qp-spinner{display:inline-block;width:18px;height:18px;border:3px solid rgba(14,59,54,0.2);border-top-color:var(--ink-teal);border-radius:50%;animation:qp-spin .7s linear infinite;}
@keyframes qp-spin{to{transform:rotate(360deg);}}
@media(max-width:520px){.qp-card{padding:20px 16px;}.qp-title{font-size:21px;}}
`;
