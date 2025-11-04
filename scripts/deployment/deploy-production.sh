#!/bin/bash

# Web3 Marketplace Production Deployment Script
# This script handles the complete deployment of the Web3 Marketplace to production

set -e

# Configuration
NAMESPACE="web3-marketplace-prod"
MONITORING_NAMESPACE="web3-marketplace-monitoring"
DEPLOYMENT_DIR="infrastructure/production"
BACKUP_DIR="backups/pre-deployment"
LOG_FILE="deployment-$(date +%Y%m%d-%H%M%S).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if kubectl is installed and configured
    if ! command -v kubectl &> /dev/null; then
        error "kubectl is not installed or not in PATH"
    fi
    
    # Check if we can connect to the cluster
    if ! kubectl cluster-info &> /dev/null; then
        error "Cannot connect to Kubernetes cluster"
    fi
    
    # Check if helm is installed
    if ! command -v helm &> /dev/null; then
        error "helm is not installed or not in PATH"
    fi
    
    # Check if required environment variables are set
    if [[ -z "$DOCKER_REGISTRY" ]]; then
        error "DOCKER_REGISTRY environment variable is not set"
    fi
    
    if [[ -z "$IMAGE_TAG" ]]; then
        warning "IMAGE_TAG not set, using 'latest'"
        export IMAGE_TAG="latest"
    fi
    
    success "Prerequisites check passed"
}

# Create backup of current deployment
create_backup() {
    log "Creating backup of current deployment..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup current deployments
    kubectl get deployments -n "$NAMESPACE" -o yaml > "$BACKUP_DIR/deployments.yaml" 2>/dev/null || true
    kubectl get statefulsets -n "$NAMESPACE" -o yaml > "$BACKUP_DIR/statefulsets.yaml" 2>/dev/null || true
    kubectl get services -n "$NAMESPACE" -o yaml > "$BACKUP_DIR/services.yaml" 2>/dev/null || true
    kubectl get configmaps -n "$NAMESPACE" -o yaml > "$BACKUP_DIR/configmaps.yaml" 2>/dev/null || true
    kubectl get secrets -n "$NAMESPACE" -o yaml > "$BACKUP_DIR/secrets.yaml" 2>/dev/null || true
    
    # Backup database
    if kubectl get statefulset postgres-primary -n "$NAMESPACE" &> /dev/null; then
        log "Creating database backup..."
        kubectl exec -n "$NAMESPACE" statefulset/postgres-primary -- \
            pg_dump -U postgres web3marketplace | gzip > "$BACKUP_DIR/database-backup.sql.gz"
    fi
    
    success "Backup created in $BACKUP_DIR"
}

# Deploy infrastructure components
deploy_infrastructure() {
    log "Deploying infrastructure components..."
    
    # Create namespaces
    kubectl apply -f "$DEPLOYMENT_DIR/kubernetes/namespace.yaml"
    
    # Apply secrets (should be created manually in production)
    if [[ -f "$DEPLOYMENT_DIR/kubernetes/secrets.yaml" ]]; then
        warning "Applying secrets from file - ensure these are properly secured in production"
        kubectl apply -f "$DEPLOYMENT_DIR/kubernetes/secrets.yaml"
    fi
    
    # Apply ConfigMaps
    kubectl apply -f "$DEPLOYMENT_DIR/kubernetes/configmap.yaml"
    
    # Apply PVCs
    kubectl apply -f "$DEPLOYMENT_DIR/kubernetes/pvc.yaml"
    
    success "Infrastructure components deployed"
}

# Deploy database
deploy_database() {
    log "Deploying database..."
    
    # Deploy PostgreSQL
    kubectl apply -f "$DEPLOYMENT_DIR/kubernetes/database.yaml"
    
    # Wait for primary database to be ready
    log "Waiting for PostgreSQL primary to be ready..."
    kubectl wait --for=condition=ready pod -l app=postgres,role=primary -n "$NAMESPACE" --timeout=300s
    
    # Wait for replicas to be ready
    log "Waiting for PostgreSQL replicas to be ready..."
    kubectl wait --for=condition=ready pod -l app=postgres,role=replica -n "$NAMESPACE" --timeout=300s
    
    success "Database deployed successfully"
}

