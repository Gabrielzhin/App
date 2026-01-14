# Bubble - Memory Library Social Platform

## Project Overview
Full-stack social media service for storing and sharing "memories" (notes, photos, comments) in personal and group timelines. Diary-like experience with freemium subscription model.

**Current Status**: React Native/Expo mobile app with Fastify backend. Ready for beta testing.

**Mobile App**: React Native + Expo (iOS + Android from single codebase). Backend API works with both platforms.

---

## ✅ COMPLETED FEATURES

### Core Memory System
- [x] Create/edit/delete memories with rich content
- [x] Photo uploads (multiple) with carousel viewing
- [x] Voice notes (up to 5 minutes recording)
- [x] Audio playback in feeds and detail views
- [x] Location tagging with map picker
- [x] Mood tracking with emoji selection
- [x] Memory dates (when it happened vs when created)
- [x] Draft auto-save functionality
- [x] Core memories (mark important memories)
- [x] Privacy levels (PUBLIC, FRIENDS, ONLY_TAGGED, PRIVATE)
- [x] Categories (custom color-coded tags)

### Social Features
- [x] Friend system (send/accept/decline requests)
- [x] Friend profiles with timeline view
- [x] Friend activity feed
- [x] Comments on memories
- [x] Reactions (emoji reactions)
- [x] User search functionality
- [x] Profile visibility settings (PUBLIC, FRIENDS_ONLY, PRIVATE)

### Groups
- [x] Create/edit groups with customization (color, avatar, cover)
- [x] Group privacy levels (PUBLIC, PRIVATE, FRIENDS_ONLY)
- [x] Group member management (invite, remove, roles)
- [x] Group memories (shared timeline)
- [x] Group chat (real-time messaging via Socket.io)
- [x] Direct messages between users
- [x] Group discovery/search for PUBLIC groups

### Relationship System (3-Level Hierarchy)
- [x] Relationship categories (Work, School, Family, etc.)
- [x] Subcategories (company names, school names)
- [x] Detail levels (department, team)
- [x] Assign friends to relationships
- [x] Default categories on registration

### Collections
- [x] Memory collections (organize memories into albums)
- [x] Add/remove memories from collections
- [x] Collection sharing

### Quiz System
- [x] Create "How well do you know me" quizzes
- [x] Friends can take quizzes
- [x] Quiz results and scoring

### Orbit (Contact Tracking)
- [x] Orbit items for tracking important contacts
- [x] Configuration and management

### Authentication & Authorization
- [x] Email/password registration and login
- [x] JWT-based authentication
- [x] User modes (RESTRICTED vs FULL)
- [x] Permission middleware for protected routes

### Payments & Subscriptions
- [x] Stripe integration for subscriptions
- [x] Webhook handling for payment events
- [x] Grace period logic for failed payments
- [x] Subscription management screen
- [x] Pricing page

### Referral System
- [x] Referral codes generation
- [x] Track referrals
- [x] Payout methods (PayPal, Stripe Connect, Gift Cards)
- [x] Admin payout management

### Notifications
- [x] In-app notification system
- [x] Notification list screen
- [x] Real-time notifications via Socket.io

### Performance Optimizations
- [x] React Query caching (5min stale, 10min cache)
- [x] API response compression (gzip)
- [x] Image optimization (WebP, thumbnails)
- [x] Client-side image compression
- [x] Database indexes for common queries
- [x] Pagination (20 items default)

---

## ❌ MISSING FEATURES (Required for Beta)

### Critical for Launch
- [ ] **Forgot Password / Reset Password flow**
- [ ] **Email service integration** (SendGrid/AWS SES for verification emails)
- [ ] **Push notifications** (expo-notifications)
- [ ] **App icons and splash screens** (custom branding)
- [ ] **Terms of Service / Privacy Policy screens**
- [ ] **Onboarding flow** for new users

### Important for User Experience
- [ ] **Delete account** functionality
- [ ] **Report user/content** functionality (backend TODO exists)
- [ ] **Block user** UI (backend exists, no frontend)
- [ ] **Edit profile picture** (may need fixing)
- [ ] **Loading states** consistency across screens
- [ ] **Error boundary** for crash recovery
- [ ] **Offline mode** indicator

### Nice to Have
- [ ] **Analytics** (Amplitude/Mixpanel)
- [ ] **Crash reporting** (Sentry)
- [ ] **Rate limiting** on API endpoints
- [ ] **Deep linking** for sharing memories/profiles

