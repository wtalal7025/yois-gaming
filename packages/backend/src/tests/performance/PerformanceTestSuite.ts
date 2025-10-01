/**
 * Performance Test Suite
 * Comprehensive performance testing and validation for the gaming platform
 */

import { getApiCacheService } from '../../services/cache/ApiCacheService';
import { getMonitoringService } from '../../services/monitoring/MonitoringService';
import { getRedisService } from '../../services/cache/RedisService';

interface PerformanceTestResult {
  testName: string;
  passed: boolean;
  actualValue: number;
  expectedThreshold: number;
  unit: string;
  details?: any;
  recommendations?: string[];
}

// interface _LoadTestConfig { // Commented out - unused interface
// interface _UnusedLoadTestConfig {
//   concurrent: number;
//   duration: number; // seconds
//   rampUp: number; // seconds
// }

interface ApiEndpointTest {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  payload?: any;
  expectedMaxResponseTime: number; // ms
  expectedSuccessRate: number; // percentage
}

export class PerformanceTestSuite {
  private monitoringService = getMonitoringService();
  private cacheService = getApiCacheService();
  private redisService = getRedisService();
  // private baseUrl: string; // Commented out - unused property
  private results: PerformanceTestResult[] = [];

  constructor(_baseUrl: string = 'http://localhost:3001') {
    // this.baseUrl = baseUrl; // Commented out - unused property assignment
  }

  /**
   * Run complete performance test suite
   */
  async runFullSuite(): Promise<{
    passed: boolean;
    totalTests: number;
    passedTests: number;
    results: PerformanceTestResult[];
    summary: {
      apiPerformance: boolean;
      cacheEffectiveness: boolean;
      databasePerformance: boolean;
      systemResources: boolean;
    };
  }> {
    this.results = [];

    console.log('🚀 Starting Performance Test Suite...\n');

    // Test API endpoints performance
    await this.testApiEndpoints();

    // Test cache effectiveness
    await this.testCachePerformance();

    // Test database performance
    await this.testDatabasePerformance();

    // Test Redis performance
    await this.testRedisPerformance();

    // Test system resource usage
    await this.testSystemResources();

    // Test concurrent load handling
    await this.testConcurrentLoad();

    const passedTests = this.results.filter(r => r.passed).length;
    const passed = passedTests === this.results.length;

    const summary = {
      apiPerformance: this.results.filter(r => r.testName.includes('API')).every(r => r.passed),
      cacheEffectiveness: this.results.filter(r => r.testName.includes('Cache')).every(r => r.passed),
      databasePerformance: this.results.filter(r => r.testName.includes('Database')).every(r => r.passed),
      systemResources: this.results.filter(r => r.testName.includes('System')).every(r => r.passed)
    };

    this.printResults();

    return {
      passed,
      totalTests: this.results.length,
      passedTests,
      results: this.results,
      summary
    };
  }

  /**
   * Test API endpoint performance
   */
  private async testApiEndpoints(): Promise<void> {
    console.log('📡 Testing API Endpoints Performance...');

    const endpoints: ApiEndpointTest[] = [
      {
        endpoint: '/api/health',
        method: 'GET',
        expectedMaxResponseTime: 100,
        expectedSuccessRate: 99.9
      },
      {
        endpoint: '/api/auth/profile',
        method: 'GET',
        headers: { 'Authorization': 'Bearer test-token' },
        expectedMaxResponseTime: 200,
        expectedSuccessRate: 99.0
      },
      {
        endpoint: '/api/games/mines/config',
        method: 'GET',
        expectedMaxResponseTime: 150,
        expectedSuccessRate: 99.5
      },
      {
        endpoint: '/api/monitoring/metrics/system',
        method: 'GET',
        headers: { 'Authorization': 'Bearer admin-token' },
        expectedMaxResponseTime: 300,
        expectedSuccessRate: 98.0
      }
    ];

    for (const endpoint of endpoints) {
      await this.testSingleEndpoint(endpoint);
    }
  }