# Deploy Redis
deploy_redis() {
    log "Deploying Redis..."
    
    kubectl apply -f "$DEPLOYMENT_DIR/kubernetes/redis.yaml"
    
    # Wait for Redis master to be ready
    log "Waiting for Redis master to be ready..."
    kubectl wait --for=condition=ready pod -l app=redis,role=master -n "$NAMESPACE" --timeout=300s
    
    # Wait for Redis sentinels to be ready
    log "Waiting for Redis sentinels to be ready..."
    kubectl wait --for=condition=ready pod -l app=redis,role=sentinel -n "$NAMESPACE" --timeout=300s
    
    success "Redis deployed successfully"
}

# Deploy application services
deploy_applications() {
    log "Deploying application services..."
    
    # Update image tags in deployment files
    sed -i.bak "s|image: web3marketplace/backend:.*|image: $DOCKER_REGISTRY/web3marketplace/backend:$IMAGE_TAG|g" \
        "$DEPLOYMENT_DIR/kubernetes/backend-deployment.yaml"
    sed -i.bak "s|image: web3marketplace/frontend:.*|image: $DOCKER_REGISTRY/web3marketplace/frontend:$IMAGE_TAG|g" \
        "$DEPLOYMENT_DIR/kubernetes/frontend-deployment.yaml"
    
    # Deploy backend
    kubectl apply -f "$DEPLOYMENT_DIR/kubernetes/backend-deployment.yaml"
    
    # Wait for backend to be ready
    log "Waiting for backend to be ready..."
    kubectl wait --for=condition=available deployment/backend-deployment -n "$NAMESPACE" --timeout=300s
    
    # Deploy frontend
    kubectl apply -f "$DEPLOYMENT_DIR/kubernetes/frontend-deployment.yaml"
    
    # Wait for frontend to be ready
    log "Waiting for frontend to be ready..."
    kubectl wait --for=condition=available deployment/frontend-deployment -n "$NAMESPACE" --timeout=300s
    
    success "Application services deployed successfully"
}

# Deploy monitoring stack
deploy_monitoring() {
    log "Deploying monitoring stack..."
    
    # Deploy monitoring components
    kubectl apply -f "$DEPLOYMENT_DIR/monitoring/alerting-rules.yaml"
    kubectl apply -f "$DEPLOYMENT_DIR/monitoring/alertmanager-config.yaml"
    kubectl apply -f "$DEPLOYMENT_DIR/monitoring/grafana-dashboards.yaml"
    kubectl apply -f "$DEPLOYMENT_DIR/kubernetes/monitoring.yaml"
    
    # Wait for monitoring services to be ready
    log "Waiting for monitoring services to be ready..."
    kubectl wait --for=condition=available deployment/prometheus -n "$MONITORING_NAMESPACE" --timeout=300s
    kubectl wait --for=condition=available deployment/grafana -n "$MONITORING_NAMESPACE" --timeout=300s
    kubectl wait --for=condition=available deployment/alertmanager -n "$MONITORING_NAMESPACE" --timeout=300s
    
    success "Monitoring stack deployed successfully"
}

# Deploy logging stack
deploy_logging() {
    log "Deploying logging stack..."
    
    # Deploy Elasticsearch
    kubectl apply -f "$DEPLOYMENT_DIR/logging/elasticsearch.yaml"
    
    # Wait for Elasticsearch to be ready
    log "Waiting for Elasticsearch to be ready..."
    kubectl wait --for=condition=ready pod -l app=elasticsearch -n "$NAMESPACE" --timeout=600s
    
    # Deploy Kibana
    kubectl apply -f "$DEPLOYMENT_DIR/logging/kibana.yaml"
    
    # Wait for Kibana to be ready
    log "Waiting for Kibana to be ready..."
    kubectl wait --for=condition=available deployment/kibana -n "$NAMESPACE" --timeout=300s
    
    # Deploy Fluentd
    kubectl apply -f "$DEPLOYMENT_DIR/logging/fluentd-config.yaml"
    
    success "Logging stack deployed successfully"
}

