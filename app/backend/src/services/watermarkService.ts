// Temporary stub for watermark service to fix build issues
import { WatermarkType, WatermarkData } from '../types/digitalAsset';

export class WatermarkService {
  async createWatermarkTemplate(userId: string, name: string, templateType: WatermarkType, templateData: WatermarkData, isDefault?: boolean) {
    return 'stub-template-id';
  }

  async getWatermarkTemplates(userId: string) {
    return [];
  }

  async applyWatermark(assetBuffer: Buffer, templateId: string, userId: string) {
    return assetBuffer; // Return unchanged for stub
  }

  async removeWatermark(assetBuffer: Buffer, templateId: string) {
    return assetBuffer; // Return unchanged for stub
  }
}

export const watermarkService = new WatermarkService();