---

## 🔧 KNOWN ISSUES

1. **Email/SMS verification**: Backend TODOs - needs actual service integration
2. **Webhook notifications**: TODO for referral success emails
3. **Report endpoint**: Not implemented (FriendProfileScreen line 151)

---

## Architecture

### Stack
- **Backend**: Node.js/TypeScript with Fastify (ESM modules via `"type": "module"`)
- **Mobile**: React Native + Expo (iOS + Android)
- **Database**: PostgreSQL 15 via Prisma ORM
- **Payments**: Stripe for subscription management
- **Storage**: Supabase Storage (for photos/videos/audio)
- **Testing**: Vitest for unit/integration tests
- **Infrastructure**: Docker Compose for local development

### Key Components
- `backend/src/` - Fastify API server with routes in `routes/` directory
- `backend/prisma/` - Database schema, migrations, and seed scripts
- `backend/src/workers/` - Background jobs (payouts, reconcile)
- `frontend/src/app/` - Next.js App Router pages
- `frontend/src/contexts/` - React contexts (AuthContext for user state)
- `frontend/src/lib/` - Shared utilities (api.ts for Axios client, theme.ts for design system)
- `frontend/src/components/` - Reusable React components (navigation, relationships, UI)
- `docker-compose.yml` - Postgres (port 5432) + Adminer (port 8080)

### UI Design System
- **Theme**: Consistent colors, spacing, and shadows in `frontend/src/lib/theme.ts`
- **Memory Cards**: Glassmorphic design with category color bars (4px left border), photo carousels, enhanced badges with backdrop-blur
- **Animations**: Framer Motion for fade-in effects, staggered delays, smooth transitions
- **Layout**: max-w-5xl containers for consistent content width across dashboard, timeline, and groups
- **Category Badges**: gap-2 spacing, px-3 py-1.5 padding, backdrop-blur-sm, subtle borders matching category colors, box shadows for depth, hover:scale-105

### Architecture Decisions
- **Fastify over NestJS**: Chosen for simplicity and faster solo development iteration. Minimal abstraction allows easier debugging and learning.
- **Vitest**: Faster test execution than Jest, better ESM support, compatible with Fastify patterns.
- **Top-level await**: ESM enables `await fastify.register(...)` at module level in `src/index.ts`
- **Decorator pattern**: `fastify.authenticate` and `fastify.requireFullMode` registered as reusable decorators

## Development Workflow

### Local Setup
```bash
# Start infrastructure
docker-compose up -d

# Backend setup (in backend/)
npm install
cp .env.example .env  # Configure DATABASE_URL, STRIPE_SECRET, STRIPE_WEBHOOK_SECRET
npx prisma migrate dev  # Run migrations
npx prisma generate     # Generate Prisma client
npm run dev             # Start server on PORT=4000

# Frontend setup (in frontend/)
npm install
# Create .env.local with NEXT_PUBLIC_API_URL=http://localhost:4000
npm run dev             # Start Next.js on port 3000
```

### Database Access
- **Adminer UI**: http://localhost:8080 (System: PostgreSQL, Server: postgres, User: postgres, Password: biel, Database: livearc)
- **Direct**: `postgresql://postgres:biel@localhost:5432/livearc`
- **Prisma Studio**: `npx prisma studio` (from backend/)

### Common Development Commands
```bash
# Backend (from backend/)
npm run dev              # Watch mode with tsx
npm test                 # Run Vitest tests
npm test:watch           # Watch mode for tests
npm run reconcile        # Sync subscription state with Stripe
npm run payouts          # Process scheduled referral payouts
npm run upgrade-user <email>  # Manually upgrade user to FULL mode
npx prisma migrate dev   # Create and apply migration
npx prisma generate      # Regenerate Prisma client after schema changes
npx prisma studio        # Open database GUI

# Frontend (from frontend/)
npm run dev              # Next.js dev server
npm run build            # Production build
npm run lint             # ESLint
```

### Testing Patterns
- **Integration tests**: Use `fastify.inject()` to simulate HTTP requests without starting server
- **Test isolation**: Each test file imports `build()` helper to create fresh Fastify instance
- **Auth testing**: Create test users, generate JWT tokens, pass in `Authorization: Bearer <token>` headers
- **Permission tests**: Verify RESTRICTED vs FULL mode access control (see `backend/src/routes/permissions.test.ts`)