# Setup backup jobs
setup_backups() {
    log "Setting up backup jobs..."
    
    kubectl apply -f "$DEPLOYMENT_DIR/backup/backup-scripts.yaml"
    kubectl apply -f "$DEPLOYMENT_DIR/backup/backup-cronjobs.yaml"
    
    success "Backup jobs configured successfully"
}

# Deploy ingress and networking
deploy_networking() {
    log "Deploying ingress and networking..."
    
    # Deploy ingress
    kubectl apply -f "$DEPLOYMENT_DIR/kubernetes/ingress.yaml"
    
    # Deploy HPA
    kubectl apply -f "$DEPLOYMENT_DIR/kubernetes/hpa.yaml"
    
    success "Networking components deployed successfully"
}

# Run health checks
run_health_checks() {
    log "Running health checks..."
    
    # Check pod status
    log "Checking pod status..."
    kubectl get pods -n "$NAMESPACE"
    kubectl get pods -n "$MONITORING_NAMESPACE"
    
    # Check service endpoints
    log "Checking service endpoints..."
    kubectl get endpoints -n "$NAMESPACE"
    
    # Test application endpoints
    log "Testing application health endpoints..."
    
    # Wait for ingress to be ready
    sleep 30
    
    # Test backend health
    if kubectl exec -n "$NAMESPACE" deployment/backend-deployment -- curl -f http://localhost:3000/health; then
        success "Backend health check passed"
    else
        error "Backend health check failed"
    fi
    
    # Test frontend health
    if kubectl exec -n "$NAMESPACE" deployment/frontend-deployment -- curl -f http://localhost:3001/api/health; then
        success "Frontend health check passed"
    else
        error "Frontend health check failed"
    fi
    
    # Test database connectivity
    if kubectl exec -n "$NAMESPACE" statefulset/postgres-primary -- pg_isready -U postgres; then
        success "Database health check passed"
    else
        error "Database health check failed"
    fi
    
    # Test Redis connectivity
    if kubectl exec -n "$NAMESPACE" statefulset/redis-master -- redis-cli ping | grep -q PONG; then
        success "Redis health check passed"
    else
        error "Redis health check failed"
    fi
    
    success "All health checks passed"
}

# Validate deployment
validate_deployment() {
    log "Validating deployment..."
    
    # Check resource usage
    log "Checking resource usage..."
    kubectl top nodes
    kubectl top pods -n "$NAMESPACE"
    
    # Check HPA status
    log "Checking HPA status..."
    kubectl get hpa -n "$NAMESPACE"
    
    # Check ingress status
    log "Checking ingress status..."
    kubectl get ingress -n "$NAMESPACE"
    kubectl get ingress -n "$MONITORING_NAMESPACE"
    
    # Validate monitoring
    log "Validating monitoring..."
    if kubectl exec -n "$MONITORING_NAMESPACE" deployment/prometheus -- \
        wget -q --spider http://localhost:9090/-/healthy; then
        success "Prometheus is healthy"
    else
        warning "Prometheus health check failed"
    fi
    
    if kubectl exec -n "$MONITORING_NAMESPACE" deployment/grafana -- \
        wget -q --spider http://localhost:3000/api/health; then
        success "Grafana is healthy"
    else
        warning "Grafana health check failed"
    fi
    
    success "Deployment validation completed"
}

