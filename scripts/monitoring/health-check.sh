#!/bin/bash

# Web3 Marketplace Health Check Script
# Comprehensive health monitoring for all system components

set -e

# Configuration
NAMESPACE="web3-marketplace-prod"
MONITORING_NAMESPACE="web3-marketplace-monitoring"
HEALTH_CHECK_TIMEOUT=30
ALERT_WEBHOOK_URL="${SLACK_WEBHOOK_URL}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Health check results
HEALTH_STATUS=0
FAILED_CHECKS=()
WARNING_CHECKS=()

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
    WARNING_CHECKS+=("$1")
}

error() {
    echo -e "${RED}[✗]${NC} $1"
    FAILED_CHECKS+=("$1")
    HEALTH_STATUS=1
}

# Check if kubectl is available and configured
check_kubectl() {
    if ! command -v kubectl &> /dev/null; then
        error "kubectl is not installed or not in PATH"
        return 1
    fi
    
    if ! kubectl cluster-info &> /dev/null; then
        error "Cannot connect to Kubernetes cluster"
        return 1
    fi
    
    success "kubectl connectivity verified"
    return 0
}

# Check namespace existence
check_namespaces() {
    log "Checking namespaces..."
    
    if kubectl get namespace "$NAMESPACE" &> /dev/null; then
        success "Production namespace exists: $NAMESPACE"
    else
        error "Production namespace not found: $NAMESPACE"
    fi
    
    if kubectl get namespace "$MONITORING_NAMESPACE" &> /dev/null; then
        success "Monitoring namespace exists: $MONITORING_NAMESPACE"
    else
        error "Monitoring namespace not found: $MONITORING_NAMESPACE"
    fi
}

# Check pod health
check_pods() {
    log "Checking pod health..."
    
    # Check production pods
    local failed_pods=$(kubectl get pods -n "$NAMESPACE" --field-selector=status.phase!=Running --no-headers 2>/dev/null | wc -l)
    local total_pods=$(kubectl get pods -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l)
    
    if [[ $failed_pods -eq 0 ]]; then
        success "All production pods are running ($total_pods/$total_pods)"
    else
        error "$failed_pods out of $total_pods production pods are not running"
        kubectl get pods -n "$NAMESPACE" --field-selector=status.phase!=Running
    fi
    
    # Check monitoring pods
    local failed_monitoring_pods=$(kubectl get pods -n "$MONITORING_NAMESPACE" --field-selector=status.phase!=Running --no-headers 2>/dev/null | wc -l)
    local total_monitoring_pods=$(kubectl get pods -n "$MONITORING_NAMESPACE" --no-headers 2>/dev/null | wc -l)
    
    if [[ $failed_monitoring_pods -eq 0 ]]; then
        success "All monitoring pods are running ($total_monitoring_pods/$total_monitoring_pods)"
    else
        warning "$failed_monitoring_pods out of $total_monitoring_pods monitoring pods are not running"
        kubectl get pods -n "$MONITORING_NAMESPACE" --field-selector=status.phase!=Running
    fi
}

# Check deployment status
check_deployments() {
    log "Checking deployment status..."
    
    local deployments=("backend-deployment" "frontend-deployment")
    
    for deployment in "${deployments[@]}"; do
        if kubectl get deployment "$deployment" -n "$NAMESPACE" &> /dev/null; then
            local ready=$(kubectl get deployment "$deployment" -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}')
            local desired=$(kubectl get deployment "$deployment" -n "$NAMESPACE" -o jsonpath='{.spec.replicas}')
            
            if [[ "$ready" == "$desired" ]]; then
                success "$deployment: $ready/$desired replicas ready"
            else
                error "$deployment: only $ready/$desired replicas ready"
            fi
        else
            error "$deployment: deployment not found"
        fi
    done
}

