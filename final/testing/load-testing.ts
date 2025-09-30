/**
 * Production load testing validation
 * Validates system performance under realistic load conditions
 */

// Types for load testing
interface LoadTestConfig {
  baseUrl: string;
  duration: number; // Test duration in milliseconds
  maxConcurrentUsers: number;
  rampUpTime: number; // Time to reach max users
  rampDownTime: number; // Time to ramp down
  thinkTime: number; // Delay between user actions
  endpoints: LoadTestEndpoint[];
  scenarios: LoadTestScenario[];
}

interface LoadTestEndpoint {
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
  body?: any;
  weight: number; // Probability weight (0-1)
  timeout: number;
  expectedStatus: number[];
}

interface LoadTestScenario {
  name: string;
  description: string;
  weight: number;
  steps: LoadTestStep[];
}

interface LoadTestStep {
  name: string;
  endpoint: string;
  delay?: number;
  data?: any;
  validation?: (response: Response) => boolean;
}

interface LoadTestMetrics {
  startTime: number;
  endTime: number;
  duration: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  requestsPerSecond: number;
  concurrentUsers: number;
  errorRate: number;
  throughput: number;
  percentiles: {
    p50: number;
    p95: number;
    p99: number;
  };
}

interface LoadTestResult {
  config: LoadTestConfig;
  metrics: LoadTestMetrics;
  endpointMetrics: Map<string, LoadTestMetrics>;
  errors: LoadTestError[];
  warnings: string[];
  recommendations: string[];
}

interface LoadTestError {
  timestamp: number;
  endpoint: string;
  error: string;
  responseTime: number;
  statusCode?: number;
}

interface VirtualUser {
  id: string;
  scenario: LoadTestScenario;
  currentStep: number;
  startTime: number;
  requestCount: number;
  active: boolean;
}

/**
 * HTTP client for load testing
 */
