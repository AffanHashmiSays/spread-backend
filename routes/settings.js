import express from 'express';
import { getSettings, updateSettings, getFooter, updateFooter, createFooter } from '../controllers/settingController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, adminOnly, getSettings);
router.put('/', protect, adminOnly, updateSettings);
router.get('/footer', getFooter);
router.post('/footer', protect, adminOnly, createFooter);
router.put('/footer', protect, adminOnly, updateFooter);

export default router; 