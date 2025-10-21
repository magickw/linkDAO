# Seller Integration Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the seller integration consistency improvements. It covers pre-deployment preparation, deployment procedures, post-deployment validation, and rollback procedures.

## Pre-Deployment Checklist

### Environment Preparation

#### 1. Infrastructure Requirements
```yaml
# Minimum system requirements
resources:
  backend:
    cpu: 2 cores
    memory: 4GB
    storage: 50GB SSD
  
  frontend:
    cdn: CloudFlare/AWS CloudFront
    storage: 10GB
  
  database:
    type: PostgreSQL 14+
    cpu: 2 cores
    memory: 8GB
    storage: 100GB SSD
  
  cache:
    type: Redis 6+
    memory: 2GB
    persistence: enabled
```

#### 2. Environment Variables
```bash
# Backend Environment Variables
SELLER_API_BASE_URL=https://api.example.com/api/marketplace/seller
SELLER_CACHE_TTL=300
SELLER_WEBSOCKET_URL=wss://api.example.com/seller/ws
SELLER_IMAGE_UPLOAD_MAX_SIZE=10485760
SELLER_TIER_UPGRADE_WEBHOOK_URL=https://api.example.com/webhooks/tier-upgrade

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/marketplace
DATABASE_POOL_SIZE=20
DATABASE_CONNECTION_TIMEOUT=30000

# Cache Configuration
REDIS_URL=redis://localhost:6379
REDIS_CLUSTER_MODE=false
REDIS_KEY_PREFIX=seller:

# Security Configuration
JWT_SECRET=your-jwt-secret
WALLET_SIGNATURE_TIMEOUT=300
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=100

# Monitoring Configuration
SENTRY_DSN=https://your-sentry-dsn
DATADOG_API_KEY=your-datadog-key
LOG_LEVEL=info
```

#### 3. Database Migrations
```sql
-- Create seller integration tables
CREATE TABLE IF NOT EXISTS seller_profiles (
  wallet_address VARCHAR(42) PRIMARY KEY,
  display_name VARCHAR(255),
  bio TEXT,
  profile_image_url TEXT,
  cover_image_url TEXT,
  email VARCHAR(255),
  website TEXT,
  social_links JSONB DEFAULT '{}',
  verification_status JSONB DEFAULT '{}',
  tier_id VARCHAR(50) DEFAULT 'bronze',
  tier_progress JSONB DEFAULT '{}',
  stats JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create seller listings table
CREATE TABLE IF NOT EXISTS seller_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id VARCHAR(42) REFERENCES seller_profiles(wallet_address),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(18,8) NOT NULL,
  currency VARCHAR(10) NOT NULL,
  images TEXT[] DEFAULT '{}',
  category VARCHAR(100),
  status VARCHAR(20) DEFAULT 'draft',
  escrow_enabled BOOLEAN DEFAULT false,
  shipping_info JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create seller analytics table
CREATE TABLE IF NOT EXISTS seller_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id VARCHAR(42) REFERENCES seller_profiles(wallet_address),
  metric_type VARCHAR(50) NOT NULL,
  metric_value DECIMAL(18,8),
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  metadata JSONB DEFAULT '{}',
  recorded_at TIMESTAMP DEFAULT NOW()
);

-- Create seller cache invalidation tracking
CREATE TABLE IF NOT EXISTS seller_cache_invalidations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id VARCHAR(42) REFERENCES seller_profiles(wallet_address),
  invalidation_type VARCHAR(50) NOT NULL,
  component VARCHAR(100),
  triggered_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_seller_listings_seller_id ON seller_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_listings_status ON seller_listings(status);
CREATE INDEX IF NOT EXISTS idx_seller_analytics_seller_id ON seller_analytics(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_analytics_metric_type ON seller_analytics(metric_type);
CREATE INDEX IF NOT EXISTS idx_seller_cache_invalidations_seller_id ON seller_cache_invalidations(seller_id);
```

