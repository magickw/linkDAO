/**
 * Load Test Generator
 * Generates content and scenarios for performance testing
 */

export class LoadTestGenerator {
  private contentTemplates = [
    "This is a test message for load testing purposes - ID: {id}",
    "Performance testing content with unique identifier {id}",
    "Load test scenario {id} - checking system capacity",
    "Concurrent request test case number {id}",
    "Stress testing message with ID {id} for system validation"
  ];

  private userPrefixes = [
    "load-user", "perf-user", "test-user", "stress-user", "bench-user"
  ];

  generateTextContent(count: number): string[] {
    const contents = [];
    
    for (let i = 0; i < count; i++) {
      const template = this.getRandomItem(this.contentTemplates);
      const content = template.replace('{id}', i.toString());
      contents.push(content);
    }
    
    return contents;
  }

  generateImageContent(count: number): Buffer[] {
    const images = [];
    
    for (let i = 0; i < count; i++) {
      const imageBuffer = this.generateTestImageBuffer(i);
      images.push(imageBuffer);
    }
    
    return images;
  }

  generateMixedContent(textCount: number, imageCount: number): any[] {
    const contents = [];
    
    // Generate text content
    for (let i = 0; i < textCount; i++) {
      contents.push({
        type: 'text',
        content: `Load test text content ${i}`,
        userId: `${this.getRandomItem(this.userPrefixes)}-${i}`,
        timestamp: new Date(),
        expectedLatency: 500 // Expected processing time in ms
      });
    }
    
    // Generate image content
    for (let i = 0; i < imageCount; i++) {
      contents.push({
        type: 'image',
        content: this.generateTestImageBuffer(i),
        userId: `${this.getRandomItem(this.userPrefixes)}-${textCount + i}`,
        timestamp: new Date(),
        expectedLatency: 2000 // Images take longer
      });
    }
    
    return this.shuffleArray(contents);
  }

  generateConcurrentUsers(userCount: number): any[] {
    const users = [];
    
    for (let i = 0; i < userCount; i++) {
      users.push({
        id: `concurrent-user-${i}`,
        reputation: Math.random() * 100,
        accountAge: Math.floor(Math.random() * 365), // Days
        activityLevel: Math.random(), // 0-1 scale
        contentTypes: this.getRandomContentTypes(),
        requestRate: 1 + Math.random() * 5 // Requests per minute
      });
    }
    
    return users;
  }

  generateBurstTraffic(peakMultiplier: number, baseLine: number): any[] {
    const trafficPattern = [];
    const duration = 60; // 60 time units
    
    for (let t = 0; t < duration; t++) {
      let load = baseLine;
      
      // Create traffic spikes
      if (t >= 20 && t <= 25) {
        load = baseLine * peakMultiplier; // First spike
      } else if (t >= 40 && t <= 50) {
        load = baseLine * (peakMultiplier * 0.8); // Second spike
      }
      
      trafficPattern.push({
        timeUnit: t,
        requestCount: Math.floor(load),
        expectedLatency: this.calculateExpectedLatency(load, baseLine)
      });
    }
    
    return trafficPattern;
  }

  generateStressTestScenarios(): any[] {
    return [
      {
        name: 'normal_load',
        concurrentUsers: 50,
        requestsPerSecond: 10,
        duration: 300, // 5 minutes
        contentMix: { text: 0.8, image: 0.2 }
      },
      {
        name: 'high_load',
        concurrentUsers: 200,
        requestsPerSecond: 50,
        duration: 600, // 10 minutes
        contentMix: { text: 0.7, image: 0.3 }
      },
      {
        name: 'peak_load',
        concurrentUsers: 500,
        requestsPerSecond: 100,
        duration: 300, // 5 minutes
        contentMix: { text: 0.6, image: 0.4 }
      },
      {
        name: 'extreme_load',
        concurrentUsers: 1000,
        requestsPerSecond: 200,
        duration: 180, // 3 minutes
        contentMix: { text: 0.5, image: 0.5 }
      }
    ];
  }

  generateDatabaseLoadScenarios(): any[] {
    return [
      {
        name: 'read_heavy',
        readOperations: 1000,
        writeOperations: 100,
        concurrentConnections: 50,
        queryComplexity: 'simple'
      },
      {
        name: 'write_heavy',
        readOperations: 200,
        writeOperations: 800,
        concurrentConnections: 30,
        queryComplexity: 'simple'
      },
      {
        name: 'mixed_load',
        readOperations: 500,
        writeOperations: 500,
        concurrentConnections: 40,
        queryComplexity: 'medium'
      },
      {
        name: 'complex_queries',
        readOperations: 300,
        writeOperations: 200,
        concurrentConnections: 20,
        queryComplexity: 'complex'
      }
    ];
  }

  generateMemoryStressContent(sizeKB: number, count: number): any[] {
    const contents = [];
    const baseContent = 'A'.repeat(sizeKB * 1024); // Create content of specified size
    
    for (let i = 0; i < count; i++) {
      contents.push({
        id: `memory-test-${i}`,
        content: `${baseContent}-${i}`,
        size: sizeKB * 1024,
        timestamp: new Date()
      });
    }
    
    return contents;
  }

