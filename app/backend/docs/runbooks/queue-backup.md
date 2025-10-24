# Runbook: Moderation Queue Backup

**Alert**: `moderation_queue_backup`  
**Severity**: P1 - High  
**Response Time**: 1 hour

## Symptoms
- Human review queue size > 1000 items
- Content processing delays > 1 hour
- Users complaining about slow content approval
- Queue size growing faster than processing rate

## Immediate Actions (First 10 minutes)

### 1. Assess Queue Status
```bash
# Check all queue sizes
redis-cli LLEN moderation:queue:fast
redis-cli LLEN moderation:queue:slow  
redis-cli LLEN moderation:queue:human_review
redis-cli LLEN moderation:queue:appeals

# Check processing rates
redis-cli GET moderation:stats:processed_per_minute
redis-cli GET moderation:stats:added_per_minute
```

### 2. Check Worker Status
```bash
# Check if workers are running
ps aux | grep "moderation-worker"
pm2 status | grep worker

# Check worker health
curl -f http://localhost:3001/worker/health
curl -f http://localhost:10000/worker/health
```

### 3. Review Recent Performance
```bash
# Check recent processing times
grep "processing_time" logs/combined.log | tail -20

# Check for errors in workers
grep "worker_error" logs/combined.log | tail -10
```

## Diagnosis Steps

### Identify Bottleneck

#### Check Processing Capacity
```bash
# Worker CPU usage
top -p $(pgrep -f moderation-worker)

# Worker memory usage
ps -o pid,ppid,cmd,%mem,%cpu -p $(pgrep -f moderation-worker)

# Database connection usage
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity WHERE application_name LIKE '%worker%';"
```

#### Check External Dependencies
```bash
# Vendor API response times
grep "vendor_latency" logs/combined.log | tail -20

# Database query performance
psql $DATABASE_URL -c "SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

# Redis performance
redis-cli --latency-history -i 1
```

#### Analyze Queue Growth Pattern
```bash
# Check queue growth over time
redis-cli EVAL "
  local queues = {'fast', 'slow', 'human_review', 'appeals'}
  for i, queue in ipairs(queues) do
    local size = redis.call('LLEN', 'moderation:queue:' .. queue)
    print(queue .. ': ' .. size)
  end
" 0
```

## Resolution Steps

### 1. Immediate Scaling (Quick Wins)

#### Scale Up Workers
```bash
# Add more worker processes
pm2 scale moderation-worker +2

# Or start additional workers manually
NODE_ENV=production npm run worker:start &
NODE_ENV=production npm run worker:start &
```

#### Increase Processing Limits
```bash
# Temporarily increase batch sizes
redis-cli SET moderation:config:batch_size 50

# Increase worker concurrency
redis-cli SET moderation:config:worker_concurrency 10
```

### 2. Optimize Processing

#### Enable Fast Track for Simple Content
```bash
# Increase auto-approval thresholds temporarily
redis-cli SET moderation:config:auto_approve_threshold 0.8

# Skip expensive checks for low-risk content
redis-cli SET moderation:config:skip_deep_scan true
```

#### Prioritize Queue Processing
```bash
# Process high-priority items first
redis-cli EVAL "
  local high_priority = redis.call('LRANGE', 'moderation:queue:high_priority', 0, -1)
  for i, item in ipairs(high_priority) do
    redis.call('LPUSH', 'moderation:queue:fast', item)
  end
  redis.call('DEL', 'moderation:queue:high_priority')
" 0
```

### 3. Reduce Incoming Load

#### Enable Rate Limiting
```bash
# Temporarily reduce submission rate
redis-cli SET rate_limit:submissions 100  # per minute

# Enable queue admission control
redis-cli SET moderation:config:max_queue_size 2000
```

#### Route to Different Queues
```bash
# Route simple text to fast lane
redis-cli SET moderation:config:text_only_fast_lane true

# Defer non-critical content types
redis-cli SET moderation:config:defer_media true
```

### 4. Database Optimization

