import mongoose from 'mongoose';

const googleDataSchema = new mongoose.Schema({
  client_email: { type: String, required: true },
  private_key: { type: String, required: true },
}, { timestamps: true, versionKey: false });

// Create a compound index to ensure only one document exists
googleDataSchema.index({ _id: 1 }, { unique: true });

export default mongoose.model('GoogleData', googleDataSchema);
