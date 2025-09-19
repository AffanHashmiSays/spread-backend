import mongoose from 'mongoose';

const postSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  excerpt: { type: String },
  status: { type: String, enum: ['draft', 'published'], default: 'draft' },
  categoryIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  tagIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag' }],
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // SEO Meta Tags
  metaTitle: { type: String}, // Optimal length for title tags
  metaDescription: { type: String, maxlength: 160 }, // Optimal length for meta descriptions
  metaKeywords: { type: String }, // Comma-separated keywords
  metaImage: { type: String }, // URL to the featured image for social sharing
  canonicalUrl: { type: String }, // Canonical URL for SEO
  
  // Open Graph Meta Tags
  ogTitle: { type: String },
  ogDescription: { type: String, maxlength: 160 },
  ogImage: { type: String },
  ogType: { type: String, default: 'article' },
  
  // Twitter Card Meta Tags
  twitterTitle: { type: String, maxlength: 150 },
  twitterDescription: { type: String, maxlength: 200 },
  twitterImage: { type: String },
  twitterCard: { type: String, enum: ['summary', 'summary_large_image', 'app', 'player'], default: 'summary_large_image' },
  
  // Additional SEO fields
  focusKeyword: { type: String }, // Primary SEO keyword
  readingTime: { type: Number }, // Estimated reading time in minutes
  featured: { type: Boolean, default: false }, // Featured post flag
  
}, { timestamps: true });

// Index for better performance on slug queries
postSchema.index({ slug: 1 });
postSchema.index({ status: 1, createdAt: -1 });
postSchema.index({ categoryIds: 1, status: 1 });

export default mongoose.model('Post', postSchema);
