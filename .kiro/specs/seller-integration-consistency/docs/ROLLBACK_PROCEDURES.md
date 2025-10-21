# Rollback Procedures for Seller Integration

## Overview

This document provides comprehensive rollback procedures for the seller integration consistency improvements. It covers different rollback scenarios, automated and manual procedures, validation steps, and recovery strategies.

## Rollback Strategy

### Rollback Triggers

#### Automatic Rollback Triggers
1. **Health Check Failures**: API endpoints returning 5xx errors for > 5 minutes
2. **High Error Rate**: Error rate > 10% for > 3 minutes
3. **Performance Degradation**: Response time > 5 seconds for > 2 minutes
4. **Database Connection Failures**: Unable to connect to database for > 1 minute
5. **Cache Service Failures**: Cache hit rate < 20% for > 5 minutes

#### Manual Rollback Triggers
1. **Critical Bug Discovery**: Severe functionality issues affecting users
2. **Data Integrity Issues**: Inconsistent or corrupted seller data
3. **Security Vulnerabilities**: Discovered security flaws requiring immediate action
4. **Business Impact**: Significant negative impact on seller operations

### Rollback Types

#### 1. Code Rollback
- Revert application code to previous stable version
- Maintain database schema compatibility
- Preserve user data and configurations

#### 2. Database Rollback
- Revert database schema changes
- Migrate data back to previous structure
- Handle data loss scenarios

#### 3. Configuration Rollback
- Revert environment variables and configurations
- Reset feature flags and toggles
- Restore previous service configurations

#### 4. Infrastructure Rollback
- Revert infrastructure changes
- Restore previous deployment configurations
- Reset load balancer and routing rules

## Automated Rollback Procedures

### 1. Blue-Green Rollback

#### Rollback Script
```bash
#!/bin/bash
# automated-rollback.sh

set -e

ENVIRONMENT=${1:-production}
ROLLBACK_REASON=${2:-"health_check_failure"}
NOTIFICATION_WEBHOOK=${3:-$SLACK_WEBHOOK_URL}

echo "=== AUTOMATED ROLLBACK INITIATED ==="
echo "Environment: $ENVIRONMENT"
echo "Reason: $ROLLBACK_REASON"
echo "Timestamp: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"

# Send initial notification
send_notification() {
  local message="$1"
  local severity="$2"
  
  curl -X POST "$NOTIFICATION_WEBHOOK" \
    -H "Content-Type: application/json" \
    -d "{
      \"text\": \"🚨 SELLER INTEGRATION ROLLBACK\",
      \"attachments\": [{
        \"color\": \"$severity\",
        \"fields\": [{
          \"title\": \"Environment\",
          \"value\": \"$ENVIRONMENT\",
          \"short\": true
        }, {
          \"title\": \"Reason\",
          \"value\": \"$ROLLBACK_REASON\",
          \"short\": true
        }, {
          \"title\": \"Status\",
          \"value\": \"$message\",
          \"short\": false
        }]
      }]
    }"
}

send_notification "Rollback initiated" "warning"

# Step 1: Stop health checks to prevent interference
echo "Disabling health checks..."
kubectl patch deployment seller-backend -p '{"spec":{"template":{"spec":{"containers":[{"name":"seller-backend","livenessProbe":null,"readinessProbe":null}]}}}}'

# Step 2: Switch traffic to blue environment
echo "Switching traffic to blue environment..."
kubectl patch service seller-backend-service -p '{"spec":{"selector":{"version":"blue"}}}'

# Step 3: Verify traffic switch
echo "Verifying traffic switch..."
BLUE_HEALTH_CHECK_URL="http://seller-backend-blue:3001/health"
for i in {1..30}; do
  if curl -f "$BLUE_HEALTH_CHECK_URL" > /dev/null 2>&1; then
    echo "Blue environment is healthy"
    break
  fi
  
  if [ $i -eq 30 ]; then
    echo "Blue environment health check failed after 30 attempts"
    send_notification "Blue environment health check failed" "danger"
    exit 1
  fi
  
  sleep 2
done

# Step 4: Scale down green environment
echo "Scaling down green environment..."
kubectl scale deployment seller-backend-green --replicas=0
kubectl scale deployment seller-frontend-green --replicas=0

# Step 5: Clear cache to prevent stale data
echo "Clearing cache..."
kubectl exec -it $(kubectl get pods -l app=redis -o jsonpath='{.items[0].metadata.name}') -- redis-cli FLUSHDB

# Step 6: Validate rollback
echo "Validating rollback..."
./scripts/validate-rollback.sh

if [ $? -eq 0 ]; then
  send_notification "Rollback completed successfully" "good"
  echo "=== ROLLBACK COMPLETED SUCCESSFULLY ==="
else
  send_notification "Rollback validation failed" "danger"
  echo "=== ROLLBACK VALIDATION FAILED ==="
  exit 1
fi
```

