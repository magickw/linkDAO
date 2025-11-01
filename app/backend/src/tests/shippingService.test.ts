import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import axios from 'axios';
import { ShippingService, CreateShipmentInput } from '../services/shippingService';
import { DatabaseService } from '../services/databaseService';
import { NotificationService } from '../services/notificationService';

// Mock dependencies
jest.mock('axios');
jest.mock('../services/databaseService');
jest.mock('../services/notificationService');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const MockedDatabaseService = DatabaseService as jest.MockedClass<typeof DatabaseService>;
const MockedNotificationService = NotificationService as jest.MockedClass<typeof NotificationService>;

describe('ShippingService', () => {
  let shippingService: ShippingService;
  let mockDatabaseService: jest.Mocked<DatabaseService>;
  let mockNotificationService: jest.Mocked<NotificationService>;

  const mockShipmentInput: CreateShipmentInput = {
    orderId: '1',
    carrier: 'FEDEX',
    service: 'GROUND',
    fromAddress: {
      name: 'Seller Name',
      street: '456 Seller St',
      city: 'Seller City',
      state: 'NY',
      postalCode: '54321',
      country: 'US',
      phone: '+0987654321'
    },
    toAddress: {
      name: 'Buyer Name',
      street: '123 Buyer St',
      city: 'Buyer City',
      state: 'CA',
      postalCode: '12345',
      country: 'US',
      phone: '+1234567890'
    },
    packageInfo: {
      weight: 2.5,
      dimensions: {
        length: 10,
        width: 8,
        height: 6
      },
      value: '1000',
      description: 'Test product'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up environment variables
    process.env.FEDEX_API_KEY = 'test-fedex-key';
    process.env.FEDEX_SECRET_KEY = 'test-fedex-secret';
    process.env.FEDEX_ACCOUNT_NUMBER = 'test-account';
    process.env.FEDEX_METER_NUMBER = 'test-meter';
    process.env.UPS_CLIENT_ID = 'test-ups-client';
    process.env.UPS_CLIENT_SECRET = 'test-ups-secret';
    process.env.UPS_ACCOUNT_NUMBER = 'test-ups-account';
    process.env.DHL_API_KEY = 'test-dhl-key';
    process.env.DHL_ACCOUNT_NUMBER = 'test-dhl-account';
    process.env.USPS_USER_ID = 'test-usps-user';
    process.env.USPS_PASSWORD = 'test-usps-password';

    mockDatabaseService = new MockedDatabaseService() as jest.Mocked<DatabaseService>;
    mockNotificationService = new MockedNotificationService() as jest.Mocked<NotificationService>;

    shippingService = new ShippingService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createShipment', () => {
    describe('FedEx', () => {
      beforeEach(() => {
        // Mock FedEx OAuth token response
        mockedAxios.post.mockImplementation((url: string) => {
          if (url.includes('/oauth/token')) {
            return Promise.resolve({
              data: { access_token: 'mock-fedex-token' }
            });
          }
          
          if (url.includes('/ship/v1/shipments')) {
            return Promise.resolve({
              data: {
                output: {
                  transactionShipments: [{
                    masterTrackingNumber: 'FEDEX123456789',
                    pieceResponses: [{
                      packageDocuments: [{
                        url: 'https://fedex.com/label.pdf'
                      }]
                    }],
                    serviceCommitMessage: '2024-03-15',
                    shipmentRating: {
                      totalNetCharge: '15.99'
                    }
                  }]
                }
              }
            });
          }
          
          return Promise.reject(new Error('Unexpected URL'));
        });
      });

      it('should create FedEx shipment successfully', async () => {
        const result = await shippingService.createShipment(mockShipmentInput);

        expect(result).toEqual({
          trackingNumber: 'FEDEX123456789',
          labelUrl: 'https://fedex.com/label.pdf',
          estimatedDelivery: '2024-03-15',
          cost: '15.99'
        });

        // Verify OAuth token request
        expect(mockedAxios.post).toHaveBeenCalledWith(
          expect.stringContaining('/oauth/token'),
          expect.objectContaining({
            grant_type: 'client_credentials',
            client_id: 'test-fedex-key',
            client_secret: 'test-fedex-secret'
          }),
          expect.any(Object)
        );

        // Verify shipment creation request
        expect(mockedAxios.post).toHaveBeenCalledWith(
          expect.stringContaining('/ship/v1/shipments'),
          expect.objectContaining({
            requestedShipment: expect.objectContaining({
              shipper: expect.objectContaining({
                contact: expect.objectContaining({
                  personName: 'Seller Name'
                })
              }),
              recipients: expect.arrayContaining([
                expect.objectContaining({
                  contact: expect.objectContaining({
                    personName: 'Buyer Name'
                  })
                })
              ])
            })
          }),
          expect.objectContaining({
            headers: expect.objectContaining({
              'Authorization': 'Bearer mock-fedex-token'
            })
          })
        );
      });

      it('should handle FedEx authentication failure', async () => {
        mockedAxios.post.mockRejectedValueOnce(new Error('Authentication failed'));

        await expect(shippingService.createShipment(mockShipmentInput))
          .rejects.toThrow('Failed to create FedEx shipment');
      });

      it('should handle FedEx shipment creation failure', async () => {
        mockedAxios.post
          .mockResolvedValueOnce({ data: { access_token: 'mock-token' } })
          .mockRejectedValueOnce(new Error('Shipment creation failed'));

        await expect(shippingService.createShipment(mockShipmentInput))
          .rejects.toThrow('Failed to create FedEx shipment');
      });
    });

    describe('UPS', () => {
      const upsInput = { ...mockShipmentInput, carrier: 'UPS' as const };

      beforeEach(() => {
        mockedAxios.post.mockImplementation((url: string) => {
          if (url.includes('/security/v1/oauth/token')) {
            return Promise.resolve({
              data: { access_token: 'mock-ups-token' }
            });
          }
          
          if (url.includes('/ship/v1/shipments')) {
            return Promise.resolve({
              data: {
                ShipmentResponse: {
                  ShipmentResults: {
                    ShipmentIdentificationNumber: 'UPS123456789',
                    PackageResults: [{
                      ShippingLabel: {
                        GraphicImage: 'base64-encoded-label'
                      }
                    }],
                    ShipmentCharges: {
                      TotalCharges: {
                        MonetaryValue: '18.50'
                      }
                    }
                  }
                }
              }
            });
          }
          
          return Promise.reject(new Error('Unexpected URL'));
        });
      });

      it('should create UPS shipment successfully', async () => {
        const result = await shippingService.createShipment(upsInput);

        expect(result).toEqual({
          trackingNumber: 'UPS123456789',
          labelUrl: 'base64-encoded-label',
          estimatedDelivery: '',
          cost: '18.50'
        });
      });
    });

    describe('DHL', () => {
      const dhlInput = { ...mockShipmentInput, carrier: 'DHL' as const };

      beforeEach(() => {
        mockedAxios.post.mockResolvedValue({
          data: {
            shipmentTrackingNumber: 'DHL123456789',
            documents: [{
              url: 'https://dhl.com/label.pdf'
            }]
          }
        });
      });

      it('should create DHL shipment successfully', async () => {
        const result = await shippingService.createShipment(dhlInput);

        expect(result).toEqual({
          trackingNumber: 'DHL123456789',
          labelUrl: 'https://dhl.com/label.pdf',
          estimatedDelivery: '',
          cost: '0'
        });

        expect(mockedAxios.post).toHaveBeenCalledWith(
          expect.stringContaining('/shipments'),
          expect.objectContaining({
            customerDetails: expect.objectContaining({
              shipperDetails: expect.objectContaining({
                contactInformation: expect.objectContaining({
                  companyName: 'Seller Name'
                })
              })
            })
          }),
          expect.objectContaining({
            headers: expect.objectContaining({
              'DHL-API-Key': 'test-dhl-key'
            })
          })
        );
      });
    });

    describe('USPS', () => {
      const uspsInput = { ...mockShipmentInput, carrier: 'USPS' as const };

      beforeEach(() => {
        mockedAxios.get.mockResolvedValue({
          data: `
            <ExpressMailLabelResponse>
              <EMConfirmationNumber>USPS123456789</EMConfirmationNumber>
              <EMLabel>base64-encoded-label</EMLabel>
            </ExpressMailLabelResponse>
          `
        });
      });

      it('should create USPS shipment successfully', async () => {
        const result = await shippingService.createShipment(uspsInput);

        expect(result).toEqual({
          trackingNumber: 'USPS123456789',
          labelUrl: 'base64-encoded-label',
          estimatedDelivery: '',
          cost: '0'
        });

        expect(mockedAxios.get).toHaveBeenCalledWith(
          expect.stringContaining('API=ExpressMailLabel')
        );
      });
    });

    it('should throw error for unsupported carrier', async () => {
      const invalidInput = { ...mockShipmentInput, carrier: 'INVALID' as any };

      await expect(shippingService.createShipment(invalidInput))
        .rejects.toThrow('Unsupported carrier: INVALID');
    });
  });

  describe('trackShipment', () => {
    describe('FedEx tracking', () => {
      beforeEach(() => {
        mockedAxios.post.mockImplementation((url: string) => {
          if (url.includes('/oauth/token')) {
            return Promise.resolve({
              data: { access_token: 'mock-fedex-token' }
            });
          }
          
          if (url.includes('/track/v1/trackingnumbers')) {
            return Promise.resolve({
              data: {
                output: {
                  completeTrackResults: [{
                    trackResults: [{
                      latestStatusDetail: {
                        description: 'Delivered'
                      },
                      estimatedDeliveryTimeWindow: {
                        description: '2024-03-15'
                      },
                      actualDeliveryTimestamp: '2024-03-15T14:30:00Z',
                      scanEvents: [{
                        date: '2024-03-15T14:30:00Z',
                        eventDescription: 'Delivered',
                        scanLocation: {
                          city: 'Buyer City'
                        }
                      }]
                    }]
                  }]
                }
              }
            });
          }
          
          return Promise.reject(new Error('Unexpected URL'));
        });
      });

      it('should track FedEx shipment successfully', async () => {
        const result = await shippingService.trackShipment('FEDEX123456789', 'FEDEX');

        expect(result).toEqual({
          trackingNumber: 'FEDEX123456789',
          carrier: 'FEDEX',
          status: 'Delivered',
          estimatedDelivery: '2024-03-15',
          actualDelivery: '2024-03-15T14:30:00Z',
          events: [{
            timestamp: '2024-03-15T14:30:00Z',
            status: 'Delivered',
            location: 'Buyer City',
            description: 'Delivered'
          }]
        });
      });
    });

    describe('UPS tracking', () => {
      beforeEach(() => {
        mockedAxios.post.mockResolvedValueOnce({
          data: { access_token: 'mock-ups-token' }
        });

        mockedAxios.get.mockResolvedValue({
          data: {
            trackResponse: {
              shipment: [{
                package: [{
                  currentStatus: {
                    description: 'In Transit'
                  },
                  deliveryDate: [{
                    date: '2024-03-16'
                  }],
                  deliveryInformation: {
                    actualDeliveryDate: '2024-03-16T16:00:00Z'
                  },
                  activity: [{
                    date: '2024-03-15',
                    time: '10:30:00',
                    status: {
                      description: 'Departed Facility'
                    },
                    location: {
                      address: {
                        city: 'Transit City'
                      }
                    }
                  }]
                }]
              }]
            }
          }
        });
      });

      it('should track UPS shipment successfully', async () => {
        const result = await shippingService.trackShipment('UPS123456789', 'UPS');

        expect(result).toEqual({
          trackingNumber: 'UPS123456789',
          carrier: 'UPS',
          status: 'In Transit',
          estimatedDelivery: '2024-03-16',
          actualDelivery: '2024-03-16T16:00:00Z',
          events: [{
            timestamp: '2024-03-15 10:30:00',
            status: 'Departed Facility',
            location: 'Transit City',
            description: 'Departed Facility'
          }]
        });
      });
    });

    it('should throw error for unsupported carrier tracking', async () => {
      await expect(shippingService.trackShipment('TRACK123', 'INVALID'))
        .rejects.toThrow('Unsupported carrier for tracking: INVALID');
    });
  });

  describe('validateAddress', () => {
    const validAddress = {
      name: 'John Doe',
      street: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      postalCode: '12345',
      country: 'US'
    };

    it('should validate complete address as valid', async () => {
      const result = await shippingService.validateAddress(validAddress);

      expect(result.valid).toBe(true);
      expect(result.suggestions).toBeUndefined();
    });

    it('should validate incomplete address as invalid', async () => {
      const incompleteAddress = {
        ...validAddress,
        street: ''
      };

      const result = await shippingService.validateAddress(incompleteAddress);

      expect(result.valid).toBe(false);
      expect(result.suggestions).toEqual([]);
    });
  });

  describe('startDeliveryTracking', () => {
    beforeEach(() => {
      mockDatabaseService.createTrackingRecord.mockResolvedValue({
        id: 1,
        orderId: '1',
        trackingNumber: 'TRACK123',
        carrier: 'FEDEX',
        createdAt: new Date()
      });

      // Mock the tracking update method
      jest.spyOn(shippingService, 'trackShipment').mockResolvedValue({
        trackingNumber: 'TRACK123',
        carrier: 'FEDEX',
        status: 'In Transit',
        events: []
      });

      mockDatabaseService.updateTrackingInfo.mockResolvedValue(true);
    });

    it('should start delivery tracking successfully', async () => {
      await shippingService.startDeliveryTracking('1', 'TRACK123', 'FEDEX');

      expect(mockDatabaseService.createTrackingRecord).toHaveBeenCalledWith('1', 'TRACK123', 'FEDEX');
    });

    it('should handle tracking record creation failure', async () => {
      mockDatabaseService.createTrackingRecord.mockRejectedValue(new Error('Database error'));

      await expect(shippingService.startDeliveryTracking('1', 'TRACK123', 'FEDEX'))
        .rejects.toThrow('Database error');
    });
  });

  describe('getShippingRates', () => {
    const fromAddress = {
      name: 'Seller',
      street: '456 Seller St',
      city: 'Seller City',
      state: 'NY',
      postalCode: '54321',
      country: 'US'
    };

    const toAddress = {
      name: 'Buyer',
      street: '123 Buyer St',
      city: 'Buyer City',
      state: 'CA',
      postalCode: '12345',
      country: 'US'
    };

    const packageInfo = {
      weight: 2.5,
      dimensions: {
        length: 10,
        width: 8,
        height: 6
      },
      value: '1000',
      description: 'Test product'
    };

    it('should return empty array when all rate requests fail', async () => {
      // Mock all rate methods to return empty arrays
      jest.spyOn(shippingService as any, 'getFedExRates').mockResolvedValue([]);
      jest.spyOn(shippingService as any, 'getUPSRates').mockResolvedValue([]);
      jest.spyOn(shippingService as any, 'getDHLRates').mockResolvedValue([]);
      jest.spyOn(shippingService as any, 'getUSPSRates').mockResolvedValue([]);

      const result = await shippingService.getShippingRates(fromAddress, toAddress, packageInfo);

      expect(result).toEqual([]);
    });

    it('should handle rate service errors gracefully', async () => {
      // Mock some methods to throw errors
      jest.spyOn(shippingService as any, 'getFedExRates').mockRejectedValue(new Error('FedEx error'));
      jest.spyOn(shippingService as any, 'getUPSRates').mockResolvedValue([{ carrier: 'UPS', cost: '20.00' }]);
      jest.spyOn(shippingService as any, 'getDHLRates').mockRejectedValue(new Error('DHL error'));
      jest.spyOn(shippingService as any, 'getUSPSRates').mockResolvedValue([]);

      const result = await shippingService.getShippingRates(fromAddress, toAddress, packageInfo);

      expect(result).toEqual([{ carrier: 'UPS', cost: '20.00' }]);
    });
  });

  describe('Error handling', () => {
    it('should handle network errors in createShipment', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Network error'));

      await expect(shippingService.createShipment(mockShipmentInput))
        .rejects.toThrow('Failed to create FedEx shipment');
    });

    it('should handle network errors in trackShipment', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Network error'));

      await expect(shippingService.trackShipment('TRACK123', 'FEDEX'))
        .rejects.toThrow('Failed to track FedEx shipment');
    });

    it('should handle malformed API responses', async () => {
      mockedAxios.post
        .mockResolvedValueOnce({ data: { access_token: 'mock-token' } })
        .mockResolvedValueOnce({ data: { invalid: 'response' } });

      await expect(shippingService.createShipment(mockShipmentInput))
        .rejects.toThrow();
    });
  });
});
