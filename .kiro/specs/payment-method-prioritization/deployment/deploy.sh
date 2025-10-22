#!/bin/bash

# Payment Method Prioritization Deployment Script
# This script handles the complete deployment process including A/B testing setup

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEPLOYMENT_ENV="${DEPLOYMENT_ENV:-staging}"
VERSION="${VERSION:-latest}"
ROLLOUT_PERCENTAGE="${ROLLOUT_PERCENTAGE:-10}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check required tools
    local required_tools=("docker" "kubectl" "helm" "jq" "curl")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "$tool is required but not installed"
            exit 1
        fi
    done
    
    # Check environment variables
    local required_vars=("ETHERSCAN_API_KEY" "ALCHEMY_API_KEY" "COINGECKO_API_KEY" "JWT_SECRET")
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            log_error "Environment variable $var is required"
            exit 1
        fi
    done
    
    # Check Kubernetes connection
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Build and push Docker image
build_and_push_image() {
    log_info "Building and pushing Docker image..."
    
    local image_tag="linkdao/payment-prioritization:${VERSION}"
    
    # Build image
    docker build -t "$image_tag" "$PROJECT_ROOT"
    
    # Push to registry
    docker push "$image_tag"
    
    log_success "Image built and pushed: $image_tag"
}

# Deploy infrastructure components
deploy_infrastructure() {
    log_info "Deploying infrastructure components..."
    
    # Create namespace if it doesn't exist
    kubectl create namespace payment-prioritization --dry-run=client -o yaml | kubectl apply -f -
    
    # Deploy PostgreSQL
    log_info "Deploying PostgreSQL..."
    kubectl apply -f "$SCRIPT_DIR/kubernetes-manifests.yml" --selector="app=postgres"
    
    # Wait for PostgreSQL to be ready
    kubectl wait --for=condition=ready pod -l app=postgres -n payment-prioritization --timeout=300s
    
    # Deploy Redis
    log_info "Deploying Redis..."
    kubectl apply -f "$SCRIPT_DIR/kubernetes-manifests.yml" --selector="app=redis"
    
    # Wait for Redis to be ready
    kubectl wait --for=condition=ready pod -l app=redis -n payment-prioritization --timeout=300s
    
    log_success "Infrastructure components deployed"
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."
    
    # Create migration job
    cat <<EOF | kubectl apply -f -
apiVersion: batch/v1
kind: Job
metadata:
  name: payment-prioritization-migration-$(date +%s)
  namespace: payment-prioritization
spec:
  template:
    spec:
      containers:
      - name: migration
        image: linkdao/payment-prioritization:${VERSION}
        command: ["npm", "run", "migrate"]
        envFrom:
        - configMapRef:
            name: payment-prioritization-config
        - secretRef:
            name: payment-prioritization-secrets
      restartPolicy: Never
  backoffLimit: 3
EOF
    
    # Wait for migration to complete
    local job_name=$(kubectl get jobs -n payment-prioritization --sort-by=.metadata.creationTimestamp -o jsonpath='{.items[-1].metadata.name}')
    kubectl wait --for=condition=complete job/"$job_name" -n payment-prioritization --timeout=300s
    
    log_success "Database migrations completed"
}

# Deploy application with feature flags
deploy_application() {
    log_info "Deploying application with feature flags..."
    
    # Update ConfigMap with feature flags
    kubectl create configmap payment-prioritization-config \
        --from-env-file="$SCRIPT_DIR/environment-config.env" \
        --dry-run=client -o yaml | \
        kubectl apply -f - -n payment-prioritization
    
    # Deploy application
    kubectl apply -f "$SCRIPT_DIR/kubernetes-manifests.yml" --selector="app=payment-prioritization"
    
    # Wait for deployment to be ready
    kubectl wait --for=condition=available deployment/payment-prioritization -n payment-prioritization --timeout=300s
    
    log_success "Application deployed successfully"
}

# Setup A/B testing
setup_ab_testing() {
    log_info "Setting up A/B testing configuration..."
    
    # Create A/B testing ConfigMap
    kubectl create configmap ab-testing-config \
        --from-file="$SCRIPT_DIR/ab-testing-config.yml" \
        --dry-run=client -o yaml | \
        kubectl apply -f - -n payment-prioritization
    
    # Initialize feature flags with rollout percentage
    local feature_flag_payload=$(cat <<EOF
{
  "feature_flags": {
    "payment_method_prioritization": {
      "enabled": true,
      "rollout_percentage": ${ROLLOUT_PERCENTAGE}
    },
    "real_time_updates_enabled": {
      "enabled": true,
      "rollout_percentage": 25
    },
    "user_preference_learning_enabled": {
      "enabled": true,
      "rollout_percentage": 50
    }
  }
}
EOF
)
    
    # Apply feature flags via API
    local api_endpoint="http://$(kubectl get service payment-prioritization-service -n payment-prioritization -o jsonpath='{.status.loadBalancer.ingress[0].ip}')/api/feature-flags"
    curl -X POST "$api_endpoint" \
        -H "Content-Type: application/json" \
        -d "$feature_flag_payload"
    
    log_success "A/B testing configuration applied"
}

