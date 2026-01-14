## Quick Start Guide

### 1. Find Your Computer's IP Address

**Windows:**
\`\`\`bash
ipconfig
\`\`\`
Look for "IPv4 Address" (e.g., 192.168.1.100)

**Mac/Linux:**
\`\`\`bash
ifconfig | grep "inet "
\`\`\`

### 2. Update API URL

Edit `src/config/env.ts`:
\`\`\`typescript
API_URL: __DEV__ ? 'http://YOUR-IP-HERE:4000' : 'https://your-api.com'
\`\`\`

### 3. Start Backend
\`\`\`bash
cd C:\Users\posta\bubble\backend
npm run dev
\`\`\`

### 4. Start Mobile App
\`\`\`bash
cd C:\Users\posta\live-arch
npm start
\`\`\`

### 5. Test on Device
- Open Expo Go app
- Scan QR code from terminal
- Login with your credentials

## Common Commands

\`\`\`bash
# Start development server
npm start

# iOS simulator
npm run ios

# Android emulator
npm run android

# Clear cache
npm start -- --clear

# View logs
npx react-native log-ios
npx react-native log-android
\`\`\`

## Testing Tips

1. **Test RESTRICTED Mode**: New user accounts start in free mode
2. **Upgrade User**: Run `npm run upgrade-user email@example.com` in backend
3. **Check Network**: Ensure phone and computer on same WiFi
4. **Debug API**: Check backend terminal for request logs

## Architecture Highlights

- **Reuses 100% of backend**: No API changes needed
- **Secure auth**: JWT tokens stored in encrypted SecureStore
- **Offline-ready**: Can add offline storage with AsyncStorage
- **Type-safe**: Full TypeScript with shared types from backend

## What's Implemented

✅ Authentication (login/register)
✅ Timeline view
✅ Create memories with photos
✅ Permission system (RESTRICTED/FULL)
✅ Groups list
✅ Profile screen with settings
✅ Image picker & camera
✅ Upgrade prompts

## What's Next

🔲 Memory detail view with comments
🔲 Group detail & chat
🔲 Relationship management UI
🔲 In-app purchases (Stripe)
🔲 Push notifications
🔲 Offline mode
🔲 Dark mode theme
