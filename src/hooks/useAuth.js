import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/config';

/**
 * موحّد حالة المصادقة:
 * - `ready: false` → Firebase ما زال يستعيد الجلسة من التخزين (خلال هذا الوقت
 *   لا نعرض أي صفحة محمية ولا نعيد التوجيه إلى /auth — هذا يمنع «طرد»
 *   المستخدم عند إعادة تحميل الصفحة فقط لأن الجلسة لم تُستعاد بعد).
 * - `ready: true` → الحالة الفعلية معروفة: `user` إمّا المستخدم أو null.
 */
export default function useAuth() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setReady(true);
    });
    return unsub;
  }, []);

  return { user, ready };
}