import React from 'react';
import Placeholder from './Placeholder';
import { SERVICES } from './services';

export default function Quiz() {
  const s = SERVICES.find((x) => x.id === 'quiz');
  return (
    <Placeholder
      icon={s.icon}
      code={s.code}
      title={s.name}
      description={s.desc}
      items={['اختبارات قصيرة', 'تصحيح فوري', 'نتيجة فورية لكل درس']}
    />
  );
}