# Check StatefulSet status
check_statefulsets() {
    log "Checking StatefulSet status..."
    
    local statefulsets=("postgres-primary" "redis-master")
    
    for statefulset in "${statefulsets[@]}"; do
        if kubectl get statefulset "$statefulset" -n "$NAMESPACE" &> /dev/null; then
            local ready=$(kubectl get statefulset "$statefulset" -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}')
            local desired=$(kubectl get statefulset "$statefulset" -n "$NAMESPACE" -o jsonpath='{.spec.replicas}')
            
            if [[ "$ready" == "$desired" ]]; then
                success "$statefulset: $ready/$desired replicas ready"
            else
                error "$statefulset: only $ready/$desired replicas ready"
            fi
        else
            error "$statefulset: StatefulSet not found"
        fi
    done
}

# Check service endpoints
check_services() {
    log "Checking service endpoints..."
    
    local services=("backend-service" "frontend-service" "postgres-primary-service" "redis-master-service")
    
    for service in "${services[@]}"; do
        if kubectl get service "$service" -n "$NAMESPACE" &> /dev/null; then
            local endpoints=$(kubectl get endpoints "$service" -n "$NAMESPACE" -o jsonpath='{.subsets[*].addresses[*].ip}' | wc -w)
            
            if [[ $endpoints -gt 0 ]]; then
                success "$service: $endpoints endpoints available"
            else
                error "$service: no endpoints available"
            fi
        else
            error "$service: service not found"
        fi
    done
}

# Check application health endpoints
check_application_health() {
    log "Checking application health endpoints..."
    
    # Check backend health
    if kubectl exec -n "$NAMESPACE" deployment/backend-deployment -- \
        timeout "$HEALTH_CHECK_TIMEOUT" curl -f http://localhost:3000/health &> /dev/null; then
        success "Backend health endpoint responding"
    else
        error "Backend health endpoint not responding"
    fi
    
    # Check frontend health
    if kubectl exec -n "$NAMESPACE" deployment/frontend-deployment -- \
        timeout "$HEALTH_CHECK_TIMEOUT" curl -f http://localhost:3001/api/health &> /dev/null; then
        success "Frontend health endpoint responding"
    else
        error "Frontend health endpoint not responding"
    fi
}

