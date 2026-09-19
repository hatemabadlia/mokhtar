// src/lib/media.js — فيديو الدروس على Cloudflare R2 (عبر الـ Worker)
//
// لوحة التحكم ترفع الفيديو إلى R2 وتحفظ في مستند الدرس:
//   videoKey     مسار الفيديو (lessons/<...>/video.mp4)
//   thumbnailURL رابط الصورة المصغّرة (عام)
// المشاهدة تحتاج رابطًا موقّعًا قصير العمر يمنحه الـ Worker فقط إذا كان القسم
// مفتوحًا في حساب الطالب (unlockedGroups) — لا يكفي فتح الواجهة.
import { auth } from '../firebase/config';

export const MEDIA_WORKER_URL = 'https://sidmokhtar-r2-exams.abadliahatem.workers.dev';

/**
 * يطلب من الـ Worker رابط مشاهدة موقّعًا لدرس معيّن.
 * يُرجع { url, expires, videoType } أو يرمي خطأ بكود: 'locked' | 'auth' | 'network' | 'error'.
 */
export async function fetchPlayUrl(lessonId) {
  const user = auth.currentUser;
  if (!user) throw Object.assign(new Error('auth'), { code: 'auth' });
  const idToken = await user.getIdToken();
  let res;
  try {
    res = await fetch(`${MEDIA_WORKER_URL}/media/play-url`, {
      method: 'POST',
      headers: { authorization: `Bearer ${idToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ lessonId }),
    });
  } catch {
    throw Object.assign(new Error('network'), { code: 'network' });
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 403) throw Object.assign(new Error('locked'), { code: 'locked' });
  if (res.status === 401) throw Object.assign(new Error('auth'), { code: 'auth' });
  if (!res.ok) throw Object.assign(new Error(data.error || 'error'), { code: 'error' });
  return data;
}

/** هل للدرس فيديو قابل للتشغيل عبر الـ Worker؟ */
export const hasR2Video = (lesson) => Boolean(lesson?.videoKey);

/**
 * يطلب من الـ Worker رابط قراءة موقّعًا لملف امتحان (exams/{examId}.r2Key).
 * أي طالب مسجّل يحصل عليه — الامتحانات ليست خلف رموز، لكن الملف لا يُفتح بلا توقيع.
 * يُرجع { url, expires } أو يرمي خطأ بكود: 'auth' | 'network' | 'error'.
 */
export async function fetchFileUrl(examId) {
  const user = auth.currentUser;
  if (!user) throw Object.assign(new Error('auth'), { code: 'auth' });
  const idToken = await user.getIdToken();
  let res;
  try {
    res = await fetch(`${MEDIA_WORKER_URL}/media/file-url`, {
      method: 'POST',
      headers: { authorization: `Bearer ${idToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ examId }),
    });
  } catch {
    throw Object.assign(new Error('network'), { code: 'network' });
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) throw Object.assign(new Error('auth'), { code: 'auth' });
  if (!res.ok) throw Object.assign(new Error(data.error || 'error'), { code: 'error' });
  return data;
}

/** هل ملف الامتحان على R2 (يحتاج رابطًا موقّعًا)؟ الملفات القديمة لها pdfURL مباشر. */
export const hasR2File = (exam) => exam?.storage === 'r2' && Boolean(exam?.r2Key);
