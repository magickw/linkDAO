import { Request, Response } from 'express';
import { UserProfileService } from '../services/userProfileService';
import { CreateUserProfileInput, UpdateUserProfileInput } from '../models/UserProfile';

const userProfileService = new UserProfileService();

export class UserProfileController {
  async createProfile(req: Request, res: Response): Promise<Response> {
    try {
      const input: CreateUserProfileInput = req.body;
      const profile = await userProfileService.createProfile(input);
      return res.status(201).json(profile);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async getProfileById(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const profile = await userProfileService.getProfileById(id);
      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }
      return res.json(profile);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async getProfileByAddress(req: Request, res: Response): Promise<Response> {
    try {
      const { address } = req.params;
      const profile = await userProfileService.getProfileByAddress(address);
      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }
      return res.json(profile);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async updateProfile(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const input: UpdateUserProfileInput = req.body;
      const profile = await userProfileService.updateProfile(id, input);
      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }
      return res.json(profile);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async deleteProfile(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const deleted = await userProfileService.deleteProfile(id);
      if (!deleted) {
        return res.status(404).json({ error: 'Profile not found' });
      }
      return res.status(204).send();
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async getAllProfiles(req: Request, res: Response): Promise<Response> {
    try {
      const profiles = await userProfileService.getAllProfiles();
      return res.json(profiles);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}