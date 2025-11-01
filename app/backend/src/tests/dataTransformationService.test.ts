import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Data transformation utility functions
class DataTransformationService {
  // Normalize numerical data to 0-1 range
  normalizeData(data: number[], min?: number, max?: number): number[] {
    const dataMin = min ?? Math.min(...data);
    const dataMax = max ?? Math.max(...data);
    const range = dataMax - dataMin;
    
    if (range === 0) return data.map(() => 0);
    
    return data.map(value => (value - dataMin) / range);
  }

  // Standardize data (z-score normalization)
  standardizeData(data: number[]): number[] {
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    const stdDev = Math.sqrt(variance);
    
    if (stdDev === 0) return data.map(() => 0);
    
    return data.map(value => (value - mean) / stdDev);
  }

  // Aggregate time-series data
  aggregateTimeSeries(
    data: Array<{ timestamp: string; value: number }>,
    interval: 'hour' | 'day' | 'week' | 'month',
    aggregationType: 'sum' | 'avg' | 'min' | 'max' | 'count'
  ): Array<{ timestamp: string; value: number }> {
    const groups = new Map<string, number[]>();
    
    data.forEach(point => {
      const date = new Date(point.timestamp);
      let key: string;
      
      switch (interval) {
        case 'hour':
          key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
          break;
        case 'day':
          key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = `${weekStart.getFullYear()}-${weekStart.getMonth()}-${weekStart.getDate()}`;
          break;
        case 'month':
          key = `${date.getFullYear()}-${date.getMonth()}`;
          break;
      }
      
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(point.value);
    });
    
    return Array.from(groups.entries()).map(([timestamp, values]) => {
      let aggregatedValue: number;
      
      switch (aggregationType) {
        case 'sum':
          aggregatedValue = values.reduce((sum, val) => sum + val, 0);
          break;
        case 'avg':
          aggregatedValue = values.reduce((sum, val) => sum + val, 0) / values.length;
          break;
        case 'min':
          aggregatedValue = Math.min(...values);
          break;
        case 'max':
          aggregatedValue = Math.max(...values);
          break;
        case 'count':
          aggregatedValue = values.length;
          break;
      }
      
      return { timestamp, value: aggregatedValue };
    });
  }

