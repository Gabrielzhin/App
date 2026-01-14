# Bubble Social Media App

A mobile social media application built with React Native/Expo that connects to your existing Bubble backend.

## Features

- 📱 **Cross-Platform**: iOS & Android from single codebase
- 🔐 **Authentication**: Secure login/register with JWT tokens
- 📝 **Memories**: Create rich memories with photos, moods, and locations
- 👥 **Groups**: Join and interact with communities
- 🎨 **Beautiful UI**: Modern design with glassmorphic elements
- 💎 **Freemium Model**: RESTRICTED and FULL modes with upgrade flow
- 🔄 **Real-time**: Auto-save drafts and instant updates

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Studio
- **Backend running at C:\Users\posta\bubble**

## Setup Instructions

### 1. Install Dependencies

\`\`\`bash
npm install
\`\`\`

### 2. Configure Backend Connection

Update `src/config/env.ts` with your backend URL:

\`\`\`typescript
export const CONFIG = {
  // For local testing, use your computer's IP address (not localhost)
  // Find it with: ipconfig (Windows) or ifconfig (Mac/Linux)
  API_URL: __DEV__ ? 'http://192.168.1.100:4000' : 'https://your-api.com',
  
  SUPABASE_URL: 'your-supabase-url',
  SUPABASE_ANON_KEY: 'your-supabase-anon-key',
};
\`\`\`

**Important**: When testing on a physical device or emulator, use your computer's IP address instead of `localhost`. The device can't access `localhost` since it refers to the device itself.

### 3. Start Backend Server

Navigate to your backend directory and start the server:

\`\`\`bash
cd C:\Users\posta\bubble\backend
npm run dev
\`\`\`

Verify it's running at `http://localhost:4000`

### 4. Start Expo Development Server

\`\`\`bash
npm start
\`\`\`

Then:
- Press `i` for iOS Simulator
- Press `a` for Android Emulator  
- Scan QR code with Expo Go app for physical device

## Project Structure

\`\`\`
src/
├── config/          # Environment configuration
├── contexts/        # React contexts (AuthContext)
├── navigation/      # React Navigation setup
├── screens/         # App screens
│   ├── auth/        # Login, Register
│   └── main/        # Timeline, CreateMemory, Groups, Profile
├── services/        # API service layer
│   ├── api.ts       # Axios client with auth
│   ├── auth.ts      # Authentication endpoints
│   ├── memory.ts    # Memory CRUD
│   ├── group.ts     # Group management
│   └── upload.ts    # Photo uploads
├── types/           # TypeScript types
└── utils/           # Utility functions
\`\`\`

## Backend Integration

The app connects to your existing Bubble backend (Fastify API) and reuses:

- ✅ PostgreSQL database via Prisma
- ✅ JWT authentication
- ✅ Memory/timeline endpoints
- ✅ Group management
- ✅ File uploads (Supabase Storage)
- ✅ Subscription/payment logic (Stripe)
- ✅ Referral system

**No backend changes needed!** The API endpoints are already mobile-ready.

## Key Files to Customize

### API Configuration
- `src/config/env.ts` - Backend URL and API keys

### Authentication  
- `src/contexts/AuthContext.tsx` - User state management
- `src/services/auth.ts` - Login/register/logout

### Screens
- `src/screens/auth/LoginScreen.tsx`
- `src/screens/main/TimelineScreen.tsx`
- `src/screens/main/CreateMemoryScreen.tsx`

## Testing the App

### 1. Create Test Account

Register a new account through the app or use existing credentials from your web app.

### 2. Test Core Features

- ✅ Login/Register
- ✅ View timeline
- ✅ Create memory (requires FULL mode)
- ✅ Upload photos
- ✅ Join groups

### 3. Test Permissions

By default, new users are in `RESTRICTED` mode:
- Can view memories/timeline
- Cannot create/edit content
- See upgrade prompts

Upgrade to `FULL` mode:
\`\`\`bash
# In backend directory
npm run upgrade-user your-email@example.com
\`\`\`

## Development Workflow

### Running on iOS
\`\`\`bash
npm run ios
\`\`\`

### Running on Android
\`\`\`bash
npm run android
\`\`\`

### Running on Web (for testing)
\`\`\`bash
npm run web
\`\`\`

### Debugging
- Shake device to open Expo Dev Menu
- Enable Remote Debugging in Dev Menu
- View logs in terminal with `npm start`

## Common Issues

### "Network request failed"
- Check backend is running (`http://localhost:4000`)
- Update `API_URL` to use your computer's IP address
- Disable firewalls temporarily
- Ensure backend has `CORS` enabled for your IP

### "401 Unauthorized"
- Token might be expired
- Try logging out and back in
- Check token storage in SecureStore

### Images not uploading
- Verify Supabase credentials in `env.ts`
- Check camera/photo permissions
- Ensure backend `/api/uploads` endpoint is working

## Next Steps

1. ✅ **Test on Device**: Install Expo Go and scan QR code
2. 🎨 **Customize Design**: Update colors in screen styles
3. 📸 **Add Features**: Implement camera, location, mood pickers
4. 💳 **Stripe Integration**: Add in-app purchases for upgrades
5. 🚀 **Build & Deploy**: Create standalone apps with `eas build`

## Building for Production

### Using EAS (Recommended)

\`\`\`bash
# Install EAS CLI
npm install -g eas-cli

# Configure project
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android  
eas build --platform android
\`\`\`

### Environment Variables for Production

Create `.env.production`:
\`\`\`
API_URL=https://your-production-api.com
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-production-key
\`\`\`

## Tech Stack

- **Framework**: Expo 54 (React Native 0.81)
- **Language**: TypeScript
- **Navigation**: React Navigation 7
- **State**: Zustand + React Context
- **HTTP**: Axios
- **Storage**: Expo SecureStore (encrypted)
- **UI**: React Native Paper + Vector Icons
- **Backend**: Fastify (Node.js) - **Reused from C:\Users\posta\bubble**

## License

Private project

## Support

For backend API questions, refer to:
- `C:\Users\posta\bubble\docs\copilot-instructions.md`
- Backend README at `C:\Users\posta\bubble\backend\README.md`
