#!/bin/bash

# Web3 Marketplace Performance Monitoring Script
# Continuous performance monitoring and optimization recommendations

set -e

# Configuration
NAMESPACE="web3-marketplace-prod"
MONITORING_NAMESPACE="web3-marketplace-monitoring"
PROMETHEUS_URL="http://prometheus-service:9090"
PERFORMANCE_THRESHOLD_CPU=80
PERFORMANCE_THRESHOLD_MEMORY=85
PERFORMANCE_THRESHOLD_RESPONSE_TIME=2000
LOG_FILE="/tmp/performance-monitor-$(date +%Y%m%d).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Performance metrics
PERFORMANCE_ISSUES=()
OPTIMIZATION_RECOMMENDATIONS=()

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[✓]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[⚠]${NC} $1" | tee -a "$LOG_FILE"
    PERFORMANCE_ISSUES+=("WARNING: $1")
}

error() {
    echo -e "${RED}[✗]${NC} $1" | tee -a "$LOG_FILE"
    PERFORMANCE_ISSUES+=("ERROR: $1")
}

recommend() {
    echo -e "${BLUE}[💡]${NC} $1" | tee -a "$LOG_FILE"
    OPTIMIZATION_RECOMMENDATIONS+=("$1")
}

# Query Prometheus metrics
query_prometheus() {
    local query="$1"
    local result
    
    if command -v kubectl &> /dev/null; then
        result=$(kubectl exec -n "$MONITORING_NAMESPACE" deployment/prometheus -- \
            wget -qO- "http://localhost:9090/api/v1/query?query=$(echo "$query" | sed 's/ /%20/g')" 2>/dev/null | \
            jq -r '.data.result[0].value[1]' 2>/dev/null || echo "0")
    else
        result=$(curl -s "$PROMETHEUS_URL/api/v1/query?query=$(echo "$query" | sed 's/ /%20/g')" | \
            jq -r '.data.result[0].value[1]' 2>/dev/null || echo "0")
    fi
    
    echo "$result"
}

# Check application performance metrics
check_application_performance() {
    log "Checking application performance metrics..."
    
    # Response time analysis
    local avg_response_time=$(query_prometheus "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) * 1000")
    local p99_response_time=$(query_prometheus "histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m])) * 1000")
    
    if (( $(echo "$avg_response_time > $PERFORMANCE_THRESHOLD_RESPONSE_TIME" | bc -l) )); then
        warning "High average response time: ${avg_response_time}ms (threshold: ${PERFORMANCE_THRESHOLD_RESPONSE_TIME}ms)"
        recommend "Consider scaling up backend replicas or optimizing slow endpoints"
    else
        success "Average response time: ${avg_response_time}ms (healthy)"
    fi
    
    if (( $(echo "$p99_response_time > $(($PERFORMANCE_THRESHOLD_RESPONSE_TIME * 2))" | bc -l) )); then
        warning "High P99 response time: ${p99_response_time}ms"
        recommend "Investigate slow queries and optimize database performance"
    else
        success "P99 response time: ${p99_response_time}ms (acceptable)"
    fi
    
    # Error rate analysis
    local error_rate=$(query_prometheus "rate(http_requests_total{status=~\"5..\"}[5m]) / rate(http_requests_total[5m]) * 100")
    
    if (( $(echo "$error_rate > 5" | bc -l) )); then
        error "High error rate: ${error_rate}%"
        recommend "Check application logs and fix underlying issues"
    elif (( $(echo "$error_rate > 1" | bc -l) )); then
        warning "Moderate error rate: ${error_rate}%"
        recommend "Monitor error patterns and consider preventive measures"
    else
        success "Error rate: ${error_rate}% (healthy)"
    fi
    
    # Request rate analysis
    local request_rate=$(query_prometheus "rate(http_requests_total[5m])")
    success "Current request rate: ${request_rate} req/sec"
    
    # Throughput analysis
    local throughput=$(query_prometheus "rate(http_requests_total{status=~\"2..\"}[5m])")
    success "Successful request throughput: ${throughput} req/sec"
}

