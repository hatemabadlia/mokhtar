import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
} from 'firebase/auth';

import { doc, getDoc } from 'firebase/firestore';

import { auth, db } from '../firebase/config';
import { saveUserToFirestore } from '../firebase/userService';

const toError = (code) => {
  const map = {
    'auth/email-already-in-use':
      'هذا البريد الإلكتروني مسجَّل مسبقًا. جرّب تسجيل الدخول.',
    'auth/invalid-email':
      'البريد الإلكتروني غير صحيح.',
    'auth/user-not-found':
      'لا يوجد حساب بهذا البريد الإلكتروني.',
    'auth/wrong-password':
      'كلمة المرور غير صحيحة.',
    // Firebase الحديث يُرجع هذا الرمز لأي بريد/كلمة مرور خاطئة (بدون تحديد أيهما)
    'auth/invalid-credential':
      'البريد الإلكتروني أو كلمة المرور غير صحيحة. إن كنت أنشأت حسابك عبر Google فاستعمل زر Google.',
    'auth/invalid-login-credentials':
      'البريد الإلكتروني أو كلمة المرور غير صحيحة. إن كنت أنشأت حسابك عبر Google فاستعمل زر Google.',
    'auth/missing-password':
      'أدخل كلمة المرور.',
    'auth/user-disabled':
      'هذا الحساب موقوف — تواصل معنا.',
    'auth/operation-not-allowed':
      'تسجيل الدخول بالبريد وكلمة المرور غير مفعّل في الإعدادات — تواصل مع الإدارة.',
    'auth/weak-password':
      'كلمة المرور قصيرة جدًا (6 أحرف على الأقل).',
    'auth/too-many-requests':
      'طلبات كثيرة جدًا — حاول بعد قليل.',
    'auth/popup-closed-by-user':
      'أُغلقت نافذة تسجيل الدخول قبل إكمالها.',
    'auth/popup-blocked':
      'إعدادات المتصفح تمنع النوافذ المنبثقة — اسمح بالنوافذ المنبثقة لهذا الموقع ثم أعد المحاولة.',
    'auth/network-request-failed':
      'تعذّر الاتصال — تأكد من اتصالك بالإنترنت.',
    // يظهر عند الاستضافة إذا لم يُضَف نطاق الموقع في
    // Firebase Console → Authentication → Settings → Authorized domains
    'auth/unauthorized-domain':
      'نطاق الموقع غير مُصرَّح به لتسجيل الدخول عبر Google — تواصل مع الإدارة.',
    'auth/internal-error':
      'خطأ في إعدادات تسجيل الدخول عبر Google — تواصل مع الإدارة.',
  };

  return map[code] || 'حدث خطأ غير متوقع، حاول مجددًا.';
};