#### Optimize Slow Queries
```sql
-- Find and optimize slow queries
SELECT query, calls, total_exec_time, mean_exec_time 
FROM pg_stat_statements 
WHERE mean_exec_time > 1000 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- Add missing indexes if needed
CREATE INDEX CONCURRENTLY idx_moderation_cases_status_created 
ON moderation_cases(status, created_at) 
WHERE status IN ('pending', 'quarantined');
```

#### Increase Connection Pool
```bash
# Temporarily increase database connections
export DATABASE_POOL_SIZE=100
pm2 restart moderation-api
```

### 5. Vendor API Optimization

#### Enable Batching
```bash
# Enable API request batching
redis-cli SET moderation:config:enable_batching true
redis-cli SET moderation:config:batch_delay_ms 100
```

#### Use Caching Aggressively
```bash
# Increase cache TTL for duplicate content
redis-cli SET moderation:config:cache_ttl 7200  # 2 hours

# Enable perceptual hash caching
redis-cli SET moderation:config:enable_perceptual_cache true
```

## Monitoring During Resolution

### Key Metrics to Watch
```bash
# Queue drain rate
watch -n 30 'redis-cli LLEN moderation:queue:human_review'

# Processing throughput
watch -n 60 'redis-cli GET moderation:stats:processed_per_minute'

# Worker health
watch -n 30 'pm2 status | grep worker'

# System resources
watch -n 30 'free -h && df -h'
```

### Expected Recovery Timeline
- **0-15 minutes**: Scaling actions should show immediate effect
- **15-30 minutes**: Queue growth should slow or stop
- **30-60 minutes**: Queue should start draining
- **1-2 hours**: Queue should return to normal levels

## Prevention Strategies

### Auto-Scaling Configuration
```javascript
// Add to worker configuration
const autoScale = {
  enabled: true,
  minWorkers: 2,
  maxWorkers: 10,
  scaleUpThreshold: 500,    // queue size
  scaleDownThreshold: 100,
  scaleUpCooldown: 300,     // 5 minutes
  scaleDownCooldown: 600    // 10 minutes
};
```

### Predictive Alerting
```yaml
# Add to monitoring configuration
alerts:
  - name: queue_growth_rate_high
    condition: increase(moderation_queue_size[5m]) > 100
    severity: warning
    description: "Queue growing rapidly, may need scaling"
    
  - name: processing_rate_low
    condition: rate(moderation_processed_total[5m]) < 50
    severity: warning
    description: "Processing rate below normal"
```

### Circuit Breaker Implementation
```javascript
// Add circuit breaker for vendor APIs
const circuitBreaker = {
  failureThreshold: 10,
  timeout: 60000,
  fallback: 'queue_for_later'
};
```

## Escalation Criteria

### Escalate to Team Lead if:
- Queue size > 2000 after 30 minutes of mitigation
- Processing completely stopped
- Database performance severely degraded
- Multiple vendor APIs failing

### Escalate to Engineering Manager if:
- Issue persists > 2 hours
- Data integrity concerns
- Need to implement emergency measures
- Customer impact is severe

## Communication Templates

### Internal Update
```
Subject: [P1] Moderation Queue Backup - Mitigation in Progress

Current Status: Queue size at [X] items, implementing scaling measures
Actions Taken: 
- Scaled workers from [X] to [Y]
- Increased batch processing
- Enabled fast-track for simple content

Impact: Content approval delays of [X] minutes
ETA: Queue should normalize within [X] hours
Next Update: [Time + 30 minutes]
```

### Customer Communication (if needed)
```
We are currently experiencing higher than normal processing times 
for content submissions. Your content is safe and will be processed 
in the order received.

Current delay: Approximately [X] minutes
We expect processing times to return to normal within [X] hours.

Thank you for your patience.
```

## Post-Incident Review

### Data to Collect
- Queue size metrics over time
- Processing rate metrics
- Worker performance data
- Vendor API latency data
- Database performance metrics

### Questions to Answer
- What caused the initial backup?
- Why didn't auto-scaling prevent it?
- Were there early warning signs we missed?
- How can we prevent this in the future?

### Action Items Template
- [ ] Implement better auto-scaling triggers
- [ ] Add predictive alerting for queue growth
- [ ] Optimize database queries identified during incident
- [ ] Review and update capacity planning
- [ ] Test queue backup scenarios in staging