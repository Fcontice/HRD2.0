# Home Run Derby - Project Context

## PROJECT OVERVIEW

A web-based sports pooling application where users create fantasy teams of MLB players and compete based on real-world home run performance throughout the MLB season. Users pay $100 per team entry, and prizes are awarded monthly and at season end.

---

## TECH STACK

### Frontend
- **Framework**: React 18.3 with Vite 5
- **Language**: TypeScript 5.3
- **Styling**: Tailwind CSS 3.4
- **Data Fetching**: TanStack Query v5
- **Forms**: React Hook Form + Zod validation
- **Routing**: React Router v6
- **UI Components**: shadcn/ui
- **Hosting**: Vercel (free tier)

### Backend
- **Runtime**: Node.js 20 LTS
- **Framework**: Express 4.19
- **Language**: TypeScript 5.3
- **ORM**: Prisma 5.x
- **Authentication**: Passport.js (Local + Google OAuth) + JWT
- **Password Hashing**: bcrypt
- **Job Queue**: BullMQ
- **Email**: Resend
- **Web Scraping**: Cheerio + Axios
- **Hosting**: Railway ($5-20/month)

### Database & Caching
- **Database**: PostgreSQL 15+ (Supabase)
- **Cache**: Redis (Upstash free tier)

### Development Tools
- **Linting**: ESLint + Prettier
- **Testing**: Vitest
- **Version Control**: Git + GitHub
- **CI/CD**: GitHub Actions
- **Error Tracking**: Sentry (free tier)

---

## COMPLETE FUNCTIONAL SCOPE

### 1. USER MANAGEMENT

**Registration & Authentication**
- Email/password registration with bcrypt hashing
- Google OAuth integration
- Email verification required before accessing app features
- Password recovery via email reset link
- Account deletion (soft-delete if teams exist)

**User Profile**
- Username (required, unique)
- Email (required, unique)
- Avatar upload (optional, 2MB max, jpg/png)
- Auth provider (email or google)
- List of created teams

**User Roles**
- **Regular User**: Create teams, view leaderboards, manage profile
- **Admin**: All user capabilities PLUS:
  - Approve/reject team entries
  - View/edit payment status for all users
  - Manually add teams past deadline
  - Manually end season early
  - Send email notifications to all users

---

### 2. TEAM CREATION & COMPOSITION

**Team Rules**
- Users can create multiple teams
- Each team requires $100 entry fee (Stripe)
- Each team must have exactly 8 players
- Combined 2024 HR total must be ≤172 HRs
- Teams can be named by user (max 50 chars, no profanity filter)
- No player exclusivity (unlimited users can pick same player)
- No position requirements
- Teams lock 3 days before MLB season starts
- Teams cannot be modified after lock date
- Teams cannot be deleted once locked into leaderboard

**Player Eligibility Pool**
- All MLB players with ≥10 HRs in 2025 regular season
- Data source: Automated scraping from Baseball Reference
- Player pool generated once per year (after previous season ends)
- Each player record includes: name, MLB team, 2025 HR total, photo URL (optional for MVP)

**Team Entry Workflow**
1. User signs up → verifies email via link
2. User creates team (selects 8 players, names team)
3. User pays $100 via Stripe
4. If payment succeeds: Team auto-accepted into contest
5. If payment fails: Team saved as draft, not entered
6. If admin rejects: Refund issued OR admin contacts user
7. If no payment by deadline: Team not entered (unless admin override)
8. 3 days before season: All accepted teams lock

**Team States**
- `draft`: Created but not paid
- `pending`: Payment processing
- `paid`: Payment confirmed, entered into contest
- `rejected`: Admin rejected, refund issued
- `locked`: Season started, no modifications allowed

---

### 3. SCORING SYSTEM

**Core Scoring Rules**
- 1 point = 1 home run
- Only best 7 of 8 players count (automatic system selection)
- Scoring is cumulative from lock date through World Series
- Regular season + playoff HRs count for overall leaderboard
- Only regular season HRs count for monthly leaderboards

**Scoring Period**
- **Start**: 3 days before MLB Opening Day (lock date)
- **End**: After World Series concludes
- Admin can manually end season early if needed

**Player Stats Updates**
- Poll every 10 minutes during active games
- Poll every 60 minutes during off-hours
- Source: Baseball Reference (automated scraping)
- If scraping fails: Retry with exponential backoff, alert admin after 3+ failures
- Stats corrections (HR ruled double) immediately reflected

**Edge Cases**
- Player traded mid-season: Stays on team, HRs count regardless of MLB team
- Player injured/IL: Stays on team, HRs count if they return
- Player retires: Stays on team for entire season
- Ties: Prize money split equally among tied teams

---

### 4. LEADERBOARDS

