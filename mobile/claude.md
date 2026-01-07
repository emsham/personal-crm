# Nexus CRM Mobile App

React Native mobile companion app for the Nexus CRM web application.

## Tech Stack

- **Framework**: React Native with Expo SDK 54
- **Language**: TypeScript
- **Authentication**: Firebase Auth (email/password + Google Sign-In)
- **Database**: Firestore (shared with web app)
- **Navigation**: React Navigation (native-stack + bottom-tabs)
- **Google Sign-In**: @react-native-google-signin/google-signin (requires development build)
- **AI Integration**: Gemini & OpenAI APIs (BYOK - Bring Your Own Key) with streaming and tool calling

## Project Structure

```
mobile/
├── src/
│   ├── components/
│   │   ├── LLMSettingsModal.tsx      # AI provider configuration modal
│   │   └── chat/
│   │       ├── ChatMessage.tsx       # Message bubbles with tool call indicators
│   │       ├── ChatInput.tsx         # Auto-resize input with send/stop
│   │       ├── ChatHistoryModal.tsx  # Chat history browser (sessions grouped by date)
│   │       ├── ToolResultCard.tsx    # Rich display of tool results (contacts, tasks, stats)
│   │       └── index.ts              # Component exports
│   ├── config/
│   │   └── firebase.ts               # Firebase initialization with AsyncStorage persistence
│   ├── contexts/
│   │   ├── AuthContext.tsx           # Auth state management
│   │   ├── LLMSettingsContext.tsx    # AI settings (API keys, provider selection)
│   │   ├── NotificationContext.tsx   # Push notification scheduling and permissions
│   │   └── ChatContext.tsx           # Chat session management (Firestore sync)
│   ├── navigation/
│   │   └── AppNavigator.tsx          # Tab and stack navigation setup
│   ├── screens/
│   │   ├── LoginScreen.tsx
│   │   ├── HomeScreen.tsx            # Full-screen AI chat (AI-first interface)
│   │   ├── DashboardScreen.tsx       # Stats, quick actions, recent contacts
│   │   ├── ContactsScreen.tsx
│   │   ├── ContactDetailScreen.tsx   # View/edit contact with full field support
│   │   ├── AddContactScreen.tsx      # Create contact with related contacts picker
│   │   ├── TasksScreen.tsx
│   │   ├── AddTaskScreen.tsx
│   │   └── LogInteractionScreen.tsx
│   ├── services/
│   │   ├── authService.ts            # Auth operations (sign in, sign up, Google)
│   │   ├── firestoreService.ts       # Firestore CRUD operations
│   │   ├── aiService.ts              # Streaming AI with OpenAI/Gemini + tool calling
│   │   ├── chatService.ts            # Chat session CRUD (Firestore sync with web app)
│   │   └── toolExecutors.ts          # CRM tool execution (search, add, update)
│   ├── shared/
│   │   └── ai/
│   │       ├── types.ts              # Shared AI types (ToolCall, LLMStreamChunk, etc.)
│   │       ├── toolDefinitions.ts    # 12 CRM tools (same as web app)
│   │       ├── systemPrompt.ts       # AI system prompt builder
│   │       └── index.ts              # Module exports
│   └── types.ts                      # Shared TypeScript types
├── app.json                          # Expo configuration
└── App.tsx                           # Entry point with providers
```

## AI-First Architecture

The mobile app now matches the web app's AI-first design:

### Conditional Home Screen
The Home tab adapts based on AI configuration status:

**When AI is NOT configured:**
- Shows Dashboard view as the default home screen
- Prominent "Enable AI Assistant" banner at top (tappable to open settings)
- Full dashboard with stats, quick actions, tasks, and contacts
- Bottom tab shows "Dashboard" with 📊 icon

**When AI IS configured:**
- Shows full-screen AI chat interface
- Dashboard accessible via "Dashboard" button in header
- Bottom tab shows "AI" with ✨ icon

