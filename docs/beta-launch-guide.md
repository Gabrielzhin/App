# Beta Launch Guide - Testing with 20 Users

*Last Updated: January 12, 2026*

This guide walks you through making Bubble ready for testing with a small group (20 users) on both iOS and Android.

---

## 📋 Table of Contents

1. [Pre-Launch Checklist](#pre-launch-checklist)
2. [Infrastructure Setup](#infrastructure-setup)
3. [App Distribution](#app-distribution)
4. [Test vs Production Differences](#test-vs-production-differences)
5. [Beta Testing Process](#beta-testing-process)
6. [Monitoring & Support](#monitoring--support)

---

## 🔲 Pre-Launch Checklist

### Must Complete Before Sharing App

- [ ] **Backend Deployed** - Hosted on Render/Railway/Fly.io
- [ ] **Database Migrated** - Production PostgreSQL running
- [ ] **Supabase Configured** - Storage bucket public, CORS set
- [ ] **Stripe Test Mode** - Test API keys configured
- [ ] **Environment Variables** - All production values set
- [ ] **App Icons** - Custom icons in `assets/`
- [ ] **App Built** - Development builds for iOS/Android

### Recommended But Optional for Beta

- [ ] Forgot Password flow
- [ ] Email service (can test without)
- [ ] Push notifications
- [ ] Terms of Service screens
- [ ] Analytics

---

## 🖥️ Infrastructure Setup

### Step 1: Deploy Backend

#### Option A: Render (Recommended - Free Tier Available)

1. Create account at [render.com](https://render.com)
2. Connect GitHub repository
3. Create new **Web Service**:
   - Root Directory: `backend`
   - Build Command: `npm install && npx prisma generate`
   - Start Command: `npm start`
4. Add Environment Variables:
   ```
   DATABASE_URL=postgresql://...
   JWT_SECRET=your-secure-secret-here
   STRIPE_SECRET=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   SUPABASE_URL=https://xxx.supabase.co
   SUPABASE_SERVICE_KEY=eyJ...
   FRONTEND_URL=*
   PORT=10000
   NODE_ENV=production
   ```
5. Deploy

#### Option B: Railway

1. Create account at [railway.app](https://railway.app)
2. New Project → Deploy from GitHub
3. Select `backend` folder
4. Railway auto-detects Node.js
5. Add environment variables (same as above)

#### Option C: Fly.io

```bash
cd backend
fly launch
fly secrets set DATABASE_URL=... JWT_SECRET=... # etc
fly deploy
```

### Step 2: Database (PostgreSQL)

#### Option A: Supabase (Recommended - Same as Storage)

1. Already have Supabase? Use its built-in PostgreSQL
2. Go to Project Settings → Database
3. Copy connection string (use **pooling** connection)
4. Update `DATABASE_URL` in backend

#### Option B: Render PostgreSQL

1. In Render, create new **PostgreSQL** database
2. Copy Internal Connection String
3. Use in `DATABASE_URL`

#### Option C: Railway PostgreSQL

1. In Railway, Add New → Database → PostgreSQL
2. Copy connection string from Variables tab

### Step 3: Run Migrations

After backend is deployed:

```bash
# From your local machine, pointing to production DB
cd backend
DATABASE_URL="postgresql://prod-connection-string" npx prisma migrate deploy
```

Or add to build command in hosting:
```
npm install && npx prisma generate && npx prisma migrate deploy
```

### Step 4: Configure Supabase Storage

1. Go to Supabase Dashboard → Storage
2. Create bucket: `memory-photos` (if not exists)
3. Make bucket **public**:
   ```sql
   -- In SQL Editor
   UPDATE storage.buckets SET public = true WHERE id = 'memory-photos';
   ```
4. Add CORS policy:
   - Go to Storage → Policies
   - Allow all origins for beta (restrict later)

### Step 5: Stripe Test Mode

1. Keep using `sk_test_*` keys (NOT live keys)
2. Create test products in Stripe Dashboard:
   - Product: "Bubble Premium"
   - Price: $9.99/month (or your price)
3. Update price IDs in code
4. For webhooks:
   - Add endpoint: `https://your-backend.com/api/webhooks/stripe`
   - Select events: `customer.subscription.*`, `invoice.*`
   - Copy webhook secret to `STRIPE_WEBHOOK_SECRET`

---

## 📱 App Distribution

### iOS Testing (TestFlight)

#### Prerequisites
- Apple Developer Account ($99/year)
- Mac with Xcode installed
- EAS CLI: `npm install -g eas-cli`

#### Steps

1. **Configure app.json**:
   ```json
   {
     "expo": {
       "ios": {
         "bundleIdentifier": "com.yourcompany.bubble",
         "supportsTablet": true,
         "buildNumber": "1"
       }
     }
   }
   ```

2. **Create EAS Build**:
   ```bash
   # Login to Expo
   eas login
   
   # Configure EAS
   eas build:configure
   
   # Create iOS build for internal testing
   eas build --platform ios --profile preview
   ```

3. **Upload to TestFlight**:
   - Download the `.ipa` from EAS
   - Open Transporter app (Mac App Store)
   - Upload `.ipa`
   - In App Store Connect, go to TestFlight
   - Add internal testers (up to 100)
   - Send invites

4. **Testers Install**:
   - Download TestFlight app
   - Accept invite email
   - Install Bubble from TestFlight

### Android Testing (Internal Testing)

#### Prerequisites
- Google Play Developer Account ($25 one-time)
- EAS CLI

#### Steps

1. **Configure app.json**:
   ```json
   {
     "expo": {
       "android": {
         "package": "com.yourcompany.bubble",
         "versionCode": 1
       }
     }
   }
   ```

2. **Create EAS Build**:
   ```bash
   # Create Android build
   eas build --platform android --profile preview
   ```

3. **Create App in Play Console**:
   - Go to [play.google.com/console](https://play.google.com/console)
   - Create new app
   - Fill in basic info

4. **Upload to Internal Testing**:
   - Go to Release → Testing → Internal testing
   - Create new release
   - Upload `.aab` from EAS build
   - Add testers by email (up to 100)

5. **Testers Install**:
   - Accept invite email
   - Download from Play Store (internal track)

### Quick Local Testing (No App Store)

For faster iteration during beta:

#### Android (APK Direct Install)

```bash
# Build APK instead of AAB
eas build --platform android --profile development

# Share APK file directly with testers
# They enable "Install from unknown sources" and install
```

#### iOS (Development Build)

```bash
# Create development build
eas build --platform ios --profile development

# Requires device UDIDs registered in Apple Developer
# More complex setup, TestFlight is easier
```

### EAS Build Profiles (eas.json)

Create `eas.json` in project root:

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      },
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "distribution": "store"
    }
  }
}
```

---

## ⚖️ Test vs Production Differences

| Aspect | Beta Testing | Real Production Launch |
|--------|--------------|----------------------|
| **Stripe** | Test mode (`sk_test_*`) | Live mode (`sk_live_*`) |
| **Users** | 20 invited testers | Public access |
| **Data** | Can be wiped | Must preserve |
| **Errors** | Expected, learning | Must be minimal |
| **Email** | Optional/manual | Required (verification) |
| **Push** | Optional | Required |
| **Legal** | ToS optional | ToS required |
| **Analytics** | Optional | Required |
| **Monitoring** | Basic logs | Full observability |
| **Support** | Direct contact | Help center/tickets |
| **Updates** | Frequent builds | Staged rollouts |
| **App Store** | TestFlight/Internal | Public listing |
| **Reviews** | None | App store review |

### For Production Launch Later:

1. **Stripe Live Mode**: 
   - Complete Stripe account verification
   - Switch to `sk_live_*` keys
   - Set up real webhook endpoint

2. **Email Service**:
   - Integrate SendGrid/SES
   - Verify sending domain
   - Create email templates

3. **App Store Submission**:
   - Screenshots for all device sizes
   - App description and keywords
   - Privacy policy URL
   - Support URL
   - Age rating questionnaire

4. **Legal Requirements**:
   - Terms of Service (lawyer reviewed)
   - Privacy Policy (GDPR/CCPA compliant)
   - Data Processing Agreement

5. **Monitoring**:
   - Sentry for crash reporting
   - Analytics (Amplitude/Mixpanel)
   - Uptime monitoring (Pingdom/UptimeRobot)

---

## 🧪 Beta Testing Process

### Recruiting Testers

**Ideal Beta Tester Profile**:
- Mix of iOS and Android users
- Varied technical skill levels
- Friends/family for honest feedback
- Some heavy social media users
- Some not on social media

**Tester Onboarding**:
1. Send invite with install instructions
2. Share getting-started doc
3. Create group chat (Discord/WhatsApp) for feedback
4. Set expectations: "This is a test, expect bugs"

### Feedback Collection

#### Option A: Simple (Google Form)

Create form with questions:
- What did you try to do?
- What worked well?
- What was confusing?
- Any crashes or errors?
- Feature requests?

#### Option B: In-App Feedback

Add shake-to-report or feedback button:
```tsx
// Add to App.tsx
import { Alert } from 'react-native';

// Simple feedback prompt
const showFeedback = () => {
  Alert.prompt(
    'Send Feedback',
    'What would you like to share?',
    (text) => {
      // Send to backend or email
      api.post('/api/feedback', { message: text });
    }
  );
};
```

#### Option C: Bug Tracking

Use GitHub Issues:
- Create issue template for bugs
- Label system (bug, feature, question)
- Testers need GitHub accounts

### Testing Schedule

**Week 1: Core Features**
- Registration/Login
- Create first memory
- Add photos
- View timeline

**Week 2: Social Features**
- Send friend requests
- Comment on memories
- Join groups
- Group chat

**Week 3: Advanced Features**
- Collections
- Quizzes
- Relationship system
- Subscription flow (test mode)

**Week 4: Edge Cases**
- Offline behavior
- Background app
- Lots of content
- Multiple devices

---

## 🔍 Monitoring & Support

### Basic Monitoring (Free)

#### Backend Logs
- Render/Railway have built-in logs
- Check for errors: `[ERROR]`, `500`, `crash`
- Monitor response times

#### Uptime Monitoring
- [UptimeRobot](https://uptimerobot.com) - Free tier
- Add backend URL
- Get alerts when down

### Database Monitoring

```sql
-- Check user count
SELECT COUNT(*) FROM "User";

-- Check memory count
SELECT COUNT(*) FROM "Memory";

-- Recent errors (if you log them)
SELECT * FROM "ErrorLog" ORDER BY "createdAt" DESC LIMIT 10;
```

### Tester Support

**Quick Support Setup**:
1. Create shared email: `support@yourdomain.com`
2. Or use existing email with filter
3. Group chat for real-time issues

**Escalation Path**:
1. Tester reports issue in group chat
2. You reproduce locally
3. Fix and deploy
4. Notify tester to retry

---

## 🚀 Launch Day Checklist

### Morning of Launch

- [ ] Backend running and healthy
- [ ] Database migrated and connected
- [ ] Latest app build uploaded
- [ ] Test login on real device
- [ ] Test creating a memory
- [ ] Test friend request flow
- [ ] Stripe test payment works

### Send Invites

- [ ] Email TestFlight/Play Store invites
- [ ] Share install instructions
- [ ] Post in tester group chat
- [ ] Be available for support

### First Hour

- [ ] Monitor logs for errors
- [ ] Watch for tester messages
- [ ] Be ready for hotfixes
- [ ] Celebrate! 🎉

---

## 📊 Success Metrics

Track these during beta:

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Install Rate | 80%+ of invites | TestFlight/Play analytics |
| Daily Active | 10+ users | Database query |
| Memories Created | 50+ total | Database query |
| Session Length | 5+ min avg | Analytics (future) |
| Crash-Free | 95%+ | Sentry (future) |
| Retention (D7) | 50%+ | Database query |

### Quick Queries

```sql
-- Daily active users (last 7 days)
SELECT DATE("updatedAt") as day, COUNT(DISTINCT id) 
FROM "User" 
WHERE "updatedAt" > NOW() - INTERVAL '7 days'
GROUP BY DATE("updatedAt");

-- Memories per user
SELECT "userId", COUNT(*) as memory_count
FROM "Memory"
GROUP BY "userId"
ORDER BY memory_count DESC;

-- Feature usage
SELECT 
  COUNT(*) FILTER (WHERE "groupId" IS NOT NULL) as group_memories,
  COUNT(*) FILTER (WHERE "audioUrl" IS NOT NULL) as voice_notes,
  COUNT(*) FILTER (WHERE array_length(photos, 1) > 0) as with_photos
FROM "Memory";
```

---

## ❓ FAQ

**Q: How long should beta testing last?**
A: 2-4 weeks is typical. Enough time for testers to form habits.

**Q: Should I charge during beta?**
A: No. Use Stripe test mode. It's a test, not a business yet.

**Q: What if I find a critical bug?**
A: Fix it, deploy, and push a new build. TestFlight/Play Console support updates.

**Q: Can testers invite friends?**
A: For this beta, keep it controlled. Add testers manually.

**Q: When am I ready for production?**
A: When:
- Critical bugs are fixed
- Core flows work reliably
- Testers report positive experience
- Legal requirements met
- You're ready for support load

---

## 🔗 Quick Reference

### Useful URLs

- Backend: `https://your-app.onrender.com`
- Supabase: `https://xxx.supabase.co`
- Stripe Dashboard: `https://dashboard.stripe.com/test`
- EAS Dashboard: `https://expo.dev`
- App Store Connect: `https://appstoreconnect.apple.com`
- Play Console: `https://play.google.com/console`

### Key Commands

```bash
# Build iOS
eas build --platform ios --profile preview

# Build Android  
eas build --platform android --profile preview

# Deploy backend (Render)
git push origin main  # Auto-deploys

# Check logs (Render)
render logs --tail

# Run migrations
DATABASE_URL="prod-url" npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

---

Good luck with your beta launch! 🚀
