import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['ADMIN', 'EDITOR', 'USER', 'AUTHOR', 'PUBLISHER'], default: 'USER' },
  avatar: { type: String },
  assignedCategoryIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  assignedTagIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag' }],
  // Subscription fields
  subscriptionType: { type: String, enum: ['basic', 'standard', 'premium', 'none'], default: 'none' },
  subscriptionStatus: { type: String, enum: ['active', 'inactive', 'expired'], default: 'inactive' },
  subscriptionStart: { type: Date },
  subscriptionEnd: { type: Date },
  postsThisPeriod: { type: Number, default: 0 },
  lastPostReset: { type: Date },
}, { timestamps: true });

export default mongoose.model('User', userSchema); 