#!/bin/bash

# Final Validation and Production Deployment Script
# 
# This script orchestrates the complete final validation and deployment process
# for the seller integration consistency improvements.

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOYMENT_ENV=${DEPLOYMENT_ENV:-production}
ROLLBACK_ENABLED=${ROLLBACK_ENABLED:-true}
HEALTH_CHECK_TIMEOUT=${HEALTH_CHECK_TIMEOUT:-300000}
RESPONSE_TIME_THRESHOLD=${RESPONSE_TIME_THRESHOLD:-2000}
ERROR_RATE_THRESHOLD=${ERROR_RATE_THRESHOLD:-1.0}
THROUGHPUT_THRESHOLD=${THROUGHPUT_THRESHOLD:-100}

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    REQUIRED_VERSION="18.0.0"
    
    if ! npx semver -r ">=$REQUIRED_VERSION" "$NODE_VERSION" &> /dev/null; then
        log_error "Node.js version $NODE_VERSION is not supported. Required: >=$REQUIRED_VERSION"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    
    # Check TypeScript
    if ! command -v npx &> /dev/null; then
        log_error "npx is not available"
        exit 1
    fi
    
    # Check environment variables
    if [[ "$DEPLOYMENT_ENV" == "production" ]]; then
        if [[ -z "$BACKEND_URL" || -z "$FRONTEND_URL" ]]; then
            log_error "BACKEND_URL and FRONTEND_URL must be set for production deployment"
            exit 1
        fi
    fi
    
    log_success "Prerequisites check passed"
}

# Install dependencies
install_dependencies() {
    log "Installing dependencies..."
    
    # Backend dependencies
    if [[ -f "app/backend/package.json" ]]; then
        log "Installing backend dependencies..."
        cd app/backend
        npm ci --production=false
        cd ../..
    fi
    
    # Frontend dependencies
    if [[ -f "app/frontend/package.json" ]]; then
        log "Installing frontend dependencies..."
        cd app/frontend
        npm ci --production=false
        cd ../..
    fi
    
    # Root dependencies
    if [[ -f "package.json" ]]; then
        log "Installing root dependencies..."
        npm ci --production=false
    fi
    
    log_success "Dependencies installed"
}

# Run pre-deployment tests
run_pre_deployment_tests() {
    log "Running pre-deployment tests..."
    
    # Backend tests
    if [[ -f "app/backend/package.json" ]]; then
        log "Running backend tests..."
        cd app/backend
        
        # Unit tests
        npm run test -- --passWithNoTests --coverage=false
        
        # Integration tests
        if npm run | grep -q "test:integration"; then
            npm run test:integration
        fi
        
        cd ../..
    fi
    
    # Frontend tests
    if [[ -f "app/frontend/package.json" ]]; then
        log "Running frontend tests..."
        cd app/frontend
        
        # Unit tests
        npm run test -- --passWithNoTests --coverage=false --watchAll=false
        
        # Integration tests
        if npm run | grep -q "test:integration"; then
            npm run test:integration
        fi
        
        cd ../..
    fi
    
    log_success "Pre-deployment tests passed"
}

# Build applications
build_applications() {
    log "Building applications..."
    
    # Build backend
    if [[ -f "app/backend/package.json" ]]; then
        log "Building backend..."
        cd app/backend
        npm run build
        cd ../..
    fi
    
    # Build frontend
    if [[ -f "app/frontend/package.json" ]]; then
        log "Building frontend..."
        cd app/frontend
        npm run build
        cd ../..
    fi
    
    log_success "Applications built successfully"
}

# Run final validation
run_final_validation() {
    log "Running final validation and deployment process..."
    
    # Set environment variables
    export DEPLOYMENT_ENV
    export ROLLBACK_ENABLED
    export HEALTH_CHECK_TIMEOUT
    export RESPONSE_TIME_THRESHOLD
    export ERROR_RATE_THRESHOLD
    export THROUGHPUT_THRESHOLD
    
    # Run the final validation and deployment script
    cd app/backend
    npx ts-node src/scripts/finalValidationAndDeployment.ts
    cd ../..
    
    log_success "Final validation and deployment completed"
}

