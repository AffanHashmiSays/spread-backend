import mongoose from 'mongoose';

const mediaSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  url: { type: String, required: true },
  type: { type: String, required: true },
  size: { type: Number, required: true },
  uploadedAt: { type: Date, default: Date.now },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

export default mongoose.model('Media', mediaSchema); 