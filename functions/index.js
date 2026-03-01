/**
 * Callable: upload profile image from React Native without using Blob/ArrayBuffer.
 * Client sends base64; we upload to Storage using Node Buffer and return the download URL.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

initializeApp();

const PROFILE_PICTURES_PREFIX = "profile-pictures";

export const uploadProfileImage = onCall(
  { enforceAppCheck: false },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in.");
    }
    const uid = request.auth.uid;
    const { base64 } = request.data || {};
    if (typeof base64 !== "string" || !base64) {
      throw new HttpsError("invalid-argument", "base64 string required.");
    }

    const bucket = getStorage().bucket();
    const path = `${PROFILE_PICTURES_PREFIX}/${uid}.jpg`;
    const file = bucket.file(path);

    const buffer = Buffer.from(base64, "base64");
    await file.save(buffer, {
      metadata: { contentType: "image/jpeg" },
    });

    const expires = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000);
    const [url] = await file.getSignedUrl({
      version: "v4",
      action: "read",
      expires,
    });
    return { url };
  }
);