  generateNetworkLatencyScenarios(): any[] {
    return [
      {
        name: 'low_latency',
        networkDelay: 10, // ms
        packetLoss: 0,
        bandwidth: 'unlimited'
      },
      {
        name: 'medium_latency',
        networkDelay: 100, // ms
        packetLoss: 0.1, // 0.1%
        bandwidth: '100mbps'
      },
      {
        name: 'high_latency',
        networkDelay: 500, // ms
        packetLoss: 1, // 1%
        bandwidth: '10mbps'
      },
      {
        name: 'poor_connection',
        networkDelay: 1000, // ms
        packetLoss: 5, // 5%
        bandwidth: '1mbps'
      }
    ];
  }

  generateFailureScenarios(): any[] {
    return [
      {
        name: 'ai_service_timeout',
        failureType: 'timeout',
        affectedService: 'openai',
        failureRate: 0.1, // 10%
        duration: 60000 // 1 minute
      },
      {
        name: 'database_connection_loss',
        failureType: 'connection_error',
        affectedService: 'database',
        failureRate: 0.05, // 5%
        duration: 30000 // 30 seconds
      },
      {
        name: 'memory_exhaustion',
        failureType: 'resource_exhaustion',
        affectedService: 'application',
        failureRate: 0.02, // 2%
        duration: 120000 // 2 minutes
      },
      {
        name: 'network_partition',
        failureType: 'network_error',
        affectedService: 'external_apis',
        failureRate: 0.15, // 15%
        duration: 45000 // 45 seconds
      }
    ];
  }

  generateScalabilityTestData(): any[] {
    const testSizes = [10, 50, 100, 250, 500, 1000, 2000];
    const scenarios = [];
    
    for (const size of testSizes) {
      scenarios.push({
        name: `scale_test_${size}`,
        userCount: size,
        requestCount: size * 10,
        expectedThroughput: this.calculateExpectedThroughput(size),
        expectedLatency: this.calculateExpectedLatency(size, 10),
        resourceRequirements: this.calculateResourceRequirements(size)
      });
    }
    
    return scenarios;
  }

  generateRealtimeLoadPatterns(): any[] {
    const patterns = [];
    const timeSlots = 24; // 24 hours
    
    for (let hour = 0; hour < timeSlots; hour++) {
      let loadMultiplier = 1;
      
      // Simulate daily usage patterns
      if (hour >= 9 && hour <= 17) {
        loadMultiplier = 1.5; // Business hours
      } else if (hour >= 19 && hour <= 22) {
        loadMultiplier = 2.0; // Peak evening hours
      } else if (hour >= 0 && hour <= 6) {
        loadMultiplier = 0.3; // Low activity hours
      }
      
      patterns.push({
        hour,
        loadMultiplier,
        expectedUsers: Math.floor(100 * loadMultiplier),
        expectedRequests: Math.floor(500 * loadMultiplier)
      });
    }
    
    return patterns;
  }

  generateContentVariations(baseContent: string, variationCount: number): string[] {
    const variations = [];
    const modifiers = [
      'urgent', 'important', 'please review', 'time-sensitive',
      'confidential', 'draft', 'final', 'updated', 'revised'
    ];
    
    for (let i = 0; i < variationCount; i++) {
      const modifier = this.getRandomItem(modifiers);
      variations.push(`[${modifier}] ${baseContent} - variation ${i}`);
    }
    
    return variations;
  }

  // Helper Methods
  private generateTestImageBuffer(id: number): Buffer {
    const size = 1000 + (id % 500); // Variable size images
    const buffer = Buffer.alloc(size);
    
    // Fill with pattern based on ID
    for (let i = 0; i < size; i++) {
      buffer[i] = (id + i) % 256;
    }
    
    return buffer;
  }

  private getRandomContentTypes(): string[] {
    const allTypes = ['post', 'comment', 'listing', 'dm', 'profile'];
    const count = 1 + Math.floor(Math.random() * 3); // 1-3 types
    return this.shuffleArray(allTypes).slice(0, count);
  }

  private calculateExpectedLatency(load: number, baseline: number): number {
    // Simulate latency increase with load
    const ratio = load / baseline;
    if (ratio <= 1) return 100; // Base latency
    if (ratio <= 2) return 150;
    if (ratio <= 5) return 300;
    return 500; // High load latency
  }

  private calculateExpectedThroughput(userCount: number): number {
    // Simulate throughput scaling (not perfectly linear)
    const baseRate = 10; // requests per second per user
    const efficiency = Math.max(0.5, 1 - (userCount / 10000)); // Efficiency decreases with scale
    return Math.floor(userCount * baseRate * efficiency);
  }

  private calculateResourceRequirements(userCount: number): any {
    return {
      cpu: Math.ceil(userCount / 100), // CPU cores needed
      memory: Math.ceil(userCount * 0.01), // GB of RAM
      connections: userCount * 2, // Database connections
      bandwidth: Math.ceil(userCount * 0.1) // Mbps
    };
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private getRandomItem<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }
}
