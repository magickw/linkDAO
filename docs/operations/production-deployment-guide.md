# Web3 Marketplace Production Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the Web3 Marketplace to production environments. The deployment includes all necessary infrastructure components, monitoring, logging, backup systems, and operational procedures.

## Prerequisites

### Infrastructure Requirements

- **Kubernetes Cluster**: Version 1.24+ with at least 3 worker nodes
- **Node Specifications**: 
  - Minimum 8 CPU cores and 16GB RAM per node
  - SSD storage with at least 500GB available
  - Network bandwidth: 1Gbps+
- **Load Balancer**: External load balancer or ingress controller
- **DNS**: Configured domain names for the application and monitoring services
- **SSL Certificates**: Valid SSL certificates for all domains

### Software Requirements

- `kubectl` v1.24+
- `helm` v3.8+
- `docker` v20.10+
- `aws-cli` v2.0+ (for S3 backups)
- `curl`, `jq`, `git`

### Access Requirements

- Kubernetes cluster admin access
- Docker registry push/pull access
- AWS S3 bucket access for backups
- DNS management access
- SSL certificate management access

## Pre-Deployment Checklist

### 1. Environment Preparation

```bash
# Verify cluster access
kubectl cluster-info
kubectl get nodes

# Check available resources
kubectl describe nodes
kubectl top nodes

# Verify storage classes
kubectl get storageclass
```

### 2. Docker Images

Ensure all required Docker images are built and pushed to your registry:

```bash
# Build and push backend image
cd app/backend
docker build -t $DOCKER_REGISTRY/web3marketplace/backend:$VERSION .
docker push $DOCKER_REGISTRY/web3marketplace/backend:$VERSION

# Build and push frontend image
cd app/frontend
docker build -t $DOCKER_REGISTRY/web3marketplace/frontend:$VERSION .
docker push $DOCKER_REGISTRY/web3marketplace/frontend:$VERSION
```

### 3. Configuration Secrets

Create required secrets manually (do not store in version control):

```bash
# Create production secrets
kubectl create secret generic web3-marketplace-secrets \
  --from-literal=DATABASE_URL="postgresql://username:password@postgres-service:5432/web3marketplace" \
  --from-literal=REDIS_URL="redis://redis-service:6379" \
  --from-literal=JWT_SECRET="your-secure-jwt-secret" \
  --from-literal=ENCRYPTION_KEY="your-32-character-encryption-key" \
  --from-literal=STRIPE_SECRET_KEY="sk_live_your_stripe_secret" \
  --from-literal=OPENAI_API_KEY="your_openai_api_key" \
  --from-literal=INFURA_PROJECT_ID="your_infura_project_id" \
  --from-literal=PRIVATE_KEY="your_deployment_private_key" \
  --from-literal=S3_ACCESS_KEY="your_s3_access_key" \
  --from-literal=S3_SECRET_KEY="your_s3_secret_key" \
  -n web3-marketplace-prod

# Create monitoring secrets
kubectl create secret generic monitoring-secrets \
  --from-literal=GRAFANA_ADMIN_PASSWORD="secure_grafana_password" \
  --from-literal=SLACK_WEBHOOK_URL="https://hooks.slack.com/services/your/webhook" \
  --from-literal=PAGERDUTY_INTEGRATION_KEY="your_pagerduty_key" \
  -n web3-marketplace-monitoring

# Create Elasticsearch secrets
kubectl create secret generic elasticsearch-secrets \
  --from-literal=ELASTIC_PASSWORD="secure_elastic_password" \
  -n web3-marketplace-prod
```

## Deployment Process

### Method 1: Automated Deployment (Recommended)

Use the provided deployment script for a complete automated deployment:

```bash
# Set environment variables
export DOCKER_REGISTRY="your-registry.com"
export IMAGE_TAG="v1.0.0"

# Run deployment script
./scripts/deployment/deploy-production.sh --tag $IMAGE_TAG --registry $DOCKER_REGISTRY
```

### Method 2: Manual Step-by-Step Deployment

#### Step 1: Create Namespaces and Basic Infrastructure

```bash
# Create namespaces
kubectl apply -f infrastructure/production/kubernetes/namespace.yaml

# Apply ConfigMaps
kubectl apply -f infrastructure/production/kubernetes/configmap.yaml

# Create PVCs
kubectl apply -f infrastructure/production/kubernetes/pvc.yaml
```

#### Step 2: Deploy Database Layer

