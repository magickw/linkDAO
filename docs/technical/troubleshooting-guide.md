# Admin System Troubleshooting Guide

This comprehensive guide helps developers and system administrators diagnose and resolve common issues with the LinkDAO Admin System.

## 🚨 Emergency Procedures

### System Down Checklist

1. **Check System Status**
   ```bash
   curl -f https://api.linkdao.io/health || echo "API is down"
   curl -f https://admin.linkdao.io/health || echo "Admin UI is down"
   ```

2. **Verify Infrastructure**
   ```bash
   # Check database connectivity
   psql $DATABASE_URL -c "SELECT 1;"
   
   # Check Redis connectivity
   redis-cli -u $REDIS_URL ping
   
   # Check load balancer
   kubectl get pods -n linkdao-admin
   ```

3. **Review Recent Deployments**
   ```bash
   # Check recent deployments
   kubectl rollout history deployment/admin-system
   
   # Rollback if necessary
   kubectl rollout undo deployment/admin-system
   ```

4. **Check Logs**
   ```bash
   # Application logs
   kubectl logs -f deployment/admin-system --tail=100
   
   # System logs
   journalctl -u linkdao-admin -f
   ```

### Critical Alert Response

#### High Error Rate (>5%)
1. Check application logs for error patterns
2. Verify database connection pool status
3. Check external service dependencies
4. Scale up pods if CPU/memory constrained
5. Enable circuit breakers if not already active

#### Database Connection Issues
1. Check connection pool metrics
2. Verify database server status
3. Check network connectivity
4. Review recent schema changes
5. Consider read replica failover

#### Memory Leaks
1. Generate heap dump for analysis
2. Check for unclosed connections
3. Review recent code changes
4. Restart affected pods
5. Implement memory monitoring alerts

## 🔍 Common Issues

### Authentication Problems

#### JWT Token Issues

**Symptoms:**
- Users getting "Authentication failed" errors
- Tokens expiring too quickly
- Invalid signature errors

**Diagnosis:**
```bash
# Check token validity
node -e "
const jwt = require('jsonwebtoken');
const token = 'your-token-here';
try {
  const decoded = jwt.decode(token, {complete: true});
  console.log('Token header:', decoded.header);
  console.log('Token payload:', decoded.payload);
  console.log('Expires at:', new Date(decoded.payload.exp * 1000));
} catch (error) {
  console.error('Token decode error:', error.message);
}
"
```

**Solutions:**
1. **Invalid Signature:**
   ```typescript
   // Verify JWT_SECRET is consistent across all instances
   const secret = process.env.JWT_SECRET;
   if (!secret || secret.length < 32) {
     throw new Error('JWT_SECRET must be at least 32 characters');
   }
   ```

2. **Token Expiration:**
   ```typescript
   // Adjust token expiration time
   const token = jwt.sign(payload, secret, {
     expiresIn: '2h', // Increase from 1h to 2h
     issuer: 'linkdao-admin'
   });
   ```

3. **Clock Skew:**
   ```bash
   # Sync system time
   sudo ntpdate -s time.nist.gov
   ```

#### Session Management Issues

**Symptoms:**
- Users logged out unexpectedly
- Session data not persisting
- Multiple login prompts

**Diagnosis:**
```bash
# Check Redis session store
redis-cli -u $REDIS_URL
> KEYS "sess:*"
> TTL "sess:specific-session-id"
```

**Solutions:**
```typescript
// Configure session middleware properly
app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));
```

### Database Performance Issues

#### Slow Queries

**Symptoms:**
- Dashboard loading slowly
- Timeout errors
- High database CPU usage