# Cleanup function
cleanup() {
    log "Cleaning up temporary files..."
    
    # Restore original deployment files
    if [[ -f "$DEPLOYMENT_DIR/kubernetes/backend-deployment.yaml.bak" ]]; then
        mv "$DEPLOYMENT_DIR/kubernetes/backend-deployment.yaml.bak" \
           "$DEPLOYMENT_DIR/kubernetes/backend-deployment.yaml"
    fi
    
    if [[ -f "$DEPLOYMENT_DIR/kubernetes/frontend-deployment.yaml.bak" ]]; then
        mv "$DEPLOYMENT_DIR/kubernetes/frontend-deployment.yaml.bak" \
           "$DEPLOYMENT_DIR/kubernetes/frontend-deployment.yaml"
    fi
}

# Rollback function
rollback() {
    error "Deployment failed. Starting rollback..."
    
    if [[ -d "$BACKUP_DIR" ]]; then
        log "Restoring from backup..."
        
        # Restore deployments
        if [[ -f "$BACKUP_DIR/deployments.yaml" ]]; then
            kubectl apply -f "$BACKUP_DIR/deployments.yaml"
        fi
        
        # Restore statefulsets
        if [[ -f "$BACKUP_DIR/statefulsets.yaml" ]]; then
            kubectl apply -f "$BACKUP_DIR/statefulsets.yaml"
        fi
        
        # Wait for rollback to complete
        kubectl rollout status deployment/backend-deployment -n "$NAMESPACE" --timeout=300s
        kubectl rollout status deployment/frontend-deployment -n "$NAMESPACE" --timeout=300s
        
        success "Rollback completed"
    else
        error "No backup found for rollback"
    fi
}

# Main deployment function
main() {
    log "Starting Web3 Marketplace production deployment..."
    log "Deployment log: $LOG_FILE"
    
    # Set trap for cleanup
    trap cleanup EXIT
    trap rollback ERR
    
    # Run deployment steps
    check_prerequisites
    create_backup
    deploy_infrastructure
    deploy_database
    deploy_redis
    deploy_applications
    deploy_monitoring
    deploy_logging
    setup_backups
    deploy_networking
    run_health_checks
    validate_deployment
    
    success "Web3 Marketplace production deployment completed successfully!"
    log "Deployment summary:"
    log "- Namespace: $NAMESPACE"
    log "- Monitoring Namespace: $MONITORING_NAMESPACE"
    log "- Image Tag: $IMAGE_TAG"
    log "- Backup Location: $BACKUP_DIR"
    log "- Log File: $LOG_FILE"
    
    log "Next steps:"
    log "1. Verify application functionality through the web interface"
    log "2. Check monitoring dashboards at https://grafana.linkdao.io"
    log "3. Review logs at https://logs.linkdao.io"
    log "4. Monitor alerts at https://alerts.linkdao.io"
    log "5. Update DNS records if this is a new deployment"
}

# Script usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo "Options:"
    echo "  -h, --help          Show this help message"
    echo "  -t, --tag TAG       Docker image tag to deploy (default: latest)"
    echo "  -r, --registry REG  Docker registry URL"
    echo "  -d, --dry-run       Show what would be deployed without actually deploying"
    echo ""
    echo "Environment variables:"
    echo "  DOCKER_REGISTRY     Docker registry URL (required)"
    echo "  IMAGE_TAG           Docker image tag (optional, default: latest)"
    echo ""
    echo "Example:"
    echo "  DOCKER_REGISTRY=registry.linkdao.io $0 --tag v1.2.3"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            usage
            exit 0
            ;;
        -t|--tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        -r|--registry)
            DOCKER_REGISTRY="$2"
            shift 2
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        *)
            error "Unknown option: $1"
            ;;
    esac
done

# Run main function if not dry run
if [[ "$DRY_RUN" == "true" ]]; then
    log "DRY RUN MODE - No actual deployment will be performed"
    log "Would deploy:"
    log "- Registry: $DOCKER_REGISTRY"
    log "- Tag: $IMAGE_TAG"
    log "- Namespace: $NAMESPACE"
    log "- Monitoring Namespace: $MONITORING_NAMESPACE"
else
    main
fi