### Code Deployment Preparation

#### 1. Build and Test
```bash
# Backend build and test
cd app/backend
npm install
npm run build
npm run test:integration
npm run test:seller-integration

# Frontend build and test
cd app/frontend
npm install
npm run build
npm run test:seller-components
npm run test:integration
```

#### 2. Docker Images
```dockerfile
# Backend Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3001
CMD ["node", "dist/index.js"]

# Frontend Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## Deployment Procedures

### Blue-Green Deployment Strategy

#### 1. Infrastructure Setup
```yaml
# docker-compose.yml for blue-green deployment
version: '3.8'
services:
  # Blue environment (current)
  backend-blue:
    image: marketplace-backend:current
    environment:
      - NODE_ENV=production
      - PORT=3001
    networks:
      - marketplace-blue
  
  frontend-blue:
    image: marketplace-frontend:current
    environment:
      - REACT_APP_API_URL=http://backend-blue:3001
    networks:
      - marketplace-blue
  
  # Green environment (new)
  backend-green:
    image: marketplace-backend:latest
    environment:
      - NODE_ENV=production
      - PORT=3002
    networks:
      - marketplace-green
  
  frontend-green:
    image: marketplace-frontend:latest
    environment:
      - REACT_APP_API_URL=http://backend-green:3002
    networks:
      - marketplace-green
  
  # Load balancer
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - backend-blue
      - backend-green
```

#### 2. Deployment Script
```bash
#!/bin/bash
# deploy-seller-integration.sh

set -e

# Configuration
ENVIRONMENT=${1:-staging}
VERSION=${2:-latest}
HEALTH_CHECK_TIMEOUT=300
ROLLBACK_ON_FAILURE=true

echo "Starting seller integration deployment..."
echo "Environment: $ENVIRONMENT"
echo "Version: $VERSION"

# Pre-deployment checks
echo "Running pre-deployment checks..."
./scripts/pre-deployment-checks.sh $ENVIRONMENT

# Database migrations
echo "Running database migrations..."
npm run migrate:up

# Deploy to green environment
echo "Deploying to green environment..."
docker-compose -f docker-compose.$ENVIRONMENT.yml up -d backend-green frontend-green

# Health checks
echo "Performing health checks..."
./scripts/health-check.sh green $HEALTH_CHECK_TIMEOUT

if [ $? -eq 0 ]; then
  echo "Health checks passed. Switching traffic to green..."
  
  # Update load balancer configuration
  ./scripts/switch-traffic.sh green
  
  # Verify traffic switch
  ./scripts/verify-traffic.sh green
  
  if [ $? -eq 0 ]; then
    echo "Traffic switch successful. Stopping blue environment..."
    docker-compose -f docker-compose.$ENVIRONMENT.yml stop backend-blue frontend-blue
    
    # Post-deployment validation
    ./scripts/post-deployment-validation.sh
    
    echo "Deployment completed successfully!"
  else
    echo "Traffic switch failed. Rolling back..."
    if [ "$ROLLBACK_ON_FAILURE" = true ]; then
      ./scripts/rollback.sh
    fi
    exit 1
  fi
else
  echo "Health checks failed. Rolling back..."
  if [ "$ROLLBACK_ON_FAILURE" = true ]; then
    ./scripts/rollback.sh
  fi
  exit 1
fi
```

### Rolling Deployment Strategy

#### 1. Kubernetes Deployment
```yaml
# seller-backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: seller-backend
  labels:
    app: seller-backend
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
  selector:
    matchLabels:
      app: seller-backend
  template:
    metadata:
      labels:
        app: seller-backend
    spec:
      containers:
      - name: seller-backend
        image: marketplace-backend:latest
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-secret
              key: url
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
```

#### 2. Service Configuration
```yaml
# seller-backend-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: seller-backend-service
spec:
  selector:
    app: seller-backend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3001
  type: ClusterIP

