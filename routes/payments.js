import express from 'express';
import { createPayment, cryptomusWebhook } from '../controllers/paymentController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// User initiates a payment
router.post('/create', protect, createPayment);
// Cryptomus webhook
router.post('/webhook', cryptomusWebhook);

export default router; 