### Debugging Quick Wins
- **Dev upgrade button**: Frontend dashboard shows "🧪 DEV: Upgrade to FULL" button when `NODE_ENV !== 'production'` and user is RESTRICTED
- **Dev routes**: POST `/api/dev/upgrade-me` and `/api/dev/downgrade-me` (only in dev mode)
- **Auth issues**: Check cookie path (`path: '/'` required in all Cookies operations)
- **Missing auth**: Ensure routes have `preHandler: [fastify.authenticate]` (common bug - see categories endpoint fix in DEVELOPMENT_LOG.md)
- **Database state**: Use Adminer or Prisma Studio to inspect tables directly

## Data Model Patterns

### Core Domain Models
```prisma
// User modes define freemium access control
enum UserMode { RESTRICTED, FULL }

model User {
  mode             UserMode  @default(RESTRICTED)
  stripeCustomerId String?   @unique
  subscription     Subscription?
  
  // Relationship system (3-level hierarchy)
  relationshipCategories    RelationshipCategory[]     // e.g., "Work"
  relationshipSubcategories RelationshipSubcategory[]  // e.g., "Acme Corp"
  relationshipDetails       RelationshipDetail[]       // e.g., "Engineering"
  friendRelationships       FriendRelationship[]       // Assignments
  
  // Groups
  groupMemberships GroupMember[]
  groupInvitesReceived GroupInvitation[]
}

model Memory {
  userId        String
  aboutUserId   String?       // Whose timeline (for friend pages)
  groupId       String?       // Group memories visible to all members
  privacy       MemoryPrivacy @default(PUBLIC)  // PUBLIC, FRIENDS, ONLY_TAGGED, PRIVATE
  isDraft       Boolean       @default(false)
  lastAutoSaved DateTime?     // Auto-save tracking
  memoryDate    DateTime?     // When memory happened (vs createdAt)
  
  // Rich content
  title         String?
  content       String
  photos        String[]      // Supabase Storage URLs
  moods         String[]      // e.g., ["happy 😊", "excited 🎉"]
  location      String?
  latitude      Decimal?
  longitude     Decimal?
  
  categories    MemoryCategory[]  // Many-to-many with Category
  collectionsIn MemoryInCollection[]  // Memory collections (linking feature)
}

model Group {
  privacy     GroupPrivacy  @default(FRIENDS_ONLY)  // PUBLIC, PRIVATE, FRIENDS_ONLY
  memberCount Int           @default(0)  // Denormalized for performance
  coverImage  String?       // Banner image
  color       String?       // Theme color (hex)
  
  members     GroupMember[]
  invitations GroupInvitation[]
  memories    Memory[]
}
```

### Relationship System (3-Level Hierarchy)
Per-friend taxonomy for tracking "how you know" each person:
1. **Category** (top): Work, School, Family, Social, Online, Hobby, Organization, Uncategorized
2. **Subcategory** (middle): Company name, school name, custom labels
3. **Detail** (optional): Department, team, specific context

**Pattern**: Users get default categories on registration via `seedDefaultRelationships()` called in `auth.ts` registration flow. Groups auto-suggest relationship creation (e.g., joining "Acme Corp" group suggests creating "Work → Acme Corp" relationship via `suggestRelationship()` in `groups.ts`).

## Permission System

### Enforcement Rules
- **RESTRICTED mode**: Read-only access (view memories, timelines)
- **FULL mode**: Full write access (create/edit memories, comments, photos)

### Middleware Pattern (Fastify)
```typescript
// Decorators registered in backend/src/index.ts
fastify.decorate('authenticate', async function (request, reply) {
  await request.jwtVerify();
  const user = await prisma.user.findUnique({
    where: { id: request.user.id },
    select: { id: true, email: true, mode: true },
  });
  if (!user) return reply.code(401).send({ error: 'User not found' });
  request.user = user;
});

fastify.decorate('requireFullMode', async function (request, reply) {
  if (request.user?.mode === 'RESTRICTED') {
    return reply.code(403).send({ error: 'Upgrade required' });
  }
});

// Usage in route files:
fastify.post('/api/memories', {
  preHandler: [fastify.authenticate, fastify.requireFullMode]
}, async (request, reply) => { /* ... */ });
```

