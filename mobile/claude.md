# Nexus CRM Mobile App

React Native mobile companion app for the Nexus CRM web application.

## Tech Stack

- **Framework**: React Native with Expo SDK 54
- **Language**: TypeScript
- **Authentication**: Firebase Auth (email/password + Google Sign-In)
- **Database**: Firestore (shared with web app)
- **Navigation**: React Navigation (native-stack + bottom-tabs)
- **Google Sign-In**: @react-native-google-signin/google-signin (requires development build)

## Project Structure

```
mobile/
├── src/
│   ├── config/
│   │   └── firebase.ts      # Firebase initialization with AsyncStorage persistence
│   ├── contexts/
│   │   └── AuthContext.tsx  # Auth state management
│   ├── navigation/
│   │   └── AppNavigator.tsx # Tab and stack navigation setup
│   ├── screens/
│   │   ├── LoginScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   ├── ContactsScreen.tsx
│   │   ├── ContactDetailScreen.tsx
│   │   ├── AddContactScreen.tsx
│   │   ├── TasksScreen.tsx
│   │   ├── AddTaskScreen.tsx
│   │   └── LogInteractionScreen.tsx
│   ├── services/
│   │   ├── authService.ts      # Auth operations (sign in, sign up, Google)
│   │   └── firestoreService.ts # Firestore CRUD operations
│   └── types.ts                # Shared TypeScript types
├── app.json                    # Expo configuration
└── App.tsx                     # Entry point
```

## Development

### Running in Expo Go (limited functionality)
```bash
npx expo start
```

### Development Build (required for Google Sign-In)
```bash
npx expo prebuild
npx expo run:ios
```

### Environment Variables

Copy `.env.example` to `.env` and fill in Firebase credentials:
- `EXPO_PUBLIC_FIREBASE_*` - Firebase project config
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` - iOS OAuth client ID
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` - Web OAuth client ID (needed for idToken)

## Key Implementation Notes

- Firebase auth uses `getReactNativePersistence(AsyncStorage)` for session persistence
- Google Sign-In requires native module, won't work in Expo Go
- iOS bundle identifier: `com.nexuscrm.app`
- Firestore queries filter by `userId` to scope data per user
- Types are duplicated from `shared/types.ts` due to Metro bundler limitations

## Navigation Structure

- **Unauthenticated**: LoginScreen (email/password + Google)
- **Authenticated**:
  - Tab Navigator:
    - Home (dashboard)
    - Contacts (list → detail → add/log interaction)
    - Tasks (list → add)
