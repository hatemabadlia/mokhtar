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

const BUNNY_LIBRARY_ID = '740962';

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
 * Embed URL for the Bunny Stream iframe player.
 * Format per Bunny docs: https://player.mediadelivery.net/embed/{library_id}/{video_id}
 */
export function bunnyEmbedUrl(videoId) {
  if (!videoId) return '';
  return `https://player.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${videoId}`;
}

export const BUNNY_LIBRARY_ID_VALUE = BUNNY_LIBRARY_ID;