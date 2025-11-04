# Production Deployment Guide

This guide covers the complete process of deploying the Web3 Marketplace platform to production environments.

## Prerequisites

### Infrastructure Requirements

#### Minimum System Requirements

| Component | CPU | RAM | Storage | Network |
|-----------|-----|-----|---------|---------|
| Frontend (Next.js) | 2 vCPU | 4 GB | 20 GB SSD | 1 Gbps |
| Backend (Node.js) | 4 vCPU | 8 GB | 50 GB SSD | 1 Gbps |
| Database (PostgreSQL) | 4 vCPU | 16 GB | 200 GB SSD | 1 Gbps |
| Redis Cache | 2 vCPU | 8 GB | 20 GB SSD | 1 Gbps |
| IPFS Node | 2 vCPU | 4 GB | 500 GB SSD | 1 Gbps |

#### Recommended Production Setup

| Component | CPU | RAM | Storage | Instances |
|-----------|-----|-----|---------|-----------|
| Load Balancer | 2 vCPU | 4 GB | 20 GB | 2 (HA) |
| Frontend | 4 vCPU | 8 GB | 50 GB | 3+ |
| Backend API | 8 vCPU | 16 GB | 100 GB | 3+ |
| Database Primary | 8 vCPU | 32 GB | 1 TB SSD | 1 |
| Database Replica | 8 vCPU | 32 GB | 1 TB SSD | 2+ |
| Redis Cluster | 4 vCPU | 16 GB | 100 GB | 3 |
| IPFS Cluster | 4 vCPU | 8 GB | 2 TB | 3+ |

### Required Accounts and Services