#### Health Check Monitor
```typescript
// health-check-monitor.ts
class HealthCheckMonitor {
  private failureCount = 0;
  private readonly maxFailures = 3;
  private readonly checkInterval = 30000; // 30 seconds
  private readonly rollbackThreshold = 5; // 5 consecutive failures
  
  constructor(
    private healthCheckUrl: string,
    private rollbackScript: string
  ) {}
  
  start(): void {
    setInterval(async () => {
      try {
        const response = await fetch(this.healthCheckUrl);
        
        if (!response.ok) {
          this.handleFailure();
        } else {
          this.handleSuccess();
        }
      } catch (error) {
        console.error('Health check error:', error);
        this.handleFailure();
      }
    }, this.checkInterval);
  }
  
  private handleFailure(): void {
    this.failureCount++;
    console.warn(`Health check failure ${this.failureCount}/${this.rollbackThreshold}`);
    
    if (this.failureCount >= this.rollbackThreshold) {
      console.error('Health check threshold exceeded, initiating rollback');
      this.initiateRollback('health_check_failure');
    }
  }
  
  private handleSuccess(): void {
    if (this.failureCount > 0) {
      console.log('Health check recovered');
      this.failureCount = 0;
    }
  }
  
  private async initiateRollback(reason: string): Promise<void> {
    try {
      const { exec } = require('child_process');
      exec(`${this.rollbackScript} production ${reason}`, (error, stdout, stderr) => {
        if (error) {
          console.error('Rollback script error:', error);
          return;
        }
        console.log('Rollback output:', stdout);
        if (stderr) console.error('Rollback stderr:', stderr);
      });
    } catch (error) {
      console.error('Failed to initiate rollback:', error);
    }
  }
}

// Start monitoring
const monitor = new HealthCheckMonitor(
  'https://api.example.com/api/marketplace/seller/health',
  './scripts/automated-rollback.sh'
);
monitor.start();
```

### 2. Rolling Deployment Rollback

#### Kubernetes Rollback
```bash
#!/bin/bash
# k8s-rollback.sh

NAMESPACE=${1:-default}
DEPLOYMENT_NAME=${2:-seller-backend}

echo "Rolling back Kubernetes deployment..."
echo "Namespace: $NAMESPACE"
echo "Deployment: $DEPLOYMENT_NAME"

# Check rollout history
kubectl rollout history deployment/$DEPLOYMENT_NAME -n $NAMESPACE

# Rollback to previous version
kubectl rollout undo deployment/$DEPLOYMENT_NAME -n $NAMESPACE

# Wait for rollback to complete
kubectl rollout status deployment/$DEPLOYMENT_NAME -n $NAMESPACE --timeout=300s

if [ $? -eq 0 ]; then
  echo "Kubernetes rollback completed successfully"
  
  # Verify pods are running
  kubectl get pods -l app=$DEPLOYMENT_NAME -n $NAMESPACE
  
  # Run post-rollback validation
  ./scripts/validate-rollback.sh
else
  echo "Kubernetes rollback failed"
  exit 1
fi
```

## Manual Rollback Procedures

### 1. Emergency Rollback