**Overall Season Leaderboard**
- Scoring period: Lock date → end of World Series
- Includes: Regular season + playoff HRs
- Prize structure: Top 15 teams win prizes
- Update frequency: Every 10 minutes during games, hourly otherwise
- Display: All entered teams, ranked by total HRs (best 7 of 8)
- Target load time: <2 seconds

**Monthly Leaderboards**
- Months: March, April, May, June, July, August, September
- September includes all October regular season games
- Excludes: Playoff games
- Prize structure: Top 4 teams each month
- Each month resets (not cumulative)
- Update frequency: Same as overall leaderboard

**All-Star Break Leaderboard**
- Type: Snapshot (one-time ranking at MLB All-Star Break)
- Timing: Mid-July (specific date set annually)
- Prize structure: Top 3 teams
- Prizes awarded: At end of season

**Leaderboard Display**
- Public: All users can see full leaderboard
- Shows: Team name, total HRs, username, avatar, rank
- Clickable: View team details (all 8 players, individual HRs, best 7 highlighted, owner)
- League stats: Most popular players, average team score

---

### 5. SEASON LIFECYCLE & KEY DATES

**Season Timeline**
1. **Player pool generation**: After 2025 World Series
2. **Team creation opens**: End of spring training (~late March)
3. **Lock deadline**: 3 days before MLB Opening Day (EST timezone)
4. **Scoring starts**: Lock date
5. **All-star break snapshot**: Mid-July
6. **Regular season ends**: Early October
7. **Scoring ends**: After World Series (~late October)
8. **Season closes**: Admin manually closes or auto-close

**Off-Season (November - March)**
Users can:
- View previous season's overall leaderboard
- View previous season's monthly leaderboards
- View winners and prize payouts
- View their created teams from past season
- Browse next year's eligible player pool (once generated)
- View player stats pages
- Manage profile

Users cannot:
- Create new teams until next draft opens

**Data Retention**
- Keep previous season data only (1 year)
- Display previous season winners on homepage
- Purge data older than 1 year (except payment records for tax/legal)

---

### 6. DATA MODEL

**Users Table**
```
id: UUID (PK)
email: String (unique, indexed)
username: String (unique, indexed)
password_hash: String (nullable if Google OAuth)
auth_provider: Enum (email | google)
email_verified: Boolean (default false)
role: Enum (user | admin)
avatar_url: String (nullable)
created_at: Timestamp
deleted_at: Timestamp (nullable, soft delete)
```

**Teams Table**
```
id: UUID (PK)
user_id: UUID (FK → users.id, indexed)
name: String (max 50 chars)
season_year: Integer (e.g., 2025)
payment_status: Enum (draft | pending | paid | rejected | refunded)
stripe_payment_id: String (nullable)
entry_status: Enum (draft | entered | locked, indexed)
total_hrs_2024: Integer (cached for validation)
created_at: Timestamp
locked_at: Timestamp (nullable)
deleted_at: Timestamp (nullable, soft delete)
```

**Players Table**
```
id: UUID (PK)
mlb_id: String (unique, from Baseball Reference)
name: String
team_abbr: String (e.g., NYY, LAD)
season_year: Integer (indexed)
hrs_previous_season: Integer (e.g., 2024 HRs)
is_eligible: Boolean (≥10 HRs)
photo_url: String (nullable)
created_at: Timestamp
updated_at: Timestamp
```

**TeamPlayers Table** (junction)
```
id: UUID (PK)
team_id: UUID (FK → teams.id, indexed)
player_id: UUID (FK → players.id, indexed)
position: Integer (1-8, for display ordering)
created_at: Timestamp
```

**PlayerStats Table** (current season performance)
```
id: UUID (PK)
player_id: UUID (FK → players.id, indexed)
season_year: Integer (indexed)
date: Date
hrs_total: Integer (cumulative)
hrs_regular_season: Integer
hrs_postseason: Integer
last_updated: Timestamp
```

**Leaderboards Table** (materialized/cached)
```
id: UUID (PK)
team_id: UUID (FK → teams.id)
leaderboard_type: Enum (overall | monthly | allstar, indexed)
month: Integer (nullable, for monthly, indexed)
rank: Integer (indexed)
total_hrs: Integer (best 7 of 8)
calculated_at: Timestamp
```

**Notifications Table**
```
id: UUID (PK)
user_id: UUID (FK → users.id, nullable for broadcast)
type: Enum (email | in_app)
subject: String
body: Text
sent_at: Timestamp
read_at: Timestamp (nullable)
```

---

### 7. API ENDPOINTS (Overview)

**Authentication**
- `POST /api/auth/register` - Register with email/password
- `POST /api/auth/login` - Login with email/password
- `GET /api/auth/google` - Initiate Google OAuth
- `GET /api/auth/google/callback` - Google OAuth callback
- `POST /api/auth/verify-email` - Verify email with token
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `POST /api/auth/logout` - Logout (invalidate JWT)