  // Clean and validate data
  cleanData(data: any[]): { cleaned: any[]; errors: string[] } {
    const cleaned: any[] = [];
    const errors: string[] = [];
    
    data.forEach((item, index) => {
      try {
        // Remove null/undefined values
        if (item === null || item === undefined) {
          errors.push(`Row ${index}: Null or undefined value`);
          return;
        }
        
        // Handle objects
        if (typeof item === 'object') {
          const cleanedItem: any = {};
          let hasValidData = false;
          
          Object.keys(item).forEach(key => {
            if (item[key] !== null && item[key] !== undefined) {
              cleanedItem[key] = item[key];
              hasValidData = true;
            }
          });
          
          if (hasValidData) {
            cleaned.push(cleanedItem);
          } else {
            errors.push(`Row ${index}: No valid data`);
          }
        } else {
          cleaned.push(item);
        }
      } catch (error) {
        errors.push(`Row ${index}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
    
    return { cleaned, errors };
  }

  // Transform categorical data to numerical
  encodeCategorical(
    data: string[],
    method: 'label' | 'onehot'
  ): number[] | number[][] {
    const uniqueValues = [...new Set(data)];
    
    if (method === 'label') {
      const labelMap = new Map(uniqueValues.map((val, idx) => [val, idx]));
      return data.map(val => labelMap.get(val) || 0);
    } else {
      // One-hot encoding
      return data.map(val => {
        const encoded = new Array(uniqueValues.length).fill(0);
        const index = uniqueValues.indexOf(val);
        if (index !== -1) encoded[index] = 1;
        return encoded;
      });
    }
  }

  // Handle missing values
  handleMissingValues(
    data: (number | null)[],
    strategy: 'mean' | 'median' | 'mode' | 'forward_fill' | 'backward_fill'
  ): number[] {
    const validValues = data.filter(val => val !== null) as number[];
    
    if (validValues.length === 0) {
      return data.map(() => 0);
    }
    
    let fillValue: number;
    
    switch (strategy) {
      case 'mean':
        fillValue = validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
        break;
      case 'median':
        const sorted = [...validValues].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        fillValue = sorted.length % 2 === 0 
          ? (sorted[mid - 1] + sorted[mid]) / 2 
          : sorted[mid];
        break;
      case 'mode':
        const counts = new Map<number, number>();
        validValues.forEach(val => counts.set(val, (counts.get(val) || 0) + 1));
        fillValue = [...counts.entries()].reduce((a, b) => a[1] > b[1] ? a : b)[0];
        break;
      case 'forward_fill':
        const result: number[] = [];
        let lastValid = validValues[0];
        data.forEach(val => {
          if (val !== null) {
            lastValid = val;
            result.push(val);
          } else {
            result.push(lastValid);
          }
        });
        return result;
      case 'backward_fill':
        const backResult: number[] = [];
        let nextValid = validValues[validValues.length - 1];
        for (let i = data.length - 1; i >= 0; i--) {
          if (data[i] !== null) {
            nextValid = data[i] as number;
            backResult.unshift(data[i] as number);
          } else {
            backResult.unshift(nextValid);
          }
        }
        return backResult;
    }
    
    return data.map(val => val !== null ? val : fillValue);
  }

  // Feature scaling
  scaleFeatures(
    data: number[][],
    method: 'minmax' | 'standard' | 'robust'
  ): { scaled: number[][]; scalers: any } {
    const numFeatures = data[0]?.length || 0;
    const scalers: any = {};
    
    const scaled = data.map(row => [...row]);
    
    for (let featureIdx = 0; featureIdx < numFeatures; featureIdx++) {
      const featureValues = data.map(row => row[featureIdx]);
      
      switch (method) {
        case 'minmax':
          const min = Math.min(...featureValues);
          const max = Math.max(...featureValues);
          const range = max - min;
          scalers[featureIdx] = { min, max, range };
          
          if (range !== 0) {
            scaled.forEach(row => {
              row[featureIdx] = (row[featureIdx] - min) / range;
            });
          }
          break;
          
        case 'standard':
          const mean = featureValues.reduce((sum, val) => sum + val, 0) / featureValues.length;
          const variance = featureValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / featureValues.length;
          const stdDev = Math.sqrt(variance);
          scalers[featureIdx] = { mean, stdDev };
          
          if (stdDev !== 0) {
            scaled.forEach(row => {
              row[featureIdx] = (row[featureIdx] - mean) / stdDev;
            });
          }
          break;
          
        case 'robust':
          const sorted = [...featureValues].sort((a, b) => a - b);
          const q1 = sorted[Math.floor(sorted.length * 0.25)];
          const q3 = sorted[Math.floor(sorted.length * 0.75)];
          const iqr = q3 - q1;
          const median = sorted[Math.floor(sorted.length * 0.5)];
          scalers[featureIdx] = { median, iqr };
          
          if (iqr !== 0) {
            scaled.forEach(row => {
              row[featureIdx] = (row[featureIdx] - median) / iqr;
            });
          }
          break;
      }
    }
    
    return { scaled, scalers };
  }
}

describe('DataTransformationService', () => {
  let dataTransformationService: DataTransformationService;

  beforeEach(() => {
    dataTransformationService = new DataTransformationService();
  });

  describe('normalizeData', () => {
    it('should normalize data to 0-1 range', () => {
      const data = [10, 20, 30, 40, 50];
      const normalized = dataTransformationService.normalizeData(data);
      
      expect(normalized).toEqual([0, 0.25, 0.5, 0.75, 1]);
      expect(Math.min(...normalized)).toBe(0);
      expect(Math.max(...normalized)).toBe(1);
    });

    it('should handle custom min/max values', () => {
      const data = [15, 25, 35];
      const normalized = dataTransformationService.normalizeData(data, 10, 40);
      
      expect(normalized).toEqual([1/6, 0.5, 5/6]);
    });

    it('should handle constant data', () => {
      const data = [5, 5, 5, 5];
      const normalized = dataTransformationService.normalizeData(data);
      
      expect(normalized).toEqual([0, 0, 0, 0]);
    });
  });

  describe('standardizeData', () => {
    it('should standardize data with z-score normalization', () => {
      const data = [10, 20, 30, 40, 50];
      const standardized = dataTransformationService.standardizeData(data);
      
      // Mean should be approximately 0
      const mean = standardized.reduce((sum, val) => sum + val, 0) / standardized.length;
      expect(Math.abs(mean)).toBeLessThan(1e-10);
      
      // Standard deviation should be approximately 1
      const variance = standardized.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / standardized.length;
      const stdDev = Math.sqrt(variance);
      expect(Math.abs(stdDev - 1)).toBeLessThan(1e-10);
    });

    it('should handle constant data', () => {
      const data = [7, 7, 7, 7];
      const standardized = dataTransformationService.standardizeData(data);
      
      expect(standardized).toEqual([0, 0, 0, 0]);
    });
  });

  describe('aggregateTimeSeries', () => {
    it('should aggregate data by hour with sum', () => {
      const data = [
        { timestamp: '2024-01-01T10:15:00Z', value: 10 },
        { timestamp: '2024-01-01T10:30:00Z', value: 20 },
        { timestamp: '2024-01-01T11:15:00Z', value: 15 }
      ];

      const aggregated = dataTransformationService.aggregateTimeSeries(data, 'hour', 'sum');
      
      expect(aggregated).toHaveLength(2);
      expect(aggregated.find(a => a.timestamp.includes('10'))?.value).toBe(30);
      expect(aggregated.find(a => a.timestamp.includes('11'))?.value).toBe(15);
    });

    it('should aggregate data by day with average', () => {
      const data = [
        { timestamp: '2024-01-01T10:00:00Z', value: 10 },
        { timestamp: '2024-01-01T14:00:00Z', value: 20 },
        { timestamp: '2024-01-02T10:00:00Z', value: 30 }
      ];

      const aggregated = dataTransformationService.aggregateTimeSeries(data, 'day', 'avg');
      
      expect(aggregated).toHaveLength(2);
      expect(aggregated[0].value).toBe(15); // (10 + 20) / 2
      expect(aggregated[1].value).toBe(30);
    });
  });

  describe('cleanData', () => {
    it('should remove null and undefined values', () => {
      const data = [
        { id: 1, name: 'John' },
        null,
        { id: 2, name: 'Jane' },
        undefined,
        { id: 3, name: null }
      ];

      const { cleaned, errors } = dataTransformationService.cleanData(data);
      
      expect(cleaned).toHaveLength(3);
      expect(cleaned[0]).toEqual({ id: 1, name: 'John' });
      expect(cleaned[1]).toEqual({ id: 2, name: 'Jane' });
      expect(cleaned[2]).toEqual({ id: 3 });
      expect(errors).toHaveLength(2);
    });

    it('should handle primitive values', () => {
      const data = [1, 2, null, 4, undefined, 6];
      
      const { cleaned, errors } = dataTransformationService.cleanData(data);
      
      expect(cleaned).toEqual([1, 2, 4, 6]);
      expect(errors).toHaveLength(2);
    });
  });

  describe('encodeCategorical', () => {
    it('should perform label encoding', () => {
      const data = ['red', 'blue', 'green', 'red', 'blue'];
      const encoded = dataTransformationService.encodeCategorical(data, 'label') as number[];
      
      expect(encoded).toHaveLength(5);
      expect(encoded[0]).toBe(encoded[3]); // Same category should have same label
      expect(encoded[1]).toBe(encoded[4]); // Same category should have same label
      expect(new Set(encoded).size).toBe(3); // Three unique categories
    });

    it('should perform one-hot encoding', () => {
      const data = ['red', 'blue', 'green'];
      const encoded = dataTransformationService.encodeCategorical(data, 'onehot') as number[][];
      
      expect(encoded).toHaveLength(3);
      expect(encoded[0]).toHaveLength(3);
      expect(encoded[0].reduce((sum, val) => sum + val, 0)).toBe(1); // Only one 1 per row
      expect(encoded[1].reduce((sum, val) => sum + val, 0)).toBe(1);
      expect(encoded[2].reduce((sum, val) => sum + val, 0)).toBe(1);
    });
  });

  describe('handleMissingValues', () => {
    it('should fill missing values with mean', () => {
      const data = [10, null, 30, null, 50];
      const filled = dataTransformationService.handleMissingValues(data, 'mean');
      
      expect(filled).toHaveLength(5);
      expect(filled[1]).toBe(30); // Mean of [10, 30, 50]
      expect(filled[3]).toBe(30);
    });

    it('should fill missing values with median', () => {
      const data = [10, null, 20, 30, null];
      const filled = dataTransformationService.handleMissingValues(data, 'median');
      
      expect(filled[1]).toBe(20); // Median of [10, 20, 30]
      expect(filled[4]).toBe(20);
    });

    it('should forward fill missing values', () => {
      const data = [10, null, null, 40, null];
      const filled = dataTransformationService.handleMissingValues(data, 'forward_fill');
      
      expect(filled).toEqual([10, 10, 10, 40, 40]);
    });

    it('should backward fill missing values', () => {
      const data = [null, null, 30, null, 50];
      const filled = dataTransformationService.handleMissingValues(data, 'backward_fill');
      
      expect(filled).toEqual([30, 30, 30, 50, 50]);
    });
  });

  describe('scaleFeatures', () => {
    it('should perform min-max scaling', () => {
      const data = [
        [10, 100],
        [20, 200],
        [30, 300]
      ];

      const { scaled, scalers } = dataTransformationService.scaleFeatures(data, 'minmax');
      
      expect(scaled).toEqual([
        [0, 0],
        [0.5, 0.5],
        [1, 1]
      ]);
      expect(scalers[0]).toEqual({ min: 10, max: 30, range: 20 });
    });

    it('should perform standard scaling', () => {
      const data = [
        [10, 100],
        [20, 200],
        [30, 300]
      ];

      const { scaled, scalers } = dataTransformationService.scaleFeatures(data, 'standard');
      
      // Check that each feature has mean ~0 and std ~1
      const feature0Mean = scaled.reduce((sum, row) => sum + row[0], 0) / scaled.length;
      expect(Math.abs(feature0Mean)).toBeLessThan(1e-10);
      
      expect(scalers[0]).toHaveProperty('mean');
      expect(scalers[0]).toHaveProperty('stdDev');
    });

    it('should perform robust scaling', () => {
      const data = [
        [10, 100],
        [20, 200],
        [30, 300],
        [100, 1000] // Outlier
      ];

      const { scaled, scalers } = dataTransformationService.scaleFeatures(data, 'robust');
      
      expect(scalers[0]).toHaveProperty('median');
      expect(scalers[0]).toHaveProperty('iqr');
      
      // Robust scaling should be less affected by outliers
      expect(Math.abs(scaled[3][0])).toBeLessThan(10); // Outlier shouldn't be too extreme
    });
  });
});