```bash
# Deploy PostgreSQL with replicas
kubectl apply -f infrastructure/production/kubernetes/database.yaml

# Wait for database to be ready
kubectl wait --for=condition=ready pod -l app=postgres,role=primary -n web3-marketplace-prod --timeout=300s
kubectl wait --for=condition=ready pod -l app=postgres,role=replica -n web3-marketplace-prod --timeout=300s

# Verify database connectivity
kubectl exec -n web3-marketplace-prod statefulset/postgres-primary -- pg_isready -U postgres
```

#### Step 3: Deploy Cache Layer

```bash
# Deploy Redis with Sentinel
kubectl apply -f infrastructure/production/kubernetes/redis.yaml

# Wait for Redis to be ready
kubectl wait --for=condition=ready pod -l app=redis,role=master -n web3-marketplace-prod --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis,role=sentinel -n web3-marketplace-prod --timeout=300s

# Verify Redis connectivity
kubectl exec -n web3-marketplace-prod statefulset/redis-master -- redis-cli ping
```

#### Step 4: Deploy Application Services

```bash
# Update image tags in deployment files
sed -i "s|image: web3marketplace/backend:.*|image: $DOCKER_REGISTRY/web3marketplace/backend:$IMAGE_TAG|g" \
    infrastructure/production/kubernetes/backend-deployment.yaml
sed -i "s|image: web3marketplace/frontend:.*|image: $DOCKER_REGISTRY/web3marketplace/frontend:$IMAGE_TAG|g" \
    infrastructure/production/kubernetes/frontend-deployment.yaml

# Deploy backend
kubectl apply -f infrastructure/production/kubernetes/backend-deployment.yaml
kubectl wait --for=condition=available deployment/backend-deployment -n web3-marketplace-prod --timeout=300s

# Deploy frontend
kubectl apply -f infrastructure/production/kubernetes/frontend-deployment.yaml
kubectl wait --for=condition=available deployment/frontend-deployment -n web3-marketplace-prod --timeout=300s
```

#### Step 5: Deploy Monitoring Stack

```bash
# Deploy monitoring components
kubectl apply -f infrastructure/production/monitoring/alerting-rules.yaml
kubectl apply -f infrastructure/production/monitoring/alertmanager-config.yaml
kubectl apply -f infrastructure/production/monitoring/grafana-dashboards.yaml
kubectl apply -f infrastructure/production/kubernetes/monitoring.yaml

# Wait for monitoring services
kubectl wait --for=condition=available deployment/prometheus -n web3-marketplace-monitoring --timeout=300s
kubectl wait --for=condition=available deployment/grafana -n web3-marketplace-monitoring --timeout=300s
kubectl wait --for=condition=available deployment/alertmanager -n web3-marketplace-monitoring --timeout=300s
```

#### Step 6: Deploy Logging Stack

```bash
# Deploy Elasticsearch cluster
kubectl apply -f infrastructure/production/logging/elasticsearch.yaml
kubectl wait --for=condition=ready pod -l app=elasticsearch -n web3-marketplace-prod --timeout=600s

# Deploy Kibana
kubectl apply -f infrastructure/production/logging/kibana.yaml
kubectl wait --for=condition=available deployment/kibana -n web3-marketplace-prod --timeout=300s

# Deploy Fluentd for log collection
kubectl apply -f infrastructure/production/logging/fluentd-config.yaml
```

#### Step 7: Setup Backup System

```bash
# Deploy backup scripts and CronJobs
kubectl apply -f infrastructure/production/backup/backup-scripts.yaml
kubectl apply -f infrastructure/production/backup/backup-cronjobs.yaml

# Verify backup jobs are scheduled
kubectl get cronjobs -n web3-marketplace-prod
```

#### Step 8: Configure Networking

```bash
# Deploy ingress and load balancing
kubectl apply -f infrastructure/production/kubernetes/ingress.yaml

# Deploy horizontal pod autoscaling
kubectl apply -f infrastructure/production/kubernetes/hpa.yaml

# Verify ingress configuration
kubectl get ingress -n web3-marketplace-prod
kubectl get ingress -n web3-marketplace-monitoring
```

## Post-Deployment Verification

### 1. Health Checks

Run comprehensive health checks:

```bash
# Use the automated health check script
./scripts/monitoring/health-check.sh

# Manual health checks
kubectl get pods -n web3-marketplace-prod
kubectl get pods -n web3-marketplace-monitoring

# Test application endpoints
curl -f https://web3marketplace.com/api/health
curl -f https://api.web3marketplace.com/health
```

### 2. Monitoring Verification

Access monitoring dashboards:

- **Grafana**: https://grafana.web3marketplace.com
- **Prometheus**: https://monitoring.web3marketplace.com
- **AlertManager**: https://alerts.web3marketplace.com
- **Kibana**: https://logs.web3marketplace.com

### 3. Performance Testing

