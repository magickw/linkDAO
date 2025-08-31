#!/bin/bash

# AI Content Moderation System Deployment Script
# This script handles the deployment of the moderation system with proper configuration management

set -e

# Configuration
ENVIRONMENT=${1:-development}
CONFIG_DIR="./config"
BACKUP_DIR="./backups"
LOG_FILE="./logs/deployment-$(date +%Y%m%d-%H%M%S).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "$LOG_FILE"
    exit 1
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a "$LOG_FILE"
}

# Create necessary directories
mkdir -p logs backups config

log "Starting AI Content Moderation System deployment for environment: $ENVIRONMENT"

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    error "Invalid environment. Must be one of: development, staging, production"
fi

# Load environment-specific configuration
if [ -f "$CONFIG_DIR/$ENVIRONMENT.env" ]; then
    log "Loading configuration for $ENVIRONMENT"
    source "$CONFIG_DIR/$ENVIRONMENT.env"
else
    error "Configuration file not found: $CONFIG_DIR/$ENVIRONMENT.env"
fi

# Validate required environment variables
required_vars=(
    "DATABASE_URL"
    "REDIS_URL"
    "OPENAI_API_KEY"
    "GOOGLE_CLOUD_PROJECT_ID"
    "AWS_ACCESS_KEY_ID"
    "IPFS_GATEWAY_URL"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        error "Required environment variable $var is not set"
    fi
done

# Pre-deployment checks
log "Running pre-deployment checks..."

# Check database connectivity
log "Checking database connectivity..."
npm run db:check || error "Database connectivity check failed"

# Check Redis connectivity
log "Checking Redis connectivity..."
npm run redis:check || error "Redis connectivity check failed"

# Check AI vendor APIs
log "Checking AI vendor API connectivity..."
npm run vendors:check || error "AI vendor API check failed"

# Run tests
log "Running test suite..."
npm run test:deployment || error "Deployment tests failed"

# Build application
log "Building application..."
npm run build || error "Build failed"

# Database migrations
log "Running database migrations..."
npm run db:migrate || error "Database migration failed"

# Create backup before deployment
log "Creating pre-deployment backup..."
BACKUP_FILE="$BACKUP_DIR/pre-deployment-$(date +%Y%m%d-%H%M%S).sql"
npm run db:backup "$BACKUP_FILE" || warn "Backup creation failed"

# Deploy application
log "Deploying application..."
case $ENVIRONMENT in
    "development")
        npm run start:dev
        ;;
    "staging")
        npm run start:staging
        ;;
    "production")
        npm run start:prod
        ;;
esac

# Post-deployment validation
log "Running post-deployment validation..."
npm run validate:deployment || error "Post-deployment validation failed"

# Health check
log "Performing health check..."
sleep 10
curl -f http://localhost:${PORT:-3000}/health || error "Health check failed"

log "Deployment completed successfully for environment: $ENVIRONMENT"
log "Deployment log saved to: $LOG_FILE"