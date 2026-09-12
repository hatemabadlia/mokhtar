import React from 'react';
import { persistUnlock } from '../../lib/access';
import Modal from './Modal';
import CodeForm from './CodeForm';
import './lessons.css';

/**
 * نافذة "لدي رمز" — تُفتح لمادة واحدة (أو مجموعة داخل المادة) وتُدخل مفتاحها فقط:
 *   level_module_trimester | level_module_unit | level_module (مادة كاملة)
 * group = { label, moduleLabel, levelLabel, level, module, field, fieldValue, isBac, key, moduleKey }
 * user: المستخدم المسجّل (لحفظ الفتح في Firestore) — onUnlocked(key) يُعلم الصفحة الأم.
 */
export default function CodeModal({ group, user, onUnlocked, onClose }) {
  return (
    <Modal title="إدخال رمز الوصول" subtitle={`${group.levelLabel} · ${group.moduleLabel} · ${group.label}`} onClose={onClose}>
      <p className="naj-modal-hint">
        كل مادة لها رمزها الخاص — أدخل الرمز الذي حصلت عليه لهذه المادة فقط.
      </p>
      <CodeForm
        groupLabel={`${group.moduleLabel} · ${group.label}`}
        scope={{
          level: group.level,
          module: group.module,
          groupValue: group.fieldValue,
          isBac: group.isBac,
        }}
        onCancel={onClose}
        onSuccess={async (res) => {
          // localStorage فورًا + Firestore (users/{uid}.unlockedGroups) حتى يبقى الفتح على كل الأجهزة
          await persistUnlock(user, res.key);
          onUnlocked?.(res.key);
          onClose();
        }}
      />
    </Modal>
  );
}