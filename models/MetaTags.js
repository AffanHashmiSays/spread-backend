import mongoose from 'mongoose';

const metaTagsSchema = new mongoose.Schema({
  // Basic Meta
  title: { type: String, required: true },
  description: { type: String, required: true },
  author: { type: String, default: '' },
  keywords: { type: [String], default: [] },
  
  // Open Graph / Facebook
  ogTitle: { type: String, default: '' },
  ogDescription: { type: String, default: '' },
  ogUrl: { type: String, default: '' },
  ogType: { type: String, default: 'website' },
  ogImage: { type: String, default: '' },
  ogImageAlt: { type: String, default: '' },
  ogImageWidth: { type: Number, default: 1200 },
  ogImageHeight: { type: Number, default: 630 },
  
  // Twitter
  twitterCard: { type: String, default: 'summary_large_image' },
  twitterTitle: { type: String, default: '' },
  twitterDescription: { type: String, default: '' },
  twitterImage: { type: String, default: '' },
  
  // Additional
  canonicalUrl: { type: String, default: '' },
  robots: { type: String, default: 'index, follow' },
  
  // Page specific (for future use)
  page: { type: String, unique: true, default: 'default' }
}, { 
  timestamps: true,
  versionKey: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create an index for the page field
metaTagsSchema.index({ page: 1 }, { unique: true });

export default mongoose.model('MetaTags', metaTagsSchema);