#### Immediate Response Checklist
```bash
#!/bin/bash
# emergency-rollback-checklist.sh

echo "=== EMERGENCY ROLLBACK CHECKLIST ==="
echo "Follow these steps in order:"

echo "1. IMMEDIATE ACTIONS (0-2 minutes)"
echo "   □ Stop new deployments"
echo "   □ Switch traffic to previous version"
echo "   □ Notify incident response team"

echo "2. TRAFFIC MANAGEMENT (2-5 minutes)"
echo "   □ Update load balancer configuration"
echo "   □ Verify traffic routing"
echo "   □ Monitor error rates"

echo "3. SERVICE RECOVERY (5-10 minutes)"
echo "   □ Restart services if needed"
echo "   □ Clear problematic cache entries"
echo "   □ Validate core functionality"

echo "4. COMMUNICATION (10-15 minutes)"
echo "   □ Update status page"
echo "   □ Notify stakeholders"
echo "   □ Prepare incident report"

# Interactive execution
read -p "Press Enter to start emergency rollback..."

# Step 1: Immediate traffic switch
echo "Switching traffic to blue environment..."
kubectl patch service seller-backend-service -p '{"spec":{"selector":{"version":"blue"}}}'

# Step 2: Stop green deployment
echo "Stopping green deployment..."
kubectl scale deployment seller-backend-green --replicas=0

# Step 3: Verify blue environment
echo "Verifying blue environment..."
curl -f http://seller-backend-blue:3001/health

# Step 4: Clear cache
echo "Clearing cache..."
redis-cli FLUSHDB

echo "Emergency rollback completed. Verify system status."
```

### 2. Database Rollback

#### Schema Rollback
```sql
-- emergency-schema-rollback.sql
-- This script rolls back seller integration schema changes

BEGIN;

-- Log rollback initiation
INSERT INTO rollback_log (operation, initiated_at, reason) 
VALUES ('seller_integration_schema_rollback', NOW(), 'Emergency rollback');

-- Step 1: Drop new indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_seller_listings_seller_id;
DROP INDEX CONCURRENTLY IF EXISTS idx_seller_listings_status;
DROP INDEX CONCURRENTLY IF EXISTS idx_seller_analytics_seller_id;
DROP INDEX CONCURRENTLY IF EXISTS idx_seller_analytics_metric_type;
DROP INDEX CONCURRENTLY IF EXISTS idx_seller_cache_invalidations_seller_id;

-- Step 2: Backup data before dropping tables
CREATE TABLE seller_profiles_backup AS SELECT * FROM seller_profiles;
CREATE TABLE seller_listings_backup AS SELECT * FROM seller_listings;
CREATE TABLE seller_analytics_backup AS SELECT * FROM seller_analytics;
CREATE TABLE seller_cache_invalidations_backup AS SELECT * FROM seller_cache_invalidations;

-- Step 3: Drop new tables (in reverse dependency order)
DROP TABLE IF EXISTS seller_cache_invalidations;
DROP TABLE IF EXISTS seller_analytics;
DROP TABLE IF EXISTS seller_listings;
DROP TABLE IF EXISTS seller_profiles;

-- Step 4: Remove added columns from existing tables
-- ALTER TABLE users DROP COLUMN IF EXISTS seller_tier_id;
-- ALTER TABLE products DROP COLUMN IF EXISTS seller_verified;

-- Step 5: Restore previous constraints and triggers
-- Add any constraint restoration here

-- Log rollback completion
UPDATE rollback_log 
SET completed_at = NOW(), status = 'completed' 
WHERE operation = 'seller_integration_schema_rollback' 
AND completed_at IS NULL;

COMMIT;
```