# Check resource utilization
check_resource_utilization() {
    log "Checking resource utilization..."
    
    # CPU utilization
    local cpu_usage=$(query_prometheus "100 - (avg by(instance) (irate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)")
    
    if (( $(echo "$cpu_usage > $PERFORMANCE_THRESHOLD_CPU" | bc -l) )); then
        warning "High CPU usage: ${cpu_usage}%"
        recommend "Consider scaling up nodes or optimizing CPU-intensive operations"
    else
        success "CPU usage: ${cpu_usage}% (healthy)"
    fi
    
    # Memory utilization
    local memory_usage=$(query_prometheus "(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100")
    
    if (( $(echo "$memory_usage > $PERFORMANCE_THRESHOLD_MEMORY" | bc -l) )); then
        warning "High memory usage: ${memory_usage}%"
        recommend "Consider increasing memory limits or optimizing memory usage"
    else
        success "Memory usage: ${memory_usage}% (healthy)"
    fi
    
    # Disk I/O analysis
    local disk_read_rate=$(query_prometheus "rate(node_disk_read_bytes_total[5m]) / 1024 / 1024")
    local disk_write_rate=$(query_prometheus "rate(node_disk_written_bytes_total[5m]) / 1024 / 1024")
    
    success "Disk read rate: ${disk_read_rate} MB/s"
    success "Disk write rate: ${disk_write_rate} MB/s"
    
    if (( $(echo "$disk_read_rate > 100" | bc -l) )) || (( $(echo "$disk_write_rate > 100" | bc -l) )); then
        warning "High disk I/O detected"
        recommend "Consider using faster storage or optimizing database queries"
    fi
    
    # Network I/O analysis
    local network_receive_rate=$(query_prometheus "rate(node_network_receive_bytes_total[5m]) / 1024 / 1024")
    local network_transmit_rate=$(query_prometheus "rate(node_network_transmit_bytes_total[5m]) / 1024 / 1024")
    
    success "Network receive rate: ${network_receive_rate} MB/s"
    success "Network transmit rate: ${network_transmit_rate} MB/s"
}

