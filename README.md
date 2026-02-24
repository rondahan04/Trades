# Trades

A **Tinder-for-trades** bartering app built with React Native (Expo). Users list physical items with a value tier ($, $$, $$$) and swipe left/right on other users' items in the same tier to find a match.

## Features

- **Swipe deck** – Browse items with tier and category filters; swipe right to save as a match, left to pass
- **Item profiles** – View full description, location, owner, and rate items (1–5 stars)
- **Auth** – Register and sign in (mock auth with persistence via AsyncStorage)
- **My Items** – See items you’ve listed (mock data by owner)
- **Profile** – View your matches (“Want to trade”), your listed items, and sign out
- **Israeli-focused mock data** – Sample users and locations (Ra’anana, Herzliya, Tel Aviv, Haifa, etc.)

## Tech Stack

- **React Native** with **Expo** (managed workflow)
- **React Navigation** – Bottom tabs + native stack
- **react-native-reanimated** & **react-native-gesture-handler** – Swipe animations
- **@react-native-async-storage/async-storage** – Auth and data persistence
- **TypeScript**

## Prerequisites

- Node.js 18+
- npm or yarn
- iOS: Xcode and iOS Simulator (or Expo Go on device)
- (Optional) Android: Android Studio / emulator or Expo Go

## Setup

```bash
# Install dependencies
npm install

# Start Expo dev server
npm start
```

Then press **`i`** for iOS simulator or **`a`** for Android. Or scan the QR code with Expo Go on your device.

### First run (iOS)

1. Open the Simulator first: `open -a Simulator`
2. Run `npm start` and press **`i`**
3. If you see a Worklets version error, ensure `react-native-worklets` matches the Expo SDK version (e.g. `npx expo install react-native-reanimated react-native-worklets`)

## Mock login

- **Sign up** – Any email, password (min 6 chars), display name
- **Sign in** – Use e.g. `yael@example.com` / `password` (see `src/utils/mockData.ts` for other users)

## Project structure

```
src/
  components/     # SwipeableItemCard, etc.
  contexts/       # AuthContext, AppDataContext
  navigation/     # Root, Auth, Swipe, My Items, Profile stacks
  screens/        # Login, Register, SwipeDeck, ItemDetail, Profile, MyItems
  theme/          # colors (Nano Banana theme)
  utils/          # mockData (users, items, helpers)
  services/       # firebase stub (future)
```

## Scripts

| Command        | Description              |
|----------------|--------------------------|
| `npm start`    | Start Expo dev server     |
| `npm run ios`  | Start and open iOS       |
| `npm run android` | Start and open Android |

## License

Private project.
