#!/bin/bash

# Performance Testing Script for Web3 Marketplace
# This script runs comprehensive performance tests including unit tests, load tests, and benchmarks

set -e

echo "🚀 Starting Web3 Marketplace Performance Tests"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_ENV=${TEST_ENV:-"test"}
LOAD_TEST_DURATION=${LOAD_TEST_DURATION:-"300"}
CONCURRENT_USERS=${CONCURRENT_USERS:-"100"}
API_BASE_URL=${API_BASE_URL:-"http://localhost:3000"}

echo -e "${BLUE}Configuration:${NC}"
echo "  Environment: $TEST_ENV"
echo "  Load Test Duration: ${LOAD_TEST_DURATION}s"
echo "  Concurrent Users: $CONCURRENT_USERS"
echo "  API Base URL: $API_BASE_URL"
echo ""

# Function to check if service is running
check_service() {
    local service_name=$1
    local url=$2
    local max_attempts=30
    local attempt=1

    echo -e "${YELLOW}Checking if $service_name is running...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ $service_name is running${NC}"
            return 0
        fi
        
        echo "  Attempt $attempt/$max_attempts - waiting for $service_name..."
        sleep 2
        ((attempt++))
    done
    
    echo -e "${RED}✗ $service_name is not responding after $max_attempts attempts${NC}"
    return 1
}

# Function to run Jest performance tests
run_unit_performance_tests() {
    echo -e "\n${BLUE}Running Unit Performance Tests${NC}"
    echo "================================"
    
    cd "$(dirname "$0")/.."
    
    # Set test environment variables
    export NODE_ENV=test
    export TEST_DB_HOST=${TEST_DB_HOST:-"localhost"}
    export TEST_DB_PORT=${TEST_DB_PORT:-"5432"}
    export TEST_DB_NAME=${TEST_DB_NAME:-"test_marketplace"}
    export TEST_REDIS_URL=${TEST_REDIS_URL:-"redis://localhost:6379"}
    
    echo "Running Jest performance tests..."
    npm test -- --testPathPattern=performance.test.ts --verbose --detectOpenHandles
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Unit performance tests passed${NC}"
    else
        echo -e "${RED}✗ Unit performance tests failed${NC}"
        return 1
    fi
}

# Function to run Artillery load tests
run_load_tests() {
    echo -e "\n${BLUE}Running Load Tests${NC}"
    echo "=================="
    
    # Check if Artillery is installed
    if ! command -v artillery &> /dev/null; then
        echo -e "${YELLOW}Installing Artillery...${NC}"
        npm install -g artillery
    fi
    
    cd "$(dirname "$0")/../load-tests"
    
    # Run main load test
    echo -e "${YELLOW}Running main load test...${NC}"
    artillery run artillery-config.yml --output main-load-test-report.json
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Main load test completed${NC}"
        
        # Generate HTML report
        artillery report main-load-test-report.json --output main-load-test-report.html
        echo -e "${GREEN}✓ Main load test report generated: main-load-test-report.html${NC}"
    else
        echo -e "${RED}✗ Main load test failed${NC}"
        return 1
    fi
    
    # Run database-specific load test
    echo -e "${YELLOW}Running database load test...${NC}"
    artillery run database-load-test.yml --output database-load-test-report.json
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Database load test completed${NC}"
        artillery report database-load-test-report.json --output database-load-test-report.html
        echo -e "${GREEN}✓ Database load test report generated: database-load-test-report.html${NC}"
    else
        echo -e "${RED}✗ Database load test failed${NC}"
        return 1
    fi
    
    # Run cache-specific load test
    echo -e "${YELLOW}Running cache load test...${NC}"
    artillery run cache-load-test.yml --output cache-load-test-report.json
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Cache load test completed${NC}"
        artillery report cache-load-test-report.json --output cache-load-test-report.html
        echo -e "${GREEN}✓ Cache load test report generated: cache-load-test-report.html${NC}"
    else
        echo -e "${RED}✗ Cache load test failed${NC}"
        return 1
    fi
}

