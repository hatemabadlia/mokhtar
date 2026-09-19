import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams, useOutletContext } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { db } from '../../firebase/config';
import { fetchFileUrl, hasR2File } from '../../lib/media';
import { MODULE_LABELS, LEVEL_FULL_LABELS, TRIMESTER_LABELS } from '../../data/platform';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const TYPE_LABELS = { exam: 'اختبار', quiz: 'فرض' };
const ZOOMS = [0.75, 1, 1.25, 1.5, 2];

/**
 * قارئ الامتحان داخل الموقع — /app/exams/:id
 * يرسم صفحات PDF على canvas (PDF.js) بدل فتح الملف أو تحميله:
 * لا زر تحميل، بلا قائمة سياق، مع علامة مائية خفيفة ببريد الطالب.
 * الملف نفسه يُقرأ من R2 عبر الـ Worker (pdfURL).
 */
export default function ExamViewer() {
  const { id } = useParams();
  const { user } = useOutletContext() || {};

  const [exam, setExam] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [pdf, setPdf] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [rendered, setRendered] = useState(0);
  const [zoom, setZoom] = useState(1);
  const pagesRef = useRef(null);

  // 1) بيانات الامتحان من Firestore
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    getDoc(doc(db, 'exams', id))
      .then((snap) => {
        if (cancelled) return;
        if (!snap.exists()) setError('هذا الموضوع غير موجود.');
        else setExam({ id: snap.id, ...snap.data() });
      })
      .catch(() => {
        if (!cancelled) setError('تعذّر تحميل الموضوع — حاول مرة أخرى.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // 2) رابط الملف: ملفات R2 تحتاج رابطًا موقّعًا من الـ Worker (مربوطًا بحساب الطالب)،
  //    الملفات القديمة لها pdfURL مباشر.
  const [fileUrl, setFileUrl] = useState('');
  useEffect(() => {
    if (!exam) return;
    let cancelled = false;
    setFileUrl('');
    if (!hasR2File(exam)) {
      if (exam.pdfURL) setFileUrl(exam.pdfURL);
      return undefined;
    }
    fetchFileUrl(exam.id)
      .then((d) => {
        if (!cancelled) setFileUrl(d.url);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.code === 'auth'
          ? 'انتهت جلستك — أعد تسجيل الدخول لعرض الموضوع.'
          : 'تعذّر تجهيز الملف — تحقق من الاتصال ثم أعد تحميل الصفحة.');
      });
    return () => {
      cancelled = true;
    };
  }, [exam]);

  // 3) تحميل ملف PDF
  useEffect(() => {
    if (!fileUrl) return;
    let cancelled = false;
    let task = null;
    setPdf(null);
    setNumPages(0);
    setRendered(0);
    task = pdfjsLib.getDocument({ url: fileUrl, withCredentials: false });
    task.promise
      .then((d) => {
        if (cancelled) return;
        setPdf(d);
        setNumPages(d.numPages);
      })
      .catch(() => {
        if (!cancelled) setError('تعذّر فتح ملف الموضوع.');
      });
    return () => {
      cancelled = true;
      task?.destroy?.();
    };
  }, [fileUrl]);

  // 4) رسم كل الصفحات (تمرير متواصل) — يُعاد عند تغيير التكبير
  useEffect(() => {
    if (!pdf || !pagesRef.current) return;
    let cancelled = false;
    const container = pagesRef.current;
    container.innerHTML = '';
    setRendered(0);

    (async () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      // عرض الصفحة يلائم عرض الحاوية × التكبير
      const maxWidth = Math.max(280, container.clientWidth - 24);
      for (let n = 1; n <= pdf.numPages; n++) {
        if (cancelled) return;
        const page = await pdf.getPage(n);
        const base = page.getViewport({ scale: 1 });
        const scale = (maxWidth / base.width) * zoom;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.className = 'ev-page';
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        const wrap = document.createElement('div');
        wrap.className = 'ev-page-wrap';
        wrap.dataset.page = String(n);
        wrap.appendChild(canvas);
        container.appendChild(wrap);

        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        await page.render({ canvasContext: ctx, viewport }).promise;
        if (!cancelled) setRendered(n);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pdf, zoom]);

  const zoomIn = () => setZoom((z) => ZOOMS[Math.min(ZOOMS.indexOf(z) + 1, ZOOMS.length - 1)] ?? z);
  const zoomOut = () => setZoom((z) => ZOOMS[Math.max(ZOOMS.indexOf(z) - 1, 0)] ?? z);

  const groupText = exam
    ? exam.level === 'bac'
      ? exam.unit
      : TRIMESTER_LABELS[exam.trimester] || exam.trimester
    : '';

  const watermark = user?.email || user?.displayName || 'منصة المخ';

  return (
    <div className="ev" dir="rtl" onContextMenu={(e) => e.preventDefault()}>
      <style>{css}</style>

      <div className="ev-top">
        <Link to="/app/exams" className="ev-back">← العودة إلى المواضيع</Link>
        {exam && (
          <div className="ev-meta">
            <span className="ev-chip">{TYPE_LABELS[exam.type] || exam.type}</span>
            <span className="ev-chip">{MODULE_LABELS[exam.module] || exam.module}</span>
            {groupText && <span className="ev-chip">{groupText}</span>}
            <span className="ev-chip">{LEVEL_FULL_LABELS[exam.level] || exam.level}</span>
          </div>
        )}
      </div>

      {exam && <h1 className="ev-title">{exam.title}</h1>}
      {exam?.description && <p className="ev-desc">{exam.description}</p>}

      {loading && <div className="ev-state"><span className="ev-spinner" /> جارٍ التحميل…</div>}
      {!loading && error && <div className="ev-state ev-error">{error}</div>}

      {!loading && !error && exam && (
        <>
          <div className="ev-toolbar">
            <div className="ev-zoom">
              <button type="button" onClick={zoomOut} disabled={zoom === ZOOMS[0]} aria-label="تصغير">−</button>
              <span>{Math.round(zoom * 100)}%</span>
              <button type="button" onClick={zoomIn} disabled={zoom === ZOOMS[ZOOMS.length - 1]} aria-label="تكبير">+</button>
            </div>
            <span className="ev-count">
              {numPages ? `${rendered}/${numPages} صفحة` : 'جارٍ فتح الملف…'}
            </span>
          </div>

          <div className="ev-stage">
            <div className="ev-watermark" aria-hidden="true">
              {Array.from({ length: 12 }).map((_, i) => (
                <span key={i}>{watermark}</span>
              ))}
            </div>
            <div className="ev-pages" ref={pagesRef} />
            {numPages > 0 && rendered < numPages && (
              <div className="ev-progress">جارٍ عرض الصفحات… {rendered}/{numPages}</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const css = `
.ev{max-width:980px;margin:0 auto;font-family:'IBM Plex Sans Arabic',sans-serif;-webkit-user-select:none;user-select:none;}
.ev-top{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px;}
.ev-back{font-size:13px;font-weight:700;color:var(--ink-teal);border:1.5px solid var(--line);border-radius:999px;padding:8px 16px;transition:all .2s;}
.ev-back:hover{border-color:var(--gold);color:var(--crimson);}
.ev-meta{display:flex;gap:6px;flex-wrap:wrap;}
.ev-chip{font-size:11.5px;font-weight:700;color:var(--ink-teal);background:rgba(14,59,54,0.08);border-radius:999px;padding:5px 12px;}
.ev-title{font-family:'Aref Ruqaa',serif;font-size:26px;color:var(--ink-teal);margin:0 0 6px;}
.ev-desc{font-size:13.5px;color:#5c584c;line-height:1.8;margin:0 0 14px;}

.ev-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;
  background:var(--parchment-dim);border:1px solid var(--line);border-radius:12px;padding:8px 12px;margin-bottom:12px;}
.ev-zoom{display:flex;align-items:center;gap:8px;}
.ev-zoom button{width:32px;height:32px;border-radius:8px;border:1.5px solid var(--line);background:#fffdf6;font-size:18px;
  font-weight:700;color:var(--ink-teal);cursor:pointer;font-family:inherit;line-height:1;}
.ev-zoom button:hover:not(:disabled){border-color:var(--gold);}
.ev-zoom button:disabled{opacity:.4;cursor:not-allowed;}
.ev-zoom span{font-family:'IBM Plex Mono',monospace;font-size:12px;min-width:44px;text-align:center;color:var(--ink-teal);}
.ev-count{font-size:12.5px;color:#5c584c;}

.ev-stage{position:relative;background:#e9e2d2;border:1px solid var(--line);border-radius:14px;padding:12px;overflow:auto;min-height:320px;}
.ev-pages{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:14px;}
.ev-page-wrap{background:#fff;box-shadow:0 6px 22px rgba(28,26,21,0.14);border-radius:4px;overflow:hidden;line-height:0;}
.ev-page{display:block;pointer-events:none;}
.ev-watermark{position:absolute;inset:0;z-index:2;pointer-events:none;overflow:hidden;
  display:grid;grid-template-columns:repeat(3,1fr);align-content:space-around;justify-items:center;}
.ev-watermark span{font-family:'IBM Plex Mono',monospace;font-size:13px;color:rgba(14,59,54,0.09);transform:rotate(-28deg);white-space:nowrap;direction:ltr;}
.ev-progress{position:sticky;bottom:8px;z-index:3;margin:10px auto 0;width:fit-content;font-size:12px;color:var(--parchment);
  background:var(--ink-teal);border-radius:999px;padding:6px 14px;}

.ev-state{display:flex;align-items:center;justify-content:center;gap:10px;padding:50px 20px;color:#8a7a4e;font-size:14px;}
.ev-error{color:#8c2a20;}
.ev-spinner{display:inline-block;width:18px;height:18px;border:3px solid rgba(14,59,54,0.2);border-top-color:var(--ink-teal);border-radius:50%;animation:ev-spin .7s linear infinite;}
@keyframes ev-spin{to{transform:rotate(360deg);}}
@media print{.ev{display:none;}}
@media(max-width:520px){.ev-title{font-size:22px;}.ev-stage{padding:8px;}}
`;