# Setup monitoring
setup_monitoring() {
    log_info "Setting up monitoring and alerting..."
    
    # Deploy Prometheus
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo update
    
    helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
        --namespace monitoring \
        --create-namespace \
        --values "$SCRIPT_DIR/monitoring-values.yml"
    
    # Apply custom monitoring configuration
    kubectl apply -f "$SCRIPT_DIR/monitoring-config.yml"
    
    # Wait for Prometheus to be ready
    kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=prometheus -n monitoring --timeout=300s
    
    log_success "Monitoring setup completed"
}

# Validate deployment
validate_deployment() {
    log_info "Validating deployment..."
    
    # Check pod status
    local pod_status=$(kubectl get pods -n payment-prioritization -l app=payment-prioritization -o jsonpath='{.items[0].status.phase}')
    if [[ "$pod_status" != "Running" ]]; then
        log_error "Application pod is not running: $pod_status"
        return 1
    fi
    
    # Check service endpoints
    local service_ip=$(kubectl get service payment-prioritization-service -n payment-prioritization -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
    if [[ -z "$service_ip" ]]; then
        log_error "Service IP not available"
        return 1
    fi
    
    # Health check
    local health_url="http://$service_ip/health"
    local health_response=$(curl -s -o /dev/null -w "%{http_code}" "$health_url")
    if [[ "$health_response" != "200" ]]; then
        log_error "Health check failed: HTTP $health_response"
        return 1
    fi
    
    # Test prioritization endpoint
    local prioritization_url="http://$service_ip/api/payment-prioritization/prioritize"
    local test_payload='{"userId":"test-user","amount":100,"chainId":1}'
    local prioritization_response=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$prioritization_url" \
        -H "Content-Type: application/json" \
        -d "$test_payload")
    
    if [[ "$prioritization_response" != "200" ]]; then
        log_error "Prioritization endpoint test failed: HTTP $prioritization_response"
        return 1
    fi
    
    log_success "Deployment validation passed"
}

# Monitor rollout metrics
monitor_rollout() {
    log_info "Monitoring rollout metrics..."
    
    local monitoring_duration=300  # 5 minutes
    local check_interval=30        # 30 seconds
    local checks=$((monitoring_duration / check_interval))
    
    for ((i=1; i<=checks; i++)); do
        log_info "Monitoring check $i/$checks..."
        
        # Check error rate
        local error_rate=$(curl -s "http://prometheus:9090/api/v1/query?query=rate(payment_prioritization_errors_total[5m])" | \
            jq -r '.data.result[0].value[1] // "0"')
        
        if (( $(echo "$error_rate > 0.05" | bc -l) )); then
            log_error "High error rate detected: $error_rate"
            return 1
        fi
        
        # Check response time
        local response_time=$(curl -s "http://prometheus:9090/api/v1/query?query=histogram_quantile(0.95, payment_prioritization_duration_seconds)" | \
            jq -r '.data.result[0].value[1] // "0"')
        
        if (( $(echo "$response_time > 2.0" | bc -l) )); then
            log_error "High response time detected: ${response_time}s"
            return 1
        fi
        
        log_info "Metrics look good - Error rate: $error_rate, Response time: ${response_time}s"
        sleep $check_interval
    done
    
    log_success "Rollout monitoring completed successfully"
}

# Rollback function
rollback() {
    log_warning "Initiating rollback..."
    
    # Disable feature flags
    local rollback_payload='{"feature_flags":{"payment_method_prioritization":{"enabled":false}}}'
    local api_endpoint="http://$(kubectl get service payment-prioritization-service -n payment-prioritization -o jsonpath='{.status.loadBalancer.ingress[0].ip}')/api/feature-flags"
    curl -X POST "$api_endpoint" \
        -H "Content-Type: application/json" \
        -d "$rollback_payload"
    
    # Revert to previous deployment
    kubectl rollout undo deployment/payment-prioritization -n payment-prioritization
    
    # Wait for rollback to complete
    kubectl rollout status deployment/payment-prioritization -n payment-prioritization
    
    log_success "Rollback completed"
}

# Cleanup function
cleanup() {
    log_info "Cleaning up temporary resources..."
    
    # Remove completed migration jobs
    kubectl delete jobs -n payment-prioritization --field-selector status.successful=1
    
    log_success "Cleanup completed"
}

# Main deployment function
main() {
    log_info "Starting Payment Method Prioritization deployment..."
    log_info "Environment: $DEPLOYMENT_ENV"
    log_info "Version: $VERSION"
    log_info "Rollout Percentage: $ROLLOUT_PERCENTAGE%"
    
    # Trap errors and rollback
    trap 'log_error "Deployment failed. Initiating rollback..."; rollback; exit 1' ERR
    
    check_prerequisites
    build_and_push_image
    deploy_infrastructure
    run_migrations
    deploy_application
    setup_ab_testing
    setup_monitoring
    validate_deployment
    monitor_rollout
    cleanup
    
    log_success "Deployment completed successfully!"
    log_info "Application is available at: http://$(kubectl get service payment-prioritization-service -n payment-prioritization -o jsonpath='{.status.loadBalancer.ingress[0].ip}')"
    log_info "Monitoring dashboard: http://$(kubectl get service prometheus-grafana -n monitoring -o jsonpath='{.status.loadBalancer.ingress[0].ip}')"
}

# Handle command line arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "rollback")
        rollback
        ;;
    "validate")
        validate_deployment
        ;;
    "monitor")
        monitor_rollout
        ;;
    "cleanup")
        cleanup
        ;;
    *)
        echo "Usage: $0 {deploy|rollback|validate|monitor|cleanup}"
        exit 1
        ;;
esac