import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Category from '../models/Category.js';
import Tag from '../models/Tag.js';

export const register = async (req, res) => {
  try {
    const { name, email, password, role = 'USER' } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'Email already in use' });
    }
    
    // Get all categories and tags for USER role
    let assignedCategoryIds = [];
    let assignedTagIds = [];
    if (role === 'USER') {
      const allCategories = await Category.find({}, '_id');
      const allTags = await Tag.find({}, '_id');
      assignedCategoryIds = allCategories.map(c => c._id);
      assignedTagIds = allTags.map(t => t._id);
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ 
      name, 
      email, 
      password: hashed,
      role,
      assignedCategoryIds,
      assignedTagIds,
      subscriptionType: 'none',
      subscriptionStatus: 'inactive',
      postsThisPeriod: 0,
      lastPostReset: null,
      subscriptionStart: null,
      subscriptionEnd: null
    });
    
    res.status(201).json({ 
      message: 'User registered', 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role 
      } 
    });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign(
      { 
        id: user._id, 
        role: user.role,
        assignedCategoryIds: user.assignedCategoryIds,
        assignedTagIds: user.assignedTagIds
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );
    res.json({ 
      token, 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role, 
        avatar: user.avatar,
        assignedCategoryIds: user.assignedCategoryIds,
        assignedTagIds: user.assignedTagIds
      } 
    });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
};

export const getMe = async (req, res) => {
  try {
    if (!req.user) return res.status(404).json({ error: 'User not found' });
    const { password, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get user' });
  }
}; 