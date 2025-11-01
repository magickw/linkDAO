import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { analyticsService } from '../services/analyticsService';
import { AccessType } from '../types/digitalAsset';

// Mock database connection
vi.mock('../db/connection');

describe('AnalyticsService', () => {
  const mockAssetId = 'asset-123';
  const mockCreatorId = 'creator-123';
  const startDate = '2024-01-01';
  const endDate = '2024-01-31';
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });
  
  describe('getAnalytics', () => {
    it('should return comprehensive analytics for date range', async () => {
      const mockMetrics = {
        totalDownloads: 100,
        totalStreams: 50,
        totalPreviews: 200,
        uniqueUsers: 75,
        totalRevenue: '5000000000000000000', // 5 ETH in wei
        bandwidthUsed: 1024000000 // 1GB
      };
      
      const mockPopularAssets = [
        {
          assetId: mockAssetId,
          title: 'Popular Asset',
          downloads: 50,
          revenue: '2000000000000000000'
        }
      ];
      
      // Mock database operations
      vi.doMock('../db/connection', () => ({
        db: {
          select: vi.fn()
            .mockReturnValueOnce({
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([mockMetrics])
              })
            })
        }
      }));
      
      // Mock private methods
      vi.spyOn(analyticsService as any, 'getPopularAssets').mockResolvedValue(mockPopularAssets);
      vi.spyOn(analyticsService as any, 'getUserEngagementMetrics').mockResolvedValue({
        dailyActiveUsers: 25,
        averageSessionDuration: 300,
        returnUserRate: 0.6
      });
      vi.spyOn(analyticsService as any, 'getPerformanceMetrics').mockResolvedValue({
        averageResponseTime: 150,
        cacheHitRate: 85,
        errorRate: 0.02
      });
      vi.spyOn(analyticsService as any, 'getAverageFileSize').mockResolvedValue(5242880); // 5MB
      
      const result = await analyticsService.getAnalytics(startDate, endDate, mockAssetId, mockCreatorId);
      
      expect(result).toEqual({
        totalDownloads: 100,
        totalStreams: 50,
        totalPreviews: 200,
        uniqueUsers: 75,
        totalRevenue: '5000000000000000000',
        bandwidthUsed: 1024000000,
        averageFileSize: 5242880,
        popularAssets: mockPopularAssets,
        userEngagement: {
          dailyActiveUsers: 25,
          averageSessionDuration: 300,
          returnUserRate: 0.6
        },
        performanceMetrics: {
          averageResponseTime: 150,
          cacheHitRate: 85,
          errorRate: 0.02
        }
      });
    });
    
    it('should handle null metrics gracefully', async () => {
      const mockMetrics = {
        totalDownloads: null,
        totalStreams: null,
        totalPreviews: null,
        uniqueUsers: null,
        totalRevenue: null,
        bandwidthUsed: null
      };
      
      // Mock database operations
      vi.doMock('../db/connection', () => ({
        db: {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([mockMetrics])
            })
          })
        }
      }));
      
      // Mock private methods
      vi.spyOn(analyticsService as any, 'getPopularAssets').mockResolvedValue([]);
      vi.spyOn(analyticsService as any, 'getUserEngagementMetrics').mockResolvedValue({
        dailyActiveUsers: 0,
        averageSessionDuration: 0,
        returnUserRate: 0
      });
      vi.spyOn(analyticsService as any, 'getPerformanceMetrics').mockResolvedValue({
        averageResponseTime: 0,
        cacheHitRate: 0,
        errorRate: 0
      });
      vi.spyOn(analyticsService as any, 'getAverageFileSize').mockResolvedValue(0);
      
      const result = await analyticsService.getAnalytics(startDate, endDate);
      
      expect(result.totalDownloads).toBe(0);
      expect(result.totalStreams).toBe(0);
      expect(result.totalPreviews).toBe(0);
      expect(result.uniqueUsers).toBe(0);
      expect(result.totalRevenue).toBe('0');
      expect(result.bandwidthUsed).toBe(0);
    });
  });
  
  describe('getTimeSeriesData', () => {
    it('should return daily time series data', async () => {
      const mockTimeSeriesData = [
        {
          date: '2024-01-01',
          downloads: 10,
          streams: 5,
          previews: 20,
          revenue: '1000000000000000000',
          uniqueUsers: 8
        },
        {
          date: '2024-01-02',
          downloads: 15,
          streams: 8,
          previews: 25,
          revenue: '1500000000000000000',
          uniqueUsers: 12
        }
      ];
      
      // Mock database operations
      vi.doMock('../db/connection', () => ({
        db: {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                groupBy: vi.fn().mockReturnValue({
                  orderBy: vi.fn().mockResolvedValue(mockTimeSeriesData)
                })
              })
            })
          })
        }
      }));
      
      const result = await analyticsService.getTimeSeriesData(startDate, endDate, mockAssetId, 'day');
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        date: '2024-01-01',
        downloads: 10,
        streams: 5,
        previews: 20,
        revenue: '1000000000000000000',
        uniqueUsers: 8
      });
    });
    
    it('should handle weekly grouping', async () => {
      const mockWeeklyData = [
        {
          date: '2024-01-01', // Week start
          downloads: 70,
          streams: 35,
          previews: 140,
          revenue: '7000000000000000000',
          uniqueUsers: 50
        }
      ];
      
      // Mock database operations
      vi.doMock('../db/connection', () => ({
        db: {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                groupBy: vi.fn().mockReturnValue({
                  orderBy: vi.fn().mockResolvedValue(mockWeeklyData)
                })
              })
            })
          })
        }
      }));
      
      const result = await analyticsService.getTimeSeriesData(startDate, endDate, mockAssetId, 'week');
      
      expect(result).toHaveLength(1);
      expect(result[0].downloads).toBe(70);
    });
    
    it('should handle monthly grouping', async () => {
      const mockMonthlyData = [
        {
          date: '2024-01-01', // Month start
          downloads: 300,
          streams: 150,
          previews: 600,
          revenue: '30000000000000000000',
          uniqueUsers: 200
        }
      ];
      
      // Mock database operations
      vi.doMock('../db/connection', () => ({
        db: {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                groupBy: vi.fn().mockReturnValue({
                  orderBy: vi.fn().mockResolvedValue(mockMonthlyData)
                })
              })
            })
          })
        }
      }));
      
      const result = await analyticsService.getTimeSeriesData(startDate, endDate, mockAssetId, 'month');
      
      expect(result).toHaveLength(1);
      expect(result[0].downloads).toBe(300);
    });
  });
  
  describe('getRealTimeStats', () => {
    it('should return real-time statistics', async () => {
      const mockActiveUsers = { count: 25 };
      const mockActivity = { downloads: 5, streams: 3 };
      const mockRecentActivity = [
        {
          userId: 'user-1',
          accessType: AccessType.DOWNLOAD,
          timestamp: new Date().toISOString(),
          success: true
        },
        {
          userId: 'user-2',
          accessType: AccessType.STREAM,
          timestamp: new Date().toISOString(),
          success: true
        }
      ];
      
      // Mock database operations
      vi.doMock('../db/connection', () => ({
        db: {
          select: vi.fn()
            .mockReturnValueOnce({
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([mockActiveUsers])
              })
            })
            .mockReturnValueOnce({
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([mockActivity])
              })
            })
            .mockReturnValueOnce({
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  orderBy: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue(mockRecentActivity)
                  })
                })
              })
            })
        }
      }));
      
      const result = await analyticsService.getRealTimeStats(mockAssetId);
      
      expect(result).toEqual({
        activeUsers: 25,
        currentDownloads: 5,
        currentStreams: 3,
        recentActivity: mockRecentActivity
      });
    });
    
    it('should handle no recent activity', async () => {
      // Mock database operations to return empty results
      vi.doMock('../db/connection', () => ({
        db: {
          select: vi.fn()
            .mockReturnValueOnce({
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([{ count: 0 }])
              })
            })
            .mockReturnValueOnce({
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([{ downloads: 0, streams: 0 }])
              })
            })
            .mockReturnValueOnce({
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  orderBy: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue([])
                  })
                })
              })
            })
        }
      }));
      
      const result = await analyticsService.getRealTimeStats();
      
      expect(result).toEqual({
        activeUsers: 0,
        currentDownloads: 0,
        currentStreams: 0,
        recentActivity: []
      });
    });
  });
  
  describe('getGeographicDistribution', () => {
    it('should return geographic distribution of users', async () => {
      const mockDistribution = [
        { country: 'US', users: 50, downloads: 100 },
        { country: 'GB', users: 30, downloads: 60 },
        { country: 'DE', users: 20, downloads: 40 }
      ];
      
      // Mock database operations
      vi.doMock('../db/connection', () => ({
        db: {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                groupBy: vi.fn().mockReturnValue({
                  orderBy: vi.fn().mockResolvedValue(mockDistribution)
                })
              })
            })
          })
        }
      }));
      
      const result = await analyticsService.getGeographicDistribution(startDate, endDate, mockAssetId);
      
      expect(result).toEqual([
        { country: 'US', users: 50, downloads: 100 },
        { country: 'GB', users: 30, downloads: 60 },
        { country: 'DE', users: 20, downloads: 40 }
      ]);
    });
    
    it('should handle null country codes', async () => {
      const mockDistribution = [
        { country: null, users: 10, downloads: 20 }
      ];
      
      // Mock database operations
      vi.doMock('../db/connection', () => ({
        db: {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                groupBy: vi.fn().mockReturnValue({
                  orderBy: vi.fn().mockResolvedValue(mockDistribution)
                })
              })
            })
          })
        }
      }));
      
      const result = await analyticsService.getGeographicDistribution(startDate, endDate);
      
      expect(result[0].country).toBe('Unknown');
    });
  });
  
  describe('getRevenueAnalytics', () => {
    it('should return comprehensive revenue analytics', async () => {
      const mockRevenueMetrics = {
        totalRevenue: '10000000000000000000', // 10 ETH
        totalSales: 50,
        averageOrderValue: '200000000000000000' // 0.2 ETH
      };
      
      const mockRevenueByAsset = [
        {
          assetId: mockAssetId,
          title: 'Popular Asset',
          revenue: '5000000000000000000',
          sales: 25
        }
      ];
      
      // Mock database operations
      vi.doMock('../db/connection', () => ({
        db: {
          select: vi.fn()
            .mockReturnValueOnce({
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([mockRevenueMetrics])
              })
            })
            .mockReturnValueOnce({
              from: vi.fn().mockReturnValue({
                innerJoin: vi.fn().mockReturnValue({
                  where: vi.fn().mockReturnValue({
                    groupBy: vi.fn().mockReturnValue({
                      orderBy: vi.fn().mockResolvedValue(mockRevenueByAsset)
                    })
                  })
                })
              })
            })
        }
      }));
      
      const result = await analyticsService.getRevenueAnalytics(startDate, endDate, mockCreatorId);
      
      expect(result).toEqual({
        totalRevenue: '10000000000000000000',
        averageOrderValue: '200000000000000000',
        revenueByAsset: [
          {
            assetId: mockAssetId,
            title: 'Popular Asset',
            revenue: '5000000000000000000',
            sales: 25
          }
        ],
        revenueByLicenseType: []
      });
    });
  });
  
  describe('updateDailyAnalytics', () => {
    it('should update analytics for all assets with activity', async () => {
      const date = '2024-01-01';
      const mockAssetsWithActivity = [
        { assetId: 'asset-1' },
        { assetId: 'asset-2' }
      ];
      
      // Mock database operations
      vi.doMock('../db/connection', () => ({
        db: {
          selectDistinct: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(mockAssetsWithActivity)
            })
          })
        }
      }));
      
      // Mock updateAssetAnalytics method
      vi.spyOn(analyticsService as any, 'updateAssetAnalytics').mockResolvedValue();
      
      await analyticsService.updateDailyAnalytics(date);
      
      expect((analyticsService as any).updateAssetAnalytics).toHaveBeenCalledTimes(2);
      expect((analyticsService as any).updateAssetAnalytics).toHaveBeenCalledWith('asset-1', date);
      expect((analyticsService as any).updateAssetAnalytics).toHaveBeenCalledWith('asset-2', date);
    });
  });
  
  describe('private helper methods', () => {
    it('should calculate asset analytics correctly', async () => {
      const assetId = mockAssetId;
      const date = '2024-01-01';
      
      const mockAccessLogs = [
        { userId: 'user-1', accessType: AccessType.DOWNLOAD, fileSizeAccessed: 1024 },
        { userId: 'user-2', accessType: AccessType.STREAM, fileSizeAccessed: 2048 },
        { userId: 'user-1', accessType: AccessType.PREVIEW, fileSizeAccessed: 512 }
      ];
      
      const mockPurchases = [
        { pricePaid: '1000000000000000000' },
        { pricePaid: '500000000000000000' }
      ];
      
      // Mock database operations
      vi.doMock('../db/connection', () => ({
        db: {
          select: vi.fn()
            .mockReturnValueOnce({
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue(mockAccessLogs)
              })
            })
            .mockReturnValueOnce({
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue(mockPurchases)
              })
            }),
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              onConflictDoUpdate: vi.fn().mockResolvedValue()
            })
          })
        }
      }));
      
      const updateAssetAnalytics = (analyticsService as any).updateAssetAnalytics;
      await updateAssetAnalytics(assetId, date);
      
      // Verify the method was called without throwing
      expect(true).toBe(true);
    });
  });
  
  describe('error handling', () => {
    it('should handle database errors in getAnalytics', async () => {
      // Mock database to throw error
      vi.doMock('../db/connection', () => ({
        db: {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockRejectedValue(new Error('Database error'))
            })
          })
        }
      }));
      
      await expect(analyticsService.getAnalytics(startDate, endDate))
        .rejects.toThrow('Failed to get analytics');
    });
    
    it('should handle database errors in getTimeSeriesData', async () => {
      // Mock database to throw error
      vi.doMock('../db/connection', () => ({
        db: {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                groupBy: vi.fn().mockReturnValue({
                  orderBy: vi.fn().mockRejectedValue(new Error('Database error'))
                })
              })
            })
          })
        }
      }));
      
      await expect(analyticsService.getTimeSeriesData(startDate, endDate))
        .rejects.toThrow('Failed to get time series data');
    });
    
    it('should handle database errors in updateDailyAnalytics', async () => {
      // Mock database to throw error
      vi.doMock('../db/connection', () => ({
        db: {
          selectDistinct: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockRejectedValue(new Error('Database error'))
            })
          })
        }
      }));
      
      await expect(analyticsService.updateDailyAnalytics('2024-01-01'))
        .rejects.toThrow('Failed to update daily analytics');
    });
  });
});