#### Data Migration Rollback
```typescript
// data-migration-rollback.ts
class DataMigrationRollback {
  private db: Database;
  private backupTablePrefix = 'rollback_backup_';
  
  constructor(database: Database) {
    this.db = database;
  }
  
  async rollbackSellerData(): Promise<void> {
    console.log('Starting seller data rollback...');
    
    try {
      await this.db.transaction(async (trx) => {
        // Step 1: Verify backup tables exist
        const backupTables = await this.verifyBackupTables(trx);
        if (!backupTables.valid) {
          throw new Error('Backup tables not found or invalid');
        }
        
        // Step 2: Restore seller profiles
        await this.restoreSellerProfiles(trx);
        
        // Step 3: Restore seller listings
        await this.restoreSellerListings(trx);
        
        // Step 4: Restore seller analytics
        await this.restoreSellerAnalytics(trx);
        
        // Step 5: Update related tables
        await this.updateRelatedTables(trx);
        
        // Step 6: Validate data integrity
        await this.validateDataIntegrity(trx);
        
        console.log('Seller data rollback completed successfully');
      });
    } catch (error) {
      console.error('Seller data rollback failed:', error);
      throw error;
    }
  }
  
  private async verifyBackupTables(trx: Transaction): Promise<{valid: boolean, tables: string[]}> {
    const requiredTables = [
      'seller_profiles_backup',
      'seller_listings_backup',
      'seller_analytics_backup'
    ];
    
    const existingTables = await trx.raw(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name IN (${requiredTables.map(t => `'${t}'`).join(',')})
    `);
    
    return {
      valid: existingTables.rows.length === requiredTables.length,
      tables: existingTables.rows.map(row => row.table_name)
    };
  }
  
  private async restoreSellerProfiles(trx: Transaction): Promise<void> {
    // Clear current data
    await trx.raw('TRUNCATE TABLE seller_profiles CASCADE');
    
    // Restore from backup
    await trx.raw(`
      INSERT INTO seller_profiles 
      SELECT * FROM seller_profiles_backup
    `);
    
    console.log('Seller profiles restored from backup');
  }
  
  private async restoreSellerListings(trx: Transaction): Promise<void> {
    await trx.raw('TRUNCATE TABLE seller_listings CASCADE');
    await trx.raw(`
      INSERT INTO seller_listings 
      SELECT * FROM seller_listings_backup
    `);
    
    console.log('Seller listings restored from backup');
  }
  
  private async restoreSellerAnalytics(trx: Transaction): Promise<void> {
    await trx.raw('TRUNCATE TABLE seller_analytics CASCADE');
    await trx.raw(`
      INSERT INTO seller_analytics 
      SELECT * FROM seller_analytics_backup
    `);
    
    console.log('Seller analytics restored from backup');
  }
  
  private async updateRelatedTables(trx: Transaction): Promise<void> {
    // Update any foreign key references or related data
    // This depends on your specific schema relationships
    console.log('Related tables updated');
  }
  
  private async validateDataIntegrity(trx: Transaction): Promise<void> {
    // Validate that restored data is consistent
    const validationQueries = [
      'SELECT COUNT(*) FROM seller_profiles',
      'SELECT COUNT(*) FROM seller_listings',
      'SELECT COUNT(*) FROM seller_analytics'
    ];
    
    for (const query of validationQueries) {
      const result = await trx.raw(query);
      console.log(`Validation: ${query} = ${result.rows[0].count}`);
    }
  }
}

// Execute rollback
const rollback = new DataMigrationRollback(database);
rollback.rollbackSellerData().catch(console.error);
```

### 3. Configuration Rollback

#### Environment Variables Rollback
```bash
#!/bin/bash
# config-rollback.sh

ENVIRONMENT=${1:-production}
BACKUP_DIR="/opt/backups/config"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "Rolling back configuration for environment: $ENVIRONMENT"