class LoadTestClient {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl: string, timeout: number = 10000) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  public async request(endpoint: LoadTestEndpoint, data?: any): Promise<{
    success: boolean;
    responseTime: number;
    statusCode: number;
    error?: string;
    response?: Response;
  }> {
    const startTime = performance.now();
    
    try {
      const url = `${this.baseUrl}${endpoint.url}`;
      const requestInit: RequestInit = {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
          ...endpoint.headers
        },
        signal: AbortSignal.timeout(endpoint.timeout || this.timeout)
      };

      if (endpoint.body || data) {
        requestInit.body = JSON.stringify(endpoint.body || data);
      }

      const response = await fetch(url, requestInit);
      const responseTime = performance.now() - startTime;
      
      const success = endpoint.expectedStatus.includes(response.status);

      return {
        success,
        responseTime,
        statusCode: response.status,
        response: success ? response : undefined
      };

    } catch (error) {
      const responseTime = performance.now() - startTime;
      
      return {
        success: false,
        responseTime,
        statusCode: 0,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}

/**
 * Virtual user simulator
 */
class VirtualUserSimulator {
  private user: VirtualUser;
  private client: LoadTestClient;
  private endpoints: Map<string, LoadTestEndpoint>;
  private thinkTime: number;
  private active: boolean = true;
  private results: Array<{
    endpoint: string;
    success: boolean;
    responseTime: number;
    statusCode: number;
    error?: string;
    timestamp: number;
  }> = [];

  constructor(
    user: VirtualUser,
    client: LoadTestClient,
    endpoints: Map<string, LoadTestEndpoint>,
    thinkTime: number
  ) {
    this.user = user;
    this.client = client;
    this.endpoints = endpoints;
    this.thinkTime = thinkTime;
  }

  public async run(): Promise<void> {
    while (this.active && this.user.active) {
      const step = this.user.scenario.steps[this.user.currentStep];
      if (!step) break;

      const endpoint = this.endpoints.get(step.endpoint);
      if (!endpoint) {
        console.warn(`Endpoint ${step.endpoint} not found`);
        break;
      }

      try {
        // Execute step
        const result = await this.client.request(endpoint, step.data);
        
        // Record result
        this.results.push({
          endpoint: step.endpoint,
          success: result.success,
          responseTime: result.responseTime,
          statusCode: result.statusCode,
          error: result.error,
          timestamp: Date.now()
        });

        // Validate response if validation function provided
        if (step.validation && result.response) {
          try {
            const isValid = step.validation(result.response);
            if (!isValid) {
              this.results[this.results.length - 1].success = false;
              this.results[this.results.length - 1].error = 'Validation failed';
            }
          } catch (validationError) {
            this.results[this.results.length - 1].success = false;
            this.results[this.results.length - 1].error = 'Validation error';
          }
        }

        // Think time between requests
        const stepDelay = step.delay || this.thinkTime;
        if (stepDelay > 0) {
          await this.sleep(stepDelay);
        }

        // Move to next step
        this.user.currentStep++;
        if (this.user.currentStep >= this.user.scenario.steps.length) {
          this.user.currentStep = 0; // Loop scenario
        }

        this.user.requestCount++;

      } catch (error) {
        console.error(`User ${this.user.id} step failed:`, error);
        this.results.push({
          endpoint: step.endpoint,
          success: false,
          responseTime: 0,
          statusCode: 0,
          error: error instanceof Error ? error.message : String(error),
          timestamp: Date.now()
        });
        break;
      }
    }
  }

  public stop(): void {
    this.active = false;
    this.user.active = false;
  }

  public getResults(): typeof this.results {
    return [...this.results];
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Load test metrics calculator
 */
class MetricsCalculator {
  public calculateMetrics(
    results: Array<{ success: boolean; responseTime: number; timestamp: number; endpoint: string }>,
    startTime: number,
    endTime: number,
    concurrentUsers: number
  ): LoadTestMetrics {
    if (results.length === 0) {
      return {
        startTime,
        endTime,
        duration: endTime - startTime,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        minResponseTime: 0,
        maxResponseTime: 0,
        requestsPerSecond: 0,
        concurrentUsers,
        errorRate: 0,
        throughput: 0,
        percentiles: { p50: 0, p95: 0, p99: 0 }
      };
    }

    const totalRequests = results.length;
    const successfulRequests = results.filter(r => r.success).length;
    const failedRequests = totalRequests - successfulRequests;
    const duration = endTime - startTime;
    
    const responseTimes = results.map(r => r.responseTime);
    const averageResponseTime = responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length;
    const minResponseTime = Math.min(...responseTimes);
    const maxResponseTime = Math.max(...responseTimes);
    
    const requestsPerSecond = (totalRequests / duration) * 1000;
    const errorRate = (failedRequests / totalRequests) * 100;
    
    // Calculate throughput (successful requests per second)
    const throughput = (successfulRequests / duration) * 1000;
    
    // Calculate percentiles
    const sortedTimes = responseTimes.sort((a, b) => a - b);
    const percentiles = {
      p50: this.calculatePercentile(sortedTimes, 50),
      p95: this.calculatePercentile(sortedTimes, 95),
      p99: this.calculatePercentile(sortedTimes, 99)
    };

    return {
      startTime,
      endTime,
      duration,
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime,
      minResponseTime,
      maxResponseTime,
      requestsPerSecond,
      concurrentUsers,
      errorRate,
      throughput,
      percentiles
    };
  }

  private calculatePercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    
    const index = (percentile / 100) * (sortedArray.length - 1);
    
    if (index % 1 === 0) {
      return sortedArray[index];
    }
    
    const lower = sortedArray[Math.floor(index)];
    const upper = sortedArray[Math.ceil(index)];
    const weight = index % 1;
    
    return lower + (upper - lower) * weight;
  }

  public calculateEndpointMetrics(
    results: Array<{ success: boolean; responseTime: number; timestamp: number; endpoint: string }>,
    startTime: number,
    endTime: number
  ): Map<string, LoadTestMetrics> {
    const endpointMetrics = new Map<string, LoadTestMetrics>();
    
    // Group results by endpoint
    const resultsByEndpoint = new Map<string, typeof results>();
    results.forEach(result => {
      if (!resultsByEndpoint.has(result.endpoint)) {
        resultsByEndpoint.set(result.endpoint, []);
      }
      resultsByEndpoint.get(result.endpoint)!.push(result);
    });

    // Calculate metrics for each endpoint
    resultsByEndpoint.forEach((endpointResults, endpoint) => {
      const metrics = this.calculateMetrics(endpointResults, startTime, endTime, 0);
      endpointMetrics.set(endpoint, metrics);
    });

    return endpointMetrics;
  }
}

/**
 * Main load test runner
 */
export class LoadTestRunner {
  private config: LoadTestConfig;
  private client: LoadTestClient;
  private metricsCalculator: MetricsCalculator;
  private virtualUsers: VirtualUser[] = [];
  private simulators: VirtualUserSimulator[] = [];
  private results: Array<{
    endpoint: string;
    success: boolean;
    responseTime: number;
    statusCode: number;
    error?: string;
    timestamp: number;
  }> = [];
  private errors: LoadTestError[] = [];
  private running: boolean = false;

  constructor(config: LoadTestConfig) {
    this.config = config;
    this.client = new LoadTestClient(config.baseUrl);
    this.metricsCalculator = new MetricsCalculator();
  }

  public async runLoadTest(): Promise<LoadTestResult> {
    if (this.running) {
      throw new Error('Load test is already running');
    }

    this.running = true;
    const startTime = Date.now();
    
    try {
      console.log(`Starting load test with ${this.config.maxConcurrentUsers} users for ${this.config.duration}ms`);
      
      // Prepare endpoints map
      const endpointsMap = new Map<string, LoadTestEndpoint>();
      this.config.endpoints.forEach(endpoint => {
        endpointsMap.set(endpoint.name, endpoint);
      });

      // Create and start virtual users
      await this.createVirtualUsers(endpointsMap);
      
      // Run test for specified duration
      await this.runTestDuration();
      
      // Stop all users
      this.stopAllUsers();
      
      // Collect results
      await this.collectResults();
      
      const endTime = Date.now();
      
      // Calculate metrics
      const overallMetrics = this.metricsCalculator.calculateMetrics(
        this.results,
        startTime,
        endTime,
        this.config.maxConcurrentUsers
      );
      
      const endpointMetrics = this.metricsCalculator.calculateEndpointMetrics(
        this.results,
        startTime,
        endTime
      );

      // Generate recommendations
      const recommendations = this.generateRecommendations(overallMetrics, endpointMetrics);
      const warnings = this.generateWarnings(overallMetrics);

      return {
        config: this.config,
        metrics: overallMetrics,
        endpointMetrics,
        errors: this.errors,
        warnings,
        recommendations
      };

    } finally {
      this.running = false;
      this.cleanup();
    }
  }

  private async createVirtualUsers(endpointsMap: Map<string, LoadTestEndpoint>): Promise<void> {
    const usersToCreate = this.config.maxConcurrentUsers;
    const rampUpDelay = this.config.rampUpTime / usersToCreate;

    for (let i = 0; i < usersToCreate; i++) {
      // Select scenario based on weight
      const scenario = this.selectScenario();
      
      const user: VirtualUser = {
        id: `user-${i}`,
        scenario,
        currentStep: 0,
        startTime: Date.now(),
        requestCount: 0,
        active: true
      };

      this.virtualUsers.push(user);
      
      const simulator = new VirtualUserSimulator(
        user,
        this.client,
        endpointsMap,
        this.config.thinkTime
      );
      
      this.simulators.push(simulator);
      
      // Start user with ramp-up delay
      setTimeout(() => {
        simulator.run().catch(error => {
          console.error(`User ${user.id} failed:`, error);
        });
      }, i * rampUpDelay);
    }
  }

  private selectScenario(): LoadTestScenario {
    const random = Math.random();
    let weightSum = 0;
    
    for (const scenario of this.config.scenarios) {
      weightSum += scenario.weight;
      if (random <= weightSum) {
        return scenario;
      }
    }
    
    // Fallback to first scenario
    return this.config.scenarios[0];
  }

  private async runTestDuration(): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, this.config.duration);
    });
  }

  private stopAllUsers(): void {
    this.simulators.forEach(simulator => simulator.stop());
    this.virtualUsers.forEach(user => user.active = false);
  }

  private async collectResults(): Promise<void> {
    // Wait for all simulators to finish
    await new Promise(resolve => setTimeout(resolve, 1000));

    this.results = [];
    this.errors = [];

    this.simulators.forEach(simulator => {
      const userResults = simulator.getResults();
      this.results.push(...userResults);
      
      // Convert failed results to errors
      userResults.forEach(result => {
        if (!result.success) {
          this.errors.push({
            timestamp: result.timestamp,
            endpoint: result.endpoint,
            error: result.error || 'Unknown error',
            responseTime: result.responseTime,
            statusCode: result.statusCode
          });
        }
      });
    });
  }

  private generateRecommendations(
    overallMetrics: LoadTestMetrics,
    endpointMetrics: Map<string, LoadTestMetrics>
  ): string[] {
    const recommendations: string[] = [];

    // Error rate recommendations
    if (overallMetrics.errorRate > 5) {
      recommendations.push('High error rate detected. Review server logs and increase server capacity.');
    } else if (overallMetrics.errorRate > 1) {
      recommendations.push('Moderate error rate detected. Monitor server health and consider optimization.');
    }

    // Response time recommendations
    if (overallMetrics.averageResponseTime > 2000) {
      recommendations.push('High average response time. Consider performance optimization and caching.');
    } else if (overallMetrics.averageResponseTime > 1000) {
      recommendations.push('Moderate response times. Monitor for performance bottlenecks.');
    }

    // Throughput recommendations
    const expectedThroughput = this.config.maxConcurrentUsers * 0.5; // Conservative estimate
    if (overallMetrics.throughput < expectedThroughput) {
      recommendations.push('Low throughput detected. Consider scaling server resources.');
    }

    // P95/P99 recommendations
    if (overallMetrics.percentiles.p95 > 5000) {
      recommendations.push('High P95 response time indicates performance issues for some requests.');
    }

    // Endpoint-specific recommendations
    endpointMetrics.forEach((metrics, endpoint) => {
      if (metrics.errorRate > 10) {
        recommendations.push(`Endpoint ${endpoint} has high error rate (${metrics.errorRate.toFixed(1)}%).`);
      }
      if (metrics.averageResponseTime > 3000) {
        recommendations.push(`Endpoint ${endpoint} has high response time (${metrics.averageResponseTime.toFixed(0)}ms).`);
      }
    });

    return recommendations;
  }

  private generateWarnings(metrics: LoadTestMetrics): string[] {
    const warnings: string[] = [];

    if (metrics.errorRate > 0.1) {
      warnings.push(`Error rate: ${metrics.errorRate.toFixed(2)}%`);
    }

    if (metrics.percentiles.p99 > metrics.averageResponseTime * 3) {
      warnings.push('High variance in response times detected');
    }

    if (metrics.requestsPerSecond < 10) {
      warnings.push('Low request rate - consider checking test configuration');
    }

    return warnings;
  }

  private cleanup(): void {
    this.virtualUsers = [];
    this.simulators = [];
    this.results = [];
    this.errors = [];
  }

  public isRunning(): boolean {
    return this.running;
  }

  public getProgress(): {
    activeUsers: number;
    totalRequests: number;
    elapsedTime: number;
  } {
    return {
      activeUsers: this.virtualUsers.filter(u => u.active).length,
      totalRequests: this.results.length,
      elapsedTime: this.running ? Date.now() - (this.virtualUsers[0]?.startTime || 0) : 0
    };
  }
}

