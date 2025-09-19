import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return res.status(401).json({ error: 'Not authorized, no token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Fetch the full user document
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user.toObject();
    next();
  } catch (err) {
    res.status(401).json({ error: 'Not authorized, token failed' });
  }
};

export const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'ADMIN') {
    next();
  } else {
    res.status(403).json({ error: 'Admin access required' });
  }
}; 