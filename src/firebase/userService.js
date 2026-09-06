import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './config';

/**
 * Builds the full profile object for the user document in Firestore.
 * Uses values passed explicitly first (e.g. the typed name during signup),
 * then falls back to the Firebase Auth user object.
 */
export const buildUserPayload = (user, extra = {}) => ({
  uid: user?.uid || extra.uid || '',
  name: extra.name ?? user?.displayName ?? '',
  email: user?.email || extra.email || '',
  provider: extra.provider || user?.providerData?.[0]?.providerId || 'password',
  level: extra.level ?? '',
  photoURL: user?.photoURL || '',
  emailVerified: user?.emailVerified || false,
});

/**
 * Saves (or updates) the complete user profile in Firestore at `users/{uid}`.
 * - If the document does not exist yet → creates it with `createdAt` timestamp.
 * - If it already exists → updates fields without overwriting `createdAt`.
 * - If a read is blocked by Firestore rules → falls back to a merge write.
 */
export async function saveUserToFirestore(user, extra = {}) {
  if (!user || !user.uid) return;

  const ref = doc(db, 'users', user.uid);
  const payload = buildUserPayload(user, extra);

  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, { ...payload, updatedAt: serverTimestamp() });
    } else {
      await setDoc(ref, { ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    }
  } catch (e) {
    // Rules may block reads — fall back to a merge write (createdAt only set on first merge)
    await setDoc(ref, { ...payload, updatedAt: serverTimestamp() }, { merge: true });
  }
}

export default saveUserToFirestore;