**Diagnosis:**
```sql
-- Find slow queries
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Check for missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public'
AND n_distinct > 100
AND correlation < 0.1;

-- Check table sizes
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Solutions:**
1. **Add Missing Indexes:**
   ```sql
   -- Example indexes for common queries
   CREATE INDEX CONCURRENTLY idx_users_status_created 
   ON users(status, created_at) WHERE status = 'active';
   
   CREATE INDEX CONCURRENTLY idx_moderation_queue_priority_status
   ON moderation_queue(priority, status, created_at);
   ```

2. **Optimize Queries:**
   ```typescript
   // Use select specific fields instead of SELECT *
   const users = await db
     .select({
       id: users.id,
       email: users.email,
       status: users.status
     })
     .from(users)
     .where(eq(users.status, 'active'))
     .limit(20);
   ```

3. **Implement Query Caching:**
   ```typescript
   async function getCachedUsers(filters: UserFilters): Promise<User[]> {
     const cacheKey = `users:${JSON.stringify(filters)}`;
     
     let users = await cache.get(cacheKey);
     if (!users) {
       users = await db.query.users.findMany({ where: filters });
       await cache.set(cacheKey, users, 300); // 5 minutes
     }
     
     return users;
   }
   ```

#### Connection Pool Exhaustion

**Symptoms:**
- "Connection pool exhausted" errors
- Timeouts on database operations
- High connection count

**Diagnosis:**
```sql
-- Check active connections
SELECT count(*) as active_connections,
       state,
       application_name
FROM pg_stat_activity
WHERE state IS NOT NULL
GROUP BY state, application_name;

-- Check connection limits
SELECT setting FROM pg_settings WHERE name = 'max_connections';
```

**Solutions:**
```typescript
// Configure connection pool properly
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum connections
  min: 5,  // Minimum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Always release connections
async function queryWithProperCleanup() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM users');
    return result.rows;
  } finally {
    client.release(); // Always release
  }
}
```

### Real-Time Features Issues

#### WebSocket Connection Problems

**Symptoms:**
- Real-time updates not working
- Connection drops frequently
- High latency in updates

**Diagnosis:**
```javascript
// Client-side debugging
const socket = io('wss://admin.linkdao.io', {
  transports: ['websocket'],
  upgrade: true,
  rememberUpgrade: true
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);
  console.log('Transport:', socket.io.engine.transport.name);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});
```

**Solutions:**
1. **Configure Load Balancer for WebSockets:**
   ```nginx
   # Nginx configuration
   location /socket.io/ {
     proxy_pass http://backend;
     proxy_http_version 1.1;
     proxy_set_header Upgrade $http_upgrade;
     proxy_set_header Connection "upgrade";
     proxy_set_header Host $host;
     proxy_cache_bypass $http_upgrade;
   }
   ```

2. **Implement Connection Recovery:**
   ```typescript
   // Server-side connection management
   io.on('connection', (socket) => {
     const adminId = socket.data.admin.id;
     
     // Store connection reference
     adminConnections.set(adminId, socket);
     
     socket.on('disconnect', (reason) => {
       adminConnections.delete(adminId);
       console.log(`Admin ${adminId} disconnected: ${reason}`);
     });
     
     // Heartbeat to detect stale connections
     const heartbeat = setInterval(() => {
       socket.emit('ping');
     }, 30000);
     
     socket.on('disconnect', () => {
       clearInterval(heartbeat);
     });
   });
   ```

3. **Client-side Reconnection:**
   ```typescript
   const socket = io({
     reconnection: true,
     reconnectionDelay: 1000,
     reconnectionAttempts: 5,
     maxReconnectionAttempts: 10
   });
   
   socket.on('reconnect', (attemptNumber) => {
     console.log('Reconnected after', attemptNumber, 'attempts');
     // Re-subscribe to channels
     socket.emit('subscribe', ['dashboard', 'moderation']);
   });
   ```

### Memory and Performance Issues

#### Memory Leaks

**Symptoms:**
- Gradually increasing memory usage
- Out of memory errors
- Slow garbage collection

**Diagnosis:**
```bash
# Generate heap dump
kill -USR2 <node-process-id>

# Analyze with clinic.js
npm install -g clinic
clinic doctor -- node app.js