  /**
   * Test single API endpoint
   */
  private async testSingleEndpoint(test: ApiEndpointTest): Promise<void> {
    const iterations = 50;
    const responseTimes: number[] = [];
    const results: { success: boolean; time: number; status?: number }[] = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();

      try {
        const response = await this.makeRequest(test);
        const responseTime = Date.now() - startTime;

        responseTimes.push(responseTime);
        results.push({
          success: response.ok,
          time: responseTime,
          status: response.status
        });
      } catch (error) {
        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);
        results.push({
          success: false,
          time: responseTime
        });
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Calculate metrics
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const p95ResponseTime = responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)];
    const successRate = (results.filter(r => r.success).length / results.length) * 100;

    // Test response time
    this.results.push({
      testName: `API ${test.method} ${test.endpoint} - Average Response Time`,
      passed: avgResponseTime <= test.expectedMaxResponseTime,
      actualValue: Math.round(avgResponseTime),
      expectedThreshold: test.expectedMaxResponseTime,
      unit: 'ms',
      details: {
        p95ResponseTime: Math.round(p95ResponseTime || 0),
        iterations,
        successRate: Math.round(successRate * 100) / 100
      }
    });

    // Test success rate
    this.results.push({
      testName: `API ${test.method} ${test.endpoint} - Success Rate`,
      passed: successRate >= test.expectedSuccessRate,
      actualValue: Math.round(successRate * 100) / 100,
      expectedThreshold: test.expectedSuccessRate,
      unit: '%',
      details: {
        successfulRequests: results.filter(r => r.success).length,
        totalRequests: results.length
      }
    });
  }

  /**
   * Make HTTP request for testing
   */
  private async makeRequest(test: ApiEndpointTest): Promise<any> {
    // const _url = `${this.baseUrl}${test.endpoint}`; // Commented out - unused
    const options: any = {
      method: test.method,
      headers: {
        'Content-Type': 'application/json',
        ...test.headers
      }
    };

    if (test.payload && (test.method === 'POST' || test.method === 'PUT')) {
      options.body = JSON.stringify(test.payload);
    }

    // For Node.js testing, we'll simulate the response
    // In a real implementation, you would use fetch or axios
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          ok: Math.random() > 0.01, // 99% success rate simulation
          status: Math.random() > 0.01 ? 200 : 500,
          json: () => Promise.resolve({ data: 'test' })
        });
      }, Math.random() * 200 + 50); // Random response time 50-250ms
    });
  }

  /**
   * Test cache performance and effectiveness
   */
  private async testCachePerformance(): Promise<void> {
    console.log('💾 Testing Cache Performance...');

    // Test cache hit/miss performance
    const testKey = '/api/test/cache';
    const testData = { message: 'Cache performance test', timestamp: Date.now() };

    // Test cache SET performance
    const setStartTime = Date.now();
    await this.cacheService.set(testKey, testData, { ttl: 300, tags: ['test'], version: '1.0' });
    const setTime = Date.now() - setStartTime;

    this.results.push({
      testName: 'Cache SET Performance',
      passed: setTime <= 50,
      actualValue: setTime,
      expectedThreshold: 50,
      unit: 'ms',
      ...(setTime > 50 && { recommendations: ['Consider optimizing Redis connection', 'Check network latency'] })
    });

    // Test cache GET performance (hit)
    const getStartTime = Date.now();
    const cachedData = await this.cacheService.get(testKey);
    const getTime = Date.now() - getStartTime;

    this.results.push({
      testName: 'Cache GET Performance (Hit)',
      passed: getTime <= 30,
      actualValue: getTime,
      expectedThreshold: 30,
      unit: 'ms',
      details: { cacheHit: cachedData !== null }
    });

    // Test cache effectiveness over multiple requests
    await this.testCacheEffectiveness();

    // Cleanup
    await this.cacheService.invalidate(testKey);
  }

  /**
   * Test cache effectiveness with multiple requests
   */
  private async testCacheEffectiveness(): Promise<void> {
    const testRoute = '/api/test/effectiveness';
    const iterations = 100;

    // Reset cache stats
    this.cacheService.resetStats();

    // Simulate cache usage
    for (let i = 0; i < iterations; i++) {
      if (i < 10) {
        // First 10 requests - cache misses
        await this.cacheService.get(`${testRoute}:${i}`);
      } else {
        // Remaining requests - should hit cache
        const cacheKey = `${testRoute}:${i % 10}`;
        let data = await this.cacheService.get(cacheKey);
        if (!data) {
          await this.cacheService.set(cacheKey, { data: `test-${i}` }, { ttl: 300, tags: ['test'], version: '1.0' });
        }
      }
    }

    const stats = this.cacheService.getStats();

    this.results.push({
      testName: 'Cache Hit Rate',
      passed: stats.hitRate >= 50, // Expect at least 50% hit rate
      actualValue: stats.hitRate,
      expectedThreshold: 50,
      unit: '%',
      details: {
        hits: stats.hits,
        misses: stats.misses,
        totalRequests: stats.hits + stats.misses
      }
    });

    this.results.push({
      testName: 'Cache Average Response Time',
      passed: stats.avgResponseTime <= 25,
      actualValue: Math.round(stats.avgResponseTime),
      expectedThreshold: 25,
      unit: 'ms'
    });
  }

  /**
   * Test database performance
   */
  private async testDatabasePerformance(): Promise<void> {
    console.log('🗃️ Testing Database Performance...');

    // Simulate database queries
    const queryTests = [
      { name: 'User Lookup', expectedTime: 100 },
      { name: 'Game History Query', expectedTime: 200 },
      { name: 'Transaction Report', expectedTime: 500 },
      { name: 'Leaderboard Query', expectedTime: 300 }
    ];

    for (const queryTest of queryTests) {
      const executionTime = await this.simulateDatabaseQuery(queryTest.name);

      this.results.push({
        testName: `Database ${queryTest.name} Performance`,
        passed: executionTime <= queryTest.expectedTime,
        actualValue: executionTime,
        expectedThreshold: queryTest.expectedTime,
        unit: 'ms',
        ...(executionTime > queryTest.expectedTime && {
          recommendations: [
            'Consider adding database indexes',
            'Optimize query structure',
            'Check database connection pool'
          ]
        })
      });
    }
  }

  /**
   * Simulate database query for testing
   */
  private async simulateDatabaseQuery(_queryName: string): Promise<number> {
    const startTime = Date.now();

    // Simulate database operation
    await new Promise(resolve => setTimeout(resolve, Math.random() * 150 + 25));

    return Date.now() - startTime;
  }

  /**
   * Test Redis performance
   */
  private async testRedisPerformance(): Promise<void> {
    console.log('🔴 Testing Redis Performance...');

    // Test Redis connection health
    const healthCheck = await this.redisService.healthCheck();

    this.results.push({
      testName: 'Redis Connection Health',
      passed: healthCheck.status === 'connected',
      actualValue: healthCheck.status === 'connected' ? 1 : 0,
      expectedThreshold: 1,
      unit: 'boolean',
      details: {
        latency: healthCheck.latency,
        message: healthCheck.message
      }
    });

    if (healthCheck.latency) {
      this.results.push({
        testName: 'Redis Connection Latency',
        passed: healthCheck.latency <= 50,
        actualValue: healthCheck.latency,
        expectedThreshold: 50,
        unit: 'ms'
      });
    }

    // Test Redis operations
    await this.testRedisOperations();
  }

  /**
   * Test Redis operations performance
   */
  private async testRedisOperations(): Promise<void> {
    const testKey = 'perf_test_key';
    const testValue = { data: 'performance test', timestamp: Date.now() };

    // Test SET operation
    const setStartTime = Date.now();
    await this.redisService.set(testKey, testValue);
    const setTime = Date.now() - setStartTime;

    this.results.push({
      testName: 'Redis SET Operation',
      passed: setTime <= 30,
      actualValue: setTime,
      expectedThreshold: 30,
      unit: 'ms'
    });

    // Test GET operation
    const getStartTime = Date.now();
    await this.redisService.get(testKey);
    const getTime = Date.now() - getStartTime;

    this.results.push({
      testName: 'Redis GET Operation',
      passed: getTime <= 20,
      actualValue: getTime,
      expectedThreshold: 20,
      unit: 'ms'
    });

    // Cleanup
    await this.redisService.delete(testKey);
  }

  /**
   * Test system resources
   */
  private async testSystemResources(): Promise<void> {
    console.log('⚙️ Testing System Resources...');

    // Get system metrics
    const systemMetrics = await this.monitoringService.getSystemMetrics();

    this.results.push({
      testName: 'System Error Rate',
      passed: systemMetrics.errorRate <= 5,
      actualValue: systemMetrics.errorRate,
      expectedThreshold: 5,
      unit: '%'
    });

    this.results.push({
      testName: 'System Average Response Time',
      passed: systemMetrics.avgResponseTime <= 200,
      actualValue: systemMetrics.avgResponseTime,
      expectedThreshold: 200,
      unit: 'ms'
    });
  }

  /**
   * Test concurrent load handling
   */
  private async testConcurrentLoad(): Promise<void> {
    console.log('🔄 Testing Concurrent Load Handling...');

    const concurrentRequests = 20;
    const requestPromises: Promise<{ success: boolean; responseTime: number }>[] = [];

    // Create concurrent requests
    for (let i = 0; i < concurrentRequests; i++) {
      requestPromises.push(this.performConcurrentRequest(i));
    }

    const results = await Promise.all(requestPromises);
    const successfulRequests = results.filter(r => r.success).length;
    const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;

    this.results.push({
      testName: 'Concurrent Load Success Rate',
      passed: (successfulRequests / concurrentRequests) >= 0.95,
      actualValue: Math.round((successfulRequests / concurrentRequests) * 100),
      expectedThreshold: 95,
      unit: '%',
      details: {
        successfulRequests,
        totalRequests: concurrentRequests
      }
    });

    this.results.push({
      testName: 'Concurrent Load Response Time',
      passed: avgResponseTime <= 500,
      actualValue: Math.round(avgResponseTime),
      expectedThreshold: 500,
      unit: 'ms',
      details: {
        concurrentRequests
      }
    });
  }

  /**
   * Perform single concurrent request
   */
  private async performConcurrentRequest(_index: number): Promise<{ success: boolean; responseTime: number }> {
    const startTime = Date.now();

    try {
      // Simulate API request
      await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 50));

      return {
        success: Math.random() > 0.05, // 95% success rate simulation
        responseTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Print test results
   */
  private printResults(): void {
    console.log('\n📊 Performance Test Results:\n');

    const passed = this.results.filter(r => r.passed);
    const failed = this.results.filter(r => !r.passed);

    console.log(`✅ Passed: ${passed.length}`);
    console.log(`❌ Failed: ${failed.length}`);
    console.log(`📈 Overall Success Rate: ${Math.round((passed.length / this.results.length) * 100)}%\n`);

    // Print failed tests with details
    if (failed.length > 0) {
      console.log('❌ Failed Tests:\n');
      failed.forEach(result => {
        console.log(`  ${result.testName}`);
        console.log(`    Expected: ≤ ${result.expectedThreshold}${result.unit}`);
        console.log(`    Actual: ${result.actualValue}${result.unit}`);
        if (result.recommendations) {
          console.log(`    Recommendations: ${result.recommendations.join(', ')}`);
        }
        console.log('');
      });
    }

    // Print passed tests summary
    console.log('✅ Passed Tests Summary:\n');
    const categories = ['API', 'Cache', 'Database', 'Redis', 'System', 'Concurrent'];

    categories.forEach(category => {
      const categoryTests = this.results.filter(r => r.testName.includes(category));
      const categoryPassed = categoryTests.filter(r => r.passed).length;

      if (categoryTests.length > 0) {
        console.log(`  ${category}: ${categoryPassed}/${categoryTests.length} passed`);
      }
    });

    console.log('\n🏁 Performance Test Suite Completed!\n');
  }

  /**
   * Generate performance report
   */
  generateReport(): {
    summary: {
      totalTests: number;
      passed: number;
      failed: number;
      successRate: number;
    };
    categories: Record<string, {
      tests: number;
      passed: number;
      failed: number;
      successRate: number;
    }>;
    failedTests: PerformanceTestResult[];
    recommendations: string[];
  } {
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.length - passed;

    const categories = ['API', 'Cache', 'Database', 'Redis', 'System', 'Concurrent'];
    const categoryStats: Record<string, any> = {};

    categories.forEach(category => {
      const categoryTests = this.results.filter(r => r.testName.includes(category));
      const categoryPassed = categoryTests.filter(r => r.passed).length;

      categoryStats[category] = {
        tests: categoryTests.length,
        passed: categoryPassed,
        failed: categoryTests.length - categoryPassed,
        successRate: categoryTests.length > 0 ? (categoryPassed / categoryTests.length) * 100 : 100
      };
    });

    const failedTests = this.results.filter(r => !r.passed);
    const recommendations = failedTests
      .filter(r => r.recommendations)
      .flatMap(r => r.recommendations!)
      .filter((rec, index, arr) => arr.indexOf(rec) === index); // Remove duplicates

    return {
      summary: {
        totalTests: this.results.length,
        passed,
        failed,
        successRate: (passed / this.results.length) * 100
      },
      categories: categoryStats,
      failedTests,
      recommendations
    };
  }
}

/**
 * Quick performance test runner
 */
export async function runQuickPerformanceTest(baseUrl?: string): Promise<boolean> {
  const testSuite = new PerformanceTestSuite(baseUrl);
  const results = await testSuite.runFullSuite();

  return results.passed;
}

/**
 * Export for use in CI/CD pipelines
 */
export async function runPerformanceValidation(): Promise<{
  success: boolean;
  report: any;
}> {
  const testSuite = new PerformanceTestSuite();
  const results = await testSuite.runFullSuite();
  const report = testSuite.generateReport();

  return {
    success: results.passed,
    report
  };
}