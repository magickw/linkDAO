#!/bin/bash

# Complete Migration Validation Script
# Validates the entire mock data removal migration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}${BOLD}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}${BOLD}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}${BOLD}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}${BOLD}[ERROR]${NC} $1"
}

log_section() {
    echo -e "\n${BLUE}${BOLD}=== $1 ===${NC}"
}

# Initialize validation results
VALIDATION_RESULTS=""
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to record test result
record_result() {
    local test_name="$1"
    local result="$2"
    local details="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ "$result" = "PASS" ]; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        log_success "$test_name"
        VALIDATION_RESULTS="${VALIDATION_RESULTS}✅ $test_name\n"
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
        log_error "$test_name: $details"
        VALIDATION_RESULTS="${VALIDATION_RESULTS}❌ $test_name: $details\n"
    fi
}

# Check if we're in the right directory
check_project_structure() {
    log_section "Project Structure Validation"
    
    if [ ! -f "package.json" ]; then
        record_result "Project root validation" "FAIL" "Not in project root directory"
        return 1
    fi
    
    if [ ! -d "app/frontend" ] || [ ! -d "app/backend" ]; then
        record_result "App structure validation" "FAIL" "Missing app/frontend or app/backend directories"
        return 1
    fi
    
    record_result "Project structure validation" "PASS" ""
    return 0
}

# Validate mock data removal
validate_mock_data_removal() {
    log_section "Mock Data Removal Validation"
    
    # Check for remaining mock data files
    local mock_files=(
        "app/frontend/src/mocks/communityMockData.ts"
        "app/frontend/src/data/mockProducts.ts"
        "app/frontend/src/mocks/mockUsers.ts"
        "app/frontend/src/data/mockFeed.ts"
    )
    
    local remaining_files=0
    for file in "${mock_files[@]}"; do
        if [ -f "$file" ]; then
            record_result "Mock file removal: $file" "FAIL" "File still exists"
            remaining_files=$((remaining_files + 1))
        else
            record_result "Mock file removal: $file" "PASS" ""
        fi
    done
    
    # Check for mock imports in components
    log_info "Checking for remaining mock imports..."
    local mock_imports=$(find app/frontend/src/components -name "*.tsx" -exec grep -l "from.*mock" {} \; 2>/dev/null || true)
    
    if [ -n "$mock_imports" ]; then
        record_result "Mock imports removal" "FAIL" "Found mock imports in: $mock_imports"
    else
        record_result "Mock imports removal" "PASS" ""
    fi
    
    # Check for hardcoded mock arrays
    local hardcoded_mocks=$(find app/frontend/src/components -name "*.tsx" -exec grep -l "const.*mock.*=.*\[" {} \; 2>/dev/null || true)
    
    if [ -n "$hardcoded_mocks" ]; then
        log_warning "Found potential hardcoded mock data in: $hardcoded_mocks"
    fi
}

# Validate service implementations
validate_service_implementations() {
    log_section "Service Implementation Validation"
    
    # Check for required service files
    local required_services=(
        "app/backend/src/services/communityService.ts"
        "app/backend/src/services/enhancedUserService.ts"
        "app/backend/src/services/feedService.ts"
        "app/backend/src/services/marketplaceService.ts"
        "app/backend/src/services/governanceService.ts"
    )
    
    for service in "${required_services[@]}"; do
        if [ -f "$service" ]; then
            record_result "Service exists: $(basename $service)" "PASS" ""
        else
            record_result "Service exists: $(basename $service)" "FAIL" "Service file missing"
        fi
    done
    
    # Check for database integration
    local db_integration=$(find app/backend/src/services -name "*.ts" -exec grep -l "db\." {} \; 2>/dev/null | wc -l)
    
    if [ "$db_integration" -gt 0 ]; then
        record_result "Database integration in services" "PASS" "Found in $db_integration services"
    else
        record_result "Database integration in services" "FAIL" "No database integration found"
    fi
}

# Validate database schema
validate_database_schema() {
    log_section "Database Schema Validation"
    
    # Check if database migration files exist
    if [ -d "app/backend/drizzle" ]; then
        local migration_count=$(find app/backend/drizzle -name "*.sql" | wc -l)
        if [ "$migration_count" -gt 0 ]; then
            record_result "Database migrations" "PASS" "Found $migration_count migration files"
        else
            record_result "Database migrations" "FAIL" "No migration files found"
        fi
    else
        record_result "Database migrations directory" "FAIL" "Drizzle directory missing"
    fi
    
    # Check for schema file
    if [ -f "app/backend/drizzle/schema.ts" ] || [ -f "app/backend/src/db/schema.ts" ]; then
        record_result "Database schema definition" "PASS" ""
    else
        record_result "Database schema definition" "FAIL" "Schema file missing"
    fi
}

