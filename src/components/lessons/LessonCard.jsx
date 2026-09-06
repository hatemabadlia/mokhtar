import React from 'react';
import { Link } from 'react-router-dom';
import { MODULE_LABELS, MODULE_ICONS } from '../../data/platform';
import './lessons.css';

/**
 * بطاقة درس واحدة.
 * - مقفل: طبقة 🔒 + نقرة تفتح نافذة طلب الوصول لهذه المجموعة.
 * - مفتوح: زر "ابدأ التعلم" ينقل إلى /watch/:id.
 */
export default function LessonCard({ lesson, unlocked, onLockedClick }) {
  const modLabel = MODULE_LABELS[lesson.module] || lesson.module || 'مادة';
  const modIcon = MODULE_ICONS[lesson.module] || '📘';

  return (
    <article
      className={`naj-card${unlocked ? '' : ' locked'}`}
      onClick={unlocked ? undefined : () => onLockedClick()}
    >
      <div className="naj-card-thumb">
        {lesson.thumbnailURL ? (
          <img src={lesson.thumbnailURL} alt="" loading="lazy" />
        ) : (
          <div className="naj-thumb-fallback">🎬</div>
        )}
        {!unlocked && (
          <div className="naj-lock-overlay">
            <span className="naj-lock-ico">🔒</span>
            <span>مقفل — اضغط للوصول</span>
          </div>
        )}
      </div>

      <div className="naj-card-body">
        <div className="naj-card-badges">
          <span className="naj-badge naj-badge-module">
            {modIcon} {modLabel}
          </span>
        </div>
        <h4 className="naj-card-title">{lesson.title}</h4>
        {unlocked ? (
          <Link className="naj-btn naj-btn-gold naj-btn-block" to={`/watch/${lesson.id}`}>
            ▶ ابدأ التعلم
          </Link>
        ) : (
          <button type="button" className="naj-btn naj-btn-ghost naj-btn-block" onClick={() => onLockedClick()}>
            🔒 اضغط للوصول
          </button>
        )}
      </div>
    </article>
  );
}