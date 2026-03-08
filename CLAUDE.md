# Trades – Claude Code Context

## Project Overview
**Trades** is a React Native (Expo) mobile app for peer-to-peer item trading. Users list items they own, swipe on items they want, and get matched for a local trade. Think Tinder for stuff.

## Tech Stack
- **Framework**: React Native + Expo (~54)
- **Language**: TypeScript
- **Backend**: Firebase (Auth, Firestore, Storage)
- **Navigation**: React Navigation v7 (bottom tabs + native stacks)
- **Animations**: react-native-reanimated + react-native-gesture-handler
- **Image uploads**: `expo-file-system` legacy API (`uploadAsync` / `uploadString`) — NOT Blob/fetch (RN Blob polyfill causes errors)

## Project Structure
```
src/
  config/
    firebase.ts          # Firebase init; exports app, auth, db, storage, isFirebaseEnabled()
  contexts/
    AuthContext.tsx       # Firebase auth state; current user
    AppDataContext.tsx    # Items, matches, swipe deck state
    ChatContext.tsx       # Chat/conversations state
  navigation/
    RootNavigator.tsx    # Auth-gated root
    TabNavigator.tsx     # Bottom tabs
    SwipeStack.tsx / ChatStack.tsx / MyItemsStack.tsx / ProfileStack.tsx / AuthStack.tsx
  screens/              # One file per screen
  components/           # SwipeableItemCard, MatchOverlay
  services/
    dbService.ts         # ALL Firestore + Storage calls centralized here
    firebase.ts          # (legacy/supplemental firebase helpers)
  theme/
    colors.ts / index.ts
  utils/
    mockData.ts          # Types (Item, User, ValueTier, ItemCategory) + mock data for testing
```

## Key Data Models (src/utils/mockData.ts)
- `ValueTier`: `'$' | '$$' | '$$$'` — used to match items of similar value
- `ItemCategory`: Electronics, Clothing, Home, Sports, Books, Toys, Music, Art, Other
- `Item`: `{ id, ownerId, title, description, photos[], valueTier, pickupLocation, category }`
- `User`: `{ id, displayName, email, avatarUrl?, bio?, location? }`

## Firebase / Environment
Firebase is conditionally initialized — only when all `EXPO_PUBLIC_FIREBASE_*` env vars are set. If not configured, the app falls back to mock data.

Required env vars (in `.env`):
```
EXPO_PUBLIC_FIREBASE_API_KEY
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
EXPO_PUBLIC_FIREBASE_PROJECT_ID
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
EXPO_PUBLIC_FIREBASE_APP_ID
```

Use `isFirebaseEnabled()` to check before any Firebase call.

## Image Upload Pattern (Critical)
React Native's Blob polyfill breaks Firebase Storage SDK uploads. Always use:
1. **Profile pictures**: `expo-file-system/legacy` `uploadAsync` with a direct REST URL (`https://firebasestorage.googleapis.com/upload/v0/b/...`) + Bearer token
2. **Item photos**: `uploadString` with `data_url` format via Firebase Storage SDK
3. Never use `fetch(blob)` or `new Blob(...)` for uploads in RN

## Firestore Collections
- `items` — item listings (`status: 'active' | 'traded'`)
- `swipes` — swipe events
- `users` — user profiles (including `profilePictureUrl`)
- `matches` — trade matches (`status: 'pending' | 'completed'`, `participantIds[]`, `itemIds[]`)
- `reviews` — post-trade reviews

# Workflow & Execution Rules

* **Task Initialization:** Before starting a new feature or bug fix, use the GitHub MCP (if configured) to read the related Issue or Pull Request to gather full context. 
* **External Documentation:** If you encounter an unfamiliar error code (e.g., from Firebase) or a React Native/Expo deprecation warning, immediately use the Brave Search MCP to look up the latest official documentation before guessing the fix.
* **Navigation & UI:** Before modifying any routing, thoroughly check the existing stack parameter lists (e.g., `ProfileStackParamList`) to maintain strict TypeScript navigation safety.
* **Debugging Strategy:** * For network, API, or storage errors, immediately add detailed `console.log` statements to verify raw URLs, variables, and User IDs before attempting complex architectural rewrites.
    * For complex React state loops or elusive UI bugs, trigger the Sequential Thinking MCP to break down the component lifecycle logic step-by-step before writing code.
* **Expo Maintenance:** If React Native's Fast Refresh appears stuck, or if new `.env` variables (`EXPO_PUBLIC_`) are not loading, run your custom `npm run clear-cache` script (`npx expo start -c`) to reset the bundler.
* **Firebase Management:** You are authorized to use the `firebase` CLI to deploy security rules, check project status, or start local emulators. If you need to debug live Firestore data, you may write and execute temporary local Node.js scripts using the `firebase-admin` SDK, but you **MUST** ask for explicit user permission before writing, modifying, or deleting live production data.
* **Pre-Commit Protocol:** Always run `npm run type-check` (`tsc --noEmit`) after significant refactoring to catch silent errors. Ensure no raw API keys (e.g., `AIza...`) are hardcoded before attempting to commit, as the local Husky pre-commit hooks will reject the push.


## Running the App
```bash
npm start          # Expo dev server
npm run ios        # iOS simulator
npm run android    # Android emulator
npm run deploy:functions  # Deploy Firebase Cloud Functions
```

## Known Issues / BUGS
- Profile picture does not appear in Profile tab after upload (frontend display bug). Upload itself works on backend (Storage + Firestore `profilePictureUrl` is saved correctly).
- See commit history for context on the profile picture fix attempts.

## Conventions
- All Firebase/Firestore operations go in `src/services/dbService.ts` — do not scatter Firebase calls across screens
- Guard every Firebase call with `isFirebaseEnabled()` and null checks on `db`, `auth`, `storage`
- Mock data (`MOCK_USERS`, `MOCK_ITEMS`) is used for development/testing when Firebase is not configured
- TypeScript strict mode; no `any` unless unavoidable