---
# seller-backend-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: seller-backend-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - api.example.com
    secretName: api-tls-secret
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /api/marketplace/seller
        pathType: Prefix
        backend:
          service:
            name: seller-backend-service
            port:
              number: 80
```

## Health Checks and Validation

### Health Check Endpoints

#### 1. Backend Health Checks
```typescript
// Health check implementation
app.get('/health', async (req, res) => {
  const checks = {
    database: false,
    cache: false,
    websocket: false,
    imageUpload: false
  };
  
  try {
    // Database check
    await db.query('SELECT 1');
    checks.database = true;
    
    // Cache check
    await redis.ping();
    checks.cache = true;
    
    // WebSocket check
    checks.websocket = wsServer.clients.size >= 0;
    
    // Image upload service check
    const uploadStatus = await imageUploadService.healthCheck();
    checks.imageUpload = uploadStatus.healthy;
    
    const allHealthy = Object.values(checks).every(check => check);
    
    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      checks
    });
  }
});

app.get('/ready', async (req, res) => {
  try {
    // Check if application is ready to serve requests
    const ready = await Promise.all([
      db.query('SELECT 1'),
      redis.ping(),
      sellerService.isReady()
    ]);
    
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});
```

#### 2. Frontend Health Checks
```typescript
// Service worker health check
self.addEventListener('message', (event) => {
  if (event.data.type === 'HEALTH_CHECK') {
    const healthStatus = {
      cacheService: cacheService.isHealthy(),
      apiConnection: apiService.isConnected(),
      websocketConnection: wsService.isConnected(),
      timestamp: Date.now()
    };
    
    event.ports[0].postMessage({
      type: 'HEALTH_STATUS',
      data: healthStatus
    });
  }
});

// React component health check
const useHealthCheck = () => {
  const [health, setHealth] = useState(null);
  
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch('/api/health');
        const healthData = await response.json();
        setHealth(healthData);
      } catch (error) {
        setHealth({ status: 'error', error: error.message });
      }
    };
    
    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  return health;
};
```

### Automated Testing

#### 1. Integration Tests
```bash
#!/bin/bash
# integration-test.sh

echo "Running seller integration tests..."

# Test API endpoints
echo "Testing API endpoints..."
npm run test:api-integration

# Test WebSocket connections
echo "Testing WebSocket connections..."
npm run test:websocket-integration

# Test cache invalidation
echo "Testing cache invalidation..."
npm run test:cache-integration

# Test error handling
echo "Testing error handling..."
npm run test:error-handling

# Test mobile optimization
echo "Testing mobile optimization..."
npm run test:mobile-integration

# Test tier system
echo "Testing tier system..."
npm run test:tier-integration