# Monitor memory usage
node --inspect app.js
# Then connect Chrome DevTools
```

**Solutions:**
1. **Fix Event Listener Leaks:**
   ```typescript
   // Bad: Creates new listener on each render
   useEffect(() => {
     const handleResize = () => setWidth(window.innerWidth);
     window.addEventListener('resize', handleResize);
     // Missing cleanup!
   }, []);
   
   // Good: Proper cleanup
   useEffect(() => {
     const handleResize = () => setWidth(window.innerWidth);
     window.addEventListener('resize', handleResize);
     return () => window.removeEventListener('resize', handleResize);
   }, []);
   ```

2. **Clear Timers and Intervals:**
   ```typescript
   useEffect(() => {
     const interval = setInterval(() => {
       fetchMetrics();
     }, 5000);
     
     return () => clearInterval(interval);
   }, []);
   ```

3. **Implement Proper Cache Eviction:**
   ```typescript
   class LRUCache<T> {
     private cache = new Map<string, T>();
     private maxSize: number;
     
     constructor(maxSize: number = 1000) {
       this.maxSize = maxSize;
     }
     
     set(key: string, value: T): void {
       if (this.cache.size >= this.maxSize) {
         const firstKey = this.cache.keys().next().value;
         this.cache.delete(firstKey);
       }
       this.cache.set(key, value);
     }
   }
   ```

#### High CPU Usage

**Symptoms:**
- Slow response times
- High server load
- Timeout errors

**Diagnosis:**
```bash
# Profile CPU usage
node --prof app.js
# Generate report
node --prof-process isolate-*.log > profile.txt

# Use clinic.js flame
clinic flame -- node app.js
```

**Solutions:**
1. **Optimize Heavy Computations:**
   ```typescript
   // Use worker threads for CPU-intensive tasks
   import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
   
   if (isMainThread) {
     // Main thread
     const worker = new Worker(__filename, {
       workerData: { data: largeDataSet }
     });
     
     worker.on('message', (result) => {
       console.log('Processing complete:', result);
     });
   } else {
     // Worker thread
     const result = processLargeDataSet(workerData.data);
     parentPort?.postMessage(result);
   }
   ```

2. **Implement Debouncing:**
   ```typescript
   // Debounce expensive operations
   const debouncedSearch = useMemo(
     () => debounce((query: string) => {
       performExpensiveSearch(query);
     }, 300),
     []
   );
   ```

3. **Use Pagination and Lazy Loading:**
   ```typescript
   // Implement virtual scrolling for large lists
   const VirtualizedList = ({ items }: { items: any[] }) => {
     const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });
     
     const visibleItems = items.slice(visibleRange.start, visibleRange.end);
     
     return (
       <div onScroll={handleScroll}>
         {visibleItems.map(item => <Item key={item.id} data={item} />)}
       </div>
     );
   };
   ```

## 🛠️ Debugging Tools

### Logging and Monitoring

#### Structured Logging Setup

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'admin-system' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Usage with context
logger.info('User action performed', {
  userId: 'user-123',
  action: 'approve_content',
  contentId: 'post-456',
  duration: 150
});
```

#### Performance Monitoring

```typescript
// Custom performance middleware
export const performanceMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    // Log slow requests
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        method: req.method,
        url: req.url,
        duration,
        statusCode: res.statusCode
      });
    }
    
    // Update metrics
    httpRequestDuration
      .labels(req.method, req.route?.path || req.url, res.statusCode.toString())
      .observe(duration / 1000);
  });
  
  next();
};
```

### Development Tools

