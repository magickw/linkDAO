import express from 'express';
import { AddressController } from '../controllers/addressController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get all addresses
router.get('/', AddressController.getAddresses);

// Create a new address
router.post('/', AddressController.createAddress);

// Update an address
router.put('/:id', AddressController.updateAddress);

// Delete an address
router.delete('/:id', AddressController.deleteAddress);

// Set as default
router.post('/:id/default', AddressController.setDefaultAddress);

export default router;