echo "All integration tests completed!"
```

#### 2. End-to-End Tests
```typescript
// E2E test suite
describe('Seller Integration E2E Tests', () => {
  beforeAll(async () => {
    await setupTestEnvironment();
  });
  
  afterAll(async () => {
    await cleanupTestEnvironment();
  });
  
  test('Complete seller onboarding flow', async () => {
    // Connect wallet
    await page.click('[data-testid="connect-wallet"]');
    await page.waitForSelector('[data-testid="wallet-connected"]');
    
    // Navigate to seller onboarding
    await page.goto('/seller/onboarding');
    
    // Complete profile setup
    await page.fill('[data-testid="display-name"]', 'Test Seller');
    await page.fill('[data-testid="bio"]', 'Test seller bio');
    await page.click('[data-testid="next-step"]');
    
    // Upload profile image
    await page.setInputFiles('[data-testid="profile-image"]', 'test-image.jpg');
    await page.waitForSelector('[data-testid="image-uploaded"]');
    
    // Complete onboarding
    await page.click('[data-testid="complete-onboarding"]');
    await page.waitForSelector('[data-testid="onboarding-complete"]');
    
    // Verify seller dashboard
    expect(await page.textContent('[data-testid="seller-name"]')).toBe('Test Seller');
  });
  
  test('Create and manage listings', async () => {
    // Navigate to create listing
    await page.goto('/seller/listings/create');
    
    // Fill listing details
    await page.fill('[data-testid="listing-title"]', 'Test Product');
    await page.fill('[data-testid="listing-description"]', 'Test description');
    await page.fill('[data-testid="listing-price"]', '100');
    
    // Upload product images
    await page.setInputFiles('[data-testid="product-images"]', [
      'product1.jpg',
      'product2.jpg'
    ]);
    
    // Save listing
    await page.click('[data-testid="save-listing"]');
    await page.waitForSelector('[data-testid="listing-saved"]');
    
    // Verify listing appears in dashboard
    await page.goto('/seller/dashboard');
    expect(await page.textContent('[data-testid="listing-title"]')).toBe('Test Product');
  });
  
  test('Real-time notifications', async () => {
    // Set up WebSocket listener
    const wsMessages = [];
    page.on('websocket', ws => {
      ws.on('framereceived', event => {
        wsMessages.push(JSON.parse(event.payload));
      });
    });
    
    // Simulate order creation
    await simulateOrderCreation('test-seller-wallet');
    
    // Wait for WebSocket notification
    await page.waitForFunction(() => 
      wsMessages.some(msg => msg.type === 'new_order')
    );
    
    // Verify notification appears in UI
    await page.waitForSelector('[data-testid="new-order-notification"]');
  });
});
```

## Post-Deployment Validation

### Validation Checklist

#### 1. Functional Validation
```bash
#!/bin/bash
# post-deployment-validation.sh

echo "Starting post-deployment validation..."

# Test API endpoints
echo "Validating API endpoints..."
curl -f https://api.example.com/api/marketplace/seller/health || exit 1

# Test seller profile creation
echo "Testing seller profile creation..."
curl -X POST https://api.example.com/api/marketplace/seller/test-wallet/profile \
  -H "Content-Type: application/json" \
  -d '{"displayName":"Test Seller"}' || exit 1

# Test listing creation
echo "Testing listing creation..."
curl -X POST https://api.example.com/api/marketplace/seller/test-wallet/listings \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Product","price":100,"currency":"USD"}' || exit 1

# Test WebSocket connection
echo "Testing WebSocket connection..."
node scripts/test-websocket.js || exit 1

# Test cache invalidation
echo "Testing cache invalidation..."
node scripts/test-cache-invalidation.js || exit 1

echo "Post-deployment validation completed successfully!"
```

#### 2. Performance Validation
```typescript
// Performance validation script
const performanceTests = async () => {
  const results = {
    apiResponseTime: 0,
    cacheHitRate: 0,
    websocketLatency: 0,
    imageUploadTime: 0
  };
  
  // Test API response time
  const apiStart = Date.now();
  await fetch('/api/marketplace/seller/test-wallet/profile');
  results.apiResponseTime = Date.now() - apiStart;
  
  // Test cache hit rate
  const cacheStats = await getCacheStats();
  results.cacheHitRate = cacheStats.hitRate;
  
  // Test WebSocket latency
  const wsLatency = await testWebSocketLatency();
  results.websocketLatency = wsLatency;
  
  // Test image upload time
  const uploadStart = Date.now();
  await uploadTestImage();
  results.imageUploadTime = Date.now() - uploadStart;
  
  // Validate performance thresholds
  const thresholds = {
    apiResponseTime: 500, // 500ms
    cacheHitRate: 0.8, // 80%
    websocketLatency: 100, // 100ms
    imageUploadTime: 5000 // 5 seconds
  };
  
  const failures = [];
  Object.keys(thresholds).forEach(metric => {
    if (results[metric] > thresholds[metric]) {
      failures.push(`${metric}: ${results[metric]} > ${thresholds[metric]}`);
    }
  });
  
  if (failures.length > 0) {
    throw new Error(`Performance validation failed: ${failures.join(', ')}`);
  }
  
  console.log('Performance validation passed:', results);
};
```

### Monitoring Setup

#### 1. Application Metrics
```typescript
// Metrics collection
const metrics = {
  sellerProfileCreations: new Counter({
    name: 'seller_profile_creations_total',
    help: 'Total number of seller profiles created'
  }),
  
  listingCreations: new Counter({
    name: 'seller_listing_creations_total',
    help: 'Total number of listings created'
  }),
  
  apiResponseTime: new Histogram({
    name: 'seller_api_response_time_seconds',
    help: 'Seller API response time in seconds',
    buckets: [0.1, 0.5, 1, 2, 5]
  }),
  
  cacheHitRate: new Gauge({
    name: 'seller_cache_hit_rate',
    help: 'Seller cache hit rate'
  }),
  
  websocketConnections: new Gauge({
    name: 'seller_websocket_connections',
    help: 'Number of active seller WebSocket connections'
  })
};