# Run frontend tests
run_frontend_tests() {
    log_section "Frontend Tests"
    
    cd app/frontend
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        log_info "Installing frontend dependencies..."
        npm install
    fi
    
    # Run user experience validation tests
    if npm test -- --testPathPattern=userExperienceValidation --run --passWithNoTests 2>/dev/null; then
        record_result "Frontend user experience tests" "PASS" ""
    else
        record_result "Frontend user experience tests" "FAIL" "Tests failed or not found"
    fi
    
    # Run performance benchmark tests
    if npm test -- --testPathPattern=performanceBenchmarks --run --passWithNoTests 2>/dev/null; then
        record_result "Frontend performance tests" "PASS" ""
    else
        record_result "Frontend performance tests" "FAIL" "Tests failed or not found"
    fi
    
    # Check for TypeScript compilation
    if npx tsc --noEmit 2>/dev/null; then
        record_result "Frontend TypeScript compilation" "PASS" ""
    else
        record_result "Frontend TypeScript compilation" "FAIL" "TypeScript errors found"
    fi
    
    cd ../..
}

# Run backend tests
run_backend_tests() {
    log_section "Backend Tests"
    
    cd app/backend
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        log_info "Installing backend dependencies..."
        npm install
    fi
    
    # Run data consistency validation tests
    if npm test -- --testPathPattern=dataConsistencyValidation --run --passWithNoTests 2>/dev/null; then
        record_result "Backend data consistency tests" "PASS" ""
    else
        record_result "Backend data consistency tests" "FAIL" "Tests failed or not found"
    fi
    
    # Run integration tests
    if npm test -- --testPathPattern=integration --run --passWithNoTests 2>/dev/null; then
        record_result "Backend integration tests" "PASS" ""
    else
        record_result "Backend integration tests" "FAIL" "Tests failed or not found"
    fi
    
    # Check for TypeScript compilation
    if npx tsc --noEmit 2>/dev/null; then
        record_result "Backend TypeScript compilation" "PASS" ""
    else
        record_result "Backend TypeScript compilation" "FAIL" "TypeScript errors found"
    fi
    
    cd ../..
}

# Validate API endpoints
validate_api_endpoints() {
    log_section "API Endpoints Validation"
    
    # Check for route files
    local route_files=(
        "app/backend/src/routes/communityRoutes.ts"
        "app/backend/src/routes/enhancedUserRoutes.ts"
        "app/backend/src/routes/feedRoutes.ts"
        "app/backend/src/routes/marketplaceRoutes.ts"
        "app/backend/src/routes/governanceRoutes.ts"
    )
    
    for route in "${route_files[@]}"; do
        if [ -f "$route" ]; then
            record_result "API route exists: $(basename $route)" "PASS" ""
        else
            record_result "API route exists: $(basename $route)" "FAIL" "Route file missing"
        fi
    done
    
    # Check for controller files
    local controller_count=$(find app/backend/src/controllers -name "*.ts" 2>/dev/null | wc -l)
    
    if [ "$controller_count" -gt 0 ]; then
        record_result "API controllers" "PASS" "Found $controller_count controllers"
    else
        record_result "API controllers" "FAIL" "No controllers found"
    fi
}

# Validate error handling
validate_error_handling() {
    log_section "Error Handling Validation"
    
    # Check for error boundary components
    local error_boundaries=$(find app/frontend/src/components -name "*ErrorBoundary*" 2>/dev/null | wc -l)
    
    if [ "$error_boundaries" -gt 0 ]; then
        record_result "Frontend error boundaries" "PASS" "Found $error_boundaries error boundaries"
    else
        record_result "Frontend error boundaries" "FAIL" "No error boundaries found"
    fi
    
    # Check for error handling in services
    local services_with_error_handling=$(find app/backend/src/services -name "*.ts" -exec grep -l "try.*catch\|throw" {} \; 2>/dev/null | wc -l)
    
    if [ "$services_with_error_handling" -gt 0 ]; then
        record_result "Backend error handling" "PASS" "Found in $services_with_error_handling services"
    else
        record_result "Backend error handling" "FAIL" "No error handling found in services"
    fi
}

