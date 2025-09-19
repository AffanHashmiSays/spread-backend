import express from 'express';
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory
} from '../controllers/categoryController.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { optionalAuth } from '../middleware/optionalAuth.js';
import { cache } from '../middleware/cache.js';

const router = express.Router();

// Cache duration in seconds (3 minutes)
const CACHE_DURATION = 180;

// Only cache the GET categories endpoint
router.get('/', optionalAuth, cache(CACHE_DURATION), listCategories);

// Routes that modify data (no cache invalidation)
router.post('/', protect, adminOnly, createCategory);
router.put('/:id', protect, adminOnly, updateCategory);
router.delete('/:id', protect, adminOnly, deleteCategory);

export default router;