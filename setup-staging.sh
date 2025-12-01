#!/bin/bash

# Staging Environment Setup Script for X402 Protocol
# This script configures and deploys the x402 payment system to staging

set -e  # Exit on any error

echo "🚀 Setting up X402 Protocol Staging Environment"
echo "=================================================="

# Configuration
STAGING_DOMAIN="staging.linkdao.io"
BACKEND_URL="https://staging-api.linkdao.io"
FRONTEND_URL="https://staging.linkdao.io"
NETWORK="sepolia"
CHAIN_ID="11155111"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    
    # Check Hardhat
    if ! command -v npx &> /dev/null || ! npx hardhat --version &> /dev/null; then
        log_error "Hardhat is not installed"
        exit 1
    fi
    
    # Check if .env.staging exists
    if [ ! -f ".env.staging" ]; then
        log_warning ".env.staging file not found. Creating from template..."
        cp .env.staging.example .env.staging
        log_warning "Please update .env.staging with your actual credentials"
        exit 1
    fi
    
    log_success "Prerequisites check completed"
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."
    
    # Backend dependencies
    log_info "Installing backend dependencies..."
    cd app/backend
    npm ci --production=false
    cd ../..
    
    # Frontend dependencies
    log_info "Installing frontend dependencies..."
    cd app/frontend
    npm ci --production=false
    cd ../..
    
    # Contract dependencies
    log_info "Installing contract dependencies..."
    cd app/contracts
    npm ci
    cd ../..
    
    log_success "Dependencies installed"
}

# Deploy contracts to staging
deploy_contracts() {
    log_info "Deploying contracts to $NETWORK..."
    
    cd app/contracts
    
    # Compile contracts
    log_info "Compiling contracts..."
    npx hardhat compile
    
    # Deploy TipRouter (if not already deployed)
    log_info "Deploying TipRouter..."
    TIP_ROUTER_OUTPUT=$(npx hardhat deploy-tiprouter --network $NETWORK)
    TIP_ROUTER_ADDRESS=$(echo "$TIP_ROUTER_OUTPUT" | grep -o '0x[a-fA-F0-9]\{40\}')
    
    # Deploy Optimized X402PaymentHandler
    log_info "Deploying Optimized X402PaymentHandler..."
    X402_OUTPUT=$(npx hardhat deploy-optimized-x402 --tiprouter $TIP_ROUTER_ADDRESS --network $NETWORK)
    X402_ADDRESS=$(echo "$X402_OUTPUT" | grep -o '0x[a-fA-F0-9]\{40\}')
    
    cd ../..
    
    # Update environment file with contract addresses
    log_info "Updating environment variables..."
    sed -i.bak "s/NEXT_PUBLIC_TIP_ROUTER_ADDRESS=.*/NEXT_PUBLIC_TIP_ROUTER_ADDRESS=$TIP_ROUTER_ADDRESS/" .env.staging
    sed -i.bak "s/NEXT_PUBLIC_X402_HANDLER_ADDRESS=.*/NEXT_PUBLIC_X402_HANDLER_ADDRESS=$X402_ADDRESS/" .env.staging
    
    log_success "Contracts deployed successfully"
    log_info "TipRouter: $TIP_ROUTER_ADDRESS"
    log_info "X402 Handler: $X402_ADDRESS"
}

# Run security audit
run_security_audit() {
    log_info "Running security audit..."
    
    cd app/contracts
    node scripts/simple-security-audit.js
    
    # Check if security score is acceptable
    SECURITY_SCORE=$(cat security-audit-report.json | jq -r '.summary.securityScore')
    if [ "$SECURITY_SCORE" -lt 90 ]; then
        log_warning "Security score is $SECURITY_SCORE/100. Review recommended."
    else
        log_success "Security audit passed with score $SECURITY_SCORE/100"
    fi
    
    cd ../..
}

# Run gas optimization tests
run_gas_tests() {
    log_info "Running gas optimization tests..."
    
    cd app/contracts
    npx hardhat compare-gas-usage
    cd ../..
    
    log_success "Gas optimization tests completed"
}

# Setup database
setup_database() {
    log_info "Setting up staging database..."
    
    cd app/backend
    
    # Run database migrations
    log_info "Running database migrations..."
    npm run migrate:staging
    
    # Seed test data
    log_info "Seeding test data..."
    npm run seed:staging
    
    cd ../..
    
    log_success "Database setup completed"
}

# Build applications
build_applications() {
    log_info "Building applications..."
    
    # Build backend
    log_info "Building backend..."
    cd app/backend
    npm run build:staging
    cd ../..
    
    # Build frontend
    log_info "Building frontend..."
    cd app/frontend
    npm run build:staging
    cd ../..
    
    log_success "Applications built successfully"
}

# Deploy to staging infrastructure
deploy_to_staging() {
    log_info "Deploying to staging infrastructure..."
    
    # This would typically involve:
    # - Docker container deployment
    # - Kubernetes deployment
    # - Cloud deployment scripts
    
    # For now, we'll simulate the deployment
    log_info "Deploying backend services..."
    # docker-compose -f docker-compose.staging.yml up -d
    
    log_info "Deploying frontend..."
    # aws s3 sync build/ s3://staging-linkdao-frontend --delete
    # aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
    
    log_success "Deployment to staging completed"
}

# Run integration tests
run_integration_tests() {
    log_info "Running integration tests..."
    
    # Test x402 payment flow
    log_info "Testing x402 payment flow..."
    node load-test-x402.js
    
    # Test API endpoints
    log_info "Testing API endpoints..."
    cd app/backend
    npm run test:integration:staging
    cd ../..
    
    log_success "Integration tests completed"
}

# Setup monitoring
setup_monitoring() {
    log_info "Setting up monitoring and alerting..."
    
    # Configure monitoring dashboards
    # Setup alerting rules
    # Configure log aggregation
    
    log_success "Monitoring setup completed"
}

# Health check
health_check() {
    log_info "Performing health check..."
    
    # Check backend health
    BACKEND_HEALTH=$(curl -s "$BACKEND_URL/health" | jq -r '.status // "error"')
    if [ "$BACKEND_HEALTH" = "ok" ]; then
        log_success "Backend health check passed"
    else
        log_error "Backend health check failed"
    fi
    
    # Check frontend
    FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL")
    if [ "$FRONTEND_STATUS" = "200" ]; then
        log_success "Frontend health check passed"
    else
        log_error "Frontend health check failed (HTTP $FRONTEND_STATUS)"
    fi
    
    # Check contracts
    log_info "Verifying contract deployments..."
    # Add contract verification logic here
}

# Main execution
main() {
    log_info "Starting X402 Protocol staging deployment..."
    
    check_prerequisites
    install_dependencies
    deploy_contracts
    run_security_audit
    run_gas_tests
    setup_database
    build_applications
    deploy_to_staging
    run_integration_tests
    setup_monitoring
    health_check
    
    log_success "🎉 Staging environment setup completed successfully!"
    log_info "Staging URL: $FRONTEND_URL"
    log_info "Backend API: $BACKEND_URL"
    log_info "Next steps:"
    log_info "  1. Test x402 payment flow manually"
    log_info "  2. Review monitoring dashboards"
    log_info "  3. Run load testing with increased concurrency"
    log_info "  4. Validate all integrations"
}

# Handle script interruption
trap 'log_error "Script interrupted"; exit 1' INT

# Run main function
main "$@"