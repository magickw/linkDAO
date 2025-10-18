# Admin System Technical Architecture

This document provides a comprehensive overview of the LinkDAO Admin System architecture, including components, data flow, and technical implementation details.

## 🏗️ System Overview

The LinkDAO Admin System is built as a modern, scalable web application with the following key characteristics:

- **Frontend**: React 18 with TypeScript and Next.js 14
- **Backend**: Node.js with Express and TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Real-time**: WebSocket connections with Socket.io
- **Caching**: Redis for session management and data caching
- **AI/ML**: TensorFlow.js and Python microservices
- **Monitoring**: Prometheus and Grafana

## 🎯 Architecture Principles

### Scalability
- Microservices architecture for independent scaling
- Horizontal scaling with load balancers
- Database sharding for large datasets
- CDN integration for static assets

### Reliability
- Circuit breaker patterns for external services
- Graceful degradation when services are unavailable
- Comprehensive error handling and logging
- Automated failover mechanisms

### Security
- Role-based access control (RBAC)
- JWT token authentication with refresh tokens
- Input validation and sanitization
- Rate limiting and DDoS protection
- Audit logging for all admin actions

### Performance
- Lazy loading and code splitting
- Efficient database queries with proper indexing
- Caching strategies at multiple levels
- Real-time updates with minimal overhead

## 🏛️ System Components

### Frontend Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Layer                           │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Pages     │  │ Components  │  │      Services       │  │
│  │             │  │             │  │                     │  │
│  │ • Dashboard │  │ • Widgets   │  │ • API Client        │  │
│  │ • Analytics │  │ • Charts    │  │ • WebSocket Manager │  │
│  │ • Users     │  │ • Forms     │  │ • State Management  │  │
│  │ • Content   │  │ • Modals    │  │ • Cache Service     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Hooks     │  │   Utils     │  │      Types          │  │
│  │             │  │             │  │                     │  │
│  │ • useAuth   │  │ • Formatters│  │ • API Interfaces    │  │
│  │ • useData   │  │ • Validators│  │ • Component Props   │  │
│  │ • useSocket │  │ • Helpers   │  │ • State Models      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

#### Component Structure

```typescript
// Component hierarchy example
src/
├── components/
│   ├── Admin/
│   │   ├── Dashboard/
│   │   │   ├── DashboardLayout.tsx
│   │   │   ├── MetricWidget.tsx
│   │   │   └── RealTimeChart.tsx
│   │   ├── Analytics/
│   │   │   ├── AnalyticsDashboard.tsx
│   │   │   ├── UserBehaviorAnalytics.tsx
│   │   │   └── ReportBuilder.tsx
│   │   ├── Moderation/
│   │   │   ├── ModerationQueue.tsx
│   │   │   ├── ContentReview.tsx
│   │   │   └── AIAssistant.tsx
│   │   └── Mobile/
│   │       ├── MobileLayout.tsx
│   │       └── TouchOptimized/
├── hooks/
│   ├── useAuth.ts
│   ├── useWebSocket.ts
│   └── useAnalytics.ts
├── services/
│   ├── api.ts
│   ├── websocket.ts
│   └── cache.ts
└── types/
    ├── admin.ts
    ├── analytics.ts
    └── moderation.ts
```

### Backend Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Backend Layer                            │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Routes    │  │ Controllers │  │      Services       │  │
│  │             │  │             │  │                     │  │
│  │ • Auth      │  │ • Admin     │  │ • User Service      │  │
│  │ • Users     │  │ • Analytics │  │ • Analytics Service │  │
│  │ • Content   │  │ • Moderation│  │ • Moderation Service│  │
│  │ • Analytics │  │ • System    │  │ • AI Service        │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Middleware  │  │   Models    │  │      Utils          │  │
│  │             │  │             │  │                     │  │
│  │ • Auth      │  │ • User      │  │ • Validators        │  │
│  │ • Logging   │  │ • Content   │  │ • Formatters        │  │
│  │ • Rate Limit│  │ • Analytics │  │ • Error Handlers    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

#### Service Layer Pattern