### AI Chat Features
- **Full-screen chat interface** - AI is the primary interaction method
- **Non-streaming responses** - Uses standard fetch (React Native doesn't support ReadableStream)
- **Tool calling** - AI can search contacts, add tasks, log interactions, get stats
- **Rich tool results** - Contacts, tasks, interactions displayed as interactive cards
- **Dashboard access** - Button to access stats/quick actions when needed
- **Chat history** - Persistent sessions synced to Firestore (shared with web app)

### Chat History
- **Firestore persistence** - Conversations saved to `users/{userId}/chatSessions`
- **Cross-platform sync** - Same sessions visible in web app
- **Session browser** - History button in header opens session list modal
- **Date grouping** - Sessions grouped by Today, Yesterday, Last 7 Days, etc.
- **Auto-title** - Session title generated from first user message
- **Session management** - Create new, switch between, or delete sessions

### AI Capabilities (12 CRM Tools)
**Query Tools:**
- `searchContacts` - Search by name, company, email, tags, status
- `getContactDetails` - Full contact info with interactions & tasks
- `searchInteractions` - Filter by contact, type, date, content
- `searchTasks` - Filter by status, priority, due date, contact
- `getStats` - CRM metrics (overview, by type, birthdays, overdue)

**Create Tools:**
- `addContact` - Create new contacts with related contacts linking
- `addInteraction` - Log meetings, calls, emails, etc.
- `addTask` - Create tasks with contact linking

**Update Tools:**
- `updateContact` - Modify contact info
- `updateTask` - Mark complete, change priority, reschedule

### API Implementation
- **Non-streaming fetch** - React Native's fetch doesn't support ReadableStream, so we use standard JSON responses
- Uses callback interface (`onText`, `onToolCall`, `onDone`, `onError`) for consistent API
- AbortController support for cancellation
- Multi-turn tool execution loop (up to 5 iterations)

## Dashboard Screen
- Stats grid (active contacts, needs attention, pending tasks, overdue)
- Quick actions (Add Contact, Log Interaction, Add Task)
- Upcoming tasks (due within 7 days)
- Recent contacts list
- Contacts needing attention (drifting status)

## Features

### Contact Management
- **Full editing support**: All fields editable (name, company, position, email, phone, birthday, tags, notes)
- **Important Dates**: Add/remove custom dates (anniversaries, etc.) in MM-DD format
- **Linked Contacts**: View and manage related contacts with search picker
- **Quick actions**: Call, Email, Log Interaction, Add Task (pre-linked)
- Delete contact with confirmation (in Danger Zone)

### AI Integration (BYOK)
- Supports **Gemini** and **OpenAI** providers
- API keys encrypted (AES-256) and synced to Firestore across all devices
- Direct API calls from app to provider
- **Streaming responses** with real-time updates
- **Tool calling** with rich result display
- Same 12 tools as web app via shared module

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
- Shared AI module copied to `src/shared/ai/` due to Metro bundler limitations
- Bottom tab bar uses `useSafeAreaInsets()` for proper spacing on notched iPhones
- AI API keys stored in AsyncStorage with `nexus_llm_` prefix

## Navigation Structure

- **Unauthenticated**: LoginScreen (email/password + Google)
- **Authenticated**:
  - Tab Navigator (dynamic based on AI config):
    - Home tab:
      - **AI not configured**: "Dashboard" (📊) - shows dashboard with "Enable AI" banner
      - **AI configured**: "AI" (✨) - shows full-screen chat
    - Contacts (list → detail with edit/delete → add/log interaction)
    - Tasks (list → add)
    - Settings (sign out)
  - Stack screens:
    - Dashboard (accessible from AI chat header when AI is configured)
    - ContactDetail
    - AddContact, AddTask, LogInteraction (modals)

## Data Types

Key types from `types.ts`:
- `Contact`: firstName, lastName, email, phone, company, position, tags[], notes, birthday?, importantDates[], relatedContactIds[], status
- `Task`: title, description?, contactId?, dueDate?, dueTime?, reminderBefore?, priority, frequency, completed
- `Interaction`: contactId, date, type, notes
- `ImportantDate`: id, label, date (MM-DD format)
- `ChatSession`: id, title, messages[], createdAt, updatedAt
- `ChatMessage`: id, role, content, timestamp, toolCalls?, toolResults?, isStreaming?

Key AI types from `shared/ai/types.ts`:
- `ToolCall`: id, name, arguments
- `ToolResult`: toolCallId, name, result, success, error?
- `LLMStreamChunk`: type (text/tool_call/done/error), content?, toolCall?
- `ChatMessage`: id, role, content, toolCalls?, toolResults?, isStreaming?