### Critical Pattern: Always Include Auth Middleware
**Common bug**: Routes without `preHandler: [fastify.authenticate]` will fail. Example from `DEVELOPMENT_LOG.md`:
```typescript
// ❌ BAD - Missing authentication causes redirect loops
fastify.get('/api/categories', async (request, reply) => { ... });

// ✅ GOOD - Auth middleware properly included
fastify.get('/api/categories', {
  preHandler: [fastify.authenticate]
}, async (request, reply) => { ... });
```

### Protected Endpoints (Require FULL Mode)
- POST `/api/memories` - Create memories
- POST `/api/comments` - Add comments
- POST `/api/uploads` - Upload photos/videos
- POST `/api/groups` - Create groups
- PUT/DELETE `/api/memories/:id` - Edit/delete resources

## Stripe Integration

### Webhook Event Handling
```typescript
// Update user.mode based on subscription status
switch (stripeEvent.type) {
  case 'customer.subscription.updated':
  case 'customer.subscription.created':
    // TRIALING | ACTIVE → mode = FULL
    // PAST_DUE | CANCELED → mode = RESTRICTED (with grace period)
  case 'invoice.payment_failed':
    // Keep FULL for grace period (e.g., 3-7 days) before → RESTRICTED
}
```

### Grace Period Logic
- Payment failures: Maintain FULL mode for **7-day grace period**
- After grace expiry: Switch to RESTRICTED, preserve data (no deletion)
- Reconciliation job: Hourly sync to catch missed webhooks
- Store `gracePeriodEndsAt` on Subscription model for tracking

## Testing Conventions

### Permission Tests (Vitest + Fastify)
```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { build } from './helper'; // Fastify app factory

describe('POST /api/memories', () => {
  let app;
  
  beforeAll(async () => {
    app = await build();
  });

  it('allows FULL mode users to create', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/memories',
      headers: { authorization: 'Bearer <full-mode-token>' },
      payload: { content: 'Test memory' }
    });
    expect(response.statusCode).toBe(200);
  });

  it('blocks RESTRICTED mode users', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/memories',
      headers: { authorization: 'Bearer <restricted-token>' },
      payload: { content: 'Test memory' }
    });
    expect(response.statusCode).toBe(403);
  });
});
```

## Frontend Integration

### User Context
```typescript
// frontend/src/contexts/AuthContext.tsx
// Expose via /api/auth/me endpoint
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  register: (email: string, username: string, password: string, ...) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

// Available via useAuth hook in all components
const { user, loading, login, logout, refreshUser } = useAuth();
```

### API Client Pattern
```typescript
// frontend/src/lib/api.ts - Axios instance with auto-auth
import axios from 'axios';
import Cookies from 'js-cookie';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
});

// Auto-inject JWT token from cookies
api.interceptors.request.use((config) => {
  const token = Cookies.get('token', { path: '/' });
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Usage in components:
import api from '@/lib/api';
const response = await api.get('/api/memories');
```

### Cookie Management Pattern
**Critical**: Always include `path: '/'` in cookie operations:
```typescript
// ✅ CORRECT
Cookies.set('token', token, { path: '/' });
Cookies.get('token', { path: '/' });
Cookies.remove('token', { path: '/' });

// ❌ WRONG - Causes token not found errors
Cookies.set('token', token);  // Default path is current route
```

### UI Gating (Next.js)
```typescript
// app/components/CreateMemoryButton.tsx
'use client';
import { useAuth } from '@/contexts/AuthContext';

export function CreateMemoryButton() {
  const { user } = useAuth();
  
  if (user.mode === 'RESTRICTED') {
    return <UpgradeCTA />;
  }
  
  return <button onClick={createMemory}>Create Memory</button>;
}
```

- Hide/disable create buttons for RESTRICTED users
- Show upgrade CTA with clear messaging ("Unlock full access")
- Link to Stripe Checkout or billing portal via `/api/checkout`
- Refresh user context after successful upgrade (revalidate `/api/me` or call `refreshUser()`)
- Use Next.js Server Actions for optimistic UI updates

