import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const optionalAuth = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // Fetch the full user document
      const user = await User.findById(decoded.id);
      req.user = user ? user.toObject() : undefined;
    } catch (err) {
      req.user = undefined;
    }
  }
  next();
}; 