```typescript
// Service layer example
export class AdminDashboardService {
  constructor(
    private userService: UserService,
    private analyticsService: AnalyticsService,
    private cacheService: CacheService
  ) {}

  async getDashboardMetrics(timeRange: string): Promise<DashboardMetrics> {
    const cacheKey = `dashboard:metrics:${timeRange}`;
    
    // Try cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    // Fetch fresh data
    const [userMetrics, systemMetrics, contentMetrics] = await Promise.all([
      this.userService.getMetrics(timeRange),
      this.getSystemMetrics(),
      this.getContentMetrics(timeRange)
    ]);

    const metrics = {
      users: userMetrics,
      system: systemMetrics,
      content: contentMetrics,
      timestamp: new Date()
    };

    // Cache for 5 minutes
    await this.cacheService.set(cacheKey, metrics, 300);
    
    return metrics;
  }
}
```

### Database Architecture

#### Schema Design

```sql
-- Core admin tables
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role admin_role NOT NULL DEFAULT 'moderator',
  permissions JSONB NOT NULL DEFAULT '[]',
  mfa_enabled BOOLEAN DEFAULT FALSE,
  mfa_secret VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP,
  status user_status DEFAULT 'active'
);

-- Audit logging
CREATE TABLE admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES admin_users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id VARCHAR(255),
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Analytics data
CREATE TABLE analytics_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name VARCHAR(100) NOT NULL,
  metric_value NUMERIC NOT NULL,
  dimensions JSONB,
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Moderation queue
CREATE TABLE moderation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL,
  content_type content_type NOT NULL,
  priority priority_level NOT NULL DEFAULT 'medium',
  status moderation_status DEFAULT 'pending',
  reported_by UUID,
  assigned_to UUID REFERENCES admin_users(id),
  ai_analysis JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Indexing Strategy

```sql
-- Performance indexes
CREATE INDEX idx_audit_log_admin_action ON admin_audit_log(admin_id, action, created_at);
CREATE INDEX idx_analytics_metrics_name_time ON analytics_metrics(metric_name, timestamp);
CREATE INDEX idx_moderation_queue_status_priority ON moderation_queue(status, priority, created_at);
CREATE INDEX idx_moderation_queue_assigned ON moderation_queue(assigned_to, status);

-- Partial indexes for active records
CREATE INDEX idx_active_admin_users ON admin_users(id) WHERE status = 'active';
CREATE INDEX idx_pending_moderation ON moderation_queue(created_at) WHERE status = 'pending';
```

### Real-Time Architecture

#### WebSocket Implementation

```typescript
// WebSocket server setup
export class AdminWebSocketService {
  private io: Server;
  private connectedAdmins = new Map<string, Socket>();

  constructor(server: http.Server) {
    this.io = new Server(server, {
      cors: { origin: process.env.FRONTEND_URL },
      transports: ['websocket', 'polling']
    });

    this.setupAuthentication();
    this.setupEventHandlers();
  }

  private setupAuthentication() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        const admin = await this.verifyAdminToken(token);
        socket.data.admin = admin;
        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      const adminId = socket.data.admin.id;
      this.connectedAdmins.set(adminId, socket);

      socket.on('subscribe', (metrics: string[]) => {
        metrics.forEach(metric => {
          socket.join(`metric:${metric}`);
        });
      });

      socket.on('disconnect', () => {
        this.connectedAdmins.delete(adminId);
      });
    });
  }

  broadcastMetricUpdate(metric: string, data: any) {
    this.io.to(`metric:${metric}`).emit('metric_update', {
      metric,
      data,
      timestamp: new Date()
    });
  }
}
```

### AI/ML Integration

#### AI Service Architecture

```typescript
// AI service integration
export class AIInsightsService {
  private mlModels: Map<string, any> = new Map();
  private pythonService: PythonMLService;

  constructor() {
    this.loadModels();
    this.pythonService = new PythonMLService();
  }

  async analyzeContent(content: ContentItem): Promise<AIAnalysis> {
    const [textAnalysis, imageAnalysis] = await Promise.all([
      this.analyzeText(content.text),
      content.images ? this.analyzeImages(content.images) : null
    ]);

    return {
      riskScore: this.calculateRiskScore(textAnalysis, imageAnalysis),
      confidence: this.calculateConfidence(textAnalysis, imageAnalysis),
      violations: this.detectViolations(textAnalysis, imageAnalysis),
      recommendation: this.generateRecommendation(textAnalysis, imageAnalysis)
    };
  }