# Check database connectivity and performance
check_database() {
    log "Checking database health..."
    
    # Check PostgreSQL connectivity
    if kubectl exec -n "$NAMESPACE" statefulset/postgres-primary -- \
        timeout "$HEALTH_CHECK_TIMEOUT" pg_isready -U postgres &> /dev/null; then
        success "PostgreSQL is accepting connections"
    else
        error "PostgreSQL is not accepting connections"
        return
    fi
    
    # Check database performance
    local connection_count=$(kubectl exec -n "$NAMESPACE" statefulset/postgres-primary -- \
        psql -U postgres -d web3marketplace -t -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'web3marketplace';" 2>/dev/null | tr -d ' ')
    
    if [[ $connection_count -lt 50 ]]; then
        success "Database connections: $connection_count (healthy)"
    elif [[ $connection_count -lt 80 ]]; then
        warning "Database connections: $connection_count (moderate load)"
    else
        error "Database connections: $connection_count (high load)"
    fi
    
    # Check for long-running queries
    local long_queries=$(kubectl exec -n "$NAMESPACE" statefulset/postgres-primary -- \
        psql -U postgres -d web3marketplace -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active' AND (now() - query_start) > interval '5 minutes';" 2>/dev/null | tr -d ' ')
    
    if [[ $long_queries -eq 0 ]]; then
        success "No long-running queries detected"
    else
        warning "$long_queries long-running queries detected"
    fi
    
    # Check replication lag
    local replication_lag=$(kubectl exec -n "$NAMESPACE" statefulset/postgres-primary -- \
        psql -U postgres -t -c "SELECT COALESCE(EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())), 0);" 2>/dev/null | tr -d ' ' | cut -d. -f1)
    
    if [[ $replication_lag -lt 10 ]]; then
        success "Replication lag: ${replication_lag}s (healthy)"
    elif [[ $replication_lag -lt 30 ]]; then
        warning "Replication lag: ${replication_lag}s (moderate)"
    else
        error "Replication lag: ${replication_lag}s (high)"
    fi
}

# Check Redis health
check_redis() {
    log "Checking Redis health..."
    
    # Check Redis connectivity
    if kubectl exec -n "$NAMESPACE" statefulset/redis-master -- \
        timeout "$HEALTH_CHECK_TIMEOUT" redis-cli ping &> /dev/null; then
        success "Redis is responding to ping"
    else
        error "Redis is not responding to ping"
        return
    fi
    
    # Check Redis memory usage
    local memory_used=$(kubectl exec -n "$NAMESPACE" statefulset/redis-master -- \
        redis-cli info memory | grep used_memory_human | cut -d: -f2 | tr -d '\r')
    local memory_peak=$(kubectl exec -n "$NAMESPACE" statefulset/redis-master -- \
        redis-cli info memory | grep used_memory_peak_human | cut -d: -f2 | tr -d '\r')
    
    success "Redis memory usage: $memory_used (peak: $memory_peak)"
    
    # Check Redis connected clients
    local connected_clients=$(kubectl exec -n "$NAMESPACE" statefulset/redis-master -- \
        redis-cli info clients | grep connected_clients | cut -d: -f2 | tr -d '\r')
    
    if [[ $connected_clients -lt 100 ]]; then
        success "Redis connected clients: $connected_clients (healthy)"
    elif [[ $connected_clients -lt 500 ]]; then
        warning "Redis connected clients: $connected_clients (moderate load)"
    else
        error "Redis connected clients: $connected_clients (high load)"
    fi
}

# Check monitoring stack
check_monitoring() {
    log "Checking monitoring stack..."
    
    # Check Prometheus
    if kubectl exec -n "$MONITORING_NAMESPACE" deployment/prometheus -- \
        timeout "$HEALTH_CHECK_TIMEOUT" wget -q --spider http://localhost:9090/-/healthy &> /dev/null; then
        success "Prometheus is healthy"
    else
        warning "Prometheus health check failed"
    fi
    
    # Check Grafana
    if kubectl exec -n "$MONITORING_NAMESPACE" deployment/grafana -- \
        timeout "$HEALTH_CHECK_TIMEOUT" curl -f http://localhost:3000/api/health &> /dev/null; then
        success "Grafana is healthy"
    else
        warning "Grafana health check failed"
    fi
    
    # Check AlertManager
    if kubectl exec -n "$MONITORING_NAMESPACE" deployment/alertmanager -- \
        timeout "$HEALTH_CHECK_TIMEOUT" wget -q --spider http://localhost:9093/-/healthy &> /dev/null; then
        success "AlertManager is healthy"
    else
        warning "AlertManager health check failed"
    fi
}

# Check resource usage
check_resources() {
    log "Checking resource usage..."
    
    # Check node resources
    local nodes_ready=$(kubectl get nodes --no-headers | grep -c Ready)
    local nodes_total=$(kubectl get nodes --no-headers | wc -l)
    
    if [[ $nodes_ready -eq $nodes_total ]]; then
        success "All nodes are ready ($nodes_ready/$nodes_total)"
    else
        error "Only $nodes_ready out of $nodes_total nodes are ready"
    fi
    
    # Check pod resource usage (if metrics-server is available)
    if kubectl top nodes &> /dev/null; then
        success "Resource metrics are available"
        
        # Check for high CPU usage
        local high_cpu_nodes=$(kubectl top nodes --no-headers | awk '$3 > 80 {print $1}')
        if [[ -n "$high_cpu_nodes" ]]; then
            warning "High CPU usage detected on nodes: $high_cpu_nodes"
        else
            success "Node CPU usage is within normal limits"
        fi
        
        # Check for high memory usage
        local high_memory_nodes=$(kubectl top nodes --no-headers | awk '$5 > 80 {print $1}')
        if [[ -n "$high_memory_nodes" ]]; then
            warning "High memory usage detected on nodes: $high_memory_nodes"
        else
            success "Node memory usage is within normal limits"
        fi
    else
        warning "Resource metrics are not available (metrics-server may not be installed)"
    fi
}

# Check persistent volumes
check_storage() {
    log "Checking storage..."
    
    # Check PVCs
    local failed_pvcs=$(kubectl get pvc -n "$NAMESPACE" --no-headers | grep -v Bound | wc -l)
    local total_pvcs=$(kubectl get pvc -n "$NAMESPACE" --no-headers | wc -l)
    
    if [[ $failed_pvcs -eq 0 ]]; then
        success "All PVCs are bound ($total_pvcs/$total_pvcs)"
    else
        error "$failed_pvcs out of $total_pvcs PVCs are not bound"
        kubectl get pvc -n "$NAMESPACE" | grep -v Bound
    fi
    
    # Check PVs
    local failed_pvs=$(kubectl get pv --no-headers | grep -v Bound | wc -l)
    local total_pvs=$(kubectl get pv --no-headers | wc -l)
    
    if [[ $failed_pvs -eq 0 ]]; then
        success "All PVs are bound ($total_pvs/$total_pvs)"
    else
        warning "$failed_pvs out of $total_pvs PVs are not bound"
    fi
}

# Check ingress and networking
check_networking() {
    log "Checking networking..."
    
    # Check ingress controllers
    local ingress_ready=$(kubectl get pods -A -l app.kubernetes.io/name=ingress-nginx --no-headers | grep -c Running)
    
    if [[ $ingress_ready -gt 0 ]]; then
        success "Ingress controller is running ($ingress_ready pods)"
    else
        warning "No ingress controller pods found running"
    fi
    
    # Check ingress resources
    local ingresses=$(kubectl get ingress -n "$NAMESPACE" --no-headers | wc -l)
    
    if [[ $ingresses -gt 0 ]]; then
        success "$ingresses ingress resources configured"
    else
        warning "No ingress resources found"
    fi
}

# Check backup jobs
check_backups() {
    log "Checking backup jobs..."
    
    # Check if backup CronJobs exist
    local backup_jobs=$(kubectl get cronjobs -n "$NAMESPACE" --no-headers | wc -l)
    
    if [[ $backup_jobs -gt 0 ]]; then
        success "$backup_jobs backup jobs configured"
        
        # Check recent backup job runs
        local failed_jobs=$(kubectl get jobs -n "$NAMESPACE" -l job-type=backup --no-headers | grep -v Complete | wc -l)
        
        if [[ $failed_jobs -eq 0 ]]; then
            success "Recent backup jobs completed successfully"
        else
            warning "$failed_jobs backup jobs failed or are still running"
        fi
    else
        warning "No backup jobs configured"
    fi
}

# Check external dependencies
check_external_dependencies() {
    log "Checking external dependencies..."
    
    # Check blockchain connectivity (if configured)
    if kubectl exec -n "$NAMESPACE" deployment/backend-deployment -- \
        timeout "$HEALTH_CHECK_TIMEOUT" curl -s -X POST -H "Content-Type: application/json" \
        --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
        https://mainnet.infura.io/v3/test &> /dev/null; then
        success "Blockchain node connectivity verified"
    else
        warning "Blockchain node connectivity check failed"
    fi
    
    # Check IPFS connectivity
    if kubectl exec -n "$NAMESPACE" deployment/backend-deployment -- \
        timeout "$HEALTH_CHECK_TIMEOUT" curl -s -I https://gateway.pinata.cloud/ipfs/QmTest &> /dev/null; then
        success "IPFS gateway connectivity verified"
    else
        warning "IPFS gateway connectivity check failed"
    fi
}

# Send alert notification
send_alert() {
    local status="$1"
    local message="$2"
    
    if [[ -n "$ALERT_WEBHOOK_URL" ]]; then
        local color="good"
        local emoji="✅"
        
        if [[ "$status" == "warning" ]]; then
            color="warning"
            emoji="⚠️"
        elif [[ "$status" == "error" ]]; then
            color="danger"
            emoji="🚨"
        fi
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"title\": \"$emoji Web3 Marketplace Health Check\",
                    \"text\": \"$message\",
                    \"ts\": $(date +%s)
                }]
            }" \
            "$ALERT_WEBHOOK_URL" &> /dev/null || true
    fi
}

