import express from 'express';
import {
  listPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  getPostBySlug,
  getPostsByCategory,
  getPostMeta,
  getFeaturedPosts
} from '../controllers/postController.js';
import { protect } from '../middleware/auth.js';
import { optionalAuth } from '../middleware/optionalAuth.js';
import { cache } from '../middleware/cache.js';

const router = express.Router();

// Cache duration in seconds (3 minutes)
const CACHE_DURATION = 180;

// Cache the main posts list endpoint
router.get('/', optionalAuth, cache(CACHE_DURATION), listPosts);

// Other routes (not cached)
router.get('/featured', optionalAuth, getFeaturedPosts);
router.get('/slug/:slug', optionalAuth, getPostBySlug);
router.get('/meta/:slug', optionalAuth, getPostMeta);
router.get('/:id', optionalAuth, getPost);
router.get('/by-category/:slug', optionalAuth, getPostsByCategory);

// Routes that modify data (no cache invalidation)
router.post('/', protect, createPost);
router.put('/:id', protect, updatePost);
router.delete('/:id', protect, deletePost);

export default router;