import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { fetchLessonsByLevel, fetchMyAccessRequests } from '../../firebase/lessonsService';
import { groupKey, isGroupUnlocked as isGroupUnlockedLocal } from '../../firebase/access';
import { syncLocalUnlocks } from '../../lib/access';
import useAuth from '../../hooks/useAuth';
import {
  LEVEL_FULL_LABELS,
  TRIMESTERS,
  TRIMESTER_LABELS,
  MODULE_LABELS,
  MODULE_ICONS,
  lessonCreatedAtMs,
  unitSortValue,
} from '../../data/platform';
import GroupSection from './GroupSection';
import RequestModal from './RequestModal';
import CodeModal from './CodeModal';
import './lessons.css';

const MODULES = ['math', 'physics'];

/**
 * محتوى دروس مستوى معيّن — يُستخدم في:
 * - داخل لوحة التحكم  /app/lessons  (DashboardLessons)
 *
 * تعرض مادة واحدة في كل مرة (تبويب: رياضيات / فيزياء) — لا تظهر
 * الرياضيات والفيزياء معًا أبدًا، ولكل مادة رموز وصول مستقلة.
 *
 * - غير البكالوريا (4am/1as/2as): قسم لكل فصل دراسي (t1/t2/t3) داخل المادة.
 * - البكالوريا (bac): قسم لكل وحدة (من حقل unit) داخل المادة.
 * الوصول لكل قسم مستقل بمفتاح level_module_<group>، ورمز «مادة كاملة»
 * (بلا فصل/وحدة) يفتح كل دروس المادة بمفتاح level_module.
 *
 * level: صيغة الدروس في Firestore ('4am' | '1as' | '2as' | 'bac').
 * embedded: إخفاء الشريط العلوي وزر الرجوع عند العرض داخل لوحة التحكم.
 */
