import axios from 'axios';
import { safeLogger } from '../utils/safeLogger';
import { ShippingInfo, TrackingInfo, TrackingEvent, ShippingAddress } from '../models/Order';
import { safeLogger } from '../utils/safeLogger';
import { DatabaseService } from './databaseService';
import { safeLogger } from '../utils/safeLogger';
import { NotificationService } from './notificationService';
import { safeLogger } from '../utils/safeLogger';

const databaseService = new DatabaseService();
const notificationService = new NotificationService();

export interface CreateShipmentInput {
  orderId: string;
  carrier: 'FEDEX' | 'UPS' | 'DHL' | 'USPS';
  service: string;
  fromAddress: ShippingAddress;
  toAddress: ShippingAddress;
  packageInfo: {
    weight: number;
    dimensions: {
      length: number;
      width: number;
      height: number;
    };
    value: string;
    description: string;
  };
}

export interface ShipmentResponse {
  trackingNumber: string;
  labelUrl: string;
  estimatedDelivery: string;
  cost: string;
}

export class ShippingService {
  private fedexConfig = {
    apiKey: process.env.FEDEX_API_KEY,
    secretKey: process.env.FEDEX_SECRET_KEY,
    accountNumber: process.env.FEDEX_ACCOUNT_NUMBER,
    meterNumber: process.env.FEDEX_METER_NUMBER,
    baseUrl: process.env.FEDEX_BASE_URL || 'https://apis-sandbox.fedex.com'
  };

  private upsConfig = {
    clientId: process.env.UPS_CLIENT_ID,
    clientSecret: process.env.UPS_CLIENT_SECRET,
    accountNumber: process.env.UPS_ACCOUNT_NUMBER,
    baseUrl: process.env.UPS_BASE_URL || 'https://wwwcie.ups.com/api'
  };

  private dhlConfig = {
    apiKey: process.env.DHL_API_KEY,
    accountNumber: process.env.DHL_ACCOUNT_NUMBER,
    baseUrl: process.env.DHL_BASE_URL || 'https://api-sandbox.dhl.com'
  };

  private uspsConfig = {
    userId: process.env.USPS_USER_ID,
    password: process.env.USPS_PASSWORD,
    baseUrl: process.env.USPS_BASE_URL || 'https://secure.shippingapis.com/ShippingAPI.dll'
  };

  /**
   * Create a shipment with the specified carrier
   */
  async createShipment(input: CreateShipmentInput): Promise<ShipmentResponse> {
    try {
      switch (input.carrier) {
        case 'FEDEX':
          return await this.createFedExShipment(input);
        case 'UPS':
          return await this.createUPSShipment(input);
        case 'DHL':
          return await this.createDHLShipment(input);
        case 'USPS':
          return await this.createUSPSShipment(input);
        default:
          throw new Error(`Unsupported carrier: ${input.carrier}`);
      }
    } catch (error) {
      safeLogger.error('Error creating shipment:', error);
      throw error;
    }
  }

