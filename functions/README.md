# Cloud Functions (Trades)

## Why

Profile picture upload from the React Native app no longer uses the Firebase **client** Storage SDK. The client SDK triggers a Blob/ArrayBuffer error in RN. This callable function uploads the image on the server (Node.js) using a Buffer, then returns the download URL. The app only sends base64 and receives a URL.

## Deploy

**Node version:** Firebase CLI does not support Node.js 25+. Use **Node 18 or 20 LTS** for the deploy (e.g. `nvm use 20`).

**Important:** Use `npx firebase-tools` (not `npx firebase`). This project has the `firebase` npm package (the SDK), so `npx firebase` would try to run the wrong thing.

1. Install dependencies: `cd functions && npm install`
2. Switch to Node 20: `nvm use 20` (or `nvm install 20` then `nvm use 20`).
3. Log in to Firebase (required for first deploy or if session expired): `npx firebase login`. A browser window will open to sign in with your Google account. Project is set to **trades-4903d** via `.firebaserc`.
4. Deploy: `npm run deploy:functions` (or `npx firebase-tools deploy --only functions`). This uses the project’s Firebase CLI so it runs with whatever Node you have active (use Node 20).

After deploy, the app’s “Save profile” with a new photo will call `uploadProfileImage` and should work without the Blob error.