# Validate loading states
validate_loading_states() {
    log_section "Loading States Validation"
    
    # Check for loading skeleton components
    local skeleton_components=$(find app/frontend/src/components -name "*Skeleton*" 2>/dev/null | wc -l)
    
    if [ "$skeleton_components" -gt 0 ]; then
        record_result "Loading skeleton components" "PASS" "Found $skeleton_components skeleton components"
    else
        record_result "Loading skeleton components" "FAIL" "No skeleton components found"
    fi
    
    # Check for loading states in key components
    local components_with_loading=$(find app/frontend/src/components -name "*.tsx" -exec grep -l "loading\|isLoading" {} \; 2>/dev/null | wc -l)
    
    if [ "$components_with_loading" -gt 0 ]; then
        record_result "Components with loading states" "PASS" "Found in $components_with_loading components"
    else
        record_result "Components with loading states" "FAIL" "No loading states found"
    fi
}

# Validate performance optimizations
validate_performance_optimizations() {
    log_section "Performance Optimizations Validation"
    
    # Check for React performance optimizations
    local memo_usage=$(find app/frontend/src/components -name "*.tsx" -exec grep -l "React\.memo\|memo(" {} \; 2>/dev/null | wc -l)
    local hook_optimizations=$(find app/frontend/src/components -name "*.tsx" -exec grep -l "useMemo\|useCallback" {} \; 2>/dev/null | wc -l)
    
    if [ "$memo_usage" -gt 0 ]; then
        record_result "React.memo usage" "PASS" "Found in $memo_usage components"
    else
        log_warning "No React.memo usage found"
    fi
    
    if [ "$hook_optimizations" -gt 0 ]; then
        record_result "React hook optimizations" "PASS" "Found in $hook_optimizations components"
    else
        log_warning "No React hook optimizations found"
    fi
    
    # Check for code splitting
    local lazy_imports=$(find app/frontend/src -name "*.tsx" -exec grep -l "lazy(" {} \; 2>/dev/null | wc -l)
    
    if [ "$lazy_imports" -gt 0 ]; then
        record_result "Code splitting (lazy imports)" "PASS" "Found $lazy_imports lazy imports"
    else
        log_warning "No code splitting found"
    fi
}

# Generate final report
generate_final_report() {
    log_section "Migration Validation Report"
    
    local pass_rate=0
    if [ "$TOTAL_TESTS" -gt 0 ]; then
        pass_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    fi
    
    echo -e "\n${BOLD}Migration Validation Summary:${NC}"
    echo -e "Total Tests: $TOTAL_TESTS"
    echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
    echo -e "${RED}Failed: $FAILED_TESTS${NC}"
    echo -e "Pass Rate: $pass_rate%"
    
    echo -e "\n${BOLD}Detailed Results:${NC}"
    echo -e "$VALIDATION_RESULTS"
    
    # Save report to file
    local report_file="migration-validation-report.txt"
    {
        echo "Mock Data Removal Migration Validation Report"
        echo "Generated: $(date)"
        echo "========================================"
        echo ""
        echo "Summary:"
        echo "Total Tests: $TOTAL_TESTS"
        echo "Passed: $PASSED_TESTS"
        echo "Failed: $FAILED_TESTS"
        echo "Pass Rate: $pass_rate%"
        echo ""
        echo "Detailed Results:"
        echo -e "$VALIDATION_RESULTS"
    } > "$report_file"
    
    log_success "Report saved to $report_file"
    
    # Determine overall success
    if [ "$FAILED_TESTS" -eq 0 ]; then
        log_success "🎉 Migration validation completed successfully!"
        echo -e "\n${GREEN}${BOLD}All validations passed! The mock data removal migration is complete.${NC}"
        return 0
    else
        log_error "❌ Migration validation failed"
        echo -e "\n${RED}${BOLD}$FAILED_TESTS validation(s) failed. Please address the issues before proceeding.${NC}"
        return 1
    fi
}

# Main execution
main() {
    echo -e "${BLUE}${BOLD}"
    echo "=================================================="
    echo "    Mock Data Removal Migration Validation"
    echo "=================================================="
    echo -e "${NC}"
    
    log_info "Starting comprehensive migration validation..."
    
    # Run all validations
    check_project_structure || exit 1
    validate_mock_data_removal
    validate_service_implementations
    validate_database_schema
    validate_api_endpoints
    validate_error_handling
    validate_loading_states
    validate_performance_optimizations
    
    # Run tests (these might fail, but we continue to get full picture)
    run_frontend_tests || true
    run_backend_tests || true
    
    # Generate final report and exit with appropriate code
    if generate_final_report; then
        exit 0
    else
        exit 1
    fi
}

# Run main function
main "$@"