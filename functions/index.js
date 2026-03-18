/**
 * Cloud Functions for Trades.
 * - uploadProfileImage: callable, uploads profile picture to Storage
 * - onChatMessageCreated: Firestore trigger, sends FCM push to the recipient on new chat messages
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

initializeApp();

const PROFILE_PICTURES_PREFIX = "profile-pictures";

// ---------------------------------------------------------------------------
// uploadProfileImage — callable
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// onChatMessageCreated — Firestore trigger
// Sends an FCM push notification to the recipient whenever a new message lands.
// ---------------------------------------------------------------------------
export const onChatMessageCreated = onDocumentCreated(
  "conversations/{convId}/messages/{msgId}",
  async (event) => {
    const message = event.data?.data();
    if (!message) return;

    const { senderId, text } = message;
    const { convId } = event.params;

    // Skip media / special messages
    const isMedia =
      typeof text === "string" &&
      (text.startsWith("data:image/") ||
        text.startsWith("data:audio/") ||
        text.startsWith("data:trade/"));

    const db = getFirestore();

    // Get the conversation to find the recipient
    const convSnap = await db.collection("conversations").doc(convId).get();
    if (!convSnap.exists) return;

    const { participantIds } = convSnap.data();
    if (!Array.isArray(participantIds) || participantIds.length < 2) return;

    const recipientId = participantIds.find((id) => id !== senderId);
    if (!recipientId) return;

    // Fetch recipient's FCM token and sender's display name in parallel
    const [recipientSnap, senderSnap] = await Promise.all([
      db.collection("users").doc(recipientId).get(),
      db.collection("users").doc(senderId).get(),
    ]);

    const pushToken = recipientSnap.exists
      ? String(recipientSnap.data()?.pushToken ?? "")
      : "";
    if (!pushToken) return; // Recipient hasn't granted notification permission

    const senderName = senderSnap.exists
      ? String(senderSnap.data()?.displayName ?? "Someone")
      : "Someone";

    const notificationBody = isMedia ? "Sent you a message" : String(text ?? "").slice(0, 200);

    await getMessaging().send({
      token: pushToken,
      notification: {
        title: senderName,
        body: notificationBody,
      },
      data: {
        type: "chat_message",
        conversationId: convId,
        senderId,
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
          },
        },
      },
      android: {
        priority: "high",
        notification: {
          sound: "default",
        },
      },
    });
  }
);
