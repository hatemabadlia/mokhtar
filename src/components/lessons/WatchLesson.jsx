import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { fetchLessonById, fetchLessonsByLevel } from '../../firebase/lessonsService';
import {
  groupKeyForLesson,
  groupValueForLesson,
  isLessonUnlocked,
  persistUnlock,
} from '../../lib/access';
import {
  LEVEL_FULL_LABELS,
  MODULE_LABELS,
  MODULE_ICONS,
  TRIMESTER_LABELS,
  lessonCreatedAtMs,
} from '../../data/platform';
import CodeForm from './CodeForm';
import { bunnyEmbedUrl, bunnyThumbnailUrl } from '../../lib/bunny';
import useAuth from '../../hooks/useAuth';
import { markLessonWatched } from '../../utils/watchHistory';
import './lessons.css';

/**
 * صفحة مشاهدة الدرس — /watch/:id
 * تعيد التحقق قبل عرض المشغّل بمفتاح مادة المجموعة (يشمل المادة):
 *   غير البكالوريا → level_module_trimester
 *   البكالوريا     → level_module_unit
 * رمز «مادة كاملة» (level_module) يفتح أيضًا كل دروس المادة.
 */
export default function WatchLesson() {
  const { id } = useParams();
  const { user } = useAuth();
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [justUnlocked, setJustUnlocked] = useState(false);
  const [siblings, setSiblings] = useState([]);
  const [unlockedGroups, setUnlockedGroups] = useState([]);

  // مفاتيح الفتح المحفوظة في Firestore (users/{uid}.unlockedGroups).
  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;
    getDoc(doc(db, 'users', user.uid))
      .then((snap) => {
        if (!cancelled && snap.exists() && Array.isArray(snap.data().unlockedGroups)) {
          setUnlockedGroups(snap.data().unlockedGroups);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setJustUnlocked(false);
    fetchLessonById(id)
      .then((l) => {
        if (!cancelled) setLesson(l);
      })
      .catch(() => {
        if (!cancelled) setError('تعذّر تحميل الدرس — حاول مرة أخرى.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // جلب دروس نفس المستوى لعرض «دروس أخرى في نفس المجموعة» وتنقّل السابق/التالي.
  useEffect(() => {
    if (!lesson?.level) return;
    let cancelled = false;
    setSiblings([]);
    fetchLessonsByLevel(lesson.level)
      .then((items) => {
        if (!cancelled) setSiblings(items);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [lesson?.level]);

  const levelLabel = lesson ? LEVEL_FULL_LABELS[lesson.level] || lesson.level : '';
  const modLabel = lesson ? MODULE_LABELS[lesson.module] || lesson.module : '';
  const triLabel =
    lesson && lesson.trimester ? TRIMESTER_LABELS[lesson.trimester] || lesson.trimester : null;
  const groupName =
    lesson && lesson.level === 'bac'
      ? lesson.unit || 'دروس أخرى'
      : triLabel || 'هذه المجموعة';
  const groupKey = lesson ? groupKeyForLesson(lesson) : '';
  const unlocked = (lesson ? isLessonUnlocked(lesson, { unlockedGroups }) : false) || justUnlocked;
  const backTo = '/app/lessons';
  // New-style lessons are hosted on Bunny Stream (videoId only); older ones
  // have a direct Firebase Storage URL.
  const embedUrl = lesson?.bunnyVideoId ? bunnyEmbedUrl(lesson.bunnyVideoId) : '';
  const posterUrl = lesson?.bunnyVideoId
    ? bunnyThumbnailUrl(lesson.bunnyVideoId)
    : (lesson?.thumbnailURL || undefined);

  // سجّل الدرس كمشاهَد محليًا بمجرد عرضه مفتوحًا (بعد فك الرمز) —
  // يستخدمه «سجل المشاهدة» في صفحة التقدّم.
  // هذا التأثير يقع بعد تعريف unlocked لأن مصفوفة الاعتماديات تقرأ
  // قيمة unlocked أثناء الرسم — لا يُمكن قراءتها قبل تهيئتها في جسم الدالة.
  useEffect(() => {
    if (user && lesson && unlocked && !loading && !error) {
      markLessonWatched(user.uid, lesson.id);
    }
  }, [user, lesson, unlocked, loading, error]);

  const isBac = lesson?.level === 'bac';

  // دروس نفس المادة ونفس المجموعة (الفصل أو الوحدة) — مرتبة من الأقدم للأحدث لتنقّل سابق/التالي.
  const groupOrder = useMemo(() => {
    if (!lesson) return [];
    const sameGroup = (l) =>
      l.module === lesson.module &&
      (lesson.level === 'bac'
        ? String(l.unit || '').trim() === String(lesson.unit || '').trim()
        : l.trimester === lesson.trimester);
    return siblings
      .filter((l) => l.id !== lesson.id && sameGroup(l))
      .sort((a, b) => lessonCreatedAtMs(a) - lessonCreatedAtMs(b));
  }, [lesson, siblings]);

  const idx = groupOrder.findIndex((l) => l.id === lesson?.id);
  const prevLesson = idx > 0 ? groupOrder[idx - 1] : null;
  const nextLesson = idx >= 0 && idx < groupOrder.length - 1 ? groupOrder[idx + 1] : null;

  // الدروس الأخرى في نفس المجموعة (أحدث أولًا للعرض العام).
  const related = useMemo(() => [...groupOrder].reverse(), [groupOrder]);

  return (
    <div className="najh" dir="rtl" lang="ar">
      <header className="naj-top">
        <div className="naj-wrap naj-top-inner">
          <Link to="/" className="naj-brand">
            <span className="naj-brand-mark">م</span>
            <span className="naj-brand-text">المخ</span>
          </Link>
          {levelLabel && <span className="naj-top-chip">{levelLabel}</span>}
        </div>
      </header>

      <main className="naj-wrap naj-watch">
        <Link to={backTo} className="naj-back">→ العودة إلى {levelLabel || 'الرئيسية'}</Link>

        {loading && (
          <div className="naj-state">
            <span className="naj-spinner big" />
            <p>جارٍ التحميل</p>
          </div>
        )}

        {!loading && error && (
          <div className="naj-state">
            <p className="naj-msg naj-msg-error" style={{ maxWidth: 460 }}>{error}</p>
            <Link className="naj-btn naj-btn-gold" to={backTo}>العودة</Link>
          </div>
        )}

        {!loading && !error && !lesson && (
          <div className="naj-state">
            <span className="naj-state-ico">🔍</span>
            <h1>الدرس غير موجود</h1>
            <p className="naj-empty">ربما حُذف الدرس أو أن الرابط غير صحيح.</p>
            <Link className="naj-btn naj-btn-gold" to={backTo}>العودة</Link>
          </div>
        )}

        {!loading && !error && lesson && unlocked && (
          <>
            <div className="naj-video-wrap">
              {embedUrl ? (
                <iframe
                  className="naj-video"
                  src={embedUrl}
                  title={lesson.title}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : (
                <video
                  className="naj-video"
                  controls
                  controlsList="nodownload"
                  preload="metadata"
                  poster={posterUrl}
                  src={lesson.videoURL}
                />
              )}
              <span className="naj-live-chip">
                <span className="live-dot" />
                مشاهدة الآن
              </span>
            </div>

            <div className="naj-watch-head">
              <div>
                <h1>{lesson.title}</h1>
                <div className="naj-watch-badges">
                  <span className="naj-badge naj-badge-level">🎓 {levelLabel}</span>
                  <span className="naj-badge naj-badge-module">
                    {MODULE_ICONS[lesson.module] || '📘'} {modLabel}
                  </span>
                  <span className="naj-badge naj-badge-tri">🗂️ {groupName}</span>
                </div>
              </div>
              <Link to={backTo} className="naj-btn naj-btn-ghost naj-back-btn">
                كل الدروس
              </Link>
            </div>

            <div className="naj-watch-meta">
              <div className="naj-meta-card">
                <span className="naj-meta-ico">🎓</span>
                <span className="naj-meta-k">المستوى</span>
                <span className="naj-meta-v">{levelLabel || '—'}</span>
              </div>
              <div className="naj-meta-card">
                <span className="naj-meta-ico">{MODULE_ICONS[lesson.module] || '📘'}</span>
                <span className="naj-meta-k">المادة</span>
                <span className="naj-meta-v">{modLabel || '—'}</span>
              </div>
              <div className="naj-meta-card">
                <span className="naj-meta-ico">🗂️</span>
                <span className="naj-meta-k">{isBac ? 'الوحدة' : 'الفصل'}</span>
                <span className="naj-meta-v">{groupName || '—'}</span>
              </div>
              <div className="naj-meta-card">
                <span className="naj-meta-ico">✅</span>
                <span className="naj-meta-k">الحالة</span>
                <span className="naj-meta-v">مكتمل المشاهدة</span>
              </div>
            </div>

            {lesson.description && (
              <div className="naj-watch-box">
                <div className="naj-box-title">📄 عن هذا الدرس</div>
                <p className="naj-watch-desc">{lesson.description}</p>
              </div>
            )}

            <div className="naj-watch-box">
              <div className="naj-box-title">💡 نصيحة للدراسة</div>
              <p className="naj-watch-desc">
                بعد المشاهدة، ثبّت المعلومة بحل اختبار قصير في «الاختبارات» وتدرّب على مواضيع
                سنوات سابقة في «التمارين والامتحانات» — المشاهدة وحدها ترسّخ نصف الفهم فقط.
              </p>
            </div>

            {related.length > 0 && (
              <div className="naj-watch-box">
                <div className="naj-box-sub">
                  <div className="naj-box-title">
                    📚 دروس أخرى في {isBac ? 'نفس الوحدة' : 'نفس الفصل'}
                  </div>
                  <span className="naj-box-count">{related.length} درس</span>
                </div>
                <ul className="naj-related-list">
                  {related.map((r) => (
                    <li key={r.id}>
                      <Link to={`/watch/${r.id}`} className="naj-related-item">
                        <span className="naj-related-play">▶</span>
                        <span className="naj-related-name">{r.title}</span>
                        <span className="naj-related-mod">
                          {MODULE_ICONS[r.module] || ''} {MODULE_LABELS[r.module] || ''}
                        </span>
                        <span className="naj-related-arrow">←</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="naj-watch-nav">
              {prevLesson ? (
                <Link to={`/watch/${prevLesson.id}`} className="naj-nav-card">
                  <span className="naj-nav-dir">→ الدرس السابق</span>
                  <span className="naj-nav-title">{prevLesson.title}</span>
                </Link>
              ) : (
                <span className="naj-nav-card is-empty">→ الدرس السابق</span>
              )}
              {nextLesson ? (
                <Link to={`/watch/${nextLesson.id}`} className="naj-nav-card is-next">
                  <span className="naj-nav-dir">الدرس التالي ←</span>
                  <span className="naj-nav-title">{nextLesson.title}</span>
                </Link>
              ) : (
                <span className="naj-nav-card is-empty is-next">الدرس التالي ←</span>
              )}
            </div>
          </>
        )}

        {!loading && !error && lesson && !unlocked && (
          <div className="naj-gate">
            {posterUrl && (
              <img src={posterUrl} alt="" className="naj-gate-thumb" />
            )}
            <div className="naj-gate-ico">🔒</div>
            <h1>{lesson.title}</h1>
            <div className="naj-gate-badges">
              <span className="naj-badge naj-badge-level">🎓 {levelLabel}</span>
              <span className="naj-badge naj-badge-module">
                {MODULE_ICONS[lesson.module] || '📘'} {modLabel}
              </span>
              {triLabel && <span className="naj-badge naj-badge-tri">🗂️ {triLabel}</span>}
            </div>
            {groupKey ? (
              <>
                <p>
                  هذا الدرس ضمن مادة «{modLabel}» (مجموعة «{groupName}») وهي مقفلة حاليًا.
                  أدخل رمز الوصول الخاص بمادة {modLabel} لبدء المشاهدة.
                </p>
                <CodeForm
                  groupLabel={`${modLabel} · ${groupName}`}
                  scope={{
                    level: lesson.level,
                    module: lesson.module,
                    groupValue: groupValueForLesson(lesson),
                    isBac: lesson.level === 'bac',
                  }}
                  onSuccess={(res) => {
                    persistUnlock(user, res.key);
                    setJustUnlocked(true);
                  }}
                />
                <div className="naj-gate-feats">
                  <span>🎬 مشاهدة فورية</span>
                  <span>✅ يظهر في صفحة تقدّمك</span>
                  <span>📚 يفتح دروس المادة {modLabel} فقط — لا يؤثر على المادة الأخرى</span>
                </div>
              </>
            ) : (
              <p className="naj-empty">
                لا يمكن تحديد مجموعة هذا الدرس تلقائيًا.
                تصفّح الدروس من الصفحة الرئيسية لطلب الوصول الصحيح.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}