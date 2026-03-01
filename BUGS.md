# Known bugs

## Profile pictures

- **Status:** Client upload via REST (no Cloud Function; works on free Spark plan).  
- **Summary:** Profile picture is uploaded with the **Storage REST API** (base64 → Uint8Array, no Blob). If you see "Profile updated, but the photo could not be uploaded":
  1. **Check the Metro/terminal console** in dev – the real error is logged there (`Profile photo upload failed: ...`).
  2. **Storage rules:** In [Firebase Console](https://console.firebase.google.com) → Storage → Rules, ensure authenticated users can write to `profile-pictures/{userId}.jpg`, e.g.  
     `match /profile-pictures/{userId}.jpg { allow read: if true; allow write: if request.auth != null && request.auth.uid == userId; }`
  3. **Network:** Try on Wi‑Fi and without VPN; retry after a moment.