  private async analyzeText(text: string): Promise<TextAnalysis> {
    // Use TensorFlow.js for client-side analysis
    const toxicityModel = this.mlModels.get('toxicity');
    const sentimentModel = this.mlModels.get('sentiment');

    const [toxicity, sentiment] = await Promise.all([
      toxicityModel.classify(text),
      sentimentModel.predict(text)
    ]);

    return { toxicity, sentiment };
  }

  private async analyzeImages(images: string[]): Promise<ImageAnalysis> {
    // Delegate to Python service for complex image analysis
    return this.pythonService.analyzeImages(images);
  }
}
```

## 🔄 Data Flow

### Request Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Client    │───▶│   Gateway   │───▶│ Controller  │───▶│   Service   │
│             │    │             │    │             │    │             │
│ • Browser   │    │ • Auth      │    │ • Validation│    │ • Business  │
│ • Mobile    │    │ • Rate Limit│    │ • Transform │    │   Logic     │
│             │    │ • Logging   │    │ • Response  │    │ • Data      │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                                │
┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  Response   │◀───│   Cache     │◀───│  Database   │◀────────┘
│             │    │             │    │             │
│ • JSON      │    │ • Redis     │    │ • PostgreSQL│
│ • WebSocket │    │ • Memory    │    │ • Indexes   │
│             │    │ • CDN       │    │ • Queries   │
└─────────────┘    └─────────────┘    └─────────────┘
```

### Real-Time Data Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Events    │───▶│  WebSocket  │───▶│   Client    │
│             │    │   Server    │    │             │
│ • User      │    │             │    │ • Dashboard │
│   Actions   │    │ • Broadcast │    │   Updates   │
│ • System    │    │ • Filtering │    │ • Alerts    │
│   Changes   │    │ • Throttling│    │ • Metrics   │
│ • Alerts    │    │             │    │             │
└─────────────┘    └─────────────┘    └─────────────┘
```

## 🔒 Security Architecture

### Authentication & Authorization

```typescript
// JWT token structure
interface AdminJWTPayload {
  sub: string;        // Admin user ID
  email: string;      // Admin email
  role: AdminRole;    // Admin role
  permissions: string[]; // Specific permissions
  iat: number;        // Issued at
  exp: number;        // Expires at
  jti: string;        // JWT ID for revocation
}

// Permission checking middleware
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const admin = req.user as AdminUser;
    
    if (!admin.permissions.includes(permission)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: permission
      });
    }
    
    next();
  };
};
```

### Input Validation

```typescript
// Validation schemas
export const adminUserSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'moderator', 'analyst']),
  permissions: z.array(z.string()),
  mfaEnabled: z.boolean().optional()
});

// Sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Sanitize all string inputs
  const sanitize = (obj: any): any => {
    if (typeof obj === 'string') {
      return DOMPurify.sanitize(obj);
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitize(value);
      }
      return sanitized;
    }
    return obj;
  };

  req.body = sanitize(req.body);
  req.query = sanitize(req.query);
  next();
};
```

## 📊 Performance Optimization

### Caching Strategy

```typescript
// Multi-level caching
export class CacheService {
  private memoryCache = new Map<string, CacheItem>();
  private redisClient: Redis;

  async get<T>(key: string): Promise<T | null> {
    // L1: Memory cache
    const memoryItem = this.memoryCache.get(key);
    if (memoryItem && !this.isExpired(memoryItem)) {
      return memoryItem.value;
    }

    // L2: Redis cache
    const redisValue = await this.redisClient.get(key);
    if (redisValue) {
      const parsed = JSON.parse(redisValue);
      // Populate memory cache
      this.memoryCache.set(key, {
        value: parsed,
        expiry: Date.now() + 60000 // 1 minute
      });
      return parsed;
    }

    return null;
  }

  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    // Set in both caches
    this.memoryCache.set(key, {
      value,
      expiry: Date.now() + Math.min(ttl * 1000, 60000)
    });
    
