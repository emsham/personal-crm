# Nexus CRM Mobile App

React Native mobile companion app for the Nexus CRM web application.

## Tech Stack

- **Framework**: React Native with Expo SDK 54
- **Language**: TypeScript
- **Authentication**: Firebase Auth (email/password + Google Sign-In)
- **Database**: Firestore (shared with web app)
- **Navigation**: React Navigation (native-stack + bottom-tabs)
- **Google Sign-In**: @react-native-google-signin/google-signin (requires development build)
- **AI Integration**: Gemini & OpenAI APIs (BYOK - Bring Your Own Key)

## Project Structure

```
mobile/
├── src/
│   ├── components/
│   │   └── LLMSettingsModal.tsx  # AI provider configuration modal
│   ├── config/
│   │   └── firebase.ts           # Firebase initialization with AsyncStorage persistence
│   ├── contexts/
│   │   ├── AuthContext.tsx       # Auth state management
│   │   └── LLMSettingsContext.tsx # AI settings (API keys, provider selection)
│   ├── navigation/
│   │   └── AppNavigator.tsx      # Tab and stack navigation setup
│   ├── screens/
│   │   ├── LoginScreen.tsx
│   │   ├── HomeScreen.tsx        # Dashboard with AI chat, stats, recent contacts
│   │   ├── ContactsScreen.tsx
│   │   ├── ContactDetailScreen.tsx # View/edit contact with full field support
│   │   ├── AddContactScreen.tsx  # Create contact with related contacts picker
│   │   ├── TasksScreen.tsx
│   │   ├── AddTaskScreen.tsx
│   │   └── LogInteractionScreen.tsx
│   ├── services/
│   │   ├── authService.ts        # Auth operations (sign in, sign up, Google)
│   │   ├── firestoreService.ts   # Firestore CRUD operations
│   │   └── aiService.ts          # Gemini & OpenAI API integration
│   └── types.ts                  # Shared TypeScript types
├── app.json                      # Expo configuration
└── App.tsx                       # Entry point with providers
```

## Features

### Dashboard (HomeScreen)
- Stats grid (active contacts, needs attention, pending tasks, overdue)
- **AI Chat**: Integrated Nexus AI with quick suggestions and conversation history
- Quick actions (Add Contact, Log Interaction, Add Task)
- Recent Contacts list (clickable, navigates to detail)

### Contact Management
- **Full editing support**: All fields editable (name, company, position, email, phone, birthday, tags, notes)
- **Important Dates**: Add/remove custom dates (anniversaries, etc.) in MM-DD format
- **Linked Contacts**: View and manage related contacts with search picker
- **Quick actions**: Call, Email, Log Interaction, Add Task (pre-linked)
- Delete contact with confirmation (in Danger Zone)

### AI Integration (BYOK)
- Supports **Gemini** and **OpenAI** providers
- API keys stored locally in AsyncStorage (never sent to our servers)
- Direct API calls from app to provider
- Context-aware responses using contact and task data
- Quick suggestion buttons on dashboard

### Contact Picker Component
- Search bar with real-time filtering
- Scrollable list with max height
- Shows contact name and company
- Used in: AddContactScreen, ContactDetailScreen (linked contacts), AddTaskScreen

## Development

### Running in Expo Go (limited functionality)
```bash
npx expo start
```
Note: Google Sign-In and some native features won't work in Expo Go.

### Development Build (required for full functionality)
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
- Bottom tab bar uses `useSafeAreaInsets()` for proper spacing on notched iPhones
- AI API keys stored in AsyncStorage with `nexus_llm_` prefix

## Navigation Structure

- **Unauthenticated**: LoginScreen (email/password + Google)
- **Authenticated**:
  - Tab Navigator:
    - Home (dashboard with AI chat)
    - Contacts (list → detail with edit/delete → add/log interaction)
    - Tasks (list → add)

## Data Types

Key types from `types.ts`:
- `Contact`: firstName, lastName, email, phone, company, position, tags[], notes, birthday?, importantDates[], relatedContactIds[], status
- `Task`: title, description?, contactId?, dueDate?, priority, frequency, completed
- `Interaction`: contactId, date, type, notes
- `ImportantDate`: id, label, date (MM-DD format)
