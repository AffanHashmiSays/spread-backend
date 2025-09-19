import express from 'express';
import { getBingIndexing, updateBingIndexing } from '../controllers/bingIndexingController.js';

const router = express.Router();

// Public routes - no authentication required

router.route('/')
  .get(getBingIndexing)
  .post(updateBingIndexing);

export default router;
