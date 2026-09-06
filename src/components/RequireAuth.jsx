import { Navigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

/**
 * حارس المصادقة — يمنع الوصول إلى المحتوى قبل تسجيل الدخول.
 * - أثناء `ready === false` يكون Firebase يستعيد الجلسة من التخزين،
 *   فنعرض شاشة تحميل بدلًا من إرجاع المستخدم إلى /auth فورًا.
 * - فقط عندما تتأكد الحالة (`ready === true`) و `user === null` نعيد
 *   التوجيه إلى /auth — أي أن إعادة تحميل الصفحة لا «تطرد» المستخدم.
 * يُستخدم لإغلاق صفحات الدروس والمشاهدة: /level/:level و /watch/:id.
 */
export default function RequireAuth({ children }) {
  const { user, ready } = useAuth();

  if (!ready) {
    return (
      <div
        dir="rtl"
        style={{
          minHeight: '100svh',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#F6EEDC',
          fontFamily: "'IBM Plex Sans Arabic', sans-serif",
        }}
      >
        <style>{`@keyframes naj-spin{to{transform:rotate(360deg);}}`}</style>
        <div style={{ textAlign: 'center', color: '#0E3B36' }}>
          <div
            style={{
              width: 42,
              height: 42,
              margin: '0 auto 14px',
              borderRadius: '50%',
              border: '3px solid rgba(14,59,54,0.2)',
              borderTopColor: '#0E3B36',
              animation: 'naj-spin .8s linear infinite',
            }}
          />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#5c584c' }}>
            جارٍ التحقق من الجلسة…
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return children;
}