**Users**
- `GET /api/users/me` - Get current user profile
- `PATCH /api/users/me` - Update profile (username, avatar)
- `DELETE /api/users/me` - Delete account (soft delete)
- `GET /api/users/:id/teams` - Get user's teams

**Teams**
- `POST /api/teams` - Create new team
- `GET /api/teams/:id` - Get team details
- `PATCH /api/teams/:id` - Update team (before lock only)
- `DELETE /api/teams/:id` - Delete team (before lock only)
- `GET /api/teams/my-teams` - Get current user's teams
- `POST /api/teams/:id/payment` - Process Stripe payment

**Players**
- `GET /api/players` - Get eligible player pool (with filters)
- `GET /api/players/:id` - Get player details and stats
- `GET /api/players/search` - Search players by name

**Leaderboards**
- `GET /api/leaderboards/overall` - Get overall season leaderboard
- `GET /api/leaderboards/monthly/:month` - Get monthly leaderboard
- `GET /api/leaderboards/allstar` - Get all-star break leaderboard
- `GET /api/leaderboards/stats` - Get league-wide stats

**Admin**
- `GET /api/admin/teams` - Get all teams (with payment status)
- `PATCH /api/admin/teams/:id/status` - Approve/reject team
- `POST /api/admin/teams/:id/override` - Add team past deadline
- `POST /api/admin/season/end` - Manually end season
- `POST /api/admin/notifications` - Send notification to users
- `PATCH /api/admin/players/:id/stats` - Manual stats override

---

### 8. BACKGROUND JOBS

**Job Queue (BullMQ + Redis)**

**Player Stats Sync Job**
- Frequency: Every 10 minutes during active games, every 60 minutes otherwise
- Process:
  1. Scrape Baseball Reference for latest HR stats
  2. Update `player_stats` table with new data
  3. If scraping fails: Retry with exponential backoff (3 attempts)
  4. Alert admin if all retries fail
- Queue: `player-stats-sync`

**Leaderboard Calculation Job**
- Frequency: After each player stats sync
- Process:
  1. For each team, calculate best 7 of 8 players' HRs
  2. Update `leaderboards` table with new rankings
  3. Invalidate Redis cache for leaderboard queries
- Queue: `leaderboard-calculation`

**Email Notification Jobs**
- **Lock Reminder**: 3 days before season (one-time)
- **Daily Scores**: Daily summary of team performance (optional user setting)
- **Monthly Winners**: After each month ends
- **Season Winners**: After World Series
- Queue: `email-notifications`

**Payment Verification Job**
- Frequency: Every 5 minutes
- Process: Check Stripe webhook events for payment confirmations
- Queue: `payment-verification`

---

### 9. EMAIL NOTIFICATIONS

**Transactional Emails (via Resend)**
- Email verification link (on signup)
- Password reset link (on request)
- Payment confirmation (on successful payment)
- Team locked confirmation (3 days before season)
- Refund confirmation (if admin rejects team)

**Marketing/Updates Emails**
- Draft deadline reminder (3 days before lock)
- Daily score update (optional, user can opt-out)
- Monthly leaderboard winners announcement
- Season leaderboard winners announcement

---

### 10. PAYMENT INTEGRATION

**Stripe Integration**
- Use Stripe Checkout for $100 team entry
- Store `stripe_payment_id` on team record
- Webhook endpoint: `/api/webhooks/stripe`
- Handle events:
  - `checkout.session.completed` → Update team payment_status to "paid"
  - `charge.refunded` → Update team payment_status to "refunded"
- Test mode for development
- Production keys for live season

---

### 11. CACHING STRATEGY

**Redis Caching**
- Leaderboard rankings (TTL: 5 minutes)
- Player pool list (TTL: 1 hour)
- User profile data (TTL: 15 minutes)
- League-wide stats (TTL: 10 minutes)
- Invalidate on data updates

**Database Indexing**
- `users.email`, `users.username`
- `teams.user_id`, `teams.entry_status`, `teams.season_year`
- `team_players.team_id`, `team_players.player_id`
- `player_stats.player_id`, `player_stats.season_year`
- `leaderboards.leaderboard_type`, `leaderboards.rank`, `leaderboards.month`

---

### 12. CONSTRAINTS & BUSINESS RULES

**Team Creation Constraints**
- Exactly 8 players required
- Total 2025 HRs of selected players ≤172
- Team name max 50 characters
- Cannot modify team after lock date
- Cannot delete team after lock date
- User must have verified email to create team

**Payment Rules**
- $100 per team entry
- Payment required before team enters contest
- Refunds only if admin rejects team
- No refunds after lock date

**Scoring Rules**
- Only best 7 of 8 players' HRs count (automatic)
- Playoff HRs count for overall leaderboard only
- Stats corrections immediately reflected
- Ties split prize money equally

