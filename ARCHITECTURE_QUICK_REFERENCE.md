# LinkDAO Architecture - Quick Reference Guide

## At a Glance

### Frontend
```
Framework:    Next.js 15.5.6
Server:       Node.js (Vercel-compatible)
Build:        npm run build
Compatibility: ✅ EXCELLENT (native Vercel support)
Cost:         FREE (Vercel Free tier)
```

### Backend  
```
Framework:    Express.js 4.18.2
Server Type:  Long-running HTTP server on port 10000
Build:        npm run build
Compatibility: ❌ INCOMPATIBLE (Vercel serverless)
Cost:         $7-20/month (must use separate platform)
```

---

## Critical Backend Components (Vercel-Incompatible)

### 1. WebSocket Servers
- **What:** Real-time bidirectional communication
- **Technology:** Socket.IO with Redis adapter
- **Services:**
  - scalableWebSocketManager.ts (5,000 concurrent connections)
  - adminWebSocketService.ts (admin dashboard)
  - sellerWebSocketService.ts (seller notifications)
  - realTimeNotificationService.ts (live updates)
- **Vercel Problem:** Requires persistent connections; serverless has 15-minute timeout
- **Impact if removed:** Admin dashboard dead, no real-time updates, no live notifications

### 2. Background Job Queue
- **What:** Asynchronous task processing
- **Technology:** BullMQ with Redis
- **Queues:**
  - `content-moderation-fast` (text processing)
  - `content-moderation-slow` (media/complex analysis)
- **Tasks:** Content moderation, marketplace verification, task assignment
- **Vercel Problem:** Workers need persistent process; serverless terminates functions
- **Impact if removed:** Moderation backlog piles up, marketplace unverified

### 3. Scheduled Monitoring
- **Services running intervals:**
  - productionMonitoringService (30s intervals)
  - memoryMonitoringService (30-60s intervals)
  - serviceHealthMonitor (regular checks)
  - databaseIndexOptimizer (index maintenance)
  - CSRF cleanup (periodic)
  - Rate limit cleanup (periodic)
- **Vercel Problem:** setInterval/setTimeout cleared on function termination
- **Impact if removed:** No health monitoring, memory leaks, database degradation

### 4. Blockchain Event Indexing
- **Service:** indexerService.ts
- **Watches:** Profile events, follows, payments, governance votes
- **Technology:** ethers.js contract listeners
- **Vercel Problem:** Needs persistent RPC connection
- **Impact if removed:** Blockchain data not indexed, events missed

### 5. Persistent Cache Layer
- **Technology:** Redis (separate service)
- **Uses:**
  - WebSocket pub/sub for multi-instance scaling
  - BullMQ queue persistence
  - Rate limiting storage
  - Session caching
  - Real-time data sync
- **Vercel Problem:** No built-in Redis; requires external service ($10-25/month)
- **Impact if removed:** No distributed caching, single-instance only, rate limiting fails

---

## Database Requirements

### PostgreSQL 15
- **Location:** Connection string in DATABASE_URL
- **Connection Pool:**
  - Free tier: 2-5 connections
  - Standard tier: 15 connections
  - Configurable with health checks
- **Required Tables:** 50+ tables (schema managed via Drizzle ORM)
- **Vercel Compatibility:** ✅ YES (use external service)
- **Recommended:** Vercel Postgres, AWS RDS, Render Postgres

---

## Feature Compatibility Matrix

```
FRONTEND (Next.js)                 VERCEL COMPATIBLE ✅
├─ Pages & Components              YES
├─ API Routes (simple)             YES
├─ Image Optimization              YES
├─ Static Generation               YES
└─ Workbox Service Workers         YES

BACKEND (Express.js)               VERCEL INCOMPATIBLE ❌
├─ Long-running Server             NO (15-min timeout)
├─ WebSocket/Socket.IO             NO (persistent connections)
├─ BullMQ Job Queue                NO (needs workers)
├─ Scheduled Tasks                 NO (no cron support)
├─ Event Listeners                 NO (persistent connections)
├─ Stateless API Endpoints         MAYBE (if extracted)
└─ Database Queries                YES (if stateless)

SERVICES
├─ PostgreSQL                       YES (external)
├─ Redis                            MAYBE (external, extra cost)
├─ IPFS                             YES (external)
└─ Blockchain RPC                   YES (external)
```

---

## Architecture Diagrams

### Current/Proposed Setup

```
USERS
  │
  ├──► Vercel Frontend (Next.js)
  │    └──► Browser Static/Pages
  │         └──► Client-side Web3
  │
  └──► Render/Railway Backend (Express.js)
       ├──► HTTP API (REST)
       ├──► WebSocket Server (Socket.IO)
       ├──► BullMQ Worker Pool
       └──► Scheduled Tasks
            │
            ├──► PostgreSQL (Render/AWS/Vercel)
            ├──► Redis (Upstash/Redis Cloud)
            ├──► IPFS (Pinata/Infura)
            └──► Blockchain RPC (Alchemy)
```