const GoogleSvg = () => (
  <svg className="g-icon" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.1a7.03 7.03 0 0 1 0-4.27V7.08H2.18a11.3 11.3 0 0 0 0 9.86l3.66-2.84z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState(
    location.pathname === '/signup' ? 'signup' : 'login'
  );

  // Keep the form mode in sync with the current route
  useEffect(() => {
    setMode(location.pathname === '/signup' ? 'signup' : 'login');
  }, [location.pathname]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showCw, setShowCw] = useState(false);
  const [remember, setRemember] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  // ============================================================
  // GOOGLE REDIRECT RESULT
  // ============================================================
  // عند رجوع المستخدم من صفحة Google (تدفّق إعادة التوجيه) نلتقط النتيجة هنا.
  // لا يفعل شيئًا إذا لم يكن هناك تسجيل دخول معلّق.
  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (!result?.user) return;

        saveUserToFirestore(result.user, {
          provider: 'google.com',
          name: result.user.displayName || '',
        }).catch(() => {
          // Offline — onAuthStateChanged will handle the navigation
        });
      })
      .catch((err) => {
        setError(toError(err.code));
      });
  }, []);

  // ============================================================
  // CHECK AUTHENTICATED USER PROFILE
  // ============================================================
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      try {
        // Get user profile from Firestore
        const snap = await getDoc(
          doc(db, 'users', user.uid)
        );

        const data = snap.exists()
          ? snap.data()
          : null;

        // User has completed onboarding
        if (data?.name && data?.level) {
          navigate('/app', { replace: true });
        } else {
          // User exists but hasn't completed onboarding
          navigate('/onboarding', { replace: true });
        }
      } catch (error) {
        console.error(
          'Failed to check user profile:',
          error
        );

        // Can't confirm profile.
        // Safer to send the user to onboarding.
        navigate('/onboarding', { replace: true });
      }
    });

    return unsub;
  }, [navigate]);

  // ============================================================
  // SWITCH LOGIN / SIGNUP
  // ============================================================
  const switchTo = (m) => {
    setError('');
    setInfo('');
    setMode(m);

    navigate(
      m === 'signup'
        ? '/signup'
        : '/login',
      { replace: true }
    );
  };

  // ============================================================
  // VALIDATION
  // ============================================================
  const validate = () => {
    if (mode === 'signup' && !name.trim()) {
      setError('من فضلك أدخل اسمك.');
      return false;
    }

    if (
      !email.trim() ||
      !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)
    ) {
      setError(
        'من فضلك أدخل بريدًا إلكترونيًا صحيحًا.'
      );
      return false;
    }

    if (password.length < 6) {
      setError(
        'كلمة المرور يجب أن تكون 6 أحرف أو أكثر.'
      );
      return false;
    }

    // سياسة كلمة المرور عند إنشاء الحساب: 8 أحرف على الأقل، بحرف ورقم معًا
    if (mode === 'signup') {
      if (password.length < 8) {
        setError('كلمة المرور يجب أن تكون 8 أحرف أو أكثر.');
        return false;
      }
      if (!/[A-Za-z\u0600-\u06FF]/.test(password) || !/\d/.test(password)) {
        setError('كلمة المرور يجب أن تحتوي على حرف ورقم معًا.');
        return false;
      }
    }

    if (
      mode === 'signup' &&
      confirm !== password
    ) {
      setError(
        'تأكيد كلمة المرور غير مطابق.'
      );
      return false;
    }

    return true;
  };

  // ============================================================
  // LOGIN / SIGNUP
  // ============================================================
  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');
    setInfo('');

    if (!validate()) return;

    setLoading(true);

    try {
      if (mode === 'signup') {
        // Create Firebase account
        const cred =
          await createUserWithEmailAndPassword(
            auth,
            email.trim(),
            password
          );

        // Set Firebase Auth display name
        await updateProfile(
          cred.user,
          {
            displayName: name.trim(),
          }
        );

        // Save profile to Firestore
        saveUserToFirestore(
          cred.user,
          {
            name: name.trim(),
            provider: 'password',
          }
        ).catch(() => {
          // Offline — onAuthStateChanged will
          // handle the redirect
        });

        // رسالة تأكيد البريد — الوصول للدروس يبقى مغلقًا حتى التأكيد (VerifyEmailGate)
        sendEmailVerification(cred.user).catch(() => {});

        setInfo(
          'تم إنشاء حسابك! أرسلنا رسالة تأكيد إلى بريدك — افتحها لتفعيل الحساب. ✨'
        );
      } else {
        // Login
        await signInWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );

        // Best-effort Firestore sync
        saveUserToFirestore(
          auth.currentUser,
          {
            provider: 'password',
          }
        ).catch(() => {
          // Offline — ignore
        });
      }
    } catch (err) {
      setError(toError(err.code));
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // GOOGLE LOGIN
  // ============================================================
  const handleGoogle = async () => {
    setError('');
    setInfo('');
    setLoading(true);

    const provider = new GoogleAuthProvider();

    try {
      // Popup flow — opens a Google popup and resolves once signed in.
      // (The console warning "Cross-Origin-Opener-Policy policy would block
      //  the window.close call" is a harmless message emitted by GOOGLE's own
      //  popup page — it does NOT affect the login process.)
      const result = await signInWithPopup(auth, provider);

      // Save Google profile to Firestore (best-effort — onAuthStateChanged
      // drives the redirect to /app or /onboarding regardless).
      saveUserToFirestore(result.user, {
        provider: 'google.com',
        name: result.user.displayName || '',
      }).catch(() => {
        // Offline — onAuthStateChanged will handle the navigation
      });
    } catch (err) {
      // النوافذ المنبثقة تُحجب في كثير من المتصفحات عند الاستضافة (خاصة متصفحات
      // الهاتف، والمواقع التي ترسل ترويسة Cross-Origin-Opener-Policy).
      // في هذه الحالة ننتقل إلى تدفّق إعادة التوجيه الذي يعمل في كل المتصفحات.
      const popupFailed =
        err?.code === 'auth/popup-blocked' ||
        err?.code === 'auth/cancelled-popup-request' ||
        err?.code === 'auth/operation-not-supported-in-this-environment' ||
        err?.code === 'auth/web-storage-unsupported';

      if (popupFailed) {
        try {
          // يغادر الصفحة — النتيجة تُلتقط في getRedirectResult عند العودة.
          await signInWithRedirect(auth, provider);
          return;
        } catch (redirectErr) {
          setError(toError(redirectErr.code));
        }
      } else {
        setError(toError(err.code));
      }
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // PASSWORD RESET
  // ============================================================
  const handleReset = async () => {
    if (!email.trim()) {
      setError(
        'أدخل بريدك الإلكتروني أولًا لاستعادة كلمة المرور.'
      );
      return;
    }

    setError('');
    setInfo('');
    setLoading(true);

    try {
      await sendPasswordResetEmail(
        auth,
        email.trim()
      );

      setInfo(
        'تم إرسال رابط استعادة كلمة المرور إلى بريدك.'
      );
    } catch (err) {
      setError(toError(err.code));
    } finally {
      setLoading(false);
    }
  };

  const isLogin = mode === 'login';

  return (
    <div
      dir="rtl"
      style={{
        fontFamily:
          "'IBM Plex Sans Arabic', sans-serif",
      }}
    >
      <link
        rel="preconnect"
        href="https://fonts.googleapis.com"
      />

      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="true"
      />

      <link
        href="https://fonts.googleapis.com/css2?family=Aref+Ruqaa:wght@400;700&family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />

      <style>{`
        :root{
          --ink-teal:#0E3B36;
          --ink-teal-deep:#092824;
          --parchment:#F6EEDC;
          --parchment-dim:#EFE3C8;
          --gold:#E3A23C;
          --gold-bright:#F0B85C;
          --crimson:#B23A2E;
          --text-dark:#1C1A15;
          --line:rgba(28,26,21,0.14);
        }

        *{
          margin:0;
          padding:0;
          box-sizing:border-box;
        }

        body{
          background:var(--parchment);
          color:var(--text-dark);
        }

        a{
          color:inherit;
          text-decoration:none;
        }

        .auth-page{
          min-height:100svh;
          display:grid;
          grid-template-columns:1.02fr 1fr;
        }

        .grain{
          position:fixed;
          inset:0;
          pointer-events:none;
          z-index:1;
          opacity:0.05;
          mix-blend-mode:multiply;
          background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
        }

        .brand{
          position:relative;
          overflow:hidden;
          z-index:2;
          background:linear-gradient(
            150deg,
            var(--ink-teal-deep) 0%,
            var(--ink-teal) 60%,
            #14534C 100%
          );
          color:var(--parchment);
          padding:56px 60px;
          display:flex;
          flex-direction:column;
          justify-content:space-between;
          min-height:100svh;
        }

        .brand::before{
          content:'';
          position:absolute;
          inset:0;
          background:
            radial-gradient(
              ellipse 620px 460px at 85% 12%,
              rgba(227,162,60,0.18),
              transparent 60%
            ),
            radial-gradient(
              ellipse 500px 420px at 8% 92%,
              rgba(178,58,46,0.16),
              transparent 60%
            );
          pointer-events:none;
        }

        .brand-top{
          position:relative;
          z-index:2;
          display:flex;
          align-items:center;
          gap:12px;
        }

        .logo-mark{
          width:42px;
          height:42px;
          border-radius:50%;
          display:flex;
          align-items:center;
          justify-content:center;
          background:var(--gold);
          color:var(--ink-teal-deep);
          font-family:'Aref Ruqaa',serif;
          font-size:22px;
          font-weight:700;
          border:2px solid var(--gold-bright);
        }

        .logo-text{
          font-family:'Aref Ruqaa',serif;
          font-size:26px;
          font-weight:700;
          color:var(--parchment);
        }

        .brand-mid{
          position:relative;
          z-index:2;
        }

        .eyebrow{
          display:inline-flex;
          align-items:center;
          gap:10px;
          font-family:'IBM Plex Mono',monospace;
          font-size:11.5px;
          letter-spacing:0.12em;
          color:var(--gold-bright);
          border:1px solid rgba(227,162,60,0.4);
          border-radius:999px;
          padding:7px 16px;
          margin-bottom:30px;
        }

        .eyebrow::before{
          content:'';
          width:6px;
          height:6px;
          border-radius:50%;
          background:var(--gold-bright);
        }

        .brand h1{
          font-family:'Aref Ruqaa',serif;
          font-weight:700;
          font-size:44px;
          line-height:1.3;
          margin-bottom:22px;
        }

        .brand h1 em{
          font-style:normal;
          color:var(--gold-bright);
        }

        .brand p.lead{
          font-size:16.5px;
          color:rgba(246,238,220,0.78);
          font-weight:300;
          max-width:440px;
        }

        .brand-feats{
          margin-top:42px;
          display:grid;
          gap:18px;
        }

        .feat{
          display:flex;
          gap:14px;
          align-items:flex-start;
        }

        .feat .fi{
          width:40px;
          height:40px;
          flex-shrink:0;
          border-radius:12px;
          background:rgba(227,162,60,0.14);
          color:var(--gold-bright);
          display:flex;
          align-items:center;
          justify-content:center;
          font-size:18px;
        }

        .feat .ft{
          font-size:15px;
          font-weight:600;
          color:var(--parchment);
        }

        .feat .fs{
          font-size:13px;
          color:rgba(246,238,220,0.6);
        }

        .brand-bottom{
          position:relative;
          z-index:2;
          font-size:13px;
          color:rgba(246,238,220,0.6);
        }

        .form-side{
          position:relative;
          z-index:2;
          background:var(--parchment);
          display:flex;
          align-items:center;
          justify-content:center;
          padding:48px 40px;
          min-height:100svh;
        }

        .form-card{
          width:100%;
          max-width:460px;
        }

        .card-head{
          text-align:center;
          margin-bottom:30px;
        }

        .card-head h2{
          font-family:'Aref Ruqaa',serif;
          font-size:30px;
          color:var(--ink-teal);
          margin-bottom:8px;
        }

        .card-head p{
          font-size:14.5px;
          color:#5c584c;
        }

        .seg{
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:6px;
          background:var(--parchment-dim);
          padding:5px;
          border-radius:999px;
          margin-bottom:30px;
        }

        .seg button{
          border:0;
          background:transparent;
          cursor:pointer;
          font-family:'IBM Plex Sans Arabic',sans-serif;
          font-weight:600;
          font-size:15px;
          padding:10px 0;
          border-radius:999px;
          color:#5c584c;
          transition:all .25s;
        }

        .seg button.active{
          background:var(--ink-teal);
          color:var(--parchment);
          box-shadow:0 4px 14px rgba(14,59,54,0.25);
        }

        .field{
          margin-bottom:20px;
        }

        .field label{
          display:block;
          font-size:13.5px;
          font-weight:600;
          margin-bottom:8px;
          color:var(--text-dark);
        }

        .input{
          position:relative;
          display:flex;
          align-items:center;
          gap:6px;
          background:#fffdf6;
          border:1.5px solid var(--line);
          border-radius:12px;
          padding:0 14px;
          transition:border-color .2s;
        }

        .input:focus-within{
          border-color:var(--gold);
          box-shadow:0 0 0 4px rgba(227,162,60,0.15);
        }

        .input .ii{
          color:var(--gold);
          font-size:15px;
        }

        .input input{
          flex:1;
          border:0;
          outline:0;
          background:transparent;
          font-family:'IBM Plex Sans Arabic',sans-serif;
          font-size:15px;
          padding:14px 4px;
          color:var(--text-dark);
        }

        .input input::placeholder{
          color:#9a9183;
          font-weight:300;
        }

        .eye{
          border:0;
          background:none;
          cursor:pointer;
          color:#9a9183;
          font-size:16px;
          padding:4px;
          line-height:1;
        }

        .row-between{
          display:flex;
          align-items:center;
          justify-content:space-between;
          margin:2px 0 22px;
        }

        .row-between label{
          font-size:13px;
          display:flex;
          align-items:center;
          gap:8px;
          cursor:pointer;
          color:#5c584c;
        }

        .row-between label input{
          accent-color:var(--ink-teal);
          width:15px;
          height:15px;
        }

        .link-btn{
          border:0;
          background:none;
          cursor:pointer;
          font-family:'IBM Plex Sans Arabic',sans-serif;
          font-size:13px;
          font-weight:600;
          color:var(--ink-teal);
          text-decoration:underline;
          text-underline-offset:3px;
          padding:0;
        }

        .link-btn:hover{
          color:var(--gold);
        }

        .btn-primary{
          width:100%;
          border:0;
          cursor:pointer;
          background:var(--gold);
          color:var(--ink-teal-deep);
          font-weight:700;
          font-size:16px;
          font-family:'IBM Plex Sans Arabic',sans-serif;
          padding:15px 0;
          border-radius:999px;
          transition:all .25s;
          box-shadow:0 8px 24px rgba(227,162,60,0.28);
        }

        .btn-primary:hover{
          background:var(--gold-bright);
          transform:translateY(-2px);
          box-shadow:0 12px 30px rgba(227,162,60,0.38);
        }

        .btn-primary:disabled{
          opacity:0.6;
          cursor:not-allowed;
          transform:none;
        }

        .spinner{
          display:inline-block;
          width:18px;
          height:18px;
          border:3px solid rgba(14,59,54,0.25);
          border-top-color:var(--ink-teal-deep);
          border-radius:50%;
          animation:spin .7s linear infinite;
          vertical-align:middle;
        }

        @keyframes spin{
          to{
            transform:rotate(360deg);
          }
        }

        .divider{
          display:flex;
          align-items:center;
          gap:14px;
          margin:24px 0;
          color:#9a918a;
          font-size:13px;
        }

        .divider::before,
        .divider::after{
          content:'';
          flex:1;
          height:1px;
          background:var(--line);
        }

        .btn-google{
          width:100%;
          display:flex;
          align-items:center;
          justify-content:center;
          gap:10px;
          background:#fffdf6;
          border:1.5px solid var(--line);
          border-radius:999px;
          padding:13px 0;
          cursor:pointer;
          font-family:'IBM Plex Sans Arabic',sans-serif;
          font-weight:600;
          font-size:15px;
          color:var(--text-dark);
          transition:all .25s;
        }

        .btn-google:hover{
          border-color:var(--gold);
          background:#fffdf6;
        }

        .g-icon{
          width:18px;
          height:18px;
        }

        .message{
          border-radius:12px;
          padding:12px 16px;
          font-size:13.5px;
          margin-bottom:20px;
          line-height:1.6;
          text-align:right;
        }

        .message.error{
          background:rgba(178,58,46,0.08);
          border:1px solid rgba(178,58,46,0.3);
          color:#8c2a20;
        }

        .message.info{
          background:rgba(227,162,60,0.12);
          border:1px solid rgba(227,162,60,0.4);
          color:#7a5612;
        }

        .foot{
          text-align:center;
          margin-top:22px;
          font-size:13.5px;
          color:#5c584c;
        }

        .foot button{
          cursor:pointer;
          border:none;
          background:none;
          font-family:'IBM Plex Sans Arabic',sans-serif;
          color:var(--ink-teal);
          font-weight:700;
          font-size:13.5px;
          margin-right:4px;
        }

        .foot button:hover{
          color:var(--gold);
        }

        .back-home{
          display:inline-flex;
          align-items:center;
          gap:8px;
          margin-top:26px;
          font-size:13.5px;
          font-weight:600;
          color:var(--ink-teal);
        }

        .back-home:hover{
          color:var(--gold);
        }

        @media (max-width:900px){
          .auth-page{
            grid-template-columns:1fr;
          }

          .brand{
            padding:40px 28px;
            min-height:auto;
          }

          .brand-feats{
            display:none;
          }

          .brand-mid{
            padding-bottom:26px;
          }

          .brand-bottom{
            display:none;
          }

          .form-side{
            padding:36px 20px;
            min-height:auto;
          }
        }

        @media (prefers-reduced-motion:reduce){
          .spinner{
            animation-duration:1.4s;
          }
        }
      `}</style>

      <div className="grain"></div>

      <div className="auth-page">

        {/* =====================================================
            BRAND SIDE
        ====================================================== */}
        <aside className="brand">

          <div className="brand-top">
            <div className="logo-mark">م</div>
            <div className="logo-text">المخ</div>
          </div>

          <div className="brand-mid">

            <div className="eyebrow">
              رياضيات وفيزياء · من 4م إلى البكالوريا
            </div>

            <h1>
              طريقك نحو <em>النجاح</em>
              <br />
              يبدأ من هنا
            </h1>

            <p className="lead">
              سجّل دخولك لمواصلة دروسك، حصصك المباشرة،
              وتمارينك التفاعلية مع الأستاذ سيد مختار —
              كل شيء في مكان واحد.
            </p>

            <div className="brand-feats">

              <div className="feat">
                <div className="fi">📚</div>

                <div>
                  <div className="ft">
                    دروس حسب منهاجك
                  </div>

                  <div className="fs">
                    من شهادة التعليم المتوسط إلى البكالوريا
                  </div>
                </div>
              </div>

              <div className="feat">
                <div className="fi">⏱</div>

                <div>
                  <div className="ft">
                    تقدّمك محفوظ
                  </div>

                  <div className="fs">
                    تكمّل من حيث توقفت، على أي جهاز
                  </div>
                </div>
              </div>

              <div className="feat">
                <div className="fi">🎓</div>

                <div>
                  <div className="ft">
                    بأسلوب الأستاذ
                  </div>

                  <div className="fs">
                    الصبر، الدقة، والإيمان بأن كل طالب قادر على النجاح
                  </div>
                </div>
              </div>

            </div>
          </div>

          <div className="brand-bottom">
            إهداءً لكل أستاذ آمن بطلابه — © المخ 2026
          </div>

        </aside>

        {/* =====================================================
            FORM SIDE
        ====================================================== */}
        <main className="form-side">

          <div className="form-card">

            <div className="card-head">

              <h2>
                {isLogin
                  ? 'مرحبًا بعودتك'
                  : 'أنشئ حسابك الآن'}
              </h2>

              <p>
                {isLogin
                  ? 'سجّل دخولك للمتابعة'
                  : 'ابدأ رحلتك الأولى مجانًا — بلا أي التزام'}
              </p>

            </div>

            {/* LOGIN / SIGNUP SWITCH */}
            <div className="seg">

              <button
                type="button"
                className={
                  isLogin ? 'active' : ''
                }
                onClick={() =>
                  switchTo('login')
                }
              >
                تسجيل الدخول
              </button>

              <button
                type="button"
                className={
                  !isLogin ? 'active' : ''
                }
                onClick={() =>
                  switchTo('signup')
                }
              >
                حساب جديد
              </button>

            </div>

            {/* MESSAGES */}
            {error && (
              <div className="message error">
                {error}
              </div>
            )}

            {info && (
              <div className="message info">
                {info}
              </div>
            )}

            {/* FORM */}
            <form
              onSubmit={handleSubmit}
              noValidate
            >

              {/* NAME */}
              {!isLogin && (
                <div className="field">

                  <label>
                    الاسم الكامل
                  </label>

                  <div className="input">

                    <span className="ii">
                      👤
                    </span>

                    <input
                      type="text"
                      placeholder="مثال: محمد الأمين"
                      value={name}
                      onChange={(e) =>
                        setName(e.target.value)
                      }
                    />

                  </div>
                </div>
              )}

              {/* EMAIL */}
              <div className="field">

                <label>
                  البريد الإلكتروني
                </label>

                <div className="input">

                  <span className="ii">
                    ✉
                  </span>

                  <input
                    type="email"
                    dir="ltr"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) =>
                      setEmail(e.target.value)
                    }
                  />

                </div>
              </div>

              {/* PASSWORD */}
              <div className="field">

                <label>
                  كلمة المرور
                </label>

                <div className="input">

                  <span className="ii">
                    🔒
                  </span>

                  <input
                    type={
                      showPw
                        ? 'text'
                        : 'password'
                    }
                    dir="ltr"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                  />

                  <button
                    type="button"
                    className="eye"
                    onClick={() =>
                      setShowPw(
                        (s) => !s
                      )
                    }
                  >
                    {showPw
                      ? '🙈'
                      : '👁'}
                  </button>

                </div>
              </div>

              {/* CONFIRM PASSWORD */}
              {!isLogin && (
                <div className="field">

                  <label>
                    تأكيد كلمة المرور
                  </label>

                  <div className="input">

                    <span className="ii">
                      🔒
                    </span>

                    <input
                      type={
                        showCw
                          ? 'text'
                          : 'password'
                      }
                      dir="ltr"
                      placeholder="••••••••"
                      value={confirm}
                      onChange={(e) =>
                        setConfirm(
                          e.target.value
                        )
                      }
                    />

                    <button
                      type="button"
                      className="eye"
                      onClick={() =>
                        setShowCw(
                          (s) => !s
                        )
                      }
                    >
                      {showCw
                        ? '🙈'
                        : '👁'}
                    </button>

                  </div>
                </div>
              )}

              {/* LOGIN OPTIONS */}
              {isLogin && (
                <div className="row-between">

                  <label>
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) =>
                        setRemember(
                          e.target.checked
                        )
                      }
                    />

                    تذكرني
                  </label>

                  <button
                    type="button"
                    className="link-btn"
                    onClick={handleReset}
                  >
                    نسيت كلمة المرور؟
                  </button>

                </div>
              )}

              {/* SUBMIT */}
              <button
                className="btn-primary"
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <span className="spinner" />
                ) : isLogin ? (
                  'تسجيل الدخول'
                ) : (
                  'إنشاء الحساب'
                )}
              </button>

            </form>

            {/* DIVIDER */}
            <div className="divider">
              أو
            </div>

            {/* GOOGLE */}
            <button
              className="btn-google"
              type="button"
              onClick={handleGoogle}
              disabled={loading}
            >
              <GoogleSvg />
              المتابعة مع Google
            </button>

            {/* FOOT */}
            <div className="foot">

              {isLogin
                ? 'ليس لديك حساب؟'
                : 'لديك حساب بالفعل؟'}

              <button
                type="button"
                onClick={() =>
                  switchTo(
                    isLogin
                      ? 'signup'
                      : 'login'
                  )
                }
              >
                {isLogin
                  ? 'أنشئ حسابًا'
                  : 'تسجيل الدخول'}
              </button>

            </div>

            {/* HOME */}
            <Link
              to="/"
              className="back-home"
            >
              → العودة للرئيسية
            </Link>

          </div>

        </main>
      </div>
    </div>
  );
}