// Middleware to collect metrics
app.use('/api/marketplace/seller', (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    metrics.apiResponseTime.observe(duration);
  });
  
  next();
});
```

#### 2. Alert Configuration
```yaml
# Prometheus alert rules
groups:
- name: seller-integration
  rules:
  - alert: SellerAPIHighLatency
    expr: histogram_quantile(0.95, seller_api_response_time_seconds) > 1
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Seller API high latency"
      description: "95th percentile latency is {{ $value }}s"
  
  - alert: SellerCacheLowHitRate
    expr: seller_cache_hit_rate < 0.7
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "Seller cache low hit rate"
      description: "Cache hit rate is {{ $value }}"
  
  - alert: SellerWebSocketConnectionsHigh
    expr: seller_websocket_connections > 1000
    for: 5m
    labels:
      severity: info
    annotations:
      summary: "High number of seller WebSocket connections"
      description: "{{ $value }} active connections"
```

## Rollback Procedures

### Automated Rollback

#### 1. Rollback Script
```bash
#!/bin/bash
# rollback-seller-integration.sh

set -e

ENVIRONMENT=${1:-staging}
ROLLBACK_VERSION=${2:-previous}

echo "Starting rollback for seller integration..."
echo "Environment: $ENVIRONMENT"
echo "Rolling back to version: $ROLLBACK_VERSION"

# Stop current deployment
echo "Stopping current deployment..."
docker-compose -f docker-compose.$ENVIRONMENT.yml stop backend-green frontend-green

# Switch traffic back to blue environment
echo "Switching traffic back to blue environment..."
./scripts/switch-traffic.sh blue

# Verify traffic switch
echo "Verifying traffic switch..."
./scripts/verify-traffic.sh blue

if [ $? -eq 0 ]; then
  echo "Traffic switched successfully to blue environment"
  
  # Database rollback if needed
  if [ "$3" = "--with-db-rollback" ]; then
    echo "Rolling back database migrations..."
    npm run migrate:down
  fi
  
  # Clear cache to prevent stale data
  echo "Clearing cache..."
  redis-cli FLUSHDB
  
  # Restart services
  echo "Restarting blue environment services..."
  docker-compose -f docker-compose.$ENVIRONMENT.yml restart backend-blue frontend-blue
  
  # Validate rollback
  echo "Validating rollback..."
  ./scripts/post-rollback-validation.sh
  
  echo "Rollback completed successfully!"
else
  echo "Traffic switch failed during rollback!"
  exit 1
fi
```

#### 2. Database Rollback
```sql
-- Rollback migrations
-- Migration: 001_seller_integration_tables.down.sql