/**
 * Predefined load test configurations for the gaming platform
 */
export class GamingPlatformLoadTests {
  public static createBasicConfig(baseUrl: string): LoadTestConfig {
    return {
      baseUrl,
      duration: 60000, // 1 minute
      maxConcurrentUsers: 10,
      rampUpTime: 10000, // 10 seconds
      rampDownTime: 5000, // 5 seconds
      thinkTime: 1000, // 1 second between requests
      endpoints: [
        {
          name: 'api-health',
          method: 'GET',
          url: '/api/health',
          weight: 0.1,
          timeout: 5000,
          expectedStatus: [200]
        },
        {
          name: 'games-list',
          method: 'GET',
          url: '/api/games',
          weight: 0.3,
          timeout: 5000,
          expectedStatus: [200]
        },
        {
          name: 'user-profile',
          method: 'GET',
          url: '/api/auth/me',
          headers: { 'Authorization': 'Bearer test-token' },
          weight: 0.2,
          timeout: 5000,
          expectedStatus: [200, 401]
        },
        {
          name: 'wallet-balance',
          method: 'GET',
          url: '/api/wallet/balance',
          headers: { 'Authorization': 'Bearer test-token' },
          weight: 0.4,
          timeout: 5000,
          expectedStatus: [200, 401]
        }
      ],
      scenarios: [
        {
          name: 'browse-games',
          description: 'User browses games without authentication',
          weight: 0.6,
          steps: [
            { name: 'health-check', endpoint: 'api-health' },
            { name: 'get-games', endpoint: 'games-list', delay: 2000 }
          ]
        },
        {
          name: 'authenticated-user',
          description: 'Authenticated user checks profile and balance',
          weight: 0.4,
          steps: [
            { name: 'check-profile', endpoint: 'user-profile' },
            { name: 'check-balance', endpoint: 'wallet-balance', delay: 1500 }
          ]
        }
      ]
    };
  }

  public static createStressConfig(baseUrl: string): LoadTestConfig {
    const basicConfig = this.createBasicConfig(baseUrl);
    
    return {
      ...basicConfig,
      duration: 300000, // 5 minutes
      maxConcurrentUsers: 100,
      rampUpTime: 60000, // 1 minute
      rampDownTime: 30000, // 30 seconds
      thinkTime: 500 // 0.5 seconds between requests
    };
  }

  public static createSpikeConfig(baseUrl: string): LoadTestConfig {
    const basicConfig = this.createBasicConfig(baseUrl);
    
    return {
      ...basicConfig,
      duration: 120000, // 2 minutes
      maxConcurrentUsers: 200,
      rampUpTime: 5000, // 5 seconds - quick spike
      rampDownTime: 5000, // 5 seconds
      thinkTime: 100 // Very fast requests
    };
  }
}

// Development helper
if (process.env.NODE_ENV !== 'production') {
  (window as any).LoadTestRunner = LoadTestRunner;
  (window as any).GamingPlatformLoadTests = GamingPlatformLoadTests;
  console.log('🏋️ Load Testing Tools loaded. Available: window.LoadTestRunner, window.GamingPlatformLoadTests');
}