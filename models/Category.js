import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
}, {
  timestamps: true // This adds createdAt and updatedAt automatically
});

export default mongoose.model('Category', categorySchema); 