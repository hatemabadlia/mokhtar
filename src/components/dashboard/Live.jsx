import React from 'react';
import Placeholder from './Placeholder';
import { SERVICES } from './services';

export default function Live() {
  const s = SERVICES.find((x) => x.id === 'live');
  return (
    <Placeholder
      icon={s.icon}
      code={s.code}
      title={s.name}
      description={s.desc}
      items={['حصص مباشرة مع الأستاذ', 'أسئلة في الوقت الحقيقي', 'جدول الحصص']}
    />
  );
}