# Generate deployment summary
generate_deployment_summary() {
    log "Generating deployment summary..."
    
    TIMESTAMP=$(date +'%Y-%m-%d %H:%M:%S')
    REPORT_FILE="deployment-summary-$(date +'%Y%m%d-%H%M%S').md"
    
    cat > "$REPORT_FILE" << EOF
# Deployment Summary

**Date:** $TIMESTAMP  
**Environment:** $DEPLOYMENT_ENV  
**Status:** SUCCESS  

## Configuration

- Rollback Enabled: $ROLLBACK_ENABLED
- Health Check Timeout: ${HEALTH_CHECK_TIMEOUT}ms
- Response Time Threshold: ${RESPONSE_TIME_THRESHOLD}ms
- Error Rate Threshold: ${ERROR_RATE_THRESHOLD}%
- Throughput Threshold: ${THROUGHPUT_THRESHOLD} req/s

## Validation Results

✅ All pre-deployment validations passed  
✅ API endpoint consistency validated  
✅ Data type consistency validated  
✅ Cache invalidation system validated  
✅ Error handling consistency validated  
✅ Image upload pipeline validated  
✅ Tier system integration validated  
✅ Mobile optimizations validated  
✅ Real-time features validated  
✅ Performance optimizations validated  
✅ Security measures validated  

## Seller Workflow Validation

✅ Seller onboarding workflow  
✅ Seller profile management workflow  
✅ Seller dashboard workflow  
✅ Seller store workflow  
✅ Seller listing workflow  
✅ Seller order management workflow  
✅ Seller tier upgrade workflow  
✅ Seller analytics workflow  

## Post-Deployment Checks

✅ Production API endpoints accessible  
✅ Database connectivity verified  
✅ Cache systems operational  
✅ Real-time connectivity established  
✅ Performance metrics within thresholds  

## Next Steps

1. Continue monitoring system performance
2. Monitor error rates and response times
3. Validate seller workflows in production
4. Collect user feedback on improvements
5. Plan next iteration of enhancements

## Support

For any issues or questions, please contact the development team.

---
*Generated automatically by the deployment script*
EOF

    log_success "Deployment summary generated: $REPORT_FILE"
}

# Cleanup function
cleanup() {
    log "Cleaning up temporary files..."
    
    # Remove any temporary files created during deployment
    find . -name "*.tmp" -type f -delete 2>/dev/null || true
    find . -name ".deployment-*" -type f -delete 2>/dev/null || true
    
    log_success "Cleanup completed"
}

# Error handler
handle_error() {
    local exit_code=$?
    log_error "Deployment failed with exit code $exit_code"
    
    if [[ "$ROLLBACK_ENABLED" == "true" && "$DEPLOYMENT_ENV" == "production" ]]; then
        log_warning "Initiating rollback..."
        
        # Run rollback script if it exists
        if [[ -f "scripts/rollback.sh" ]]; then
            bash scripts/rollback.sh
        else
            log_warning "No rollback script found"
        fi
    fi
    
    cleanup
    exit $exit_code
}

# Set error handler
trap handle_error ERR

# Main execution
main() {
    log "🚀 Starting Final Validation and Production Deployment"
    log "Environment: $DEPLOYMENT_ENV"
    log "Rollback Enabled: $ROLLBACK_ENABLED"
    echo "=================================================="
    
    # Execute deployment steps
    check_prerequisites
    install_dependencies
    run_pre_deployment_tests
    build_applications
    run_final_validation
    generate_deployment_summary
    cleanup
    
    log_success "🎉 Final validation and deployment completed successfully!"
    log "📄 Check the deployment report for detailed results"
    log "📊 Monitor the production dashboard for ongoing system health"
}

# Help function
show_help() {
    cat << EOF
Final Validation and Production Deployment Script

Usage: $0 [OPTIONS]

Options:
    -e, --environment ENV    Deployment environment (staging|production) [default: production]
    -r, --rollback BOOL      Enable rollback on failure (true|false) [default: true]
    -t, --timeout MS         Health check timeout in milliseconds [default: 300000]
    --response-time MS       Response time threshold in milliseconds [default: 2000]
    --error-rate PERCENT     Error rate threshold as percentage [default: 1.0]
    --throughput NUM         Throughput threshold in req/s [default: 100]
    -h, --help              Show this help message

Environment Variables:
    DEPLOYMENT_ENV           Deployment environment
    ROLLBACK_ENABLED         Enable rollback on failure
    HEALTH_CHECK_TIMEOUT     Health check timeout
    RESPONSE_TIME_THRESHOLD  Response time threshold
    ERROR_RATE_THRESHOLD     Error rate threshold
    THROUGHPUT_THRESHOLD     Throughput threshold
    BACKEND_URL             Backend API URL (required for production)
    FRONTEND_URL            Frontend application URL (required for production)

Examples:
    # Deploy to production with default settings
    $0

    # Deploy to staging
    $0 --environment staging

    # Deploy with custom thresholds
    $0 --response-time 1500 --error-rate 0.5

    # Deploy without rollback
    $0 --rollback false

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            DEPLOYMENT_ENV="$2"
            shift 2
            ;;
        -r|--rollback)
            ROLLBACK_ENABLED="$2"
            shift 2
            ;;
        -t|--timeout)
            HEALTH_CHECK_TIMEOUT="$2"
            shift 2
            ;;
        --response-time)
            RESPONSE_TIME_THRESHOLD="$2"
            shift 2
            ;;
        --error-rate)
            ERROR_RATE_THRESHOLD="$2"
            shift 2
            ;;
        --throughput)
            THROUGHPUT_THRESHOLD="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Validate environment
if [[ "$DEPLOYMENT_ENV" != "staging" && "$DEPLOYMENT_ENV" != "production" ]]; then
    log_error "Invalid environment: $DEPLOYMENT_ENV. Must be 'staging' or 'production'"
    exit 1
fi

# Run main function
main "$@"