    await this.redisClient.setex(key, ttl, JSON.stringify(value));
  }
}
```

### Database Optimization

```typescript
// Query optimization
export class OptimizedUserService {
  async getUsersWithPagination(options: PaginationOptions): Promise<PaginatedUsers> {
    const { page, limit, search, filters } = options;
    
    // Build optimized query
    let query = this.db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        status: users.status,
        createdAt: users.createdAt,
        // Only select needed fields
      })
      .from(users);

    // Add search conditions
    if (search) {
      query = query.where(
        or(
          ilike(users.email, `%${search}%`),
          ilike(users.username, `%${search}%`)
        )
      );
    }

    // Add filters
    if (filters.status) {
      query = query.where(eq(users.status, filters.status));
    }

    // Add pagination
    const offset = (page - 1) * limit;
    query = query.limit(limit).offset(offset);

    // Execute with count query in parallel
    const [results, totalCount] = await Promise.all([
      query.execute(),
      this.getUserCount(search, filters)
    ]);

    return {
      users: results,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    };
  }
}
```

## 🔍 Monitoring & Observability

### Metrics Collection

```typescript
// Prometheus metrics
export class MetricsService {
  private httpRequestDuration = new prometheus.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code']
  });

  private activeAdminSessions = new prometheus.Gauge({
    name: 'active_admin_sessions',
    help: 'Number of active admin sessions'
  });

  recordHttpRequest(method: string, route: string, statusCode: number, duration: number) {
    this.httpRequestDuration
      .labels(method, route, statusCode.toString())
      .observe(duration);
  }

  updateActiveAdminSessions(count: number) {
    this.activeAdminSessions.set(count);
  }
}
```

### Health Checks

```typescript
// Health check endpoint
export class HealthService {
  async getSystemHealth(): Promise<HealthStatus> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkExternalServices()
    ]);

    const results = checks.map((check, index) => ({
      name: ['database', 'redis', 'external'][index],
      status: check.status === 'fulfilled' ? 'healthy' : 'unhealthy',
      details: check.status === 'fulfilled' ? check.value : check.reason
    }));

    const overallStatus = results.every(r => r.status === 'healthy') 
      ? 'healthy' 
      : 'degraded';

    return {
      status: overallStatus,
      timestamp: new Date(),
      services: results
    };
  }
}
```

## 🚀 Deployment Architecture

### Container Setup

```dockerfile
# Multi-stage build for frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci --only=production
COPY frontend/ ./
RUN npm run build

# Backend container
FROM node:18-alpine AS backend
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --only=production
COPY backend/ ./
COPY --from=frontend-builder /app/dist ./public
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: admin-system
spec:
  replicas: 3
  selector:
    matchLabels:
      app: admin-system
  template:
    metadata:
      labels:
        app: admin-system
    spec:
      containers:
      - name: admin-system
        image: linkdao/admin-system:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: admin-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: admin-secrets
              key: redis-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

## 🔧 Development Guidelines

### Code Organization

```
src/
├── components/          # React components
│   ├── Admin/          # Admin-specific components
│   ├── Common/         # Reusable components
│   └── Mobile/         # Mobile-optimized components
├── hooks/              # Custom React hooks
├── services/           # API and business logic
├── utils/              # Utility functions
├── types/              # TypeScript type definitions
├── styles/             # CSS and styling
└── tests/              # Test files
```

### Testing Strategy

```typescript
// Unit test example
describe('AdminDashboardService', () => {
  let service: AdminDashboardService;
  let mockUserService: jest.Mocked<UserService>;

  beforeEach(() => {
    mockUserService = createMockUserService();
    service = new AdminDashboardService(mockUserService);
  });

  it('should return cached metrics when available', async () => {
    const cachedMetrics = { users: 100, timestamp: new Date() };
    mockCacheService.get.mockResolvedValue(cachedMetrics);

    const result = await service.getDashboardMetrics('24h');

    expect(result).toEqual(cachedMetrics);
    expect(mockUserService.getMetrics).not.toHaveBeenCalled();
  });
});
```

### Error Handling

```typescript
// Centralized error handling
export class AdminError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'AdminError';
  }
}

// Error handler middleware
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (error instanceof AdminError) {
    return res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    });
  }

  // Log unexpected errors
  logger.error('Unexpected error:', error);
  
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred'
    }
  });
};
```

---

*This architecture documentation is maintained by the LinkDAO development team. For questions or contributions, please contact [dev-team@linkdao.com](mailto:dev-team@linkdao.com).*