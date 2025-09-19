import express from 'express';
import { 
  getMetaTags, 
  updateMetaTags, 
  deleteMetaTags 
} from '../controllers/metaTagsController.js';
import { protect, adminOnly as admin } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/:page?', getMetaTags);

// Protected routes (Admin only)
router.use(protect);
router.use(admin);

router.route('/:page?')
  .post(updateMetaTags);

router.route('/:page')
  .delete(deleteMetaTags);

export default router;