**Season Rules**
- Teams lock 3 days before MLB Opening Day (EST)
- No mid-season joins (must enter before lock)
- Season ends after World Series
- Admin can manually end season early

**Data Retention**
- Keep current season + previous season
- Purge data older than 1 year (except payment records)
- Soft delete users and teams (preserve leaderboard integrity)

---

### 13. PERFORMANCE REQUIREMENTS

- Leaderboard page load: <2 seconds (95th percentile)
- Support 5,000 concurrent users
- Database queries optimized with proper indexes
- Redis caching for frequently accessed data
- Image optimization for player photos and avatars
- Lazy loading for long lists (players, leaderboards)

---

### 14. SECURITY REQUIREMENTS

- HTTPS only (SSL certificates)
- JWT tokens with 24-hour expiration
- Bcrypt password hashing (cost factor 10)
- CORS configured for frontend domain only
- Rate limiting on API endpoints (100 req/min per IP)
- Input validation on all user inputs (Zod schemas)
- SQL injection prevention (Prisma parameterized queries)
- XSS prevention (React escapes by default)
- CSRF protection for state-changing operations
- Stripe webhook signature verification

---

### 15. ERROR HANDLING

**API Error Responses**
```typescript
{
  success: false,
  error: {
    code: "TEAM_VALIDATION_ERROR",
    message: "Team must have exactly 8 players",
    details: { currentCount: 7 }
  }
}
```

**Error Codes**
- `AUTH_REQUIRED` (401)
- `FORBIDDEN` (403)
- `NOT_FOUND` (404)
- `VALIDATION_ERROR` (400)
- `TEAM_LOCKED` (400)
- `PAYMENT_FAILED` (402)
- `INTERNAL_ERROR` (500)

**Logging**
- Use Sentry for error tracking
- Log all API requests (method, path, status, duration)
- Log background job failures
- Log payment events
- Do not log sensitive data (passwords, tokens)

---

## OUT OF SCOPE (NOT IN MVP)

- Trading players between users
- Live chat or messaging
- Mobile native app (iOS/Android)
- Multiple leagues/pools
- Advanced analytics
- Social features (friends, followers, activity feeds)
- Custom scoring rules per league
- Live draft room
- Integration with gambling platforms
- Real-time WebSocket updates (polling only)
- Read-replica database (single database for MVP)
- Player comparison tools
- Weekly/daily leaderboards (monthly and overall only)

---

## PROJECT STRUCTURE
```
mlb-hr-pool/
├── frontend/                 # React + Vite
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Route pages
│   │   ├── hooks/           # Custom React hooks
│   │   ├── services/        # API client functions
│   │   ├── utils/           # Helper functions
│   │   ├── types/           # TypeScript types
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── backend/                  # Express + Node.js
│   ├── src/
│   │   ├── routes/          # API route handlers
│   │   ├── controllers/     # Business logic
│   │   ├── services/        # Service layer
│   │   ├── middleware/      # Auth, validation, error handling
│   │   ├── jobs/            # Background job workers
│   │   ├── config/          # Configuration files
│   │   ├── utils/           # Helper functions
│   │   ├── types/           # TypeScript types
│   │   └── server.ts        # Entry point
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   └── migrations/      # Database migrations
│   ├── package.json
│   └── tsconfig.json
│
├── .github/
│   └── workflows/           # GitHub Actions CI/CD
├── .gitignore
└── README.md
```

---

## DEVELOPMENT PHASES

**Phase 1: Foundation** (Weeks 1-3)
- Database schema + Prisma setup
- User auth (email/password + Google OAuth)
- Email verification flow
- Basic API structure

**Phase 2: Team Creation** (Weeks 4-6)
- Player data scraper
- Team creation UI + validation
- Stripe payment integration
- Admin approval system

**Phase 3: Scoring & Leaderboards** (Weeks 7-9)
- Player stats polling job
- Scoring calculator (best 7 of 8)
- Leaderboard calculation
- Redis caching

**Phase 4: User Experience** (Weeks 10-11)
- Leaderboard UI
- Player stats pages
- Email notifications
- Off-season mode

**Phase 5: Testing & Launch** (Week 12)
- End-to-end testing
- Load testing
- Admin dashboard
- Production deployment

---

## ENVIRONMENT VARIABLES

**Frontend (.env)**
```
VITE_API_URL=http://localhost:5000
VITE_STRIPE_PUBLIC_KEY=pk_test_xxx
```

**Backend (.env)**
```
DATABASE_URL=postgresql://user:pass@localhost:5432/mlb_pool
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxxultra
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
RESEND_API_KEY=re_xxx
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

---

This is the complete project context. Build with this as the single source of truth for requirements and technical decisions.
```