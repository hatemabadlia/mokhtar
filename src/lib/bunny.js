// src/lib/bunny.js
//
// Student-facing helpers for Bunny Stream video URLs.
//
// The admin panel (admin-panel-sidmokhtar) uploads lessons to Bunny Stream
// and saves each lesson's `bunnyVideoId` (and `bunnyLibraryId`) on the
// Firestore `lessons` doc. This module turns that id into the CDN thumbnail
// (and embed) URL.
//
// SECURITY NOTE: the Bunny Stream AccessKey/API key is defined ONLY in the
// admin panel (src/lib/bunny.js there). Never import or copy it into this
// student-facing bundle.

import { auth } from '../firebase/config';

const BUNNY_LIBRARY_ID = '740962';
// الـ Worker الذي يوقّع توكن المشاهدة بعد التحقق من أن القسم مفتوح للطالب
export const MEDIA_WORKER_URL = 'https://sidmokhtar-r2-exams.abadliahatem.workers.dev';

// CDN hostname (pull zone) for the Stream library, found in
// Bunny dashboard → Stream → your library → CDN Hostname.
// File URLs are served from `{hostname}/{videoId}/...` where the full
// hostname ends with the `.b-cdn.net` suffix.
const BUNNY_PULL_ZONE = 'vz-239bc759-0b3';

/**
 * Auto-generated thumbnail URL for a Bunny Stream video.
 * Format per Bunny docs: https://{hostname}/{video_id}/thumbnail.jpg
 * Returns '' for a missing video id so <img> never hits a 404 "undefined".
 */
export function bunnyThumbnailUrl(videoId) {
  if (!videoId) return '';
  return `https://${BUNNY_PULL_ZONE}.b-cdn.net/${videoId}/thumbnail.jpg`;
}

/**
 * Embed URL for the Bunny Stream iframe player (with Token Authentication).
 * Format: https://iframe.mediadelivery.net/embed/{library_id}/{video_id}?token=..&expires=..
 * Without token/expires the player refuses to play once token auth is enabled in Bunny.
 */
export function bunnyEmbedUrl(videoId, token, expires) {
  if (!videoId) return '';
  const base = `https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${videoId}`;
  if (!token || !expires) return base;
  return `${base}?token=${encodeURIComponent(token)}&expires=${expires}&autoplay=false`;
}

/**
 * يطلب من الـ Worker توكن مشاهدة موقّعًا لدرس معيّن.
 * الـ Worker يتحقق (بتوكن Firebase) من أن unlockedGroups تغطي هذا الدرس، وإلا 403.
 * يُرجع { embedUrl, token, expires } أو يرمي خطأ بكود: 'locked' | 'auth' | 'network'.
 */
export async function fetchEmbedToken(lessonId) {
  const user = auth.currentUser;
  if (!user) throw Object.assign(new Error('auth'), { code: 'auth' });
  const idToken = await user.getIdToken();
  let res;
  try {
    res = await fetch(`${MEDIA_WORKER_URL}/bunny/embed-token`, {
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

export const BUNNY_LIBRARY_ID_VALUE = BUNNY_LIBRARY_ID;