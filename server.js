import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { redisClient } from './utils/redis.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import postRoutes from './routes/posts.js';
import mediaRoutes from './routes/media.js';
import categoryRoutes from './routes/categories.js';
import tagRoutes from './routes/tags.js';
import settingsRoutes from './routes/settings.js';
import paymentsRoutes from './routes/payments.js';
import googleDataRoutes from './routes/googleData.js';
import metaTagsRoutes from './routes/metaTags.js';
import bingIndexingRoutes from './routes/bingIndexing.js';
import exampleRoutes from './routes/example.js';
import Category from './models/Category.js';
import Post from './models/Post.js';

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Redis connection
(async () => {
  try {
    await redisClient.connect();
    console.log('Connected to Redis');
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
  }
})();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch((err) => console.error('MongoDB connection error:', err));

// Basic root route
app.get('/', (req, res) => {
  res.send('CRM Backend API is check running');
});

// Example routes (for testing Redis cache)
app.use('/api/example', exampleRoutes);

// Dynamic sitemap index endpoint
app.get('/dunhill.xml', async (req, res) => {
  try {
    const BASE_URL = process.env.FRONTEND_URL || 'https://spreadtheword.fr';
    
    // Helper function to escape XML characters
    const escapeXml = (unsafe) => {
      if (!unsafe) return '';
      return unsafe.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    };

    const currentDate = new Date().toISOString();

    const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${escapeXml(BASE_URL)}/post-sitemap.xml</loc>
    <lastmod>${currentDate}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${escapeXml(BASE_URL)}/categories-sitemap.xml</loc>
    <lastmod>${currentDate}</lastmod>
  </sitemap>
</sitemapindex>`;
    
    res.header('Content-Type', 'application/xml');
    res.send(sitemapIndex);
  } catch (err) {
    console.error('[ERROR] Failed to generate sitemap index:', err);
    res.status(500).send('Failed to generate sitemap index');
  }
});

// Posts sitemap endpoint
app.get('/post-sitemap.xml', async (req, res) => {
  try {
    const BASE_URL = process.env.FRONTEND_URL || 'https://spreadtheword.fr';
    
    // Helper function to escape XML characters
    const escapeXml = (unsafe) => {
      if (!unsafe) return '';
      return unsafe.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    };

    // Helper function to count images in content
    const countImages = (content) => {
      if (!content) return 0;
      const imgMatches = content.match(/<img[^>]*>/gi);
      return imgMatches ? imgMatches.length : 0;
    };

    // Helper function to extract image URLs from content
    const extractImageUrls = (content) => {
      if (!content) return [];
      const imgMatches = content.match(/<img[^>]+src=["']([^"'>]+)["']/gi);
      if (!imgMatches) return [];
      
      return imgMatches.map(match => {
        const srcMatch = match.match(/src=["']([^"'>]+)["']/i);
        return srcMatch ? srcMatch[1] : null;
      }).filter(Boolean);
    };
    
    // Fetch all published posts
    const posts = await Post.find({ status: 'published' })
      .select('slug title content updatedAt createdAt featured')
      .sort({ createdAt: -1 });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${posts.map(post => {
  const imageUrls = extractImageUrls(post.content);
  const imageCount = countImages(post.content);
  const priority = post.featured ? '0.9' : '0.6';
  
  return `  <url>
    <loc>${escapeXml(BASE_URL)}/${escapeXml(post.slug)}</loc>
    <lastmod>${post.updatedAt ? post.updatedAt.toISOString() : post.createdAt.toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${priority}</priority>${imageUrls.length > 0 ? '\n' + imageUrls.map(imageUrl => `    <image:image>
      <image:loc>${escapeXml(imageUrl)}</image:loc>
      <image:title>${escapeXml(post.title)}</image:title>
    </image:image>`).join('\n') : ''}
  </url>`;
}).join('\n')}
</urlset>`;
    
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) {
    console.error('[ERROR] Failed to generate posts sitemap:', err);
    res.status(500).send('Failed to generate posts sitemap');
  }
});

// Categories sitemap endpoint
app.get('/categories-sitemap.xml', async (req, res) => {
  try {
    console.log('[DEBUG] Starting categories sitemap generation...');
    const BASE_URL = process.env.FRONTEND_URL || 'https://spreadtheword.fr';
    
    // Helper function to escape XML characters
    const escapeXml = (unsafe) => {
      if (!unsafe) return '';
      return unsafe.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    };
    
    console.log('[DEBUG] Fetching categories from database...');
    // Fetch all categories
    const categories = await Category.find({}, '_id slug name parentId updatedAt createdAt');
    console.log(`[DEBUG] Found ${categories.length} categories`);

    // Build a map of categories by _id for easy lookup
    const categoryMap = {};
    categories.forEach(cat => {
      categoryMap[cat._id.toString()] = cat;
    });

    // Helper to get full path for a category (handles parent/subcategory)
    function getCategoryPath(cat) {
      if (!cat.parentId) return `/${cat.slug}`;
      const parent = categoryMap[cat.parentId.toString()];
      if (parent) return `/${parent.slug}/${cat.slug}`;
      return `/${cat.slug}`;
    }

    let urls = [];

    console.log('[DEBUG] Processing categories...');
    // Add all category and subcategory URLs
    categories.forEach(cat => {
      const isSubcategory = !!cat.parentId;
      // Handle missing timestamp fields by using current date as fallback
      const lastmod = cat.updatedAt || cat.createdAt || new Date();
      urls.push({
        url: getCategoryPath(cat),
        priority: isSubcategory ? '0.7' : '0.8', // Main categories have higher priority
        changefreq: 'weekly',
        lastmod: lastmod,
        name: cat.name,
        slug: cat.slug,
        isSubcategory
      });
    });

    console.log(`[DEBUG] Generated ${urls.length} URLs`);
    console.log('[DEBUG] Generating XML...');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(item => `  <url>
    <loc>${escapeXml(BASE_URL + item.url)}</loc>
    <lastmod>${item.lastmod.toISOString()}</lastmod>
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
  </url>`).join('\n')}
</urlset>`;
    
    console.log('[DEBUG] XML generated successfully, sending response...');
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) {
    console.error('[ERROR] Failed to generate categories sitemap:', err);
    console.error('[ERROR] Error details:', err.message);
    console.error('[ERROR] Stack trace:', err.stack);
    res.status(500).send('Failed to generate categories sitemap');
  }
});

// Keep the original sitemap.xml for backward compatibility (redirect to dunhill)
app.get('/sitemap.xml', (req, res) => {
  res.redirect(301, '/dunhill.xml');
});

// robots.txt endpoint
app.get('/robots.txt', (req, res) => {
  const robotsTxt = `User-agent: *
Allow: /
Disallow: /dashboard/
Disallow: /login
Disallow: /register
Disallow: /api/`;

  res.header('Content-Type', 'text/plain');
  res.send(robotsTxt);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Static file serving and API routes
app.use('/uploads', express.static('backend/uploads'));
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/google-data', googleDataRoutes);
app.use('/api/meta-tags', metaTagsRoutes);
app.use('/api/bing-indexing', bingIndexingRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

