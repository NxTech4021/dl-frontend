# DeuceLeague Mobile

Mobile app for players — match scheduling, league participation, chat, payments, and scorecards.

**Stack:** React Native + Expo SDK 54 + TypeScript + better-auth + NativeWind

## Prerequisites

- Node.js 20+
- yarn
- Expo CLI (`npm i -g expo-cli` or use `npx`)
- For native builds:
  - **iOS**: Xcode 15+ (macOS only)
  - **Android**: Android Studio + JDK 17
- Running [dl-backend](https://github.com/deuceleague/dl-backend) instance

## Setup

```bash
# Install dependencies
yarn install

# Configure environment
cp .env.example .env
# Set EXPO_PUBLIC_API_URL to your backend (use your machine's LAN IP for device testing)

# Start Expo dev server
yarn start
```

Then choose a target:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go app on a physical device

## Scripts

| Command | Purpose |
|---------|---------|
| `yarn start` | Launch Expo dev server |
| `yarn ios` | Build & run on iOS (requires native build) |
| `yarn android` | Build & run on Android (requires native build) |
| `yarn web` | Run in web browser |
| `yarn lint` | Run Expo lint |
| `yarn test` | Run Jest tests |

## Environment Variables

See [.env.example](.env.example). Required:

- `EXPO_PUBLIC_API_URL` — backend API URL (must be reachable from device/simulator)

> ⚠️ Variables prefixed with `EXPO_PUBLIC_` are bundled into the client — **never put secrets there**. Secrets must live on the backend.

## Native Build Notes

- **Firebase / Google Services**: requires `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) — not committed. Get from your Firebase console.
- **Apple Sign-In**: requires Apple Developer account and bundle ID configured (see `app.json`)
- Android/iOS folders are regenerated via `expo prebuild` — see [Expo docs](https://docs.expo.dev/workflow/continuous-native-generation/)

## Building for Release

Use EAS Build:

```bash
npx eas-cli build --platform ios
npx eas-cli build --platform android
```

Config: `eas.json` (create if missing — see Expo docs).

## Project Structure

```
src/
├── features/      # Feature-grouped screens and logic
├── components/    # Shared UI components
├── navigation/    # React Navigation setup
├── services/      # API clients, auth
├── hooks/
├── stores/        # State management
└── utils/

assets/            # Images, videos, fonts
```

## Troubleshooting

- **API requests fail on device**: `localhost` won't work from a phone — use your machine's LAN IP (e.g. `http://192.168.1.10:3000`)
- **Metro bundler stuck**: `yarn start --clear`
- **Native rebuild needed**: delete `android/`, `ios/`, run `npx expo prebuild`