```bash
# Run load tests
kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: load-test
  namespace: web3-marketplace-prod
spec:
  template:
    spec:
      containers:
      - name: load-test
        image: loadimpact/k6:latest
        command:
        - k6
        - run
        - --vus=50
        - --duration=5m
        - /scripts/load-test.js
        volumeMounts:
        - name: test-scripts
          mountPath: /scripts
      volumes:
      - name: test-scripts
        configMap:
          name: load-test-scripts
      restartPolicy: Never
EOF
```

### 4. Backup Verification

```bash
# Test backup functionality
kubectl create job --from=cronjob/postgres-backup manual-backup-test -n web3-marketplace-prod

# Verify backup files in S3
aws s3 ls s3://web3marketplace-backups/postgres/

# Test restore procedure (in staging environment)
./infrastructure/production/backup/restore-postgres.sh backup_file_name.sql.gz
```

## Configuration Management

### Environment Variables

Key environment variables for production:

```bash
# Application Configuration
NODE_ENV=production
LOG_LEVEL=info
PORT=3000

# Database Configuration
DATABASE_URL=postgresql://username:password@postgres-primary-service:5432/web3marketplace
DATABASE_POOL_SIZE=20
DATABASE_TIMEOUT=30000

# Redis Configuration
REDIS_URL=redis://redis-master-service:6379
REDIS_POOL_SIZE=10

# Blockchain Configuration
BLOCKCHAIN_NETWORK=mainnet
INFURA_PROJECT_ID=your_project_id
ALCHEMY_API_KEY=your_alchemy_key

# Security Configuration
JWT_SECRET=your_secure_jwt_secret
ENCRYPTION_KEY=your_32_character_key
CORS_ORIGIN=https://web3marketplace.com

# External Services
STRIPE_SECRET_KEY=sk_live_your_stripe_key
OPENAI_API_KEY=your_openai_key
PINATA_JWT=your_pinata_jwt

# Monitoring
METRICS_ENABLED=true
SENTRY_DSN=your_sentry_dsn
```

### Resource Limits

Recommended resource limits for production:

```yaml
# Backend pods
resources:
  requests:
    memory: "512Mi"
    cpu: "250m"
  limits:
    memory: "1Gi"
    cpu: "500m"

# Frontend pods
resources:
  requests:
    memory: "256Mi"
    cpu: "100m"
  limits:
    memory: "512Mi"
    cpu: "250m"

# Database
resources:
  requests:
    memory: "1Gi"
    cpu: "500m"
  limits:
    memory: "2Gi"
    cpu: "1000m"

# Redis
resources:
  requests:
    memory: "256Mi"
    cpu: "100m"
  limits:
    memory: "512Mi"
    cpu: "250m"
```

## Scaling Configuration

### Horizontal Pod Autoscaling

```yaml
# Backend HPA
minReplicas: 3
maxReplicas: 20
targetCPUUtilizationPercentage: 70
targetMemoryUtilizationPercentage: 80

# Frontend HPA
minReplicas: 2
maxReplicas: 10
targetCPUUtilizationPercentage: 70
targetMemoryUtilizationPercentage: 80
```

### Vertical Scaling

Monitor resource usage and adjust limits based on actual usage patterns:

```bash
# Monitor resource usage
kubectl top pods -n web3-marketplace-prod --sort-by=cpu
kubectl top pods -n web3-marketplace-prod --sort-by=memory

# Update resource limits
kubectl patch deployment backend-deployment -n web3-marketplace-prod -p '{"spec":{"template":{"spec":{"containers":[{"name":"backend","resources":{"limits":{"memory":"2Gi","cpu":"1000m"}}}]}}}}'
```

## Security Considerations

### Network Policies

```yaml
# Restrict database access
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: postgres-network-policy
  namespace: web3-marketplace-prod
spec:
  podSelector:
    matchLabels:
      app: postgres
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: backend
    ports:
    - protocol: TCP
      port: 5432
```

### Pod Security Standards

```yaml
# Pod Security Context
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  fsGroup: 2000
  seccompProfile:
    type: RuntimeDefault
```

### Secret Management

- Use external secret management systems (AWS Secrets Manager, HashiCorp Vault)
- Rotate secrets regularly
- Implement least privilege access
- Monitor secret access

## Monitoring and Alerting

### Key Metrics to Monitor

1. **Application Metrics**:
   - Request rate and response time
   - Error rate (4xx, 5xx)
   - Active users and transactions
   - Database query performance

2. **Infrastructure Metrics**:
   - CPU and memory usage
   - Disk I/O and network traffic
   - Pod restart count
   - Node health

3. **Business Metrics**:
   - Transaction volume and revenue
   - User registration and activity
   - Order completion rate
   - Payment success rate

### Alert Thresholds