# Check database performance
check_database_performance() {
    log "Checking database performance..."
    
    if ! kubectl get statefulset postgres-primary -n "$NAMESPACE" &> /dev/null; then
        warning "PostgreSQL not found in namespace $NAMESPACE"
        return
    fi
    
    # Connection pool analysis
    local active_connections=$(kubectl exec -n "$NAMESPACE" statefulset/postgres-primary -- \
        psql -U postgres -d web3marketplace -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';" 2>/dev/null | tr -d ' ' || echo "0")
    
    local total_connections=$(kubectl exec -n "$NAMESPACE" statefulset/postgres-primary -- \
        psql -U postgres -d web3marketplace -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null | tr -d ' ' || echo "0")
    
    local max_connections=$(kubectl exec -n "$NAMESPACE" statefulset/postgres-primary -- \
        psql -U postgres -t -c "SHOW max_connections;" 2>/dev/null | tr -d ' ' || echo "100")
    
    local connection_usage=$((total_connections * 100 / max_connections))
    
    if [[ $connection_usage -gt 80 ]]; then
        warning "High database connection usage: ${total_connections}/${max_connections} (${connection_usage}%)"
        recommend "Consider increasing max_connections or implementing connection pooling"
    else
        success "Database connections: ${total_connections}/${max_connections} (${connection_usage}%)"
    fi
    
    # Query performance analysis
    local slow_queries=$(kubectl exec -n "$NAMESPACE" statefulset/postgres-primary -- \
        psql -U postgres -d web3marketplace -t -c "
            SELECT count(*) 
            FROM pg_stat_activity 
            WHERE state = 'active' 
            AND (now() - query_start) > interval '5 seconds';" 2>/dev/null | tr -d ' ' || echo "0")
    
    if [[ $slow_queries -gt 0 ]]; then
        warning "$slow_queries slow queries detected (>5 seconds)"
        recommend "Analyze and optimize slow queries using pg_stat_statements"
    else
        success "No slow queries detected"
    fi
    
    # Lock analysis
    local blocked_queries=$(kubectl exec -n "$NAMESPACE" statefulset/postgres-primary -- \
        psql -U postgres -d web3marketplace -t -c "
            SELECT count(*) 
            FROM pg_catalog.pg_locks blocked_locks
            JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
            WHERE NOT blocked_locks.granted;" 2>/dev/null | tr -d ' ' || echo "0")
    
    if [[ $blocked_queries -gt 0 ]]; then
        warning "$blocked_queries blocked queries detected"
        recommend "Investigate database locks and optimize transaction handling"
    else
        success "No blocked queries detected"
    fi
    
    # Cache hit ratio
    local cache_hit_ratio=$(kubectl exec -n "$NAMESPACE" statefulset/postgres-primary -- \
        psql -U postgres -d web3marketplace -t -c "
            SELECT round(
                sum(blks_hit) * 100.0 / sum(blks_hit + blks_read), 2
            ) 
            FROM pg_stat_database 
            WHERE datname = 'web3marketplace';" 2>/dev/null | tr -d ' ' || echo "0")
    
    if (( $(echo "$cache_hit_ratio < 95" | bc -l) )); then
        warning "Low database cache hit ratio: ${cache_hit_ratio}%"
        recommend "Consider increasing shared_buffers or adding more memory"
    else
        success "Database cache hit ratio: ${cache_hit_ratio}%"
    fi
}

# Check Redis performance
check_redis_performance() {
    log "Checking Redis performance..."
    
    if ! kubectl get statefulset redis-master -n "$NAMESPACE" &> /dev/null; then
        warning "Redis not found in namespace $NAMESPACE"
        return
    fi
    
    # Memory usage analysis
    local memory_used=$(kubectl exec -n "$NAMESPACE" statefulset/redis-master -- \
        redis-cli info memory | grep used_memory: | cut -d: -f2 | tr -d '\r' || echo "0")
    
    local memory_peak=$(kubectl exec -n "$NAMESPACE" statefulset/redis-master -- \
        redis-cli info memory | grep used_memory_peak: | cut -d: -f2 | tr -d '\r' || echo "0")
    
    local memory_usage_percent=$(kubectl exec -n "$NAMESPACE" statefulset/redis-master -- \
        redis-cli info memory | grep used_memory_rss_human | cut -d: -f2 | tr -d '\r' || echo "0")
    
    success "Redis memory usage: $memory_used (peak: $memory_peak)"
    
    # Hit ratio analysis
    local keyspace_hits=$(kubectl exec -n "$NAMESPACE" statefulset/redis-master -- \
        redis-cli info stats | grep keyspace_hits | cut -d: -f2 | tr -d '\r' || echo "0")
    
    local keyspace_misses=$(kubectl exec -n "$NAMESPACE" statefulset/redis-master -- \
        redis-cli info stats | grep keyspace_misses | cut -d: -f2 | tr -d '\r' || echo "0")
    
    if [[ $keyspace_hits -gt 0 ]] && [[ $keyspace_misses -gt 0 ]]; then
        local hit_ratio=$((keyspace_hits * 100 / (keyspace_hits + keyspace_misses)))
        
        if [[ $hit_ratio -lt 90 ]]; then
            warning "Low Redis hit ratio: ${hit_ratio}%"
            recommend "Review caching strategy and TTL settings"
        else
            success "Redis hit ratio: ${hit_ratio}%"
        fi
    fi
    
    # Connection analysis
    local connected_clients=$(kubectl exec -n "$NAMESPACE" statefulset/redis-master -- \
        redis-cli info clients | grep connected_clients | cut -d: -f2 | tr -d '\r' || echo "0")
    
    if [[ $connected_clients -gt 1000 ]]; then
        warning "High Redis client connections: $connected_clients"
        recommend "Implement connection pooling or review client connection management"
    else
        success "Redis connected clients: $connected_clients"
    fi
    
    # Latency analysis
    local avg_latency=$(kubectl exec -n "$NAMESPACE" statefulset/redis-master -- \
        timeout 5 redis-cli --latency-history -i 1 2>/dev/null | tail -1 | awk '{print $4}' || echo "0")
    
    if [[ -n "$avg_latency" ]] && (( $(echo "$avg_latency > 10" | bc -l) )); then
        warning "High Redis latency: ${avg_latency}ms"
        recommend "Check Redis configuration and server resources"
    elif [[ -n "$avg_latency" ]]; then
        success "Redis latency: ${avg_latency}ms"
    fi
}

# Check pod performance and scaling
check_pod_performance() {
    log "Checking pod performance and scaling..."
    
    # HPA status
    if kubectl get hpa -n "$NAMESPACE" &> /dev/null; then
        local hpa_status=$(kubectl get hpa -n "$NAMESPACE" --no-headers)
        
        while IFS= read -r line; do
            local name=$(echo "$line" | awk '{print $1}')
            local current=$(echo "$line" | awk '{print $4}')
            local min=$(echo "$line" | awk '{print $5}')
            local max=$(echo "$line" | awk '{print $6}')
            
            if [[ "$current" == "$max" ]]; then
                warning "HPA $name at maximum replicas: $current/$max"
                recommend "Consider increasing max replicas or optimizing resource usage"
            elif [[ "$current" == "$min" ]]; then
                success "HPA $name at minimum replicas: $current (room to scale up)"
            else
                success "HPA $name scaling appropriately: $current replicas"
            fi
        done <<< "$hpa_status"
    else
        warning "No HPA configured"
        recommend "Consider implementing Horizontal Pod Autoscaling"
    fi
    
    # Pod resource usage
    if kubectl top pods -n "$NAMESPACE" &> /dev/null; then
        local high_cpu_pods=$(kubectl top pods -n "$NAMESPACE" --no-headers | awk '$2 > 500 {print $1}')
        local high_memory_pods=$(kubectl top pods -n "$NAMESPACE" --no-headers | awk '$3 > 1000 {print $1}')
        
        if [[ -n "$high_cpu_pods" ]]; then
            warning "High CPU usage pods: $high_cpu_pods"
            recommend "Review CPU limits and consider optimization"
        fi
        
        if [[ -n "$high_memory_pods" ]]; then
            warning "High memory usage pods: $high_memory_pods"
            recommend "Review memory limits and check for memory leaks"
        fi
    fi
    
    # Pod restart analysis
    local restarted_pods=$(kubectl get pods -n "$NAMESPACE" --no-headers | awk '$4 > 0 {print $1 " (" $4 " restarts)"}')
    
    if [[ -n "$restarted_pods" ]]; then
        warning "Pods with restarts detected:"
        echo "$restarted_pods" | while read -r pod; do
            warning "  $pod"
        done
        recommend "Investigate pod restart causes and fix underlying issues"
    else
        success "No pod restarts detected"
    fi
}

# Check external dependencies performance
check_external_dependencies() {
    log "Checking external dependencies performance..."
    
    # Blockchain connectivity performance
    local blockchain_start_time=$(date +%s%N)
    if kubectl exec -n "$NAMESPACE" deployment/backend-deployment -- \
        timeout 10 curl -s -X POST -H "Content-Type: application/json" \
        --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
        https://mainnet.infura.io/v3/test &> /dev/null; then
        local blockchain_end_time=$(date +%s%N)
        local blockchain_latency=$(((blockchain_end_time - blockchain_start_time) / 1000000))
        
        if [[ $blockchain_latency -gt 5000 ]]; then
            warning "High blockchain API latency: ${blockchain_latency}ms"
            recommend "Consider using multiple blockchain providers or caching"
        else
            success "Blockchain API latency: ${blockchain_latency}ms"
        fi
    else
        error "Blockchain API connectivity failed"
        recommend "Check blockchain provider status and failover mechanisms"
    fi
    
    # IPFS performance
    local ipfs_start_time=$(date +%s%N)
    if kubectl exec -n "$NAMESPACE" deployment/backend-deployment -- \
        timeout 10 curl -s -I https://gateway.pinata.cloud/ipfs/QmTest &> /dev/null; then
        local ipfs_end_time=$(date +%s%N)
        local ipfs_latency=$(((ipfs_end_time - ipfs_start_time) / 1000000))
        
        if [[ $ipfs_latency -gt 3000 ]]; then
            warning "High IPFS gateway latency: ${ipfs_latency}ms"
            recommend "Consider using multiple IPFS gateways or local IPFS node"
        else
            success "IPFS gateway latency: ${ipfs_latency}ms"
        fi
    else
        error "IPFS gateway connectivity failed"
        recommend "Check IPFS gateway status and implement fallback gateways"
    fi
}

# Generate performance optimization recommendations
generate_optimization_recommendations() {
    log "Generating performance optimization recommendations..."
    
    # Analyze current metrics and suggest optimizations
    local current_replicas=$(kubectl get deployment backend-deployment -n "$NAMESPACE" -o jsonpath='{.spec.replicas}')
    local cpu_usage=$(query_prometheus "100 - (avg by(instance) (irate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)")
    local memory_usage=$(query_prometheus "(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100")
    local avg_response_time=$(query_prometheus "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) * 1000")
    
    # Scaling recommendations
    if (( $(echo "$cpu_usage > 70" | bc -l) )) && [[ $current_replicas -lt 10 ]]; then
        recommend "Consider scaling up backend replicas from $current_replicas to $((current_replicas + 2))"
    fi
    
    if (( $(echo "$memory_usage > 80" | bc -l) )); then
        recommend "Consider increasing memory limits or adding more nodes"
    fi
    
    if (( $(echo "$avg_response_time > 1000" | bc -l) )); then
        recommend "Implement caching strategies to reduce response times"
        recommend "Optimize database queries and add appropriate indexes"
        recommend "Consider implementing CDN for static assets"
    fi
    
    # Database optimization recommendations
    local db_connections=$(kubectl exec -n "$NAMESPACE" statefulset/postgres-primary -- \
        psql -U postgres -d web3marketplace -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null | tr -d ' ' || echo "0")
    
    if [[ $db_connections -gt 50 ]]; then
        recommend "Implement connection pooling (PgBouncer) to optimize database connections"
    fi
    
    # Redis optimization recommendations
    local redis_memory=$(kubectl exec -n "$NAMESPACE" statefulset/redis-master -- \
        redis-cli info memory | grep used_memory_human | cut -d: -f2 | tr -d '\r' 2>/dev/null || echo "0")
    
    if [[ "$redis_memory" =~ [0-9]+G ]]; then
        recommend "Consider Redis clustering or partitioning for large datasets"
    fi
    
    # General optimization recommendations
    recommend "Implement application-level caching for frequently accessed data"
    recommend "Use compression for API responses to reduce bandwidth"
    recommend "Implement lazy loading for non-critical components"
    recommend "Consider using a CDN for static assets and images"
    recommend "Implement database read replicas for read-heavy workloads"
    recommend "Use async processing for non-critical operations"
}

# Generate performance report
generate_performance_report() {
    log "Generating performance report..."
    
    echo ""
    echo "=========================================="
    echo "Web3 Marketplace Performance Report"
    echo "=========================================="
    echo "Timestamp: $(date)"
    echo "Monitoring Period: Last 5 minutes"
    echo ""
    
    if [[ ${#PERFORMANCE_ISSUES[@]} -eq 0 ]]; then
        success "No performance issues detected! 🚀"
    else
        echo -e "${RED}Performance Issues Detected (${#PERFORMANCE_ISSUES[@]}):${NC}"
        for issue in "${PERFORMANCE_ISSUES[@]}"; do
            echo "  • $issue"
        done
        echo ""
    fi
    
    if [[ ${#OPTIMIZATION_RECOMMENDATIONS[@]} -gt 0 ]]; then
        echo -e "${BLUE}Optimization Recommendations (${#OPTIMIZATION_RECOMMENDATIONS[@]}):${NC}"
        for recommendation in "${OPTIMIZATION_RECOMMENDATIONS[@]}"; do
            echo "  💡 $recommendation"
        done
        echo ""
    fi
    
    echo "=========================================="
    echo "Detailed metrics available in Grafana:"
    echo "https://grafana.linkdao.io"
    echo ""
    echo "Performance log: $LOG_FILE"
    echo "=========================================="
}

# Main function
main() {
    log "Starting Web3 Marketplace performance monitoring..."
    
    # Check if required tools are available
    if ! command -v bc &> /dev/null; then
        error "bc calculator not found. Please install bc package."
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        error "jq not found. Please install jq package."
        exit 1
    fi
    
    # Run performance checks
    check_application_performance
    check_resource_utilization
    check_database_performance
    check_redis_performance
    check_pod_performance
    check_external_dependencies
    generate_optimization_recommendations
    
    # Generate final report
    generate_performance_report
    
    # Exit with appropriate code
    if [[ ${#PERFORMANCE_ISSUES[@]} -gt 0 ]]; then
        exit 1
    else
        exit 0
    fi
}

# Script usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo "Options:"
    echo "  -h, --help              Show this help message"
    echo "  -n, --namespace NS      Production namespace (default: web3-marketplace-prod)"
    echo "  -m, --monitoring NS     Monitoring namespace (default: web3-marketplace-monitoring)"
    echo "  -c, --cpu-threshold N   CPU usage threshold % (default: 80)"
    echo "  -r, --memory-threshold N Memory usage threshold % (default: 85)"
    echo "  -t, --response-threshold N Response time threshold ms (default: 2000)"
    echo "  -o, --output FILE       Output log file (default: /tmp/performance-monitor-DATE.log)"
    echo "  -q, --quiet             Suppress non-error output"
    echo "  -v, --verbose           Enable verbose output"
    echo ""
    echo "Example:"
    echo "  $0 --cpu-threshold 70 --memory-threshold 80 --response-threshold 1500"
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
        -c|--cpu-threshold)
            PERFORMANCE_THRESHOLD_CPU="$2"
            shift 2
            ;;
        -r|--memory-threshold)
            PERFORMANCE_THRESHOLD_MEMORY="$2"
            shift 2
            ;;
        -t|--response-threshold)
            PERFORMANCE_THRESHOLD_RESPONSE_TIME="$2"
            shift 2
            ;;
        -o|--output)
            LOG_FILE="$2"
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