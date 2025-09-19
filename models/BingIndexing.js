import mongoose from 'mongoose';

const bingIndexingSchema = new mongoose.Schema({
  bingApiKey: { type: String, required: true },
  bingSiteUrl: { type: String, required: true }
}, { timestamps: true, versionKey: false });

// Ensure only one document exists
bingIndexingSchema.index({}, { unique: true });

export default mongoose.model('BingIndexing', bingIndexingSchema);
