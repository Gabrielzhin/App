# Missing Features & Improvements for Beta Launch

*Last Updated: January 12, 2026*

This document catalogs all missing features, improvements, and known issues that need to be addressed before and during beta testing with ~20 users.

---

## 🔴 CRITICAL - Must Fix Before Beta

These issues will prevent successful testing or cause user frustration.

### 1. Forgot Password / Reset Password
**Status**: ❌ Not Implemented  
**Impact**: Users locked out of accounts have no recovery option  
**Files Affected**: 
- `src/screens/auth/LoginScreen.tsx` - Need "Forgot Password?" link
- `backend/src/routes/auth.ts` - Need reset endpoints
- New screen: `ForgotPasswordScreen.tsx`

**Implementation Needed**:
- POST `/api/auth/forgot-password` - Send reset email
- POST `/api/auth/reset-password` - Accept token + new password
- Email template for reset link
- Token expiration (1 hour recommended)

---

### 2. Email Service Integration
**Status**: ❌ Backend TODOs exist, no actual integration  
**Impact**: Email verification, password reset, notifications all broken  
**Location**: `backend/src/routes/verification.ts` lines 19, 24

**Options**:
- **SendGrid** (recommended for ease): Free tier = 100 emails/day
- **AWS SES**: Cheaper at scale, more setup
- **Resend**: Developer-friendly, good free tier

**Code to Replace**:
```typescript
// Current (line 19):
// TODO: Integrate with email service (SendGrid, AWS SES, etc.)

// Needed:
const sendEmail = async (to: string, subject: string, html: string) => {
  // SendGrid/SES/Resend implementation
};
```

---

### 3. App Branding (Icons & Splash)
**Status**: ❌ Using default Expo assets  
**Impact**: Unprofessional appearance, poor first impression  
**Files**: 
- `assets/icon.png` - App icon (1024x1024)
- `assets/adaptive-icon.png` - Android adaptive (1024x1024)
- `assets/splash-icon.png` - Splash screen
- `app.json` - Configuration

**Sizes Needed**:
- iOS: 1024x1024 (single icon, Apple auto-generates sizes)
- Android Adaptive: 1024x1024 foreground + background color
- Splash: 1284x2778 (iPhone 14 Pro Max) for full coverage

---

### 4. Terms of Service / Privacy Policy
**Status**: ❌ No screens or content  
**Impact**: Legal requirement for app stores, GDPR compliance  

**Required Screens**:
- `TermsOfServiceScreen.tsx` - Full ToS content
- `PrivacyPolicyScreen.tsx` - Privacy policy content
- Checkbox on `RegisterScreen.tsx` - "I agree to..."
- Links in profile settings

**Content Needed** (from legal/template):
- Data collection practices
- Third-party services (Stripe, Supabase)
- User rights (GDPR, CCPA)
- Contact information

---

## 🟡 IMPORTANT - Should Fix for Good Beta Experience

### 5. Push Notifications
**Status**: ❌ Not implemented  
**Impact**: Users miss friend requests, comments, messages  
**Package**: `expo-notifications`

**Implementation Steps**:
1. `npx expo install expo-notifications`
2. Add to `app.json` plugins
3. Request permission on app load
4. Store push token in backend (`User.pushToken`)
5. Send notifications on events (friend request, comment, etc.)

---

### 6. Onboarding Flow
**Status**: ❌ Users go straight to empty timeline  
**Impact**: Confusion about how to use app  

**Recommended Screens**:
1. Welcome + app overview (3-4 slides)
2. Profile picture upload
3. First friend invite (optional)
4. Create first memory prompt
5. Store "hasOnboarded" in AsyncStorage

---

### 7. Delete Account
**Status**: ❌ Not implemented  
**Impact**: Legal requirement (GDPR "right to be forgotten")  
**Backend Endpoint**: POST `/api/users/delete-account`

**Must Handle**:
- Cancel Stripe subscription
- Delete all user data (memories, photos, comments)
- Remove from Supabase storage
- Anonymize referral data
- Confirmation prompt (type "DELETE" to confirm)

---