export default function LessonsContent({ level, embedded = false }) {
  const valid = !!LEVEL_FULL_LABELS[level];
  const isBac = level === 'bac';

  const [module, setModule] = useState('math');
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [modal, setModal] = useState(null); // { type: 'request' | 'code', group }

  // مفاتيح الفتح المحفوظة في Firestore (users/{uid}.unlockedGroups) — تعمل على كل الأجهزة،
  // بينما localStorage يبقى نسخة محلية سريعة (انظر isGroupUnlocked).
  const { user } = useAuth();
  const [unlockedGroups, setUnlockedGroups] = useState([]);
  // طلبات الوصول قيد المراجعة لهذا المستخدم: groupKey → طلب
  const [pendingRequests, setPendingRequests] = useState({});

  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;
    getDoc(doc(db, 'users', user.uid))
      .then((snap) => {
        if (cancelled) return;
        const groups = snap.exists() && Array.isArray(snap.data().unlockedGroups) ? snap.data().unlockedGroups : [];
        syncLocalUnlocks(groups); // Firestore هو المصدر — النسخة المحلية تتبعه
        setUnlockedGroups(groups);
      })
      .catch(() => {
        // دون اتصال / صلاحيات — نعتمد على localStorage فقط
      });
    fetchMyAccessRequests(user.uid)
      .then((items) => {
        if (cancelled) return;
        const map = {};
        items.forEach((r) => {
          if (r.status === 'pending' && r.groupKey) map[r.groupKey] = r;
        });
        setPendingRequests(map);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  useEffect(() => {
    if (!valid) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchLessonsByLevel(level)
      .then((items) => {
        if (cancelled) return;
        const sorted = [...items].sort((a, b) => lessonCreatedAtMs(b) - lessonCreatedAtMs(a));
        setLessons(sorted);
      })
      .catch(() => {
        if (!cancelled) setError('تعذّر تحميل الدروس — حاول مرة أخرى.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [level, valid, reloadKey]);

  // المادة المختارة فقط — لا نعرض مادتين معًا.
  const moduleLessons = useMemo(() => lessons.filter((l) => l.module === module), [lessons, module]);

  const sections = useMemo(() => {
    const moduleKey = `${level}_${module}`;
    if (isBac) {
      const map = new Map();
      for (const l of moduleLessons) {
        const unit = l.unit && String(l.unit).trim() ? String(l.unit).trim() : 'دروس أخرى';
        if (!map.has(unit)) map.set(unit, []);
        map.get(unit).push(l);
      }
      return Array.from(map.entries())
        .map(([unit, items]) => ({
          type: 'unit',
          label: unit,
          emptyText: 'لا توجد دروس في هذه الوحدة بعد',
          key: groupKey(level, module, unit),
          moduleKey,
          field: 'unit',
          fieldValue: unit,
          lessons: items,
        }))
        .sort((a, b) => unitSortValue(a.label) - unitSortValue(b.label));
    }

    return TRIMESTERS.map((t) => ({
      type: 'trimester',
      label: TRIMESTER_LABELS[t],
      emptyText: `لا توجد دروس في ${TRIMESTER_LABELS[t]} بعد`,
      key: groupKey(level, module, t),
      moduleKey,
      field: 'trimester',
      fieldValue: t,
      lessons: moduleLessons.filter((l) => l.trimester === t),
    }));
  }, [moduleLessons, isBac, level, module]);

  const levelLabel = LEVEL_FULL_LABELS[level] || '';
  const moduleLabel = MODULE_LABELS[module] || module;

  const openRequest = (group) =>
    setModal({ type: 'request', group: { ...group, level, levelLabel, module, moduleLabel, isBac } });
  const openCode = (group) =>
    setModal({ type: 'code', group: { ...group, level, levelLabel, module, moduleLabel, isBac } });

  // «المادة كاملة»: مفتاح level_module يفتح كل الفصول/الوحدات بمرة واحدة
  const moduleKeyValue = groupKey(level, module);
  const moduleGroup = {
    type: 'module',
    label: isBac ? 'كل الوحدات' : 'كل الفصول',
    key: moduleKeyValue,
    moduleKey: moduleKeyValue,
    field: null,
    fieldValue: '',
    lessons: [],
    emptyText: '',
  };
  const moduleUnlocked = isGroupUnlockedLocal(moduleKeyValue) || unlockedGroups.includes(moduleKeyValue);
  const modulePending = pendingRequests[moduleKeyValue] || null;

  if (!valid) return null;

  return (
    <div className={`najh${embedded ? ' najh-embedded' : ''}`} dir="rtl" lang="ar">
      {!embedded && (
        <header className="naj-top">
          <div className="naj-wrap naj-top-inner">
            <Link to="/" className="naj-brand">
              <span className="naj-brand-mark">م</span>
              <span className="naj-brand-text">المخ</span>
            </Link>
            <span className="naj-top-chip">{levelLabel}</span>
          </div>
        </header>
      )}

      <main className="naj-wrap">
        <div className="naj-page-head">
          {!embedded && (
            <Link to="/" className="naj-back">
              ← الرئيسية
            </Link>
          )}
          <h1>{levelLabel}</h1>
          <p>
            اختر المادة ثم افتح القسم برمزها — دروس الرياضيات والفيزياء منفصلة، ولكل مادة رمز خاص بها.
          </p>
          {!loading && !error && (
            <span className="naj-count">{moduleLessons.length} درس في {moduleLabel}</span>
          )}

          <div className="naj-module-tabs">
            {MODULES.map((m) => (
              <button
                key={m}
                type="button"
                className={`naj-module-tab${module === m ? ' active' : ''}`}
                onClick={() => setModule(m)}
              >
                {MODULE_ICONS[m]} {MODULE_LABELS[m]}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="naj-state">
            <span className="naj-spinner big" />
            <p>جارٍ التحميل</p>
          </div>
        )}

        {!loading && error && (
          <div className="naj-state">
            <p className="naj-msg naj-msg-error" style={{ maxWidth: 460 }}>
              {error}
            </p>
            <button
              type="button"
              className="naj-btn naj-btn-gold"
              onClick={() => setReloadKey((k) => k + 1)}
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        {!loading && !error && moduleLessons.length === 0 && (
          <div className="naj-state">
            <span className="naj-state-ico">📚</span>
            <p className="naj-empty">
              لا توجد دروس في {moduleLabel} لهذا المستوى بعد — ترقّب قريبًا.
            </p>
          </div>
        )}

        {!loading && !error && moduleLessons.length > 0 && (
          <div className={`naj-pass${moduleUnlocked ? ' open' : ''}`}>
            <div className="naj-pass-ico">{moduleUnlocked ? '✅' : '🎁'}</div>
            <div className="naj-pass-body">
              <h3>
                {moduleUnlocked
                  ? `${moduleLabel} كاملة مفتوحة`
                  : `اشترك في ${moduleLabel} كاملة — ${isBac ? 'كل الوحدات' : 'كل الفصول'} برمز واحد`}
              </h3>
              <p>
                {moduleUnlocked
                  ? `لديك وصول إلى جميع ${isBac ? 'وحدات' : 'فصول'} ${moduleLabel} لهذا المستوى.`
                  : modulePending
                    ? 'طلبك للمادة كاملة قيد المراجعة — بعد تأكيد الدفع تُفتح كل الأقسام في حسابك.'
                    : `بدل طلب كل ${isBac ? 'وحدة' : 'فصل'} على حدة: رمز واحد يفتح كل دروس ${moduleLabel} (${sections.length} ${isBac ? 'وحدة' : 'فصول'}).`}
              </p>
            </div>
            {!moduleUnlocked && (
              <div className="naj-pass-actions">
                <button type="button" className="naj-btn naj-btn-ghost" onClick={() => openCode(moduleGroup)}>
                  لدي رمز المادة
                </button>
                <button type="button" className="naj-btn naj-btn-gold" onClick={() => openRequest(moduleGroup)}>
                  {modulePending ? '⏳ حالة الطلب' : 'اطلب المادة كاملة'}
                </button>
              </div>
            )}
          </div>
        )}

        {!loading && !error && moduleLessons.length > 0 && (
          <div className="naj-sections">
            {sections.map((group) => (
              <GroupSection
                key={group.key}
                group={group}
                unlockedGroups={unlockedGroups}
                pendingRequest={pendingRequests[group.key] || pendingRequests[group.moduleKey] || null}
                onRequest={openRequest}
                onCode={openCode}
              />
            ))}
          </div>
        )}
      </main>

      {modal?.type === 'request' && (
        <RequestModal
          group={modal.group}
          existingRequest={pendingRequests[modal.group.key] || null}
          onSubmitted={(key) => setPendingRequests((prev) => ({ ...prev, [key]: { status: 'pending', groupKey: key } }))}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'code' && (
        <CodeModal
          group={modal.group}
          user={user}
          onUnlocked={(key) => setUnlockedGroups((prev) => (prev.includes(key) ? prev : [...prev, key]))}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}