-- Drop indexes
DROP INDEX IF EXISTS idx_seller_listings_seller_id;
DROP INDEX IF EXISTS idx_seller_listings_status;
DROP INDEX IF EXISTS idx_seller_analytics_seller_id;
DROP INDEX IF EXISTS idx_seller_analytics_metric_type;
DROP INDEX IF EXISTS idx_seller_cache_invalidations_seller_id;

-- Drop tables (in reverse order of creation)
DROP TABLE IF EXISTS seller_cache_invalidations;
DROP TABLE IF EXISTS seller_analytics;
DROP TABLE IF EXISTS seller_listings;
DROP TABLE IF EXISTS seller_profiles;

-- Remove any added columns from existing tables
-- ALTER TABLE existing_table DROP COLUMN IF EXISTS new_column;
```

### Manual Rollback Procedures

#### 1. Emergency Rollback
```bash
#!/bin/bash
# emergency-rollback.sh

echo "EMERGENCY ROLLBACK INITIATED"
echo "Timestamp: $(date)"

# Immediate traffic switch
nginx -s reload -c /etc/nginx/nginx.conf.backup

# Stop problematic services
docker stop marketplace-backend-green marketplace-frontend-green

# Restart known good services
docker start marketplace-backend-blue marketplace-frontend-blue

# Clear all caches
redis-cli FLUSHALL

# Send emergency notification
curl -X POST https://hooks.slack.com/emergency \
  -d '{"text":"EMERGENCY ROLLBACK: Seller integration rolled back due to critical issues"}'

echo "Emergency rollback completed"
```

#### 2. Rollback Validation
```typescript
// Post-rollback validation
const validateRollback = async () => {
  const checks = {
    apiEndpoints: false,
    databaseConnectivity: false,
    cacheService: false,
    websocketService: false
  };
  
  try {
    // Test API endpoints
    const apiResponse = await fetch('/api/marketplace/seller/health');
    checks.apiEndpoints = apiResponse.ok;
    
    // Test database
    await db.query('SELECT 1');
    checks.databaseConnectivity = true;
    
    // Test cache
    await redis.ping();
    checks.cacheService = true;
    
    // Test WebSocket
    const wsTest = await testWebSocketConnection();
    checks.websocketService = wsTest.connected;
    
    const allPassed = Object.values(checks).every(check => check);
    
    if (allPassed) {
      console.log('Rollback validation passed:', checks);
      return true;
    } else {
      console.error('Rollback validation failed:', checks);
      return false;
    }
  } catch (error) {
    console.error('Rollback validation error:', error);
    return false;
  }
};
```

## Troubleshooting

### Common Deployment Issues

#### 1. Database Migration Failures
```bash
# Check migration status
npm run migrate:status

# Rollback specific migration
npm run migrate:down -- --to 20231201000000

# Force migration state
npm run migrate:force -- --state up --migration 20231201000001
```

#### 2. Cache Synchronization Issues
```bash
# Clear all seller-related cache
redis-cli --scan --pattern "seller:*" | xargs redis-cli del

# Warm up cache
curl -X POST /api/marketplace/seller/cache/warm-up
```

#### 3. WebSocket Connection Issues
```bash
# Check WebSocket server status
netstat -an | grep :8080

# Test WebSocket connection
wscat -c ws://localhost:8080/seller/test-wallet
```

### Monitoring and Debugging

#### 1. Log Analysis
```bash
# View deployment logs
docker logs marketplace-backend-green --tail 100 -f

# Search for specific errors
grep -i "seller.*error" /var/log/marketplace/*.log

# Analyze performance metrics
curl -s http://localhost:9090/metrics | grep seller_
```

#### 2. Health Check Debugging
```bash
# Detailed health check
curl -v http://localhost:3001/health

# Check individual components
curl http://localhost:3001/health/database
curl http://localhost:3001/health/cache
curl http://localhost:3001/health/websocket
```

This comprehensive deployment guide ensures smooth and reliable deployment of the seller integration consistency improvements with proper validation, monitoring, and rollback procedures.