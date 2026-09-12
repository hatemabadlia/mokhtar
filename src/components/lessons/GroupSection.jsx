import React from 'react';
import { isGroupUnlocked } from '../../firebase/access';
import LessonCard from './LessonCard';
import './lessons.css';

/**
 * قسم واحد في صفحة الدروس:
 * - فصل دراسي (غير البكالوريا) أو وحدة (البكالوريا) داخل مادة واحدة.
 * يعرض حالة القسم 🔓/🔒 وأزرار "لدي رمز" و "اطلب الوصول" عندما يكون مقفلًا.
 * group = { label, level, module, moduleLabel, field, fieldValue, isBac, key, moduleKey, emptyText }
 *    key: level_module_group  —  moduleKey: level_module (فتح المادة كلها)
 * unlockedGroups: مفاتيح الفتح المحفوظة في Firestore للمستخدم (تُقرأ في LessonsContent).
 */
export default function GroupSection({ group, unlockedGroups = [], pendingRequest = null, onRequest, onCode }) {
  // مفتوح إذا وُجد المفتاح محليًا (localStorage) أو في Firestore (unlockedGroups)،
  // بمفتاح المجموعة أو بمفتاح «المادة كاملة».
  const unlocked =
    isGroupUnlocked(group.key) ||
    isGroupUnlocked(group.moduleKey) ||
    unlockedGroups.includes(group.key) ||
    unlockedGroups.includes(group.moduleKey);

  return (
    <section className={`naj-section${unlocked ? ' open' : ' locked'}`}>
      <header className="naj-section-head">
        <div className="naj-section-title">
          <h2>{group.label}</h2>
          <span className={`naj-status${unlocked ? ' open' : pendingRequest ? ' pending' : ' locked'}`}>
            {unlocked ? '🔓 مفتوح' : pendingRequest ? '⏳ قيد المراجعة' : '🔒 مقفل'}
          </span>
        </div>

        {!unlocked && (
          <div className="naj-section-actions">
            <button type="button" className="naj-btn naj-btn-ghost" onClick={() => onCode(group)}>
              لدي رمز
            </button>
            <button type="button" className="naj-btn naj-btn-gold" onClick={() => onRequest(group)}>
              {pendingRequest ? 'حالة الطلب' : 'اطلب الوصول'}
            </button>
          </div>
        )}

        {unlocked && <p className="naj-open-note">تم فتح هذا القسم — يمكنك البدء بالتعلم مباشرة 📚</p>}
      </header>

      {group.lessons.length === 0 ? (
        <p className="naj-empty">{group.emptyText}</p>
      ) : (
        <div className="naj-cards">
          {group.lessons.map((lesson) => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              unlocked={unlocked}
              onLockedClick={() => onRequest(group)}
            />
          ))}
        </div>
      )}
    </section>
  );
}