#!/bin/bash

# LinkDAO Complete Post-Deployment Validation Script
# This script runs all post-deployment validation components in sequence

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Default values
NETWORK="localhost"
SKIP_COMPILE=false
VERBOSE=false
SKIP_PERFORMANCE=false
SKIP_SECURITY=false
SKIP_DOCS=false

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

print_section() {
    echo -e "${PURPLE}[SECTION]${NC} $1"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Complete post-deployment validation for LinkDAO mainnet deployment"
    echo ""
    echo "Options:"
    echo "  -n, --network NETWORK       Network to validate (default: localhost)"
    echo "  -s, --skip-compile          Skip contract compilation"
    echo "  --skip-performance          Skip performance and load testing"
    echo "  --skip-security             Skip security validation"
    echo "  --skip-docs                 Skip documentation generation"
    echo "  -v, --verbose               Enable verbose output"
    echo "  -h, --help                  Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --network mainnet"
    echo "  $0 --network sepolia --verbose"
    echo "  $0 --skip-performance --skip-docs"
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
        --skip-performance)
            SKIP_PERFORMANCE=true
            shift
            ;;
        --skip-security)
            SKIP_SECURITY=true
            shift
            ;;
        --skip-docs)
            SKIP_DOCS=true
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

print_section "🚀 Starting Complete Post-Deployment Validation"
print_status "Network: $NETWORK"
print_status "Timestamp: $(date)"

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
    print_error "Please ensure contracts are deployed before running validation"
    exit 1
fi

print_success "Found deployed addresses file: $ADDRESSES_FILE"

# Compile contracts if not skipped
if [ "$SKIP_COMPILE" = false ]; then
    print_section "🔨 Compiling Contracts"
    if [ "$VERBOSE" = true ]; then
        npx hardhat compile
    else
        npx hardhat compile > /dev/null 2>&1
    fi
    print_success "Contracts compiled successfully"
else
    print_warning "Skipping contract compilation"
fi

# Create reports directory
REPORTS_DIR="./post-deployment-validation-reports"
if [ -d "$REPORTS_DIR" ]; then
    print_warning "Reports directory exists, backing up previous reports..."
    BACKUP_DIR="./validation-reports-backup-$(date +%Y%m%d-%H%M%S)"
    mv "$REPORTS_DIR" "$BACKUP_DIR"
    print_status "Previous reports backed up to: $BACKUP_DIR"
fi

mkdir -p "$REPORTS_DIR"

# Set environment variables
export HARDHAT_NETWORK="$NETWORK"

# Track validation results
VALIDATION_RESULTS=()

# 1. Post-Deployment Verification
print_section "🔍 Running Post-Deployment Verification"
print_status "This includes contract verification and user workflow testing..."

if [ "$VERBOSE" = true ]; then
    npx ts-node scripts/run-post-deployment-verification.ts
else
    npx ts-node scripts/run-post-deployment-verification.ts > verification.log 2>&1
fi