- [ ] AWS/GCP/Azure account with appropriate permissions
- [ ] Domain name and DNS management
- [ ] SSL certificate (Let's Encrypt or commercial)
- [ ] Container registry (Docker Hub, ECR, GCR)
- [ ] Monitoring service (DataDog, New Relic, or Prometheus)
- [ ] Log aggregation service (ELK Stack, Splunk, or CloudWatch)
- [ ] Backup storage (S3, GCS, or Azure Blob)
- [ ] CDN service (CloudFlare, CloudFront, or Fastly)

### External Service Dependencies

- [ ] Ethereum/Polygon/Arbitrum RPC endpoints (Infura, Alchemy, or QuickNode)
- [ ] IPFS pinning service (Pinata, Web3.Storage, or self-hosted)
- [ ] Email service (SendGrid, AWS SES, or Mailgun)
- [ ] SMS service (Twilio, AWS SNS, or similar)
- [ ] Payment processors (Stripe, PayPal)
- [ ] KYC/AML service (Jumio, Onfido, or similar)

## Environment Setup

### 1. Infrastructure Provisioning

#### Using Terraform (Recommended)

```hcl
# terraform/main.tf
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# VPC and Networking
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  
  name = "web3-marketplace-vpc"
  cidr = "10.0.0.0/16"
  
  azs             = ["${var.aws_region}a", "${var.aws_region}b", "${var.aws_region}c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
  
  enable_nat_gateway = true
  enable_vpn_gateway = true
  
  tags = {
    Environment = var.environment
    Project     = "web3-marketplace"
  }
}

# EKS Cluster
module "eks" {
  source = "terraform-aws-modules/eks/aws"
  
  cluster_name    = "web3-marketplace-${var.environment}"
  cluster_version = "1.28"
  
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets
  
  node_groups = {
    main = {
      desired_capacity = 3
      max_capacity     = 10
      min_capacity     = 3
      
      instance_types = ["t3.large"]
      
      k8s_labels = {
        Environment = var.environment
        Application = "web3-marketplace"
      }
    }
  }
}

# RDS Database
resource "aws_db_instance" "main" {
  identifier = "web3-marketplace-${var.environment}"
  
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r6g.xlarge"
  
  allocated_storage     = 200
  max_allocated_storage = 1000
  storage_type          = "gp3"
  storage_encrypted     = true
  
  db_name  = "web3marketplace"
  username = var.db_username
  password = var.db_password
  
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  skip_final_snapshot = false
  final_snapshot_identifier = "web3-marketplace-${var.environment}-final-snapshot"
  
  tags = {
    Environment = var.environment
    Project     = "web3-marketplace"
  }
}

# ElastiCache Redis
resource "aws_elasticache_replication_group" "main" {
  replication_group_id       = "web3-marketplace-${var.environment}"
  description                = "Redis cluster for Web3 Marketplace"
  
  node_type                  = "cache.r6g.large"
  port                       = 6379
  parameter_group_name       = "default.redis7"
  
  num_cache_clusters         = 3
  automatic_failover_enabled = true
  multi_az_enabled          = true
  
  subnet_group_name = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]
  
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  
  tags = {
    Environment = var.environment
    Project     = "web3-marketplace"
  }
}
```

#### Using Kubernetes Manifests

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: web3-marketplace
  labels:
    name: web3-marketplace
    environment: production

---
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: web3-marketplace
data:
  NODE_ENV: "production"
  API_URL: "https://api.linkdao.io"
  FRONTEND_URL: "https://linkdao.io"
  REDIS_URL: "redis://redis-cluster:6379"
  IPFS_GATEWAY: "https://ipfs.linkdao.io"

---
# k8s/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: web3-marketplace
type: Opaque
data:
  DATABASE_URL: <base64-encoded-database-url>
  JWT_SECRET: <base64-encoded-jwt-secret>
  ETHEREUM_PRIVATE_KEY: <base64-encoded-private-key>
  STRIPE_SECRET_KEY: <base64-encoded-stripe-key>
```

### 2. Container Images

#### Backend Dockerfile

```dockerfile
# Dockerfile.backend
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/
COPY drizzle/ ./drizzle/

# Build application
RUN npm run build

# Production image
FROM node:18-alpine AS production

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node dist/healthcheck.js

EXPOSE 3001

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
```

#### Frontend Dockerfile

```dockerfile
# Dockerfile.frontend
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY next.config.js ./
COPY tsconfig.json ./
COPY tailwind.config.js ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src/ ./src/
COPY public/ ./public/

# Build application
ENV NODE_ENV=production
RUN npm run build

# Production image
FROM node:18-alpine AS production

WORKDIR /app

# Install dumb-init
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
```

### 3. Kubernetes Deployments

#### Backend Deployment

```yaml
# k8s/backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: web3-marketplace
  labels:
    app: backend
    version: v1
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
        version: v1
    spec:
      containers:
      - name: backend
        image: web3marketplace/backend:latest
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "3001"
        envFrom:
        - configMapRef:
            name: app-config
        - secretRef:
            name: app-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
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
        securityContext:
          runAsNonRoot: true
          runAsUser: 1001
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
        volumeMounts:
        - name: tmp
          mountPath: /tmp
      volumes:
      - name: tmp
        emptyDir: {}

---
apiVersion: v1
kind: Service
metadata:
  name: backend-service
  namespace: web3-marketplace
spec:
  selector:
    app: backend
  ports:
  - port: 80
    targetPort: 3001
  type: ClusterIP
```

#### Frontend Deployment

```yaml
# k8s/frontend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: web3-marketplace
  labels:
    app: frontend
    version: v1
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 2
      maxUnavailable: 0
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
        version: v1
    spec:
      containers:
      - name: frontend
        image: web3marketplace/frontend:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "3000"
        envFrom:
        - configMapRef:
            name: app-config
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        securityContext:
          runAsNonRoot: true
          runAsUser: 1001
          allowPrivilegeEscalation: false

---
apiVersion: v1
kind: Service
metadata:
  name: frontend-service
  namespace: web3-marketplace
spec:
  selector:
    app: frontend
  ports:
  - port: 80
    targetPort: 3000
  type: ClusterIP
```

## Database Setup

### 1. Database Migration

```bash
# Run database migrations
kubectl exec -it deployment/backend -n web3-marketplace -- npm run db:migrate

# Seed initial data
kubectl exec -it deployment/backend -n web3-marketplace -- npm run db:seed
```

### 2. Database Configuration

```sql
-- Create production database
CREATE DATABASE web3marketplace_production;

-- Create application user
CREATE USER web3marketplace WITH PASSWORD 'secure_password';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE web3marketplace_production TO web3marketplace;

-- Enable required extensions
\c web3marketplace_production;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Create indexes for performance
CREATE INDEX CONCURRENTLY idx_products_category ON products(category_id);
CREATE INDEX CONCURRENTLY idx_products_seller ON products(seller_id);
CREATE INDEX CONCURRENTLY idx_products_created_at ON products(created_at);
CREATE INDEX CONCURRENTLY idx_orders_buyer ON orders(buyer_id);
CREATE INDEX CONCURRENTLY idx_orders_seller ON orders(seller_id);
CREATE INDEX CONCURRENTLY idx_orders_status ON orders(status);
```

## Smart Contract Deployment

### 1. Contract Deployment Script

```typescript
// scripts/deploy-contracts.ts
import { ethers } from 'hardhat';
import { writeFileSync } from 'fs';

async function main() {
  console.log('Deploying contracts to mainnet...');
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log('Deploying with account:', deployer.address);
  
  // Check balance
  const balance = await deployer.getBalance();
  console.log('Account balance:', ethers.utils.formatEther(balance), 'ETH');
  
  // Deploy MarketplaceEscrow
  console.log('Deploying MarketplaceEscrow...');
  const MarketplaceEscrow = await ethers.getContractFactory('MarketplaceEscrow');
  const escrow = await MarketplaceEscrow.deploy();
  await escrow.deployed();
  console.log('MarketplaceEscrow deployed to:', escrow.address);
  
  // Deploy ReputationSystem
  console.log('Deploying ReputationSystem...');
  const ReputationSystem = await ethers.getContractFactory('ReputationSystem');
  const reputation = await ReputationSystem.deploy();
  await reputation.deployed();
  console.log('ReputationSystem deployed to:', reputation.address);
  
  // Deploy PlatformToken
  console.log('Deploying PlatformToken...');
  const PlatformToken = await ethers.getContractFactory('PlatformToken');
  const token = await PlatformToken.deploy(
    'Web3 Marketplace Token',
    'W3MT',
    ethers.utils.parseEther('1000000000') // 1B tokens
  );
  await token.deployed();
  console.log('PlatformToken deployed to:', token.address);
  
  // Deploy NFTMarketplace
  console.log('Deploying NFTMarketplace...');
  const NFTMarketplace = await ethers.getContractFactory('NFTMarketplace');
  const nftMarketplace = await NFTMarketplace.deploy(
    escrow.address,
    reputation.address,
    token.address
  );
  await nftMarketplace.deployed();
  console.log('NFTMarketplace deployed to:', nftMarketplace.address);
  
  // Save deployment addresses
  const deploymentInfo = {
    network: 'mainnet',
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      MarketplaceEscrow: escrow.address,
      ReputationSystem: reputation.address,
      PlatformToken: token.address,
      NFTMarketplace: nftMarketplace.address
    },
    transactionHashes: {
      MarketplaceEscrow: escrow.deployTransaction.hash,
      ReputationSystem: reputation.deployTransaction.hash,
      PlatformToken: token.deployTransaction.hash,
      NFTMarketplace: nftMarketplace.deployTransaction.hash
    }
  };
  
  writeFileSync(
    'deployments/mainnet.json',
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log('Deployment complete!');
  console.log('Contract addresses saved to deployments/mainnet.json');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

### 2. Contract Verification

```bash
# Verify contracts on Etherscan
npx hardhat verify --network mainnet 0x1234567890abcdef1234567890abcdef12345678
npx hardhat verify --network mainnet 0x5678901234abcdef5678901234abcdef56789012
npx hardhat verify --network mainnet 0x9abcdef01234567890abcdef01234567890abcdef "Web3 Marketplace Token" "W3MT" "1000000000000000000000000000"
npx hardhat verify --network mainnet 0xdef0123456789abcdef0123456789abcdef012345 0x1234567890abcdef1234567890abcdef12345678 0x5678901234abcdef5678901234abcdef56789012 0x9abcdef01234567890abcdef01234567890abcdef
```

## Load Balancer and Ingress

### 1. Ingress Configuration

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web3-marketplace-ingress
  namespace: web3-marketplace
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
spec:
  tls:
  - hosts:
    - linkdao.io
    - api.linkdao.io
    secretName: web3marketplace-tls
  rules:
  - host: linkdao.io
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-service
            port:
              number: 80
  - host: api.linkdao.io
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: backend-service
            port:
              number: 80
```

### 2. SSL Certificate Setup

```yaml
# k8s/certificate.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: web3marketplace-cert
  namespace: web3-marketplace
spec:
  secretName: web3marketplace-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - linkdao.io
  - www.linkdao.io
  - api.linkdao.io
```

## Monitoring and Logging

### 1. Prometheus Monitoring

```yaml
# k8s/monitoring.yaml
apiVersion: v1
kind: ServiceMonitor
metadata:
  name: web3-marketplace-monitor
  namespace: web3-marketplace
spec:
  selector:
    matchLabels:
      app: backend
  endpoints:
  - port: metrics
    path: /metrics
    interval: 30s

---
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: web3-marketplace-alerts
  namespace: web3-marketplace
spec:
  groups:
  - name: web3-marketplace
    rules:
    - alert: HighErrorRate
      expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "High error rate detected"
        description: "Error rate is {{ $value }} errors per second"
    
    - alert: HighResponseTime
      expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High response time detected"
        description: "95th percentile response time is {{ $value }} seconds"
```

### 2. Logging Configuration

```yaml
# k8s/logging.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-config
  namespace: web3-marketplace
data:
  fluent-bit.conf: |
    [SERVICE]
        Flush         1
        Log_Level     info
        Daemon        off
        Parsers_File  parsers.conf
    
    [INPUT]
        Name              tail
        Path              /var/log/containers/*web3-marketplace*.log
        Parser            docker
        Tag               kube.*
        Refresh_Interval  5
        Mem_Buf_Limit     50MB
        Skip_Long_Lines   On
    
    [FILTER]
        Name                kubernetes
        Match               kube.*
        Kube_URL            https://kubernetes.default.svc:443
        Kube_CA_File        /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
        Kube_Token_File     /var/run/secrets/kubernetes.io/serviceaccount/token
        Merge_Log           On
        K8S-Logging.Parser  On
        K8S-Logging.Exclude Off
    
    [OUTPUT]
        Name  es
        Match *
        Host  elasticsearch.logging.svc.cluster.local
        Port  9200
        Index web3-marketplace
        Type  _doc
```

## Security Configuration

### 1. Network Policies

```yaml
# k8s/network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: web3-marketplace-network-policy
  namespace: web3-marketplace
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 3000
    - protocol: TCP
      port: 3001
  - from:
    - podSelector:
        matchLabels:
          app: backend
    - podSelector:
        matchLabels:
          app: frontend
    ports:
    - protocol: TCP
      port: 3001
  egress:
  - to: []
    ports:
    - protocol: TCP
      port: 53
    - protocol: UDP
      port: 53
  - to: []
    ports:
    - protocol: TCP
      port: 443
    - protocol: TCP
      port: 80
  - to:
    - podSelector:
        matchLabels:
          app: redis
    ports:
    - protocol: TCP
      port: 6379
```

### 2. Pod Security Policy

```yaml
# k8s/pod-security-policy.yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: web3-marketplace-psp
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
    - ALL
  volumes:
    - 'configMap'
    - 'emptyDir'
    - 'projected'
    - 'secret'
    - 'downwardAPI'
    - 'persistentVolumeClaim'
  runAsUser:
    rule: 'MustRunAsNonRoot'
  seLinux:
    rule: 'RunAsAny'
  fsGroup:
    rule: 'RunAsAny'
```

## Backup and Disaster Recovery

### 1. Database Backup

```bash
#!/bin/bash
# scripts/backup-database.sh

set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/database"
DB_NAME="web3marketplace_production"
S3_BUCKET="web3marketplace-backups"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create database dump
pg_dump $DATABASE_URL > $BACKUP_DIR/backup_$TIMESTAMP.sql

# Compress backup
gzip $BACKUP_DIR/backup_$TIMESTAMP.sql

# Upload to S3
aws s3 cp $BACKUP_DIR/backup_$TIMESTAMP.sql.gz s3://$S3_BUCKET/database/

# Clean up local files older than 7 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Database backup completed: backup_$TIMESTAMP.sql.gz"
```

### 2. Application State Backup

```bash
#!/bin/bash
# scripts/backup-application.sh

set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/application"
S3_BUCKET="web3marketplace-backups"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup Kubernetes resources
kubectl get all -n web3-marketplace -o yaml > $BACKUP_DIR/k8s-resources_$TIMESTAMP.yaml
kubectl get configmaps -n web3-marketplace -o yaml > $BACKUP_DIR/configmaps_$TIMESTAMP.yaml
kubectl get secrets -n web3-marketplace -o yaml > $BACKUP_DIR/secrets_$TIMESTAMP.yaml

# Backup IPFS data
ipfs repo gc
tar -czf $BACKUP_DIR/ipfs-data_$TIMESTAMP.tar.gz ~/.ipfs

# Upload to S3
aws s3 sync $BACKUP_DIR s3://$S3_BUCKET/application/

echo "Application backup completed: $TIMESTAMP"
```

## Deployment Process

### 1. Pre-deployment Checklist

- [ ] All tests passing in CI/CD pipeline
- [ ] Security scan completed with no critical issues
- [ ] Performance tests meet requirements
- [ ] Database migrations tested
- [ ] Rollback plan prepared
- [ ] Monitoring and alerting configured
- [ ] Team notified of deployment window

### 2. Deployment Script

```bash
#!/bin/bash
# scripts/deploy.sh

set -e

ENVIRONMENT=${1:-production}
VERSION=${2:-latest}

echo "Deploying Web3 Marketplace to $ENVIRONMENT..."

# Set kubectl context
kubectl config use-context $ENVIRONMENT

# Update container images
kubectl set image deployment/backend backend=web3marketplace/backend:$VERSION -n web3-marketplace
kubectl set image deployment/frontend frontend=web3marketplace/frontend:$VERSION -n web3-marketplace

# Wait for rollout to complete
kubectl rollout status deployment/backend -n web3-marketplace --timeout=600s
kubectl rollout status deployment/frontend -n web3-marketplace --timeout=600s

# Run health checks
echo "Running health checks..."
kubectl exec deployment/backend -n web3-marketplace -- curl -f http://localhost:3001/health
kubectl exec deployment/frontend -n web3-marketplace -- curl -f http://localhost:3000/api/health

# Run smoke tests
echo "Running smoke tests..."
npm run test:smoke -- --env=$ENVIRONMENT

echo "Deployment completed successfully!"
```

### 3. Rollback Procedure

```bash
#!/bin/bash
# scripts/rollback.sh

set -e

ENVIRONMENT=${1:-production}

echo "Rolling back Web3 Marketplace in $ENVIRONMENT..."

# Rollback deployments
kubectl rollout undo deployment/backend -n web3-marketplace
kubectl rollout undo deployment/frontend -n web3-marketplace

# Wait for rollback to complete
kubectl rollout status deployment/backend -n web3-marketplace --timeout=300s
kubectl rollout status deployment/frontend -n web3-marketplace --timeout=300s

# Verify rollback
kubectl exec deployment/backend -n web3-marketplace -- curl -f http://localhost:3001/health
kubectl exec deployment/frontend -n web3-marketplace -- curl -f http://localhost:3000/api/health

echo "Rollback completed successfully!"
```

## Post-deployment Verification

### 1. Health Checks

```bash
#!/bin/bash
# scripts/health-check.sh

set -e

API_URL="https://api.linkdao.io"
FRONTEND_URL="https://linkdao.io"

echo "Running post-deployment health checks..."

# API health check
echo "Checking API health..."
curl -f $API_URL/health || exit 1

# Frontend health check
echo "Checking frontend health..."
curl -f $FRONTEND_URL/api/health || exit 1

# Database connectivity
echo "Checking database connectivity..."
curl -f $API_URL/health/database || exit 1

# Redis connectivity
echo "Checking Redis connectivity..."
curl -f $API_URL/health/redis || exit 1

# Blockchain connectivity
echo "Checking blockchain connectivity..."
curl -f $API_URL/health/blockchain || exit 1

echo "All health checks passed!"
```

### 2. Smoke Tests

```javascript
// tests/smoke/smoke.test.js
const { test, expect } = require('@playwright/test');

test.describe('Production Smoke Tests', () => {
  test('Homepage loads correctly', async ({ page }) => {
    await page.goto(process.env.FRONTEND_URL);
    await expect(page.locator('h1')).toContainText('Web3 Marketplace');
  });
  
  test('API responds correctly', async ({ request }) => {
    const response = await request.get(`${process.env.API_URL}/health`);
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.status).toBe('healthy');
  });
  
  test('User can connect wallet', async ({ page }) => {
    await page.goto(process.env.FRONTEND_URL);
    await page.click('[data-testid="connect-wallet"]');
    await expect(page.locator('[data-testid="wallet-modal"]')).toBeVisible();
  });
  
  test('Products page loads', async ({ page }) => {
    await page.goto(`${process.env.FRONTEND_URL}/products`);
    await expect(page.locator('[data-testid="product-grid"]')).toBeVisible();
  });
});
```

## Maintenance and Updates

### 1. Regular Maintenance Tasks

```bash
#!/bin/bash
# scripts/maintenance.sh

set -e

echo "Running regular maintenance tasks..."

# Update system packages
kubectl exec -it deployment/backend -n web3-marketplace -- apt-get update
kubectl exec -it deployment/backend -n web3-marketplace -- apt-get upgrade -y

# Clean up old Docker images
docker system prune -f

# Optimize database
kubectl exec -it deployment/backend -n web3-marketplace -- npm run db:optimize

# Clear old logs
kubectl exec -it deployment/backend -n web3-marketplace -- find /var/log -name "*.log" -mtime +30 -delete

# Update SSL certificates
certbot renew --quiet

echo "Maintenance tasks completed!"
```

### 2. Security Updates

```bash
#!/bin/bash
# scripts/security-update.sh

set -e

echo "Applying security updates..."

# Scan for vulnerabilities
npm audit --audit-level high

# Update dependencies
npm update

# Rebuild and redeploy
docker build -t web3marketplace/backend:security-update .
docker push web3marketplace/backend:security-update

kubectl set image deployment/backend backend=web3marketplace/backend:security-update -n web3-marketplace
kubectl rollout status deployment/backend -n web3-marketplace

echo "Security updates applied successfully!"
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Pod Startup Failures
```bash
# Check pod status
kubectl get pods -n web3-marketplace

# Check pod logs
kubectl logs -f deployment/backend -n web3-marketplace

# Describe pod for events
kubectl describe pod <pod-name> -n web3-marketplace
```

#### 2. Database Connection Issues
```bash
# Test database connectivity
kubectl exec -it deployment/backend -n web3-marketplace -- npm run db:test

# Check database logs
kubectl logs -f deployment/postgres -n web3-marketplace
```

#### 3. High Memory Usage
```bash
# Check resource usage
kubectl top pods -n web3-marketplace

# Scale up if needed
kubectl scale deployment backend --replicas=5 -n web3-marketplace
```

### Emergency Contacts

- **DevOps Team**: devops@linkdao.io
- **Security Team**: security@linkdao.io
- **On-call Engineer**: +1-555-0123
- **Slack Channel**: #production-alerts

## Performance Optimization

### 1. Database Optimization

```sql
-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM products WHERE category_id = 'digital-art';

-- Create missing indexes
CREATE INDEX CONCURRENTLY idx_products_search ON products USING gin(to_tsvector('english', title || ' ' || description));

-- Update table statistics
ANALYZE products;
ANALYZE orders;
ANALYZE users;
```

### 2. Application Optimization

```bash
# Enable gzip compression
kubectl patch configmap nginx-config -n ingress-nginx --patch '{"data":{"enable-gzip":"true"}}'

# Configure caching headers
kubectl patch configmap nginx-config -n ingress-nginx --patch '{"data":{"proxy-cache-valid":"200 302 10m"}}'

# Optimize resource limits
kubectl patch deployment backend -n web3-marketplace --patch '{"spec":{"template":{"spec":{"containers":[{"name":"backend","resources":{"limits":{"memory":"2Gi","cpu":"1000m"}}}]}}}}'
```

This production deployment guide provides a comprehensive approach to deploying the Web3 Marketplace platform with proper security, monitoring, and maintenance procedures.