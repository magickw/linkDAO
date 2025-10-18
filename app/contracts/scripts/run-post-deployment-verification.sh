#!/bin/bash

# LinkDAO Post-Deployment Verification Script
# This script runs comprehensive post-deployment verification for the LinkDAO platform

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
NETWORK="localhost"
SKIP_COMPILE=false
VERBOSE=false

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -n, --network NETWORK    Network to verify (default: localhost)"
    echo "  -s, --skip-compile       Skip contract compilation"
    echo "  -v, --verbose           Enable verbose output"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --network mainnet"
    echo "  $0 --network sepolia --verbose"
    echo "  $0 --skip-compile"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -n|--network)
            NETWORK="$2"
            shift 2
            ;;
        -s|--skip-compile)
            SKIP_COMPILE=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validate network
case $NETWORK in
    localhost|hardhat|sepolia|mainnet)
        ;;
    *)
        print_error "Unsupported network: $NETWORK"
        print_error "Supported networks: localhost, hardhat, sepolia, mainnet"
        exit 1
        ;;
esac

print_status "Starting LinkDAO Post-Deployment Verification"
print_status "Network: $NETWORK"

# Check if we're in the contracts directory
if [ ! -f "hardhat.config.ts" ]; then
    print_error "This script must be run from the contracts directory"
    exit 1
fi

# Check for required files
ADDRESSES_FILE="deployed-addresses-${NETWORK}.json"
if [ "$NETWORK" = "mainnet" ]; then
    ADDRESSES_FILE="deployedAddresses.json"
fi

if [ ! -f "$ADDRESSES_FILE" ]; then
    print_error "Deployed addresses file not found: $ADDRESSES_FILE"
    print_error "Please ensure contracts are deployed before running verification"
    exit 1
fi

print_success "Found deployed addresses file: $ADDRESSES_FILE"

# Compile contracts if not skipped
if [ "$SKIP_COMPILE" = false ]; then
    print_status "Compiling contracts..."
    if [ "$VERBOSE" = true ]; then
        npx hardhat compile
    else
        npx hardhat compile > /dev/null 2>&1
    fi
    print_success "Contracts compiled successfully"
else
    print_warning "Skipping contract compilation"
fi

# Check if verification reports directory exists
REPORTS_DIR="./verification-reports"
if [ -d "$REPORTS_DIR" ]; then
    print_warning "Verification reports directory exists, backing up previous reports..."
    BACKUP_DIR="./verification-reports-backup-$(date +%Y%m%d-%H%M%S)"
    mv "$REPORTS_DIR" "$BACKUP_DIR"
    print_status "Previous reports backed up to: $BACKUP_DIR"
fi

# Set environment variables for the verification script
export HARDHAT_NETWORK="$NETWORK"

# Run the verification script
print_status "Running post-deployment verification..."
print_status "This may take several minutes depending on network conditions..."

if [ "$VERBOSE" = true ]; then
    npx ts-node scripts/run-post-deployment-verification.ts
else
    npx ts-node scripts/run-post-deployment-verification.ts 2>&1 | tee verification.log
fi

# Check if verification completed successfully
if [ $? -eq 0 ]; then
    print_success "Post-deployment verification completed successfully!"
    
    # Display summary of generated reports
    print_status "Generated Reports:"
    if [ -d "$REPORTS_DIR" ]; then
        for report in "$REPORTS_DIR"/*.md; do
            if [ -f "$report" ]; then
                echo "  - $(basename "$report")"
            fi
        done
        
        # Show file sizes
        echo ""
        print_status "Report Details:"
        ls -lh "$REPORTS_DIR"/*.md 2>/dev/null || true
        ls -lh "$REPORTS_DIR"/*.json 2>/dev/null || true
    fi
    
    # Check for any failures in the reports
    if [ -f "$REPORTS_DIR/post-deployment-verification-summary.md" ]; then
        echo ""
        print_status "Verification Summary:"
        echo "📄 View the complete report at: $REPORTS_DIR/post-deployment-verification-summary.md"
        
        # Quick check for failures
        if grep -q "❌" "$REPORTS_DIR"/*.md 2>/dev/null; then
            print_warning "Some tests may have failed. Please review the detailed reports."
        else
            print_success "All verification tests appear to have passed!"
        fi
    fi
    
    echo ""
    print_success "Verification complete! Review the reports in: $REPORTS_DIR"
    
else
    print_error "Post-deployment verification failed!"
    print_error "Check the logs above for details"
    
    if [ -f "verification.log" ]; then
        print_status "Full logs saved to: verification.log"
    fi
    
    exit 1
fi

# Cleanup
if [ -f "verification.log" ] && [ "$VERBOSE" = false ]; then
    rm verification.log
fi

print_success "Post-deployment verification script completed successfully!"