if [ $? -eq 0 ]; then
    print_success "Post-deployment verification completed successfully"
    VALIDATION_RESULTS+=("✅ Post-Deployment Verification: PASSED")
    
    # Move reports to main directory
    if [ -d "./verification-reports" ]; then
        cp -r ./verification-reports/* "$REPORTS_DIR/"
        rm -rf ./verification-reports
    fi
else
    print_error "Post-deployment verification failed"
    VALIDATION_RESULTS+=("❌ Post-Deployment Verification: FAILED")
    
    if [ -f "verification.log" ]; then
        print_status "Verification logs:"
        tail -20 verification.log
    fi
fi

# 2. Performance and Load Testing
if [ "$SKIP_PERFORMANCE" = false ]; then
    print_section "🏃‍♂️ Running Performance and Load Testing"
    print_status "This may take several minutes depending on test configuration..."
    
    if [ "$VERBOSE" = true ]; then
        npx ts-node scripts/run-performance-load-tests.ts
    else
        npx ts-node scripts/run-performance-load-tests.ts > performance.log 2>&1
    fi
    
    if [ $? -eq 0 ]; then
        print_success "Performance and load testing completed successfully"
        VALIDATION_RESULTS+=("✅ Performance Testing: PASSED")
    else
        print_error "Performance and load testing failed"
        VALIDATION_RESULTS+=("❌ Performance Testing: FAILED")
        
        if [ -f "performance.log" ]; then
            print_status "Performance testing logs:"
            tail -20 performance.log
        fi
    fi
else
    print_warning "Skipping performance and load testing"
    VALIDATION_RESULTS+=("⚠️  Performance Testing: SKIPPED")
fi

# 3. Security and Emergency Procedures Validation
if [ "$SKIP_SECURITY" = false ]; then
    print_section "🛡️ Running Security and Emergency Procedures Validation"
    print_status "Validating security measures and emergency response capabilities..."
    
    if [ "$VERBOSE" = true ]; then
        npx ts-node scripts/run-security-emergency-validation.ts
    else
        npx ts-node scripts/run-security-emergency-validation.ts > security.log 2>&1
    fi
    
    if [ $? -eq 0 ]; then
        print_success "Security validation completed successfully"
        VALIDATION_RESULTS+=("✅ Security Validation: PASSED")
    else
        print_error "Security validation failed"
        VALIDATION_RESULTS+=("❌ Security Validation: FAILED")
        
        if [ -f "security.log" ]; then
            print_status "Security validation logs:"
            tail -20 security.log
        fi
    fi
else
    print_warning "Skipping security validation"
    VALIDATION_RESULTS+=("⚠️  Security Validation: SKIPPED")
fi

# 4. Documentation Generation
if [ "$SKIP_DOCS" = false ]; then
    print_section "📚 Generating Deployment Documentation"
    print_status "Creating comprehensive documentation for deployment..."
    
    if [ "$VERBOSE" = true ]; then
        npx ts-node scripts/generate-deployment-documentation.ts
    else
        npx ts-node scripts/generate-deployment-documentation.ts > documentation.log 2>&1
    fi
    
    if [ $? -eq 0 ]; then
        print_success "Documentation generation completed successfully"
        VALIDATION_RESULTS+=("✅ Documentation Generation: PASSED")
        
        # Move documentation to main reports directory
        if [ -d "./deployment-documentation" ]; then
            cp -r ./deployment-documentation/* "$REPORTS_DIR/"
            rm -rf ./deployment-documentation
        fi
    else
        print_error "Documentation generation failed"
        VALIDATION_RESULTS+=("❌ Documentation Generation: FAILED")
        
        if [ -f "documentation.log" ]; then
            print_status "Documentation generation logs:"
            tail -20 documentation.log
        fi
    fi
else
    print_warning "Skipping documentation generation"
    VALIDATION_RESULTS+=("⚠️  Documentation Generation: SKIPPED")
fi

# Generate final validation summary
print_section "📋 Generating Final Validation Summary"

SUMMARY_FILE="$REPORTS_DIR/final-validation-summary.md"

cat > "$SUMMARY_FILE" << EOF
# LinkDAO Post-Deployment Validation Summary

**Network:** $NETWORK
**Validation Date:** $(date)
**Validation Duration:** $SECONDS seconds

## Validation Results

EOF

# Add results to summary
for result in "${VALIDATION_RESULTS[@]}"; do
    echo "- $result" >> "$SUMMARY_FILE"
done

# Calculate overall success
PASSED_COUNT=$(printf '%s\n' "${VALIDATION_RESULTS[@]}" | grep -c "✅")
FAILED_COUNT=$(printf '%s\n' "${VALIDATION_RESULTS[@]}" | grep -c "❌")
SKIPPED_COUNT=$(printf '%s\n' "${VALIDATION_RESULTS[@]}" | grep -c "⚠️")
TOTAL_COUNT=${#VALIDATION_RESULTS[@]}

cat >> "$SUMMARY_FILE" << EOF

## Summary Statistics

- **Total Validations:** $TOTAL_COUNT
- **Passed:** $PASSED_COUNT
- **Failed:** $FAILED_COUNT
- **Skipped:** $SKIPPED_COUNT
- **Success Rate:** $(( (PASSED_COUNT * 100) / (TOTAL_COUNT - SKIPPED_COUNT) ))%

## Report Files

The following reports have been generated:

EOF

# List all generated files
if [ -d "$REPORTS_DIR" ]; then
    find "$REPORTS_DIR" -name "*.md" -o -name "*.json" | sort | while read file; do
        filename=$(basename "$file")
        echo "- [\`$filename\`](./$filename)" >> "$SUMMARY_FILE"
    done
fi

cat >> "$SUMMARY_FILE" << EOF

## Next Steps

EOF

if [ $FAILED_COUNT -eq 0 ]; then
    cat >> "$SUMMARY_FILE" << EOF
✅ **All validations passed successfully!**

1. Review all generated reports for detailed information
2. Proceed with community launch preparation
3. Activate production monitoring systems
4. Publish documentation and user guides

EOF
else
    cat >> "$SUMMARY_FILE" << EOF
⚠️ **Some validations failed - action required before launch**

1. **IMMEDIATE:** Review failed validations and address issues
2. Re-run validation after fixes are implemented
3. Do not proceed with community launch until all critical issues are resolved
4. Consider additional testing if significant changes are made

### Failed Validations
EOF
    
    for result in "${VALIDATION_RESULTS[@]}"; do
        if [[ $result == *"❌"* ]]; then
            echo "- $result" >> "$SUMMARY_FILE"
        fi
    done
fi

cat >> "$SUMMARY_FILE" << EOF

---

*This validation was performed as part of the LinkDAO mainnet deployment plan (Task 6: Post-Deployment Validation and Testing).*
EOF

# Display final results
print_section "🎉 Post-Deployment Validation Complete!"

echo ""
print_status "Validation Results:"
for result in "${VALIDATION_RESULTS[@]}"; do
    echo "  $result"
done

echo ""
print_status "Summary:"
print_status "  - Total Validations: $TOTAL_COUNT"
print_status "  - Passed: $PASSED_COUNT"
print_status "  - Failed: $FAILED_COUNT"
print_status "  - Skipped: $SKIPPED_COUNT"

if [ $FAILED_COUNT -eq 0 ]; then
    echo ""
    print_success "🎉 ALL VALIDATIONS PASSED! Ready for community launch!"
    print_success "📁 All reports saved to: $REPORTS_DIR"
    print_success "📄 View summary: $SUMMARY_FILE"
else
    echo ""
    print_error "❌ $FAILED_COUNT validation(s) failed - action required before launch"
    print_error "📁 Review reports in: $REPORTS_DIR"
    print_error "📄 See details in: $SUMMARY_FILE"
    
    echo ""
    print_warning "Do not proceed with community launch until all issues are resolved!"
fi

# Cleanup log files if not verbose
if [ "$VERBOSE" = false ]; then
    rm -f verification.log performance.log security.log documentation.log
fi

# Exit with appropriate code
if [ $FAILED_COUNT -eq 0 ]; then
    exit 0
else
    exit 1
fi