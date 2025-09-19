import express from 'express';
import { getGoogleData, updateGoogleData } from '../controllers/googleDataController.js';

const router = express.Router();

// Public routes - no authentication required

router.route('/')
  .get(getGoogleData)      // GET /api/google-data
  .post(updateGoogleData); // POST /api/google-data

export default router;
