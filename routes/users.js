import express from 'express';
import {
  listUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser
} from '../controllers/userController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// Add staffOnly middleware
function staffOnly(req, res, next) {
  const allowedRoles = ['ADMIN', 'EDITOR', 'AUTHOR', 'PUBLISHER'];
  console.log('[DEBUG] req.user:', req.user.role);
  if (req.user && allowedRoles.includes(req.user.role)) {
    return next();
  }
  return res.status(403).json({ error: 'Staff access required' });
}

router.get('/', protect, staffOnly, listUsers);
router.get('/:id', protect, staffOnly, getUser);
router.post('/', protect, staffOnly, createUser);
router.put('/:id', protect, staffOnly, updateUser); // allow self or staff (frontend should restrict)
router.delete('/:id', protect, adminOnly, deleteUser);

export default router; 