# Create current config backup before rollback
echo "Backing up current configuration..."
mkdir -p "$BACKUP_DIR/current_$TIMESTAMP"
cp /opt/app/.env "$BACKUP_DIR/current_$TIMESTAMP/"
cp /opt/app/config/*.json "$BACKUP_DIR/current_$TIMESTAMP/"

# Restore previous configuration
echo "Restoring previous configuration..."
if [ -f "$BACKUP_DIR/previous/.env" ]; then
  cp "$BACKUP_DIR/previous/.env" /opt/app/
  echo "Environment variables restored"
else
  echo "Previous .env file not found"
  exit 1
fi

if [ -d "$BACKUP_DIR/previous/config" ]; then
  cp "$BACKUP_DIR/previous/config"/*.json /opt/app/config/
  echo "Configuration files restored"
else
  echo "Previous config files not found"
  exit 1
fi

# Restart services to apply configuration
echo "Restarting services..."
systemctl restart seller-backend
systemctl restart seller-frontend

# Validate configuration
echo "Validating configuration..."
curl -f http://localhost:3001/health

if [ $? -eq 0 ]; then
  echo "Configuration rollback completed successfully"
else
  echo "Configuration rollback validation failed"
  exit 1
fi
```

## Rollback Validation

### 1. Automated Validation

#### Validation Script
```bash
#!/bin/bash
# validate-rollback.sh

ENVIRONMENT=${1:-production}
VALIDATION_TIMEOUT=300 # 5 minutes

echo "=== ROLLBACK VALIDATION ==="
echo "Environment: $ENVIRONMENT"
echo "Timeout: ${VALIDATION_TIMEOUT}s"

# Test results
TESTS_PASSED=0
TESTS_FAILED=0

run_test() {
  local test_name="$1"
  local test_command="$2"
  
  echo -n "Testing $test_name... "
  
  if eval "$test_command" > /dev/null 2>&1; then
    echo "✓ PASSED"
    ((TESTS_PASSED++))
  else
    echo "✗ FAILED"
    ((TESTS_FAILED++))
  fi
}

# API Health Tests
run_test "API Health Check" "curl -f http://localhost:3001/health"
run_test "Seller Profile Endpoint" "curl -f http://localhost:3001/api/marketplace/seller/test/profile"
run_test "Seller Listings Endpoint" "curl -f http://localhost:3001/api/marketplace/seller/test/listings"
run_test "Seller Dashboard Endpoint" "curl -f http://localhost:3001/api/marketplace/seller/test/dashboard"

# Database Tests
run_test "Database Connection" "psql -h localhost -U postgres -d marketplace -c 'SELECT 1;'"
run_test "Seller Tables Exist" "psql -h localhost -U postgres -d marketplace -c 'SELECT COUNT(*) FROM seller_profiles;'"

# Cache Tests
run_test "Redis Connection" "redis-cli ping"
run_test "Cache Clear" "redis-cli FLUSHDB"

# WebSocket Tests
run_test "WebSocket Connection" "node scripts/test-websocket-connection.js"

# Performance Tests
run_test "API Response Time" "scripts/test-api-performance.sh"

# Frontend Tests
run_test "Frontend Health" "curl -f http://localhost:3000/health"
run_test "Seller Dashboard Page" "curl -f http://localhost:3000/seller/dashboard"

echo ""
echo "=== VALIDATION RESULTS ==="
echo "Tests Passed: $TESTS_PASSED"
echo "Tests Failed: $TESTS_FAILED"

if [ $TESTS_FAILED -eq 0 ]; then
  echo "✓ ALL TESTS PASSED - Rollback validation successful"
  exit 0
else
  echo "✗ SOME TESTS FAILED - Rollback validation failed"
  exit 1
fi
```

### 2. Manual Validation Checklist

#### User Acceptance Testing
```markdown
# Rollback Validation Checklist

## Core Functionality
- [ ] Seller profile creation works
- [ ] Seller profile editing works
- [ ] Listing creation works
- [ ] Listing editing works
- [ ] Image upload works
- [ ] Dashboard loads correctly
- [ ] Analytics display correctly

## Data Integrity
- [ ] Existing seller profiles are intact
- [ ] Existing listings are intact
- [ ] Order history is preserved
- [ ] Analytics data is consistent
- [ ] No data corruption detected

## Performance
- [ ] API response times < 500ms
- [ ] Page load times < 3 seconds
- [ ] Image upload times < 10 seconds
- [ ] WebSocket connections stable
- [ ] Cache hit rate > 70%

## Error Handling
- [ ] Error messages display correctly
- [ ] Fallback mechanisms work
- [ ] Recovery procedures function
- [ ] User guidance is helpful

## Mobile Compatibility
- [ ] Mobile interface works
- [ ] Touch interactions work
- [ ] Responsive design intact
- [ ] Mobile performance acceptable

## Integration Points
- [ ] Payment processing works
- [ ] Email notifications work
- [ ] WebSocket updates work
- [ ] Third-party services work
```

## Recovery Strategies

### 1. Partial Recovery

#### Feature Flag Rollback
```typescript
// feature-flag-rollback.ts
class FeatureFlagRollback {
  private featureFlags: Map<string, boolean> = new Map();
  
  constructor() {
    // Initialize with safe defaults
    this.featureFlags.set('seller-unified-api', false);
    this.featureFlags.set('seller-cache-invalidation', false);
    this.featureFlags.set('seller-websocket-updates', false);
    this.featureFlags.set('seller-tier-system', false);
    this.featureFlags.set('seller-mobile-optimization', false);
  }
  
  async rollbackFeature(featureName: string): Promise<void> {
    console.log(`Rolling back feature: ${featureName}`);
    
    this.featureFlags.set(featureName, false);
    
    // Update feature flag in database
    await this.updateFeatureFlagInDB(featureName, false);
    
    // Notify all services about the change
    await this.notifyServices(featureName, false);
    
    console.log(`Feature ${featureName} rolled back successfully`);
  }
  
  async rollbackAllSellerFeatures(): Promise<void> {
    const sellerFeatures = Array.from(this.featureFlags.keys())
      .filter(key => key.startsWith('seller-'));
    
    for (const feature of sellerFeatures) {
      await this.rollbackFeature(feature);
    }
  }
  
  private async updateFeatureFlagInDB(featureName: string, enabled: boolean): Promise<void> {
    await db.query(
      'UPDATE feature_flags SET enabled = $1, updated_at = NOW() WHERE name = $2',
      [enabled, featureName]
    );
  }
  
  private async notifyServices(featureName: string, enabled: boolean): Promise<void> {
    const notification = {
      type: 'feature_flag_update',
      feature: featureName,
      enabled,
      timestamp: new Date().toISOString()
    };
    
    // Notify via WebSocket
    wsServer.clients.forEach(client => {
      client.send(JSON.stringify(notification));
    });
    
    // Notify via Redis pub/sub
    redis.publish('feature_flags', JSON.stringify(notification));
  }
}
```

### 2. Gradual Recovery

#### Canary Rollback
```bash
#!/bin/bash
# canary-rollback.sh

ENVIRONMENT=${1:-production}
ROLLBACK_PERCENTAGE=${2:-10}

echo "Starting canary rollback..."
echo "Environment: $ENVIRONMENT"
echo "Rollback percentage: $ROLLBACK_PERCENTAGE%"

# Calculate number of instances to rollback
TOTAL_INSTANCES=$(kubectl get pods -l app=seller-backend --no-headers | wc -l)
ROLLBACK_INSTANCES=$((TOTAL_INSTANCES * ROLLBACK_PERCENTAGE / 100))

echo "Total instances: $TOTAL_INSTANCES"
echo "Instances to rollback: $ROLLBACK_INSTANCES"

# Get list of pods to rollback
PODS_TO_ROLLBACK=$(kubectl get pods -l app=seller-backend --no-headers | head -n $ROLLBACK_INSTANCES | awk '{print $1}')

# Rollback selected pods
for pod in $PODS_TO_ROLLBACK; do
  echo "Rolling back pod: $pod"
  kubectl delete pod $pod
  
  # Wait for pod to be recreated with previous version
  kubectl wait --for=condition=Ready pod -l app=seller-backend --timeout=60s
done

# Monitor rollback
echo "Monitoring rollback progress..."
for i in {1..30}; do
  HEALTHY_PODS=$(kubectl get pods -l app=seller-backend --no-headers | grep Running | wc -l)
  
  if [ $HEALTHY_PODS -eq $TOTAL_INSTANCES ]; then
    echo "All pods are healthy"
    break
  fi
  
  echo "Waiting for pods to be ready... ($HEALTHY_PODS/$TOTAL_INSTANCES)"
  sleep 10
done

# Validate canary rollback
./scripts/validate-canary-rollback.sh $ROLLBACK_PERCENTAGE

if [ $? -eq 0 ]; then
  echo "Canary rollback completed successfully"
  
  # Optionally continue with full rollback
  read -p "Continue with full rollback? (y/N): " -n 1 -r
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    ./scripts/full-rollback.sh $ENVIRONMENT
  fi
else
  echo "Canary rollback validation failed"
  exit 1
fi
```

## Communication and Documentation

### 1. Incident Communication

#### Status Page Updates
```typescript
// status-page-update.ts
interface StatusUpdate {
  component: string;
  status: 'operational' | 'degraded_performance' | 'partial_outage' | 'major_outage';
  message: string;
  timestamp: string;
}

class StatusPageManager {
  private apiKey: string;
  private pageId: string;
  
  constructor(apiKey: string, pageId: string) {
    this.apiKey = apiKey;
    this.pageId = pageId;
  }
  
  async updateSellerIntegrationStatus(
    status: StatusUpdate['status'],
    message: string
  ): Promise<void> {
    const update: StatusUpdate = {
      component: 'seller-integration',
      status,
      message,
      timestamp: new Date().toISOString()
    };
    
    try {
      const response = await fetch(`https://api.statuspage.io/v1/pages/${this.pageId}/components`, {
        method: 'PATCH',
        headers: {
          'Authorization': `OAuth ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          component: {
            status: update.status,
            description: update.message
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`Status page update failed: ${response.statusText}`);
      }
      
      console.log('Status page updated successfully');
    } catch (error) {
      console.error('Failed to update status page:', error);
    }
  }
  
  async createIncident(title: string, message: string): Promise<void> {
    try {
      const response = await fetch(`https://api.statuspage.io/v1/pages/${this.pageId}/incidents`, {
        method: 'POST',
        headers: {
          'Authorization': `OAuth ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          incident: {
            name: title,
            status: 'investigating',
            impact_override: 'major',
            body: message,
            component_ids: ['seller-integration-component-id']
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`Incident creation failed: ${response.statusText}`);
      }
      
      console.log('Incident created successfully');
    } catch (error) {
      console.error('Failed to create incident:', error);
    }
  }
}

// Usage during rollback
const statusManager = new StatusPageManager(process.env.STATUSPAGE_API_KEY, process.env.STATUSPAGE_ID);

// Update status during rollback
await statusManager.updateSellerIntegrationStatus(
  'partial_outage',
  'Seller integration is being rolled back due to technical issues. We are working to restore full functionality.'
);

// Create incident if needed
await statusManager.createIncident(
  'Seller Integration Rollback',
  'We are currently rolling back recent changes to the seller integration system due to performance issues. Seller functionality may be limited during this time.'
);
```

### 2. Post-Rollback Documentation

#### Incident Report Template
```markdown
# Seller Integration Rollback Incident Report

## Incident Summary
- **Date**: [Date]
- **Duration**: [Start time] - [End time] ([Duration])
- **Impact**: [Description of impact]
- **Root Cause**: [Brief description]

## Timeline
- **[Time]**: Issue detected
- **[Time]**: Incident declared
- **[Time]**: Rollback initiated
- **[Time]**: Rollback completed
- **[Time]**: Service restored
- **[Time]**: Incident resolved

## Impact Assessment
- **Users Affected**: [Number/percentage]
- **Services Affected**: [List of services]
- **Data Loss**: [Yes/No - details if yes]
- **Revenue Impact**: [If applicable]

## Root Cause Analysis
### What Happened
[Detailed description of what went wrong]

### Why It Happened
[Analysis of underlying causes]

### Contributing Factors
- [Factor 1]
- [Factor 2]
- [Factor 3]

## Response Actions
### Immediate Actions Taken
- [Action 1]
- [Action 2]
- [Action 3]

### Rollback Procedure
- [Step 1]
- [Step 2]
- [Step 3]

## Lessons Learned
### What Went Well
- [Positive aspect 1]
- [Positive aspect 2]

### What Could Be Improved
- [Improvement area 1]
- [Improvement area 2]

## Action Items
| Action | Owner | Due Date | Status |
|--------|-------|----------|--------|
| [Action 1] | [Owner] | [Date] | [Status] |
| [Action 2] | [Owner] | [Date] | [Status] |

## Prevention Measures
- [Measure 1]
- [Measure 2]
- [Measure 3]

## Appendices
### Rollback Logs
[Attach relevant logs]

### Monitoring Data
[Attach relevant metrics and graphs]

### Communication Records
[Attach communication logs]
```

This comprehensive rollback procedure ensures that any issues with the seller integration can be quickly and safely resolved while maintaining system stability and user experience.