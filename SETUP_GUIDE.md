# 🚀 Bubble Social Media Mobile App - Complete Setup

## Overview

This is a React Native mobile app that **reuses your existing backend** from `C:\Users\posta\bubble`. No backend modifications needed!

### What's Built

✅ **Authentication System**
- Login/Register screens with validation
- JWT token storage (encrypted)
- Auto-login on app restart
- Secure logout

✅ **Core Features**
- Timeline/feed view with infinite scroll
- Create memories with photos
- Group browsing
- User profile with settings
- Permission system (RESTRICTED/FULL modes)

✅ **Media Handling**
- Image picker from gallery
- Camera integration
- Multi-photo uploads
- Photo preview & removal

✅ **UI/UX**
- Modern glassmorphic design
- Bottom tab navigation
- Pull-to-refresh
- Loading states
- Empty states
- Error handling

## Setup Instructions

### Step 1: Install Dependencies

Open a terminal in this directory and run:

\`\`\`bash
npm install
\`\`\`

Or use the setup script:
- **Windows**: Double-click `setup.bat`
- **Mac/Linux**: Run `chmod +x setup.sh && ./setup.sh`

### Step 2: Configure Backend Connection

**Important**: Mobile devices can't access `localhost`. You need your computer's IP address.

#### Find Your IP Address:

**Windows (PowerShell/CMD):**
\`\`\`bash
ipconfig
\`\`\`
Look for "IPv4 Address" under your network adapter (e.g., `192.168.1.100`)

**Mac:**
\`\`\`bash
ifconfig en0 | grep inet
\`\`\`

**Linux:**
\`\`\`bash
hostname -I
\`\`\`

#### Update Configuration:

Edit `src/config/env.ts`:

\`\`\`typescript
export const CONFIG = {
  // Replace with YOUR computer's IP address
  API_URL: __DEV__ ? 'http://192.168.1.100:4000' : 'https://your-production-api.com',
  
  // Copy from your backend/.env
  SUPABASE_URL: 'https://your-project.supabase.co',
  SUPABASE_ANON_KEY: 'your-anon-key-here',
};
\`\`\`

### Step 3: Start Backend Server

Open a **separate terminal** and navigate to your backend:

\`\`\`bash
cd C:\Users\posta\bubble\backend
npm run dev
\`\`\`

Verify it's running:
- Open browser to http://localhost:4000/health (if health endpoint exists)
- Check terminal for "Server listening at http://..."

### Step 4: Start Mobile App

Back in the app directory:

\`\`\`bash
npm start
\`\`\`

This opens the Expo Dev Tools. Choose your platform:

- **iOS Simulator**: Press `i` (Mac only)
- **Android Emulator**: Press `a` (requires Android Studio)
- **Physical Device**: Scan QR code with Expo Go app

### Step 5: Install Expo Go (For Physical Devices)

- **iOS**: [Download from App Store](https://apps.apple.com/app/expo-go/id982107779)
- **Android**: [Download from Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

### Step 6: Test the App

1. **Register** a new account (or use existing credentials)
2. **View timeline** - should see existing memories from web app
3. **Try creating** a memory (need FULL mode - see below)
4. **Test photo upload** - tap camera/gallery icons
5. **Browse groups** - see your existing groups

## Upgrading User to FULL Mode

New users start in `RESTRICTED` mode (read-only). To test full features:

\`\`\`bash
# In backend directory
cd C:\Users\posta\bubble\backend
npm run upgrade-user your-email@example.com
\`\`\`

Or use the dev endpoint (dev mode only):
\`\`\`bash
curl -X POST http://localhost:4000/api/dev/upgrade-me \\
  -H "Authorization: Bearer YOUR_TOKEN"
\`\`\`

## Troubleshooting

### "Network request failed"

**Cause**: Can't reach backend
**Solutions**:
1. Verify backend is running (`cd C:\Users\posta\bubble\backend && npm run dev`)
2. Check IP address in `src/config/env.ts` matches your computer's IP
3. Ensure phone and computer are on **same WiFi network**
4. Disable Windows Firewall temporarily to test
5. Check backend CORS settings allow mobile device IP

### "Unable to resolve module"

**Cause**: Missing dependencies
**Solution**:
\`\`\`bash
rm -rf node_modules
npm install
npm start -- --clear
\`\`\`

### "401 Unauthorized" after login

**Cause**: Token issue
**Solution**:
1. Log out and log back in
2. Check backend JWT_SECRET is set correctly
3. Verify token expiry settings

### Camera/Photos not working

**Cause**: Missing permissions
**Solution**:
- iOS: Check Settings > Expo Go > Camera & Photos
- Android: Grant permissions when prompted
- Ensure using HTTPS or localhost (not HTTP with IP on iOS)

### Can't connect to Expo

**Cause**: Network/firewall issues
**Solution**:
1. Use tunnel mode: `npm start -- --tunnel`
2. Or LAN mode: `npm start -- --lan`
3. Disable VPN if active

## Project Structure Explained

\`\`\`
live-arch/
├── App.tsx                 # Root component with providers
├── src/
│   ├── config/
│   │   └── env.ts         # 🔧 UPDATE THIS: Backend URL & API keys
│   ├── contexts/
│   │   └── AuthContext.tsx # User authentication state
│   ├── navigation/
│   │   └── RootNavigator.tsx # Tab + Stack navigation
│   ├── screens/
│   │   ├── auth/          # Login, Register
│   │   └── main/          # Timeline, CreateMemory, Groups, Profile
│   ├── services/
│   │   ├── api.ts         # Axios client with auth interceptors
│   │   ├── auth.ts        # Auth endpoints
│   │   ├── memory.ts      # Memory CRUD
│   │   ├── group.ts       # Group management
│   │   └── upload.ts      # Photo uploads
│   ├── types/
│   │   └── index.ts       # TypeScript types (matches backend)
│   └── utils/
│       ├── helpers.ts     # Utility functions
│       └── theme.ts       # Design system
└── docs/
    └── copilot-instructions.md # Backend architecture docs
\`\`\`

## Key Differences from Web App

| Feature | Web | Mobile |
|---------|-----|--------|
| **Auth Storage** | Cookies | SecureStore (encrypted) |
| **Navigation** | Next.js Router | React Navigation |
| **Image Picker** | HTML input | expo-image-picker |
| **Permissions** | None | Camera, Photos, Location |
| **Styling** | Tailwind CSS | StyleSheet |

## Backend Integration Points

All endpoints from your Fastify backend are available:

**Auth:**
- POST `/api/auth/register`
- POST `/api/auth/login`
- POST `/api/auth/logout`
- GET `/api/auth/me`

**Memories:**
- GET `/api/memories` (timeline)
- POST `/api/memories` (create)
- GET `/api/memories/:id` (detail)
- PUT `/api/memories/:id` (update)
- DELETE `/api/memories/:id` (delete)

**Groups:**
- GET `/api/groups`
- POST `/api/groups`
- GET `/api/groups/:id`
- POST `/api/groups/:id/join`

**Uploads:**
- POST `/api/uploads` (photo upload)

**Categories:**
- GET `/api/categories`
- POST `/api/categories`

## Development Workflow

### Daily Development

1. Start backend (keep running):
   \`\`\`bash
   cd C:\Users\posta\bubble\backend
   npm run dev
   \`\`\`

2. Start mobile app:
   \`\`\`bash
   cd C:\Users\posta\live-arch
   npm start
   \`\`\`

3. Make changes to files in `src/`
4. App reloads automatically
5. Shake device to open dev menu

### Useful Commands

\`\`\`bash
# Clear cache and restart
npm start -- --clear

# View logs (iOS)
npx react-native log-ios

# View logs (Android)
npx react-native log-android

# Type check
npx tsc --noEmit

# Upgrade backend user
cd C:\Users\posta\bubble\backend
npm run upgrade-user email@example.com
\`\`\`

### Testing Features

**Test RESTRICTED Mode:**
1. Register new user
2. Try creating memory → see upgrade prompt
3. View timeline → works (read-only)

**Test FULL Mode:**
1. Upgrade user via backend command
2. Restart app (or refresh user)
3. Create memory with photos → works
4. Edit/delete content → works

## Next Development Steps

### High Priority
- [ ] Memory detail screen with comments
- [ ] Comment creation/deletion
- [ ] Reactions (likes) on memories
- [ ] Group detail screen
- [ ] Search functionality

### Medium Priority
- [ ] Relationship management UI
- [ ] Category picker with custom colors
- [ ] Location picker with map
- [ ] Mood selector UI
- [ ] Draft auto-save
- [ ] Pull-to-refresh on all lists

### Nice to Have
- [ ] Dark mode theme
- [ ] Push notifications
- [ ] Offline mode with sync
- [ ] In-app Stripe subscription
- [ ] Share memories externally
- [ ] Memory collections
- [ ] Advanced filters

## Building for Production

When ready to deploy:

### 1. Install EAS CLI
\`\`\`bash
npm install -g eas-cli
eas login
\`\`\`

### 2. Configure Build
\`\`\`bash
eas build:configure
\`\`\`

### 3. Build iOS
\`\`\`bash
eas build --platform ios
\`\`\`

### 4. Build Android
\`\`\`bash
eas build --platform android
\`\`\`

### 5. Submit to Stores
\`\`\`bash
eas submit --platform ios
eas submit --platform android
\`\`\`

## Performance Tips

1. **Optimize Images**: Use `expo-image` (already included)
2. **Lazy Load**: Implement virtual lists for long feeds
3. **Cache**: Use AsyncStorage for offline data
4. **Debounce**: Search/input handlers (see utils/helpers.ts)
5. **Memoize**: Use React.memo for heavy components

## Support & Resources

- **Backend Docs**: `C:\Users\posta\bubble\docs\copilot-instructions.md`
- **Expo Docs**: https://docs.expo.dev
- **React Navigation**: https://reactnavigation.org
- **React Native**: https://reactnative.dev

## Common Questions

**Q: Can I use the web and mobile app simultaneously?**
A: Yes! They share the same backend and database.

**Q: Do I need to change the backend?**
A: No, it's already mobile-ready. Just ensure CORS allows mobile device IPs.

**Q: How do I test payments?**
A: Use Stripe test mode keys, implement in-app purchases with expo-payments

**Q: Can I add push notifications?**
A: Yes, use expo-notifications + backend webhook integration

**Q: How do I deploy to app stores?**
A: Use EAS Build (see "Building for Production" section)

---

**Need help?** Check the backend logs and mobile app console for detailed error messages.