#### Debug Configuration

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Admin Backend",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/backend/src/index.ts",
      "env": {
        "NODE_ENV": "development",
        "DEBUG": "admin:*"
      },
      "runtimeArgs": ["-r", "ts-node/register"],
      "sourceMaps": true,
      "restart": true,
      "protocol": "inspector"
    }
  ]
}
```

#### Database Debugging

```typescript
// Enable query logging in development
const db = drizzle(connection, {
  schema,
  logger: process.env.NODE_ENV === 'development' ? {
    logQuery: (query, params) => {
      console.log('Query:', query);
      console.log('Params:', params);
    }
  } : false
});
```

## 📊 Monitoring and Alerting

### Health Check Implementation

```typescript
// Comprehensive health check
export class HealthCheckService {
  async performHealthCheck(): Promise<HealthStatus> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkExternalAPIs(),
      this.checkDiskSpace(),
      this.checkMemoryUsage()
    ]);

    const results = checks.map((check, index) => {
      const names = ['database', 'redis', 'external-apis', 'disk', 'memory'];
      return {
        name: names[index],
        status: check.status === 'fulfilled' ? 'healthy' : 'unhealthy',
        details: check.status === 'fulfilled' ? check.value : check.reason,
        timestamp: new Date()
      };
    });

    const overallStatus = results.every(r => r.status === 'healthy') 
      ? 'healthy' 
      : results.some(r => r.status === 'healthy') 
        ? 'degraded' 
        : 'unhealthy';

    return {
      status: overallStatus,
      checks: results,
      timestamp: new Date()
    };
  }

  private async checkDatabase(): Promise<any> {
    const start = Date.now();
    await db.execute(sql`SELECT 1`);
    const duration = Date.now() - start;
    
    return {
      responseTime: duration,
      status: duration < 1000 ? 'healthy' : 'slow'
    };
  }
}
```

### Alert Configuration

```yaml
# Prometheus alerting rules
groups:
- name: admin-system
  rules:
  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "High error rate detected"
      description: "Error rate is {{ $value }} for the last 5 minutes"

  - alert: DatabaseConnectionHigh
    expr: pg_stat_activity_count > 80
    for: 1m
    labels:
      severity: warning
    annotations:
      summary: "High database connection count"
      description: "Database has {{ $value }} active connections"

  - alert: MemoryUsageHigh
    expr: process_resident_memory_bytes / 1024 / 1024 > 512
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High memory usage"
      description: "Memory usage is {{ $value }}MB"
```

## 🔄 Recovery Procedures

### Database Recovery

#### Backup and Restore

```bash
# Create backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
psql $DATABASE_URL < backup_20240120_143000.sql

# Point-in-time recovery
pg_basebackup -D /var/lib/postgresql/backup -Ft -z -P
```

#### Connection Pool Recovery

```typescript
// Graceful pool shutdown and restart
export class DatabaseManager {
  private pool: Pool;

  async gracefulShutdown(): Promise<void> {
    logger.info('Starting graceful database shutdown');
    
    // Stop accepting new connections
    await this.pool.end();
    
    // Wait for existing queries to complete
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    logger.info('Database shutdown complete');
  }

  async restart(): Promise<void> {
    await this.gracefulShutdown();
    this.pool = new Pool(this.config);
    
    // Test connection
    const client = await this.pool.connect();
    await client.query('SELECT 1');
    client.release();
    
    logger.info('Database connection restored');
  }
}
```

### Application Recovery

#### Circuit Breaker Implementation

```typescript
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private threshold = 5,
    private timeout = 60000
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
  }
}
```

## 📞 Escalation Procedures

### Severity Levels

#### Critical (P0)
- System completely down
- Data loss or corruption
- Security breach

**Response Time:** 15 minutes
**Escalation:** Immediately notify on-call engineer and team lead

#### High (P1)
- Major functionality broken
- Performance severely degraded
- Authentication issues

**Response Time:** 1 hour
**Escalation:** Notify team lead within 30 minutes

#### Medium (P2)
- Minor functionality issues
- Performance degradation
- Non-critical bugs

**Response Time:** 4 hours
**Escalation:** Include in daily standup

#### Low (P3)
- Cosmetic issues
- Enhancement requests
- Documentation updates

**Response Time:** 1 week
**Escalation:** Include in sprint planning

### Contact Information

```yaml
# On-call rotation
primary_oncall:
  - name: "John Doe"
    phone: "+1-555-0101"
    email: "john.doe@linkdao.io"
    slack: "@johndoe"

secondary_oncall:
  - name: "Jane Smith"
    phone: "+1-555-0102"
    email: "jane.smith@linkdao.io"
    slack: "@janesmith"

escalation:
  team_lead:
    name: "Alex Johnson"
    phone: "+1-555-0103"
    email: "alex.johnson@linkdao.io"
  
  engineering_manager:
    name: "Sarah Wilson"
    phone: "+1-555-0104"
    email: "sarah.wilson@linkdao.io"
```

---

*This troubleshooting guide is maintained by the LinkDAO engineering team. For updates or additions, please submit a pull request or contact [dev-team@linkdao.io](mailto:dev-team@linkdao.io).*