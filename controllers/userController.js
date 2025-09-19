import User from '../models/User.js';
import bcrypt from 'bcryptjs';

export const listUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

export const createUser = async (req, res) => {
  try {
    const { name, email, password, role, assignedCategoryIds, assignedTagIds } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'Email already in use' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed, role, assignedCategoryIds, assignedTagIds });
    res.status(201).json({ id: user._id, name: user.name, email: user.email, role: user.role, assignedCategoryIds: user.assignedCategoryIds, assignedTagIds: user.assignedTagIds });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user' });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { name, email, password, role, assignedCategoryIds, assignedTagIds } = req.body;
    const update = { name, email };
    if (role) update.role = role;
    if (password) update.password = await bcrypt.hash(password, 10);
    if (assignedCategoryIds) update.assignedCategoryIds = assignedCategoryIds;
    if (assignedTagIds) update.assignedTagIds = assignedTagIds;
    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
}; 