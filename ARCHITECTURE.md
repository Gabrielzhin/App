# Architecture Overview

## System Architecture

\`\`\`
┌─────────────────────────────────────────────────────┐
│                  Mobile App (React Native)          │
│                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │
│  │   Screens    │  │  Contexts    │  │  Utils   │ │
│  │              │  │              │  │          │ │
│  │ - Login      │  │ - Auth       │  │ - Theme  │ │
│  │ - Register   │  │              │  │ - Helpers│ │
│  │ - Timeline   │  │              │  │          │ │
│  │ - Create     │  │              │  │          │ │
│  │ - Groups     │  │              │  │          │ │
│  │ - Profile    │  │              │  │          │ │
│  └──────┬───────┘  └──────┬───────┘  └──────────┘ │
│         │                 │                        │
│         └────────┬────────┘                        │
│                  │                                 │
│         ┌────────▼────────┐                        │
│         │   Services      │                        │
│         │  - api.ts       │                        │
│         │  - auth.ts      │                        │
│         │  - memory.ts    │                        │
│         │  - group.ts     │                        │
│         │  - upload.ts    │                        │
│         └────────┬────────┘                        │
└──────────────────┼──────────────────────────────────┘
                   │ HTTP/REST (Axios)
                   │ Authorization: Bearer <JWT>
                   │
┌──────────────────▼──────────────────────────────────┐
│       Backend (Fastify/Node.js)                     │
│       📁 C:\Users\posta\bubble\backend              │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │              Routes                          │  │
│  │  - /api/auth/*                               │  │
│  │  - /api/memories/*                           │  │
│  │  - /api/groups/*                             │  │
│  │  - /api/uploads/*                            │  │
│  │  - /api/categories/*                         │  │
│  └────────────────┬─────────────────────────────┘  │
│                   │                                 │
│  ┌────────────────▼─────────────────────────────┐  │
│  │          Middleware                          │  │
│  │  - fastify.authenticate (JWT verify)         │  │
│  │  - fastify.requireFullMode (permission)      │  │
│  └────────────────┬─────────────────────────────┘  │
│                   │                                 │
│  ┌────────────────▼─────────────────────────────┐  │
│  │         Prisma ORM                           │  │
│  │  - User, Memory, Group models                │  │
│  │  - Relationship, Category models             │  │
│  └────────────────┬─────────────────────────────┘  │
└───────────────────┼──────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
┌───────▼────────┐    ┌─────────▼────────┐
│   PostgreSQL   │    │  Supabase Storage│
│                │    │                  │
│ - users        │    │  - photos/       │
│ - memories     │    │  - avatars/      │
│ - groups       │    │  - covers/       │
│ - categories   │    │                  │
│ - ...          │    │                  │
└────────────────┘    └──────────────────┘
\`\`\`

## Data Flow

### Authentication Flow

\`\`\`
Mobile App                Backend              Database
    │                        │                     │
    │ POST /api/auth/login   │                     │
    ├───────────────────────>│                     │
    │                        │ Query user          │
    │                        ├────────────────────>│
    │                        │<────────────────────┤
    │                        │ Verify password     │
    │                        │ Generate JWT        │
    │<───────────────────────┤                     │
    │ { token, user }        │                     │
    │                        │                     │
    │ Save to SecureStore    │                     │
    │                        │                     │
\`\`\`

### Create Memory Flow

\`\`\`
Mobile App                Backend              Supabase         Database
    │                        │                     │              │
    │ 1. Pick images         │                     │              │
    │                        │                     │              │
    │ 2. Upload photos       │                     │              │
    ├───────────────────────>│                     │              │
    │ POST /api/uploads      │ Upload files        │              │
    │                        ├────────────────────>│              │
    │                        │<────────────────────┤              │
    │<───────────────────────┤ { url, path }       │              │
    │                        │                     │              │
    │ 3. Create memory       │                     │              │
    ├───────────────────────>│                     │              │
    │ POST /api/memories     │ Check permissions   │              │
    │ {content, photos[]}    │ (FULL mode required)│              │
    │                        │                     │              │
    │                        │ Create memory       │              │
    │                        ├────────────────────────────────────>│
    │                        │<────────────────────────────────────┤
    │<───────────────────────┤ { memory }          │              │
    │                        │                     │              │
    │ Navigate to Timeline   │                     │              │
    │                        │                     │              │
\`\`\`

## Permission System

\`\`\`
┌─────────────────────────────────────────┐
│           User Modes                    │
├─────────────────────────────────────────┤
│                                         │
│  ┌────────────────────────────────┐    │
│  │      RESTRICTED (Free)         │    │
│  │  - View memories/timeline ✓    │    │
│  │  - Browse groups ✓             │    │
│  │  - View profiles ✓             │    │
│  │  - Create content ✗            │    │
│  │  - Upload photos ✗             │    │
│  │  - Comment ✗                   │    │
│  └────────────────────────────────┘    │
│                                         │
│  ┌────────────────────────────────┐    │
│  │      FULL (Premium)            │    │
│  │  - All RESTRICTED features ✓   │    │
│  │  - Create memories ✓           │    │
│  │  - Upload photos ✓             │    │
│  │  - Create/join groups ✓        │    │
│  │  - Comment ✓                   │    │
│  │  - Reactions ✓                 │    │
│  └────────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘

Middleware Check:
fastify.requireFullMode() → 403 if RESTRICTED
\`\`\`

## State Management

\`\`\`
┌───────────────────────────────────────────────┐
│              AuthContext                      │
│  - user: User | null                          │
│  - loading: boolean                           │
│  - isAuthenticated: boolean                   │
│  - login(email, password)                     │
│  - register(...)                              │
│  - logout()                                   │
│  - refreshUser()                              │
└───────────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
┌───────▼──────┐       ┌────────▼────────┐
│  Screens     │       │  Services       │
│  - Access    │       │  - Make API     │
│    user data │       │    calls with   │
│  - Check     │       │    auth token   │
│    permissions│      │                 │
└──────────────┘       └─────────────────┘
\`\`\`

## Navigation Structure

\`\`\`
RootNavigator
├── isAuthenticated = false
│   └── AuthStack (Stack Navigator)
│       ├── LoginScreen
│       └── RegisterScreen
│
└── isAuthenticated = true
    └── MainTabs (Tab Navigator)
        ├── Timeline (Stack)
        │   ├── TimelineScreen
        │   └── MemoryDetailScreen
        ├── Groups (Stack)
        │   ├── GroupsScreen
        │   └── GroupDetailScreen
        ├── Create (Screen)
        │   └── CreateMemoryScreen
        └── Profile (Stack)
            ├── ProfileScreen
            ├── EditProfileScreen
            └── SettingsScreen
\`\`\`

## File Upload Flow

\`\`\`
┌─────────────┐
│ Image Picker│
│ or Camera   │
└──────┬──────┘
       │ Local URI
       │ (file:///...)
       ▼
┌──────────────┐
│ uploadService│
│ .uploadPhoto │
└──────┬───────┘
       │ FormData
       │ (multipart)
       ▼
┌──────────────┐
│ POST /api/   │
│   uploads    │
└──────┬───────┘
       │
       ▼
┌──────────────┐     ┌──────────────┐
│ Backend      │────>│ Supabase     │
│ - Validate   │     │ Storage      │
│ - Process    │     │ - Save file  │
│ - Generate   │     │ - Return URL │
│   path       │     │              │
└──────┬───────┘     └──────────────┘
       │
       │ { url, path }
       ▼
┌──────────────┐
│ Store in     │
│ Memory.photos│
│ array        │
└──────────────┘
\`\`\`

## Technology Stack

### Mobile App
- **Framework**: Expo 54 (React Native 0.81)
- **Language**: TypeScript 5.9
- **Navigation**: React Navigation 7
- **HTTP Client**: Axios
- **State**: React Context + Zustand
- **Storage**: Expo SecureStore (encrypted)
- **UI**: React Native Paper + Vector Icons

### Backend (Existing - Reused)
- **Framework**: Fastify (Node.js)
- **Language**: TypeScript
- **Database**: PostgreSQL 15
- **ORM**: Prisma
- **Auth**: JWT (@fastify/jwt)
- **Storage**: Supabase Storage
- **Payments**: Stripe

## Key Design Decisions

### Why Expo?
- Rapid development
- Cross-platform (iOS + Android)
- Rich ecosystem (camera, location, etc.)
- OTA updates
- Easy deployment (EAS Build)

### Why Context API?
- Simple for auth state
- No external dependencies
- Built-in to React
- Can upgrade to Redux/Zustand if needed

### Why Axios?
- Interceptors for auth tokens
- Better error handling than fetch
- Request/response transformation
- Familiar to backend team

### Why SecureStore?
- Encrypted storage (iOS Keychain, Android Keystore)
- Persistent across app restarts
- Perfect for JWT tokens
- Better than AsyncStorage for secrets

## Security Considerations

1. **JWT Storage**: Uses SecureStore (hardware-backed encryption)
2. **HTTPS**: Use HTTPS in production (enforced by iOS)
3. **Token Expiry**: Backend handles expiration, app clears on 401
4. **Permissions**: Server-side validation (never trust client)
5. **File Uploads**: Backend validates file types and sizes
6. **API Keys**: Never commit to git, use env.ts (gitignored)

## Performance Optimizations

1. **Lazy Loading**: Components loaded on demand
2. **Image Caching**: expo-image handles caching
3. **Pagination**: Load 20 items at a time
4. **Debouncing**: Search inputs (see utils/helpers.ts)
5. **Memoization**: React.memo for expensive renders
6. **Virtual Lists**: FlatList for long lists

## Future Enhancements

- [ ] Offline mode (AsyncStorage + sync queue)
- [ ] Push notifications (expo-notifications)
- [ ] Real-time updates (WebSocket/Socket.io)
- [ ] In-app purchases (expo-payments + Stripe)
- [ ] Analytics (Amplitude/Mixpanel)
- [ ] Crash reporting (Sentry)
- [ ] A/B testing
- [ ] Deep linking
