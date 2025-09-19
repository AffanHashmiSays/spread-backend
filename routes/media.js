import express from 'express';
import multer from 'multer';
import path from 'path';
import { listMedia, uploadMedia, deleteMedia } from '../controllers/mediaController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Set up multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  },
});
const upload = multer({ storage });

router.get('/', listMedia);
router.post('/', protect, upload.single('file'), uploadMedia);
router.delete('/:id', protect, deleteMedia);

export default router; 