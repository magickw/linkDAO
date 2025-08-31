/**
 * Test Content Generator
 * Generates various types of content for testing moderation scenarios
 */

export class TestContentGenerator {
  private safeTexts = [
    "Hello everyone! Hope you're having a great day.",
    "Just finished reading an amazing book about blockchain technology.",
    "Looking forward to the weekend. Any recommendations for good movies?",
    "The weather is beautiful today. Perfect for a walk in the park.",
    "Excited about the new NFT collection launching next week!"
  ];

  private harmfulTexts = [
    "I hate everyone in this community and wish they would all disappear",
    "You're such an idiot, go kill yourself",
    "This group is full of losers who deserve to be attacked",
    "I'm going to find you and make you pay for this",
    "All people from that country are worthless scum"
  ];

  private uncertainTexts = [
    "This person might be suspicious, not sure though",
    "Could this be considered harassment? It's borderline",
    "I'm not entirely comfortable with this content",
    "This seems questionable but I can't put my finger on why",
    "Maybe this violates the rules, maybe it doesn't"
  ];

  private controversialTexts = [
    "I disagree with the current political situation but respect others' views",
    "This cryptocurrency project seems risky but might have potential",
    "The moderation here is sometimes inconsistent in my opinion",
    "I think this NFT might be overpriced but art is subjective",
    "Some people won't like this opinion but I think it's valid"
  ];

  generateSafeText(): string {
    return this.getRandomItem(this.safeTexts);
  }

  generateHarmfulText(): string {
    return this.getRandomItem(this.harmfulTexts);
  }

  generateUncertainText(): string {
    return this.getRandomItem(this.uncertainTexts);
  }

  generateBorderlineText(): string {
    const borderlineTexts = [
      "This is getting really annoying, someone should do something",
      "I'm tired of dealing with people like this",
      "This behavior is unacceptable and needs to stop",
      "Why do some people have to be so difficult?",
      "This situation is frustrating beyond belief"
    ];
    return this.getRandomItem(borderlineTexts);
  }

  generateControversialText(): string {
    return this.getRandomItem(this.controversialTexts);
  }

  generateContentWithMaliciousLink(): string {
    const maliciousLinks = [
      "Check out this amazing deal: http://malicious-site.com/phishing",
      "Free crypto giveaway here: https://fake-exchange.net/scam",
      "Download this wallet: http://wallet-stealer.com/download",
      "Verify your account: https://phishing-site.org/verify"
    ];
    return this.getRandomItem(maliciousLinks);
  }

  generateTestImage(): Buffer {
    // Generate a simple test image buffer
    const width = 100;
    const height = 100;
    const channels = 3; // RGB
    const imageSize = width * height * channels;
    
    const buffer = Buffer.alloc(imageSize);
    
    // Fill with a simple pattern
    for (let i = 0; i < imageSize; i += 3) {
      buffer[i] = 255;     // Red
      buffer[i + 1] = 128; // Green
      buffer[i + 2] = 64;  // Blue
    }
    
    return buffer;
  }

  generateNSFWImage(): Buffer {
    // Generate a test image that would be flagged as NSFW
    const buffer = this.generateTestImage();
    // Add metadata that would trigger NSFW detection
    return Buffer.concat([buffer, Buffer.from('NSFW_MARKER')]);
  }

  generateBiometricImage(): Buffer {
    // Generate a test image with biometric data
    const buffer = this.generateTestImage();
    return Buffer.concat([buffer, Buffer.from('BIOMETRIC_DATA')]);
  }

  generateImageWithFaces(): Buffer {
    // Generate a test image with face detection markers
    const buffer = this.generateTestImage();
    return Buffer.concat([buffer, Buffer.from('FACE_DETECTED_2')]);
  }

  generateTextContent(count: number): string[] {
    const contents = [];
    const templates = [
      ...this.safeTexts,
      ...this.uncertainTexts,
      ...this.controversialTexts
    ];
    
    for (let i = 0; i < count; i++) {
      const template = this.getRandomItem(templates);
      contents.push(`${template} #${i}`);
    }
    
    return contents;
  }

  generateImageContent(count: number): Buffer[] {
    const images = [];
    
    for (let i = 0; i < count; i++) {
      if (i % 10 === 0) {
        images.push(this.generateNSFWImage());
      } else if (i % 15 === 0) {
        images.push(this.generateBiometricImage());
      } else {
        images.push(this.generateTestImage());
      }
    }
    
    return images;
  }

  generateUncertainContent(count: number): string[] {
    const contents = [];
    
    for (let i = 0; i < count; i++) {
      const baseText = this.getRandomItem(this.uncertainTexts);
      contents.push(`${baseText} - Case ${i}`);
    }
    
    return contents;
  }