## Referral Payout System
1
### Data Models
```prisma
model User {
  emailVerified    Boolean  @default(false)
  phoneVerified    Boolean  @default(false)
  referralCode     String   @unique @default(cuid())
  referredBy       String?  // ID of referrer
  payoutMethods    PayoutMethod[]
  referralsMade    Referral[] @relation("ReferrerReferrals")
}

model Referral {
  referrerId        String
  refereeId         String   @unique
  status            ReferralStatus  // PENDING, QUALIFIED, PAID, CANCELED
  qualifiedAt       DateTime?
  scheduledPayoutAt DateTime?  // 7 days after qualification
  payout            Payout?
}

model PayoutMethod {
  type      PayoutMethodType  // GIFT_CARD, PAYPAL, STRIPE_CONNECT
  details   Json              // Provider-specific (email, accountId, etc.)
  isDefault Boolean
  isActive  Boolean
}

model Payout {
  amount            Int       // cents
  status            String    // pending, completed, failed
  referralId        String?
  payoutMethodId    String?
  providerPayoutId  String?   // External transaction ID
  failureReason     String?
}
```

### Referral Flow
1. **User Registration**: Capture `ref` query param → set referral cookie → populate `User.referredBy` on signup
2. **First Payment**: `invoice.payment_succeeded` webhook creates `Referral` record with status=QUALIFIED and scheduledPayoutAt = now + 7 days
3. **Payout Processing**: Worker (`npm run payouts`) processes qualified referrals after scheduled date
4. **Payment Providers**: Tango (gift cards), PayPal (Payouts API), Stripe Connect (transfers)

### Verification Endpoints
- POST `/api/verify/email/request` - Send 6-digit code to user's email
- POST `/api/verify/email/confirm` - Verify code (24-hour expiry)
- POST `/api/verify/phone/request` - Send SMS code (E.164 format required)
- POST `/api/verify/phone/confirm` - Verify phone code

### Payout Management Endpoints
- GET `/api/payouts/methods` - List user's payout methods
- POST `/api/payouts/methods` - Add payout method (type + details)
- PUT `/api/payouts/methods/:id` - Update/set as default
- DELETE `/api/payouts/methods/:id` - Remove payout method
- GET `/api/payouts/referrals` - Referral stats and history
- GET `/api/payouts/history` - Payout transaction history

### Admin Endpoints (Protected by `ADMIN_EMAILS`)
- GET `/api/admin/referrals` - All referrals with user details
- GET `/api/admin/payouts/queue` - Referrals ready for payout
- GET `/api/admin/payouts/stats` - Aggregate statistics
- POST `/api/admin/payouts/:id/approve` - Manually trigger payout
- GET `/api/admin/payouts/export` - Export CSV of all payouts
- POST `/api/admin/referrals/:id/cancel` - Cancel pending/qualified referral

### Workers
- `npm run payouts` - Process scheduled payouts (cron: daily)
- `npm run reconcile` - Sync subscription state with Stripe (cron: hourly)

### Payment Provider Adapters
```typescript

// PayPal Payouts
class PayPalAdapter {
  async process(details, amount, currency) {
    // Call PayPal Payouts API with details.email
    // Return { success: true, transactionId: 'paypal_...' }
  }
}

// Stripe Connect Transfers
class StripeConnectAdapter {
  async process(details, amount, currency) {
    const transfer = await stripe.transfers.create({
      amount, currency,
      destination: details.accountId,
    });
    return { success: true, transactionId: transfer.id };
  }
}
```

### Fraud Prevention
- **7-day hold period**: Payouts scheduled 7 days after qualification to prevent chargeback fraud
- **Verification requirement**: Email/phone verification can be required before payout method creation
- **Manual review**: Admins can review queue before approval
- **Subscription validation**: Referral only qualifies if referee remains subscribed

## Environment Variables

### Backend (`backend/.env`)
- `DATABASE_URL` - Prisma connection string
- `STRIPE_SECRET` - Stripe API key (sk_test_* or sk_live_*)
- `STRIPE_WEBHOOK_SECRET` - Webhook signature verification (whsec_*)
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_KEY` - Service role key for storage operations
- `PORT` - API server port (default: 4000)
- `JWT_SECRET` - Secret for signing auth tokens
- `ADMIN_EMAILS` - Comma-separated list of admin emails for payout management
- `FRONTEND_URL` - CORS origin (default: http://localhost:3000)
- `LOG_LEVEL` - Fastify log level (default: info)

### Frontend (`frontend/.env.local`)
- `NEXT_PUBLIC_API_URL` - Backend API URL (http://localhost:4000)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase URL for client-side storage
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Anon key for client uploads

## Migration Strategy
For existing products: Default `User.mode = FULL` to avoid breaking current users. New signups: Default to `RESTRICTED`.