### 8. Report User/Content
**Status**: 🟡 Backend TODO exists, no frontend  
**Location**: `src/screens/main/FriendProfileScreen.tsx` line 151  

**Implementation**:
- Report button in memory detail + profile screens
- POST `/api/reports` endpoint
- Reason selection (spam, harassment, inappropriate)
- Admin dashboard to review (future)

---

### 9. Block User UI
**Status**: 🟡 Backend exists, no frontend  
**Current**: Backend can block, but no way for users to do it  

**Needed**:
- Block button on profile screens
- Blocked users list in settings
- Unblock functionality
- Hide blocked users from feeds

---

## 🟢 NICE TO HAVE - Can Add During/After Beta

### 10. Error Boundary
**Status**: ❌ App crashes show white screen  
**Solution**: Wrap app in error boundary component
```tsx
// src/components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component {
  // Catch JS errors, show friendly message
  // Option to restart/report
}
```

---

### 11. Offline Mode Indicator
**Status**: ❌ No indication when offline  
**Solution**: NetInfo listener + banner component

---

### 12. Analytics
**Status**: ❌ No tracking  
**Options**: Amplitude, Mixpanel, PostHog  
**Value**: Understand user behavior during beta

---

### 13. Crash Reporting
**Status**: ❌ No crash reports  
**Solution**: Sentry (`npx expo install @sentry/react-native`)
**Value**: See crashes in production, fix before user reports

---

### 14. Rate Limiting
**Status**: ❌ No rate limits on API  
**Risk**: Abuse, accidental DDoS from buggy clients  
**Solution**: `@fastify/rate-limit`

---

### 15. Deep Linking
**Status**: ❌ Can't share links to specific content  
**Use Case**: Share memory link → opens in app  
**Solution**: Expo Linking + universal links config

---

## 📋 KNOWN BUGS

### Bug 1: Edit Profile Picture May Not Work
**Status**: Needs testing  
**Impact**: Low - workaround is to register with correct picture

### Bug 2: Socket Connection Cleanup
**Status**: Memory leak potential  
**Location**: WebSocket connections not cleaned up on unmount  
**Impact**: Performance degradation over long sessions

### Bug 3: Audio Player Cleanup
**Status**: Audio.Sound refs may not be released  
**Impact**: Memory leaks, audio playing after leaving screen

---

## 🏗️ TECHNICAL DEBT

### 1. Inconsistent Loading States
- Some screens have spinners, others don't
- Need unified loading component

### 2. Error Handling Inconsistency
- Some screens show alerts, others silently fail
- Need unified error handling pattern

### 3. TypeScript Any Usage
- Several `any` types that should be properly typed
- Search for `: any` in codebase

### 4. Test Coverage
- Auth and permissions have tests
- Missing: memory creation, groups, notifications

---

## 📊 FEATURE PRIORITY MATRIX

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Forgot Password | High | Low | P0 |
| Email Service | High | Medium | P0 |
| App Branding | High | Low | P0 |
| ToS/Privacy | High | Low | P0 |
| Push Notifications | High | Medium | P1 |
| Delete Account | High | Medium | P1 |
| Onboarding | Medium | Medium | P1 |
| Report/Block UI | Medium | Low | P2 |
| Error Boundary | Medium | Low | P2 |
| Analytics | Low | Low | P3 |
| Crash Reporting | Medium | Low | P2 |

---

## 🎯 BETA TESTING FOCUS AREAS

For your 20-user beta test, prioritize testing:

1. **Core Flow**: Register → Create Memory → Share → Comment
2. **Social Flow**: Send friend request → Accept → View timeline
3. **Group Flow**: Create group → Invite → Post → Chat
4. **Payment Flow**: Subscribe → Access features → Cancel (use test mode)
5. **Edge Cases**: No internet, background app, force close

---

## 📝 FEEDBACK COLLECTION

For beta testers:
- Create feedback form (Google Forms, Typeform)
- In-app feedback button (shake to report?)
- Weekly check-in surveys
- Bug report template:
  - What were you doing?
  - What happened?
  - What did you expect?
  - Screenshot/recording