### What Won't Work on Vercel

```
❌ VERCEL SERVERLESS (15-min timeout)
   ├─ WebSocket connection dies after 15 min
   ├─ Background jobs pile up in queue
   ├─ Scheduled tasks never run
   ├─ Event listeners disconnect
   └─ Users see timeouts/disconnects
```

---

## File Locations Reference

### Backend Architecture Files
```
/app/backend/src/
├─ index.ts                              (Main server entry)
├─ index.production.js                   (Production wrapper)
├─ services/
│  ├─ websocket/scalableWebSocketManager.ts
│  ├─ webSocketService.ts
│  ├─ adminWebSocketService.ts
│  ├─ sellerWebSocketService.ts
│  ├─ realTimeNotificationService.ts
│  ├─ contentModerationQueue.ts
│  ├─ indexerService.ts
│  ├─ productionMonitoringService.ts
│  ├─ memoryMonitoringService.ts
│  └─ [40+ other services]
├─ config/
│  ├─ productionConfig.ts
│  ├─ production-server.ts
│  ├─ redis-production.ts
│  └─ load-balancer.ts
└─ routes/
   ├─ postRoutes.ts
   ├─ messagingRoutes.ts
   ├─ adminDashboardRoutes.ts
   └─ [20+ other routes]
```

### Frontend Architecture Files
```
/app/frontend/
├─ package.json                         (Next.js dependencies)
├─ next.config.js                       (Build configuration)
├─ vercel.json                          (Vercel deployment config)
├─ src/
│  ├─ pages/
│  │  ├─ index.tsx                      (Home page)
│  │  ├─ api/                           (API routes)
│  │  ├─ communities.tsx
│  │  ├─ governance.tsx
│  │  └─ [30+ pages]
│  ├─ components/
│  ├─ context/
│  │  └─ AuthContext.tsx
│  └─ services/
```

### Docker Configurations
```
/app/backend/
├─ Dockerfile                           (Development)
├─ Dockerfile.prod                      (Production multi-stage)

/
└─ docker-compose.yml                   (Full dev stack)
   ├─ PostgreSQL 15
   ├─ Redis 7
   └─ IPFS (Kubo)
```

---

## Deployment Options

### Option 1: Render (Recommended)
```
Pros:
  - Free tier available
  - Automatic GitHub deploys
  - Built-in PostgreSQL/Redis
  - Simple to scale
  
Cost: $14-30/month
Time to deploy: 1-2 hours
```

### Option 2: Railway
```
Pros:
  - Pay-as-you-go
  - Built-in services
  - Good for prototyping
  
Cost: $5-20/month
Time to deploy: 1-2 hours
```

### Option 3: AWS (Advanced)
```
Pros:
  - Maximum scalability
  - Custom configuration
  - Competitive pricing at scale
  
Cost: $40-100+/month
Time to deploy: 4-8 hours
```

---

## Migration Checklist

- [ ] Identify backend dependencies (PostgreSQL, Redis, IPFS)
- [ ] Set up Render/Railway account
- [ ] Create PostgreSQL instance
- [ ] Create Redis instance (Upstash recommended)
- [ ] Configure environment variables
- [ ] Deploy backend to Render
- [ ] Update frontend .env for new API URL
- [ ] Test WebSocket connections
- [ ] Test background jobs
- [ ] Monitor health checks
- [ ] Set up monitoring/alerts

---

## Key Metrics

| Metric | Value |
|--------|-------|
| Backend Services | 40+ |
| Database Tables | 50+ |
| API Routes | 30+ |
| WebSocket Connections (max) | 5,000 per instance |
| Job Queue Workers | 2 (fast + slow) |
| Scheduled Tasks | 10+ |
| Memory Requirement | 1.5GB |
| CPU Cores Used | 2-4 |

---

## What Breaks on Vercel

### Immediate Issues (Day 1)
1. WebSocket connections timeout after 15 minutes
2. Admin dashboard loses real-time updates
3. Live notifications stop working
4. Seller status updates fail

### Long-term Issues (Week 1+)
1. Content moderation jobs accumulate
2. Marketplace listings not verified
3. Blockchain events not indexed
4. System health monitoring fails
5. Database performance degrades

---

## Bottom Line

**You CANNOT use Vercel for the backend.**

The backend is a stateful, long-running service that requires:
- Persistent WebSocket connections (15+ minutes)
- Background worker processes (hours)
- Scheduled tasks (forever)
- Event listeners (always on)

None of these are compatible with Vercel's 15-minute serverless timeout.

**Solution:** Use Render or Railway for backend ($7-15/month), keep frontend on Vercel (free).

Total cost: **$14-30/month** for production setup.

