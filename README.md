# Home Run Derby 2.0

A web-based MLB fantasy sports pooling application where users create teams of 8 MLB players and compete based on real-world home run performance throughout the MLB season.

## Project Structure

```
HRD2.0/
├── frontend/          # React + Vite + TypeScript frontend
├── backend/           # Express + TypeScript backend API
└── PROJECT_CONTEXT.md # Complete project requirements and specifications
```

## Tech Stack

### Frontend
- React 18.3 with Vite 5
- TypeScript 5.3
- Tailwind CSS 3.4
- TanStack Query v5
- React Hook Form + Zod validation
- React Router v6
- shadcn/ui components

### Backend
- Node.js 20 LTS
- Express 4.19
- TypeScript 5.3
- Prisma 5.x ORM
- PostgreSQL 15+ (Supabase)
- Redis (Upstash)
- Passport.js (Local + Google OAuth)
- JWT authentication
- BullMQ job queue
- Stripe payments
- Resend email service

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 20.x LTS or higher
- **npm** or **yarn** or **pnpm**
- **PostgreSQL** 15+ (local or Supabase account)
- **Redis** (local or Upstash account)
- **Git**

## Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd HRD2.0
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment variables template
cp .env.example .env

# Edit .env and add your configuration
# VITE_API_URL=http://localhost:5000
# VITE_STRIPE_PUBLIC_KEY=pk_test_xxx

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:5173`

### 3. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment variables template
cp .env.example .env

# Edit .env and add your configuration (see Environment Variables section below)

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Start development server
npm run dev
```

The backend API will be available at `http://localhost:5000`

## Environment Variables

### Frontend (.env)

```env
VITE_API_URL=http://localhost:5000
VITE_STRIPE_PUBLIC_KEY=pk_test_xxx
```

### Backend (.env)

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/mlb_pool
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key-change-in-production
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
RESEND_API_KEY=re_xxx
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
PORT=5000
```

## Database Setup

### Using Local PostgreSQL

1. Install PostgreSQL 15+
2. Create a new database:
   ```sql
   CREATE DATABASE mlb_pool;
   ```
3. Update `DATABASE_URL` in `backend/.env`
4. Run migrations:
   ```bash
   cd backend
   npm run prisma:migrate
   ```

### Using Supabase (Recommended)

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Copy the connection string from Settings → Database
4. Update `DATABASE_URL` in `backend/.env`
5. Run migrations:
   ```bash
   cd backend
   npm run prisma:migrate
   ```

## Redis Setup

### Using Local Redis

1. Install Redis
2. Start Redis server:
   ```bash
   redis-server
   ```
3. Update `REDIS_URL` in `backend/.env` to `redis://localhost:6379`

### Using Upstash (Recommended)

1. Create a free account at [upstash.com](https://upstash.com)
2. Create a new Redis database
3. Copy the connection string
4. Update `REDIS_URL` in `backend/.env`

## Available Scripts

### Frontend

- `npm run dev` - Start development server (port 5173)
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

### Backend

- `npm run dev` - Start development server with hot reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Start production server
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio GUI
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## Development Workflow

1. Start the backend server in one terminal:
   ```bash
   cd backend
   npm run dev
   ```

2. Start the frontend development server in another terminal:
   ```bash
   cd frontend
   npm run dev
   ```

3. Open your browser to `http://localhost:5173`

## Project Documentation

For complete project requirements, technical specifications, database schema, API endpoints, and business rules, see [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md)

## Development Phases

The project is organized into 5 development phases:

1. **Phase 1: Foundation** - Database schema, user authentication, email verification
2. **Phase 2: Team Creation** - Player data scraper, team builder UI, Stripe integration
3. **Phase 3: Scoring & Leaderboards** - Stats polling, scoring calculator, Redis caching
4. **Phase 4: User Experience** - Leaderboard UI, player pages, notifications
5. **Phase 5: Testing & Launch** - Testing, admin dashboard, deployment

## Third-Party Services Required

To fully run this application, you'll need accounts for:

- **Supabase** - PostgreSQL database (free tier available)
- **Upstash** - Redis cache (free tier available)
- **Stripe** - Payment processing (test mode free)
- **Resend** - Email delivery (free tier available)
- **Google Cloud Console** - OAuth credentials (free)
- **Vercel** - Frontend hosting (free tier available)
- **Railway** - Backend hosting ($5-20/month)

## Contributing

This is a private project. For questions or suggestions, please contact the project owner.

## License

All rights reserved.
