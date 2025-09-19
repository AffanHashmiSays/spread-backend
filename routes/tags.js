import express from 'express';
import {
  listTags,
  createTag,
  updateTag,
  deleteTag
} from '../controllers/tagController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.get('/', listTags);
router.post('/', protect, adminOnly, createTag);
router.put('/:id', protect, adminOnly, updateTag);
router.delete('/:id', protect, adminOnly, deleteTag);

export default router; 