  generateMixedConfidenceContent(count: number): any[] {
    const contents = [];
    
    for (let i = 0; i < count; i++) {
      let text: string;
      let expectedConfidence: number;
      let categories: string[];
      let expectedAction: string;
      
      const rand = Math.random();
      
      if (rand < 0.3) {
        // High confidence safe
        text = this.generateSafeText();
        expectedConfidence = 0.9 + Math.random() * 0.1;
        categories = ['safe'];
        expectedAction = 'allow';
      } else if (rand < 0.5) {
        // High confidence harmful
        text = this.generateHarmfulText();
        expectedConfidence = 0.9 + Math.random() * 0.1;
        categories = ['harassment', 'hate'];
        expectedAction = 'block';
      } else {
        // Uncertain content
        text = this.generateUncertainText();
        expectedConfidence = 0.6 + Math.random() * 0.3;
        categories = ['potentially_harmful'];
        expectedAction = 'review';
      }
      
      contents.push({
        id: i,
        text: `${text} [ID: ${i}]`,
        expectedConfidence,
        categories,
        expectedAction
      });
    }
    
    return contents;
  }

  generatePerformanceTestContent(count: number): any[] {
    const contents = [];
    const types = ['post', 'comment', 'listing'];
    
    for (let i = 0; i < count; i++) {
      contents.push({
        type: this.getRandomItem(types),
        text: `Performance test content ${i}: ${this.generateSafeText()}`,
        userId: `perf-user-${i % 10}`,
        timestamp: new Date()
      });
    }
    
    return contents;
  }

  generateStatisticalTestContent(count: number): any[] {
    const contents = [];
    
    for (let i = 0; i < count; i++) {
      const isHarmful = Math.random() < 0.2; // 20% harmful content
      const isFalsePositive = Math.random() < 0.05; // 5% false positives
      const isFalseNegative = Math.random() < 0.03; // 3% false negatives
      
      let text: string;
      let confidence: number;
      let categories: string[];
      let truePositive: boolean;
      let falsePositive: boolean;
      
      if (isHarmful && !isFalseNegative) {
        text = this.generateHarmfulText();
        confidence = 0.85 + Math.random() * 0.15;
        categories = ['harassment'];
        truePositive = true;
        falsePositive = false;
      } else if (!isHarmful && isFalsePositive) {
        text = this.generateSafeText();
        confidence = 0.85 + Math.random() * 0.15;
        categories = ['harassment'];
        truePositive = false;
        falsePositive = true;
      } else if (isHarmful && isFalseNegative) {
        text = this.generateHarmfulText();
        confidence = 0.3 + Math.random() * 0.4;
        categories = ['safe'];
        truePositive = false;
        falsePositive = false;
      } else {
        text = this.generateSafeText();
        confidence = 0.1 + Math.random() * 0.3;
        categories = ['safe'];
        truePositive = true;
        falsePositive = false;
      }
      
      contents.push({
        text: `${text} [Test ${i}]`,
        userId: `stat-user-${i % 50}`,
        confidence,
        categories,
        expectedAction: confidence > 0.8 ? 'block' : 'allow',
        truePositive,
        falsePositive
      });
    }
    
    return contents;
  }

  generateBlockedContent(count: number): any[] {
    const contents = [];
    
    for (let i = 0; i < count; i++) {
      const legitimateAppeal = Math.random() < 0.3; // 30% legitimate appeals
      
      contents.push({
        text: legitimateAppeal ? this.generateControversialText() : this.generateHarmfulText(),
        userId: `blocked-user-${i}`,
        legitimateAppeal
      });
    }
    
    return contents;
  }

  generateTestUsers(count: number): any[] {
    const users = [];
    
    for (let i = 0; i < count; i++) {
      users.push({
        id: `test-user-${i}`,
        token: `token-${i}`,
        reputation: Math.random() * 100,
        joinDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000)
      });
    }
    
    return users;
  }

  generateUserContent(user: any): any {
    const contentTypes = ['safe', 'uncertain', 'controversial'];
    const contentType = this.getRandomItem(contentTypes);
    
    let text: string;
    let expectedConfidence: number;
    let categories: string[];
    let expectedAction: string;
    
    switch (contentType) {
      case 'safe':
        text = this.generateSafeText();
        expectedConfidence = 0.9;
        categories = ['safe'];
        expectedAction = 'allow';
        break;
      case 'uncertain':
        text = this.generateUncertainText();
        expectedConfidence = 0.75;
        categories = ['potentially_harmful'];
        expectedAction = 'review';
        break;
      case 'controversial':
        text = this.generateControversialText();
        expectedConfidence = 0.65;
        categories = ['controversial'];
        expectedAction = 'allow';
        break;
    }
    
    return {
      text: `${text} (by ${user.id})`,
      expectedConfidence,
      categories,
      expectedAction
    };
  }

  private getRandomItem<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }
}