  /**
   * Get shipping rates from multiple carriers
   */
  async getShippingRates(fromAddress: ShippingAddress, toAddress: ShippingAddress, packageInfo: any): Promise<any[]> {
    try {
      const rates = await Promise.allSettled([
        this.getFedExRates(fromAddress, toAddress, packageInfo),
        this.getUPSRates(fromAddress, toAddress, packageInfo),
        this.getDHLRates(fromAddress, toAddress, packageInfo),
        this.getUSPSRates(fromAddress, toAddress, packageInfo)
      ]);

      return rates
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as PromiseFulfilledResult<any>).value)
        .flat();
    } catch (error) {
      safeLogger.error('Error getting shipping rates:', error);
      throw error;
    }
  }

  /**
   * Track a shipment
   */
  async trackShipment(trackingNumber: string, carrier: string): Promise<TrackingInfo> {
    try {
      switch (carrier.toUpperCase()) {
        case 'FEDEX':
          return await this.trackFedExShipment(trackingNumber);
        case 'UPS':
          return await this.trackUPSShipment(trackingNumber);
        case 'DHL':
          return await this.trackDHLShipment(trackingNumber);
        case 'USPS':
          return await this.trackUSPSShipment(trackingNumber);
        default:
          throw new Error(`Unsupported carrier for tracking: ${carrier}`);
      }
    } catch (error) {
      safeLogger.error('Error tracking shipment:', error);
      throw error;
    }
  }

  /**
   * Start delivery tracking for an order
   */
  async startDeliveryTracking(orderId: string, trackingNumber: string, carrier: string): Promise<void> {
    try {
      // Store tracking info in database
      await databaseService.createTrackingRecord(orderId, trackingNumber, carrier);

      // Set up periodic tracking updates
      this.scheduleTrackingUpdates(orderId, trackingNumber, carrier);
    } catch (error) {
      safeLogger.error('Error starting delivery tracking:', error);
      throw error;
    }
  }

  /**
   * Validate shipping address
   */
  async validateAddress(address: ShippingAddress): Promise<{ valid: boolean; suggestions?: ShippingAddress[] }> {
    try {
      // Use a service like SmartyStreets or similar for address validation
      // For now, basic validation
      const isValid = address.street && address.city && address.postalCode && address.country;
      
      return {
        valid: !!isValid,
        suggestions: isValid ? undefined : []
      };
    } catch (error) {
      safeLogger.error('Error validating address:', error);
      return { valid: false };
    }
  }

  // Private methods for carrier-specific implementations

  private async createFedExShipment(input: CreateShipmentInput): Promise<ShipmentResponse> {
    try {
      // Get OAuth token
      const token = await this.getFedExToken();

      const shipmentData = {
        labelResponseOptions: 'URL_ONLY',
        requestedShipment: {
          shipper: {
            contact: {
              personName: input.fromAddress.name,
              phoneNumber: input.fromAddress.phone
            },
            address: {
              streetLines: [input.fromAddress.street],
              city: input.fromAddress.city,
              stateOrProvinceCode: input.fromAddress.state,
              postalCode: input.fromAddress.postalCode,
              countryCode: input.fromAddress.country
            }
          },
          recipients: [{
            contact: {
              personName: input.toAddress.name,
              phoneNumber: input.toAddress.phone
            },
            address: {
              streetLines: [input.toAddress.street],
              city: input.toAddress.city,
              stateOrProvinceCode: input.toAddress.state,
              postalCode: input.toAddress.postalCode,
              countryCode: input.toAddress.country
            }
          }],
          serviceType: input.service,
          packagingType: 'YOUR_PACKAGING',
          requestedPackageLineItems: [{
            weight: {
              units: 'LB',
              value: input.packageInfo.weight
            },
            dimensions: {
              length: input.packageInfo.dimensions.length,
              width: input.packageInfo.dimensions.width,
              height: input.packageInfo.dimensions.height,
              units: 'IN'
            }
          }]
        },
        accountNumber: {
          value: this.fedexConfig.accountNumber
        }
      };

      const response = await axios.post(
        `${this.fedexConfig.baseUrl}/ship/v1/shipments`,
        shipmentData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const shipment = response.data.output.transactionShipments[0];
      
      return {
        trackingNumber: shipment.masterTrackingNumber,
        labelUrl: shipment.pieceResponses[0].packageDocuments[0].url,
        estimatedDelivery: shipment.serviceCommitMessage || '',
        cost: shipment.shipmentRating?.totalNetCharge || '0'
      };
    } catch (error) {
      safeLogger.error('FedEx shipment creation error:', error);
      throw new Error('Failed to create FedEx shipment');
    }
  }

  private async createUPSShipment(input: CreateShipmentInput): Promise<ShipmentResponse> {
    try {
      // Get OAuth token
      const token = await this.getUPSToken();

      const shipmentData = {
        ShipmentRequest: {
          Request: {
            RequestOption: 'nonvalidate',
            TransactionReference: {
              CustomerContext: input.orderId
            }
          },
          Shipment: {
            Description: input.packageInfo.description,
            Shipper: {
              Name: input.fromAddress.name,
              AttentionName: input.fromAddress.name,
              Phone: {
                Number: input.fromAddress.phone
              },
              Address: {
                AddressLine: [input.fromAddress.street],
                City: input.fromAddress.city,
                StateProvinceCode: input.fromAddress.state,
                PostalCode: input.fromAddress.postalCode,
                CountryCode: input.fromAddress.country
              }
            },
            ShipTo: {
              Name: input.toAddress.name,
              AttentionName: input.toAddress.name,
              Phone: {
                Number: input.toAddress.phone
              },
              Address: {
                AddressLine: [input.toAddress.street],
                City: input.toAddress.city,
                StateProvinceCode: input.toAddress.state,
                PostalCode: input.toAddress.postalCode,
                CountryCode: input.toAddress.country
              }
            },
            Service: {
              Code: input.service
            },
            Package: [{
              Description: input.packageInfo.description,
              Packaging: {
                Code: '02'
              },
              Dimensions: {
                UnitOfMeasurement: {
                  Code: 'IN'
                },
                Length: input.packageInfo.dimensions.length.toString(),
                Width: input.packageInfo.dimensions.width.toString(),
                Height: input.packageInfo.dimensions.height.toString()
              },
              PackageWeight: {
                UnitOfMeasurement: {
                  Code: 'LBS'
                },
                Weight: input.packageInfo.weight.toString()
              }
            }]
          },
          LabelSpecification: {
            LabelImageFormat: {
              Code: 'PDF'
            }
          }
        }
      };

      const response = await axios.post(
        `${this.upsConfig.baseUrl}/ship/v1/shipments`,
        shipmentData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const shipment = response.data.ShipmentResponse.ShipmentResults;
      
      return {
        trackingNumber: shipment.ShipmentIdentificationNumber,
        labelUrl: shipment.PackageResults[0].ShippingLabel.GraphicImage,
        estimatedDelivery: '',
        cost: shipment.ShipmentCharges?.TotalCharges?.MonetaryValue || '0'
      };
    } catch (error) {
      safeLogger.error('UPS shipment creation error:', error);
      throw new Error('Failed to create UPS shipment');
    }
  }

  private async createDHLShipment(input: CreateShipmentInput): Promise<ShipmentResponse> {
    try {
      const shipmentData = {
        plannedShippingDateAndTime: new Date().toISOString(),
        pickup: {
          isRequested: false
        },
        productCode: input.service,
        accounts: [{
          typeCode: 'shipper',
          number: this.dhlConfig.accountNumber
        }],
        customerDetails: {
          shipperDetails: {
            postalAddress: {
              postalCode: input.fromAddress.postalCode,
              cityName: input.fromAddress.city,
              countryCode: input.fromAddress.country,
              addressLine1: input.fromAddress.street
            },
            contactInformation: {
              phone: input.fromAddress.phone,
              companyName: input.fromAddress.name,
              fullName: input.fromAddress.name
            }
          },
          receiverDetails: {
            postalAddress: {
              postalCode: input.toAddress.postalCode,
              cityName: input.toAddress.city,
              countryCode: input.toAddress.country,
              addressLine1: input.toAddress.street
            },
            contactInformation: {
              phone: input.toAddress.phone,
              companyName: input.toAddress.name,
              fullName: input.toAddress.name
            }
          }
        },
        content: {
          packages: [{
            weight: input.packageInfo.weight,
            dimensions: {
              length: input.packageInfo.dimensions.length,
              width: input.packageInfo.dimensions.width,
              height: input.packageInfo.dimensions.height
            }
          }],
          isCustomsDeclarable: false,
          description: input.packageInfo.description
        }
      };

      const response = await axios.post(
        `${this.dhlConfig.baseUrl}/shipments`,
        shipmentData,
        {
          headers: {
            'DHL-API-Key': this.dhlConfig.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      const shipment = response.data.shipmentTrackingNumber;
      
      return {
        trackingNumber: shipment,
        labelUrl: response.data.documents?.[0]?.url || '',
        estimatedDelivery: '',
        cost: '0'
      };
    } catch (error) {
      safeLogger.error('DHL shipment creation error:', error);
      throw new Error('Failed to create DHL shipment');
    }
  }

  private async createUSPSShipment(input: CreateShipmentInput): Promise<ShipmentResponse> {
    try {
      // USPS uses XML API
      const xmlData = `
        <ExpressMailLabelRequest USERID="${this.uspsConfig.userId}">
          <Option></Option>
          <Revision>2</Revision>
          <EMCAAccount></EMCAAccount>
          <EMCAPassword></EMCAPassword>
          <ImageParameters></ImageParameters>
          <FromName>${input.fromAddress.name}</FromName>
          <FromFirm></FromFirm>
          <FromAddress1></FromAddress1>
          <FromAddress2>${input.fromAddress.street}</FromAddress2>
          <FromCity>${input.fromAddress.city}</FromCity>
          <FromState>${input.fromAddress.state}</FromState>
          <FromZip5>${input.fromAddress.postalCode}</FromZip5>
          <FromZip4></FromZip4>
          <FromPhone>${input.fromAddress.phone}</FromPhone>
          <ToName>${input.toAddress.name}</ToName>
          <ToFirm></ToFirm>
          <ToAddress1></ToAddress1>
          <ToAddress2>${input.toAddress.street}</ToAddress2>
          <ToCity>${input.toAddress.city}</ToCity>
          <ToState>${input.toAddress.state}</ToState>
          <ToZip5>${input.toAddress.postalCode}</ToZip5>
          <ToZip4></ToZip4>
          <ToPhone>${input.toAddress.phone}</ToPhone>
          <WeightInOunces>${input.packageInfo.weight * 16}</WeightInOunces>
          <ServiceType>Express</ServiceType>
          <Container></Container>
          <Size>REGULAR</Size>
          <Width>${input.packageInfo.dimensions.width}</Width>
          <Length>${input.packageInfo.dimensions.length}</Length>
          <Height>${input.packageInfo.dimensions.height}</Height>
          <Girth></Girth>
        </ExpressMailLabelRequest>
      `;

      const response = await axios.get(
        `${this.uspsConfig.baseUrl}?API=ExpressMailLabel&XML=${encodeURIComponent(xmlData)}`
      );

      // Parse XML response (simplified)
      const trackingNumber = this.extractFromXML(response.data, 'EMConfirmationNumber');
      const labelUrl = this.extractFromXML(response.data, 'EMLabel');
      
      return {
        trackingNumber: trackingNumber || '',
        labelUrl: labelUrl || '',
        estimatedDelivery: '',
        cost: '0'
      };
    } catch (error) {
      safeLogger.error('USPS shipment creation error:', error);
      throw new Error('Failed to create USPS shipment');
    }
  }

  // Tracking methods
  private async trackFedExShipment(trackingNumber: string): Promise<TrackingInfo> {
    try {
      const token = await this.getFedExToken();
      
      const response = await axios.post(
        `${this.fedexConfig.baseUrl}/track/v1/trackingnumbers`,
        {
          includeDetailedScans: true,
          trackingInfo: [{
            trackingNumberInfo: {
              trackingNumber: trackingNumber
            }
          }]
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const trackingData = response.data.output.completeTrackResults[0].trackResults[0];
      
      return {
        trackingNumber,
        carrier: 'FEDEX',
        status: trackingData.latestStatusDetail?.description || 'Unknown',
        estimatedDelivery: trackingData.estimatedDeliveryTimeWindow?.description,
        actualDelivery: trackingData.actualDeliveryTimestamp,
        events: trackingData.scanEvents?.map((event: any) => ({
          timestamp: event.date,
          status: event.eventDescription,
          location: event.scanLocation?.city || '',
          description: event.eventDescription
        })) || []
      };
    } catch (error) {
      safeLogger.error('FedEx tracking error:', error);
      throw new Error('Failed to track FedEx shipment');
    }
  }

  private async trackUPSShipment(trackingNumber: string): Promise<TrackingInfo> {
    try {
      const token = await this.getUPSToken();
      
      const response = await axios.get(
        `${this.upsConfig.baseUrl}/track/v1/details/${trackingNumber}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const trackingData = response.data.trackResponse.shipment[0];
      
      return {
        trackingNumber,
        carrier: 'UPS',
        status: trackingData.package[0].currentStatus?.description || 'Unknown',
        estimatedDelivery: trackingData.package[0].deliveryDate?.[0]?.date,
        actualDelivery: trackingData.package[0].deliveryInformation?.actualDeliveryDate,
        events: trackingData.package[0].activity?.map((event: any) => ({
          timestamp: event.date + ' ' + event.time,
          status: event.status?.description || '',
          location: event.location?.address?.city || '',
          description: event.status?.description || ''
        })) || []
      };
    } catch (error) {
      safeLogger.error('UPS tracking error:', error);
      throw new Error('Failed to track UPS shipment');
    }
  }

  private async trackDHLShipment(trackingNumber: string): Promise<TrackingInfo> {
    try {
      const response = await axios.get(
        `${this.dhlConfig.baseUrl}/track/shipments?trackingNumber=${trackingNumber}`,
        {
          headers: {
            'DHL-API-Key': this.dhlConfig.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      const trackingData = response.data.shipments[0];
      
      return {
        trackingNumber,
        carrier: 'DHL',
        status: trackingData.status?.description || 'Unknown',
        estimatedDelivery: trackingData.estimatedTimeOfDelivery,
        actualDelivery: trackingData.events?.find((e: any) => e.description?.includes('delivered'))?.timestamp,
        events: trackingData.events?.map((event: any) => ({
          timestamp: event.timestamp,
          status: event.description,
          location: event.location?.address?.addressLocality || '',
          description: event.description
        })) || []
      };
    } catch (error) {
      safeLogger.error('DHL tracking error:', error);
      throw new Error('Failed to track DHL shipment');
    }
  }

  private async trackUSPSShipment(trackingNumber: string): Promise<TrackingInfo> {
    try {
      const xmlData = `
        <TrackFieldRequest USERID="${this.uspsConfig.userId}">
          <Revision>1</Revision>
          <ClientIp>127.0.0.1</ClientIp>
          <SourceId>Web3Marketplace</SourceId>
          <TrackID ID="${trackingNumber}"></TrackID>
        </TrackFieldRequest>
      `;

      const response = await axios.get(
        `${this.uspsConfig.baseUrl}?API=TrackV2&XML=${encodeURIComponent(xmlData)}`
      );

      // Parse XML response (simplified)
      const status = this.extractFromXML(response.data, 'Status') || 'Unknown';
      const statusSummary = this.extractFromXML(response.data, 'StatusSummary') || '';
      
      return {
        trackingNumber,
        carrier: 'USPS',
        status,
        events: [{
          timestamp: new Date().toISOString(),
          status,
          location: '',
          description: statusSummary
        }]
      };
    } catch (error) {
      safeLogger.error('USPS tracking error:', error);
      throw new Error('Failed to track USPS shipment');
    }
  }

  // Rate calculation methods
  private async getFedExRates(fromAddress: ShippingAddress, toAddress: ShippingAddress, packageInfo: any): Promise<any[]> {
    // Implementation for FedEx rates
    return [];
  }

  private async getUPSRates(fromAddress: ShippingAddress, toAddress: ShippingAddress, packageInfo: any): Promise<any[]> {
    // Implementation for UPS rates
    return [];
  }

  private async getDHLRates(fromAddress: ShippingAddress, toAddress: ShippingAddress, packageInfo: any): Promise<any[]> {
    // Implementation for DHL rates
    return [];
  }

  private async getUSPSRates(fromAddress: ShippingAddress, toAddress: ShippingAddress, packageInfo: any): Promise<any[]> {
    // Implementation for USPS rates
    return [];
  }

  // Authentication methods
  private async getFedExToken(): Promise<string> {
    try {
      const response = await axios.post(
        `${this.fedexConfig.baseUrl}/oauth/token`,
        {
          grant_type: 'client_credentials',
          client_id: this.fedexConfig.apiKey,
          client_secret: this.fedexConfig.secretKey
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return response.data.access_token;
    } catch (error) {
      safeLogger.error('FedEx token error:', error);
      throw new Error('Failed to get FedEx token');
    }
  }

  private async getUPSToken(): Promise<string> {
    try {
      const response = await axios.post(
        `${this.upsConfig.baseUrl}/security/v1/oauth/token`,
        {
          grant_type: 'client_credentials'
        },
        {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${this.upsConfig.clientId}:${this.upsConfig.clientSecret}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return response.data.access_token;
    } catch (error) {
      safeLogger.error('UPS token error:', error);
      throw new Error('Failed to get UPS token');
    }
  }

  // Utility methods
  private scheduleTrackingUpdates(orderId: string, trackingNumber: string, carrier: string): void {
    const updateInterval = setInterval(async () => {
      try {
        const trackingInfo = await this.trackShipment(trackingNumber, carrier);
        
        // Update database with latest tracking info
        await databaseService.updateTrackingInfo(orderId, trackingInfo);

        // Check if delivered
        if (trackingInfo.status.toLowerCase().includes('delivered')) {
          clearInterval(updateInterval);
          
          // Notify order service about delivery
          await notificationService.sendOrderNotification(
            '', // Will be filled by order service
            'DELIVERY_CONFIRMED',
            orderId,
            { trackingInfo }
          );
        }
      } catch (error) {
        safeLogger.error('Error updating tracking info:', error);
      }
    }, 60 * 60 * 1000); // Update every hour

    // Clear interval after 30 days
    setTimeout(() => {
      clearInterval(updateInterval);
    }, 30 * 24 * 60 * 60 * 1000);
  }

  private extractFromXML(xml: string, tag: string): string | null {
    const regex = new RegExp(`<${tag}>(.*?)</${tag}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1] : null;
  }
}