# Function to run custom benchmarks
run_benchmarks() {
    echo -e "\n${BLUE}Running Custom Benchmarks${NC}"
    echo "========================="
    
    cd "$(dirname "$0")/.."
    
    # Database benchmark
    echo -e "${YELLOW}Running database benchmark...${NC}"
    node -e "
    const { performance } = require('perf_hooks');
    const { Pool } = require('pg');
    
    async function benchmarkDatabase() {
        const pool = new Pool({
            host: process.env.TEST_DB_HOST || 'localhost',
            port: process.env.TEST_DB_PORT || 5432,
            database: process.env.TEST_DB_NAME || 'test_marketplace',
            user: process.env.TEST_DB_USER || 'postgres',
            password: process.env.TEST_DB_PASSWORD || '',
            max: 20
        });
        
        const iterations = 1000;
        const start = performance.now();
        
        const promises = Array.from({ length: iterations }, () =>
            pool.query('SELECT 1 as test')
        );
        
        await Promise.all(promises);
        
        const end = performance.now();
        const totalTime = end - start;
        const avgTime = totalTime / iterations;
        
        console.log(\`Database Benchmark Results:\`);
        console.log(\`  Total time: \${totalTime.toFixed(2)}ms\`);
        console.log(\`  Average time per query: \${avgTime.toFixed(2)}ms\`);
        console.log(\`  Queries per second: \${(1000 / avgTime).toFixed(2)}\`);
        
        await pool.end();
    }
    
    benchmarkDatabase().catch(console.error);
    "
    
    # Cache benchmark
    echo -e "${YELLOW}Running cache benchmark...${NC}"
    node -e "
    const { performance } = require('perf_hooks');
    const Redis = require('ioredis');
    
    async function benchmarkCache() {
        const redis = new Redis(process.env.TEST_REDIS_URL || 'redis://localhost:6379');
        
        const iterations = 10000;
        const testData = JSON.stringify({ test: 'data', number: 12345, array: [1, 2, 3] });
        
        // Benchmark SET operations
        const setStart = performance.now();
        const setPromises = Array.from({ length: iterations }, (_, i) =>
            redis.set(\`benchmark:set:\${i}\`, testData)
        );
        await Promise.all(setPromises);
        const setEnd = performance.now();
        
        // Benchmark GET operations
        const getStart = performance.now();
        const getPromises = Array.from({ length: iterations }, (_, i) =>
            redis.get(\`benchmark:set:\${i}\`)
        );
        await Promise.all(getPromises);
        const getEnd = performance.now();
        
        const setTime = setEnd - setStart;
        const getTime = getEnd - getStart;
        
        console.log(\`Cache Benchmark Results:\`);
        console.log(\`  SET operations: \${iterations} in \${setTime.toFixed(2)}ms (\${(iterations / setTime * 1000).toFixed(2)} ops/sec)\`);
        console.log(\`  GET operations: \${iterations} in \${getTime.toFixed(2)}ms (\${(iterations / getTime * 1000).toFixed(2)} ops/sec)\`);
        
        // Cleanup
        await redis.flushdb();
        await redis.quit();
    }
    
    benchmarkCache().catch(console.error);
    "
}

# Function to generate performance report
generate_report() {
    echo -e "\n${BLUE}Generating Performance Report${NC}"
    echo "============================="
    
    local report_dir="$(dirname "$0")/../performance-reports"
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local report_file="$report_dir/performance_report_$timestamp.md"
    
    mkdir -p "$report_dir"
    
    cat > "$report_file" << EOF
# Web3 Marketplace Performance Test Report

**Generated:** $(date)
**Environment:** $TEST_ENV
**Test Duration:** ${LOAD_TEST_DURATION}s
**Concurrent Users:** $CONCURRENT_USERS

## Test Summary

### Unit Performance Tests
- Database optimization tests
- Cache performance tests
- Load balancer tests
- Monitoring system tests

### Load Tests
- Main application load test
- Database-specific load test
- Cache-specific load test

### Benchmarks
- Database query performance
- Cache operation performance

## Results

### Load Test Results
$(if [ -f "$(dirname "$0")/../load-tests/main-load-test-report.json" ]; then
    echo "Main load test completed successfully"
    echo "- Report: main-load-test-report.html"
else
    echo "Main load test failed or not run"
fi)

$(if [ -f "$(dirname "$0")/../load-tests/database-load-test-report.json" ]; then
    echo "Database load test completed successfully"
    echo "- Report: database-load-test-report.html"
else
    echo "Database load test failed or not run"
fi)

$(if [ -f "$(dirname "$0")/../load-tests/cache-load-test-report.json" ]; then
    echo "Cache load test completed successfully"
    echo "- Report: cache-load-test-report.html"
else
    echo "Cache load test failed or not run"
fi)

## Recommendations

Based on the test results, consider the following optimizations:

1. **Database Performance**
   - Monitor slow queries and optimize indexes
   - Adjust connection pool settings based on load
   - Consider read replicas for high-read workloads

2. **Cache Performance**
   - Monitor cache hit rates and adjust TTL values
   - Consider cache warming strategies for critical data
   - Implement cache invalidation strategies

3. **Load Balancing**
   - Monitor server health and response times
   - Adjust auto-scaling thresholds based on traffic patterns
   - Consider geographic load balancing for global users

4. **Monitoring**
   - Set up alerts for performance degradation
   - Monitor key metrics continuously
   - Implement automated performance testing in CI/CD

## Files Generated

- Performance test reports in: $report_dir
- Load test reports in: $(dirname "$0")/../load-tests/
- Benchmark results in console output

EOF

    echo -e "${GREEN}✓ Performance report generated: $report_file${NC}"
}

# Main execution
main() {
    echo -e "${BLUE}Starting performance test suite...${NC}"
    
    # Check if required services are running
    check_service "API Server" "$API_BASE_URL/health" || {
        echo -e "${RED}API server is not running. Please start the server first.${NC}"
        exit 1
    }
    
    # Run tests
    local failed_tests=0
    
    # Run unit performance tests
    if ! run_unit_performance_tests; then
        ((failed_tests++))
    fi
    
    # Run load tests
    if ! run_load_tests; then
        ((failed_tests++))
    fi
    
    # Run benchmarks
    run_benchmarks
    
    # Generate report
    generate_report
    
    # Summary
    echo -e "\n${BLUE}Performance Test Summary${NC}"
    echo "======================="
    
    if [ $failed_tests -eq 0 ]; then
        echo -e "${GREEN}✓ All performance tests completed successfully${NC}"
        echo -e "${GREEN}✓ Performance reports generated${NC}"
        exit 0
    else
        echo -e "${RED}✗ $failed_tests test suite(s) failed${NC}"
        echo -e "${YELLOW}⚠ Check the logs above for details${NC}"
        exit 1
    fi
}

# Handle script arguments
case "${1:-}" in
    "unit")
        run_unit_performance_tests
        ;;
    "load")
        run_load_tests
        ;;
    "benchmark")
        run_benchmarks
        ;;
    "report")
        generate_report
        ;;
    *)
        main
        ;;
esac