```yaml
# Critical Alerts
- Service down (immediate)
- Error rate > 10% (2 minutes)
- Response time > 5s (5 minutes)
- Database connections > 90% (2 minutes)

# Warning Alerts
- Error rate > 5% (5 minutes)
- Response time > 2s (10 minutes)
- CPU usage > 80% (10 minutes)
- Memory usage > 85% (10 minutes)
```

## Backup and Disaster Recovery

### Backup Schedule

- **Database**: Daily full backup + continuous WAL archiving
- **Redis**: Every 6 hours
- **Configuration**: Daily backup of all Kubernetes resources
- **Application Data**: Real-time replication to secondary region

### Recovery Procedures

1. **Database Recovery**:
   ```bash
   # Point-in-time recovery
   ./infrastructure/production/backup/restore-postgres.sh backup_file.sql.gz
   
   # Verify data integrity
   kubectl exec -n web3-marketplace-prod statefulset/postgres-primary -- \
     psql -U postgres -d web3marketplace -c "SELECT count(*) FROM users;"
   ```

2. **Application Recovery**:
   ```bash
   # Rollback to previous version
   kubectl rollout undo deployment/backend-deployment -n web3-marketplace-prod
   kubectl rollout undo deployment/frontend-deployment -n web3-marketplace-prod
   ```

3. **Full System Recovery**:
   ```bash
   # Restore from backup in new cluster
   ./scripts/deployment/deploy-production.sh --restore-from-backup
   ```

## Maintenance Procedures

### Regular Maintenance Tasks

1. **Weekly**:
   - Review monitoring dashboards
   - Check backup integrity
   - Update security patches
   - Review resource usage

2. **Monthly**:
   - Rotate secrets and certificates
   - Update dependencies
   - Performance optimization
   - Capacity planning review

3. **Quarterly**:
   - Disaster recovery testing
   - Security audit
   - Architecture review
   - Cost optimization

### Update Procedures

```bash
# Rolling update with zero downtime
kubectl set image deployment/backend-deployment backend=$DOCKER_REGISTRY/web3marketplace/backend:$NEW_VERSION -n web3-marketplace-prod

# Monitor rollout
kubectl rollout status deployment/backend-deployment -n web3-marketplace-prod

# Rollback if needed
kubectl rollout undo deployment/backend-deployment -n web3-marketplace-prod
```

## Troubleshooting

### Common Issues

1. **Pod Startup Issues**:
   ```bash
   kubectl describe pod <pod-name> -n web3-marketplace-prod
   kubectl logs <pod-name> -n web3-marketplace-prod --previous
   ```

2. **Database Connection Issues**:
   ```bash
   kubectl exec -n web3-marketplace-prod deployment/backend-deployment -- \
     psql $DATABASE_URL -c "SELECT 1;"
   ```

3. **Performance Issues**:
   ```bash
   kubectl top pods -n web3-marketplace-prod
   kubectl get hpa -n web3-marketplace-prod
   ```

### Emergency Procedures

Refer to the operational runbooks:
- [Service Down Runbook](./runbooks/service-down.md)
- [High Error Rate Runbook](./runbooks/high-error-rate.md)
- [Database Issues Runbook](./runbooks/database-issues.md)

## Support and Escalation

### Contact Information

- **On-call Engineer**: Check PagerDuty rotation
- **Engineering Team**: engineering@web3marketplace.com
- **Infrastructure Team**: infra@web3marketplace.com
- **Security Team**: security@web3marketplace.com

### Escalation Matrix

1. **Level 1** (0-15 min): On-call engineer
2. **Level 2** (15-30 min): Senior engineer + team lead
3. **Level 3** (30+ min): Engineering manager + CTO

## Compliance and Auditing

### Audit Logging

All system activities are logged and stored for compliance:

- Application logs: 90 days retention
- Security logs: 1 year retention
- Audit logs: 7 years retention
- Database logs: 30 days retention

### Compliance Requirements

- SOC 2 Type II compliance
- GDPR data protection
- PCI DSS for payment processing
- Regular security assessments

## Cost Optimization

### Resource Optimization

1. **Right-sizing**: Regular review of resource requests and limits
2. **Spot Instances**: Use spot instances for non-critical workloads
3. **Storage Optimization**: Implement data lifecycle policies
4. **Network Optimization**: Use CDN and edge caching

### Monitoring Costs

```bash
# Monitor resource usage
kubectl cost --namespace web3-marketplace-prod

# Analyze storage costs
kubectl get pv --sort-by=.spec.capacity.storage
```

This deployment guide provides a comprehensive foundation for running the Web3 Marketplace in production. Regular updates and improvements should be made based on operational experience and changing requirements.