# Generate health report
generate_report() {
    log "Generating health report..."
    
    echo ""
    echo "=================================="
    echo "Web3 Marketplace Health Report"
    echo "=================================="
    echo "Timestamp: $(date)"
    echo "Cluster: $(kubectl config current-context)"
    echo ""
    
    if [[ ${#FAILED_CHECKS[@]} -eq 0 && ${#WARNING_CHECKS[@]} -eq 0 ]]; then
        success "All systems are healthy! ✅"
        send_alert "good" "All systems are healthy! All health checks passed."
    else
        if [[ ${#FAILED_CHECKS[@]} -gt 0 ]]; then
            echo -e "${RED}Failed Checks (${#FAILED_CHECKS[@]}):${NC}"
            for check in "${FAILED_CHECKS[@]}"; do
                echo "  ✗ $check"
            done
            echo ""
        fi
        
        if [[ ${#WARNING_CHECKS[@]} -gt 0 ]]; then
            echo -e "${YELLOW}Warning Checks (${#WARNING_CHECKS[@]}):${NC}"
            for check in "${WARNING_CHECKS[@]}"; do
                echo "  ⚠ $check"
            done
            echo ""
        fi
        
        local alert_message="Health check completed with ${#FAILED_CHECKS[@]} failures and ${#WARNING_CHECKS[@]} warnings."
        if [[ ${#FAILED_CHECKS[@]} -gt 0 ]]; then
            send_alert "error" "$alert_message"
        else
            send_alert "warning" "$alert_message"
        fi
    fi
    
    echo "=================================="
}

# Main function
main() {
    log "Starting Web3 Marketplace health check..."
    
    # Run all health checks
    check_kubectl || exit 1
    check_namespaces
    check_pods
    check_deployments
    check_statefulsets
    check_services
    check_application_health
    check_database
    check_redis
    check_monitoring
    check_resources
    check_storage
    check_networking
    check_backups
    check_external_dependencies
    
    # Generate final report
    generate_report
    
    exit $HEALTH_STATUS
}

# Script usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo "Options:"
    echo "  -h, --help              Show this help message"
    echo "  -n, --namespace NS      Production namespace (default: web3-marketplace-prod)"
    echo "  -m, --monitoring NS     Monitoring namespace (default: web3-marketplace-monitoring)"
    echo "  -t, --timeout SECONDS   Health check timeout (default: 30)"
    echo "  -q, --quiet             Suppress non-error output"
    echo "  -v, --verbose           Enable verbose output"
    echo ""
    echo "Environment variables:"
    echo "  SLACK_WEBHOOK_URL       Slack webhook for alerts (optional)"
    echo ""
    echo "Example:"
    echo "  $0 --namespace my-namespace --timeout 60"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            usage
            exit 0
            ;;
        -n|--namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        -m|--monitoring)
            MONITORING_NAMESPACE="$2"
            shift 2
            ;;
        -t|--timeout)
            HEALTH_CHECK_TIMEOUT="$2"
            shift 2
            ;;
        -q|--quiet)
            exec > /dev/null
            shift
            ;;
        -v|--verbose)
            set -x
            shift
            ;;
        *)
            echo "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Run main function
main