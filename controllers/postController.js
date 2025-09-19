import Post from '../models/Post.js';
import Category from '../models/Category.js';
import Tag from '../models/Tag.js';
import User from '../models/User.js';

// Helper function to calculate reading time
const calculateReadingTime = (content) => {
  const wordsPerMinute = 200; // Average reading speed
  const words = content.trim().split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
};

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

// Helper function to generate meta fields from content if not provided
const generateMetaFields = (post) => {
  const { title, content, excerpt } = post;
  
  return {
    metaTitle: post.metaTitle || title,
    metaDescription: post.metaDescription || excerpt || content.substring(0, 160).replace(/<[^>]*>/g, ''),
    ogTitle: post.ogTitle || post.metaTitle || title,
    ogDescription: post.ogDescription || post.metaDescription || excerpt || content.substring(0, 160).replace(/<[^>]*>/g, ''),
    twitterTitle: post.twitterTitle || post.metaTitle || title,
    twitterDescription: post.twitterDescription || post.metaDescription || excerpt || content.substring(0, 200).replace(/<[^>]*>/g, ''),
    readingTime: calculateReadingTime(content)
  };
};

export const listPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    let filter = {};
    
    if (!req.user) {
      // Public: show only published posts
      filter.status = 'published';
    } else {
      switch(req.user.role) {
        case 'ADMIN':
          // Admin sees all posts
          break;
        case 'USER':
          // User only sees their own posts
          filter.authorId = req.user._id;
          break;
        default:
          // Staff (EDITOR/AUTHOR/etc): show posts in assigned categories
          const assignedCategories = req.user.assignedCategoryIds || [];
          filter = { status: { $in: ['published', 'draft'] } };
          if (assignedCategories.length > 0) {
            filter.categoryIds = { $all: assignedCategories };
          }
      }
    }

    const totalPosts = await Post.countDocuments(filter);
    const totalPages = Math.ceil(totalPosts / limit);

    const posts = await Post.find(filter)
      .populate('authorId', 'name email role avatar')
      .populate('categoryIds', 'name slug')
      .populate('tagIds', 'name slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
      
    res.json({
      data: posts.map(post => ({
        ...post.toObject(),
        id: post._id.toString(),
      })),
      pagination: {
        currentPage: page,
        totalPages,
        totalPosts,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
};

export const getPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('authorId', 'name email role avatar')
      .populate('categoryIds', 'name slug')
      .populate('tagIds', 'name slug');
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const mappedPost = {
      ...post.toObject(),
      id: post._id.toString(),
    };
    res.json(mappedPost);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch post' });
  }
};

export const createPost = async (req, res) => {
  try {

    const { 
      title, content, slug, excerpt, status, categoryIds, tagIds,
      // SEO Meta Tags
      metaTitle, metaDescription, metaKeywords, metaImage, canonicalUrl,
      // Open Graph Meta Tags
      ogTitle, ogDescription, ogImage, ogType,
      // Twitter Card Meta Tags
      twitterTitle, twitterDescription, twitterImage, twitterCard,
      // Additional SEO fields
      focusKeyword, featured
    } = req.body;
    
    if (!title || !content || !slug) {
      return res.status(400).json({ error: 'Title, content, and slug are required' });
    }

    // Restrict non-admins to only assigned categories/tags
    if (req.user && req.user.role !== 'ADMIN') {
      // Subscription enforcement for USER role
      if (req.user.role === 'USER') {
        const user = await User.findById(req.user._id);
        if (!user) {
          return res.status(403).json({ error: 'User not found' });
        }
        // Check subscription status
        if (user.subscriptionStatus !== 'active') {
          return res.status(403).json({ error: 'No active subscription. Please purchase a subscription to create posts.' });
        }
        // Subscription logic
        const now = new Date();
        let allowed = false;
        let limit = 0;
        let periodReset = false;
        if (user.subscriptionType === 'basic') {
          limit = 1;
          if (user.postsThisPeriod >= 1) {
            return res.status(403).json({ error: 'Basic subscription allows only 1 post. Please purchase again to create another post.' });
          }
          allowed = true;
        } else if (user.subscriptionType === 'standard') {
          limit = 3;
          // Reset monthly if needed
          if (!user.lastPostReset || (now.getMonth() !== user.lastPostReset.getMonth() || now.getFullYear() !== user.lastPostReset.getFullYear())) {
            user.postsThisPeriod = 0;
            user.lastPostReset = now;
            periodReset = true;
          }
          if (user.postsThisPeriod >= 3) {
            return res.status(403).json({ error: 'Standard subscription allows only 3 posts per month. Please wait until next month or upgrade.' });
          }
          // Check subscription period
          if (!user.subscriptionEnd || now > user.subscriptionEnd) {
            user.subscriptionStatus = 'expired';
            await user.save();
            return res.status(403).json({ error: 'Your standard subscription has expired. Please renew to continue posting.' });
          }
          allowed = true;
        } else if (user.subscriptionType === 'premium') {
          limit = 10;
          // Reset monthly if needed
          if (!user.lastPostReset || (now.getMonth() !== user.lastPostReset.getMonth() || now.getFullYear() !== user.lastPostReset.getFullYear())) {
            user.postsThisPeriod = 0;
            user.lastPostReset = now;
            periodReset = true;
          }
          if (user.postsThisPeriod >= 10) {
            return res.status(403).json({ error: 'Premium subscription allows only 10 posts per month. Please wait until next month or renew.' });
          }
          // Check subscription period
          if (!user.subscriptionEnd || now > user.subscriptionEnd) {
            user.subscriptionStatus = 'expired';
            await user.save();
            return res.status(403).json({ error: 'Your premium subscription has expired. Please renew to continue posting.' });
          }
          allowed = true;
        } else {
          return res.status(403).json({ error: 'No valid subscription. Please purchase a subscription to create posts.' });
        }
        if (!allowed) {
          return res.status(403).json({ error: 'Subscription does not allow posting.' });
        }
        // Increment post count and update status if needed
        user.postsThisPeriod = (user.postsThisPeriod || 0) + 1;
        if (user.subscriptionType === 'basic' && user.postsThisPeriod >= 1) {
          user.subscriptionStatus = 'inactive';
        }
        await user.save();
      }
      const assignedCategories = (req.user.assignedCategoryIds || []).map(id => 
        id._id ? id._id.toString() : id.toString()
      );

      const assignedTags = (req.user.assignedTagIds || []).map(id => 
        id._id ? id._id.toString() : id.toString()
      );

      const invalidCategories = categoryIds ? categoryIds.filter(id => !assignedCategories.includes(id)) : [];
      const invalidTags = tagIds ? tagIds.filter(id => !assignedTags.includes(id)) : [];

      if (invalidCategories.length > 0 || invalidTags.length > 0) {
        return res.status(403).json({ error: 'You can only create posts in your assigned categories/tags' });
      }
    }

    // Prepare post data with meta fields
    const postData = {
      title,
      content,
      slug,
      excerpt,
      status,
      categoryIds,
      tagIds,
      authorId: req.user._id,
      // SEO Meta Tags
      metaTitle,
      metaDescription,
      metaKeywords,
      metaImage,
      canonicalUrl,
      // Open Graph Meta Tags
      ogTitle,
      ogDescription,
      ogImage,
      ogType,
      // Twitter Card Meta Tags
      twitterTitle,
      twitterDescription,
      twitterImage,
      twitterCard,
      // Additional SEO fields
      focusKeyword,
      featured: featured || false
    };

    // Generate missing meta fields
    const generatedMeta = generateMetaFields(postData);
    Object.assign(postData, generatedMeta);

    const post = await Post.create(postData);
    
    const mappedPost = {
      ...post.toObject(),
      id: post._id.toString(),
    };
    res.status(201).json(mappedPost);
  } catch (err) {
    console.error('[ERROR] Post creation failed:', err);
    res.status(500).json({ error: 'Failed to create post' });
  }
};

export const updatePost = async (req, res) => {
  try {
    const { 
      title, content, slug, excerpt, status, categoryIds, tagIds,
      // SEO Meta Tags
      metaTitle, metaDescription, metaKeywords, metaImage, canonicalUrl,
      // Open Graph Meta Tags
      ogTitle, ogDescription, ogImage, ogType,
      // Twitter Card Meta Tags
      twitterTitle, twitterDescription, twitterImage, twitterCard,
      // Additional SEO fields
      focusKeyword, featured
    } = req.body;
    
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.authorId.toString() !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    // Update basic fields
    post.title = title ?? post.title;
    post.content = content ?? post.content;
    post.slug = slug ?? post.slug;
    post.excerpt = excerpt ?? post.excerpt;
    post.status = status ?? post.status;
    post.categoryIds = categoryIds ?? post.categoryIds;
    post.tagIds = tagIds ?? post.tagIds;
    
    // Update SEO Meta Tags
    post.metaTitle = metaTitle ?? post.metaTitle;
    post.metaDescription = metaDescription ?? post.metaDescription;
    post.metaKeywords = metaKeywords ?? post.metaKeywords;
    post.metaImage = metaImage ?? post.metaImage;
    post.canonicalUrl = canonicalUrl ?? post.canonicalUrl;
    
    // Update Open Graph Meta Tags
    post.ogTitle = ogTitle ?? post.ogTitle;
    post.ogDescription = ogDescription ?? post.ogDescription;
    post.ogImage = ogImage ?? post.ogImage;
    post.ogType = ogType ?? post.ogType;
    
    // Update Twitter Card Meta Tags
    post.twitterTitle = twitterTitle ?? post.twitterTitle;
    post.twitterDescription = twitterDescription ?? post.twitterDescription;
    post.twitterImage = twitterImage ?? post.twitterImage;
    post.twitterCard = twitterCard ?? post.twitterCard;
    
    // Update Additional SEO fields
    post.focusKeyword = focusKeyword ?? post.focusKeyword;
    post.featured = featured ?? post.featured;
    
    // Regenerate meta fields if content changed
    if (content || title) {
      const generatedMeta = generateMetaFields(post.toObject());
      if (!post.metaTitle) post.metaTitle = generatedMeta.metaTitle;
      if (!post.metaDescription) post.metaDescription = generatedMeta.metaDescription;
      if (!post.ogTitle) post.ogTitle = generatedMeta.ogTitle;
      if (!post.ogDescription) post.ogDescription = generatedMeta.ogDescription;
      if (!post.twitterTitle) post.twitterTitle = generatedMeta.twitterTitle;
      if (!post.twitterDescription) post.twitterDescription = generatedMeta.twitterDescription;
      post.readingTime = generatedMeta.readingTime;
    }
    
    await post.save();
    const mappedPost = {
      ...post.toObject(),
      id: post._id.toString(),
    };
    res.json(mappedPost);
  } catch (err) {
    console.error('[ERROR] Post update failed:', err);
    res.status(500).json({ error: 'Failed to update post' });
  }
};

export const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.authorId.toString() !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    await post.deleteOne();
    res.json({ message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete post' });
  }
};

export const getPostBySlug = async (req, res) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug })
      .populate('authorId', 'name email role avatar')
      .populate('categoryIds', 'name slug')
      .populate('tagIds', 'name slug');
    if (!post) return res.status(404).json({ error: 'Post not found' });
    
    // Generate missing meta fields if not present
    const generatedMeta = generateMetaFields(post.toObject());
    
    const mappedPost = {
      ...post.toObject(),
      id: post._id.toString(),
      // Ensure meta fields are included with fallbacks
      metaTitle: post.metaTitle || generatedMeta.metaTitle,
      metaDescription: post.metaDescription || generatedMeta.metaDescription,
      ogTitle: post.ogTitle || generatedMeta.ogTitle,
      ogDescription: post.ogDescription || generatedMeta.ogDescription,
      twitterTitle: post.twitterTitle || generatedMeta.twitterTitle,
      twitterDescription: post.twitterDescription || generatedMeta.twitterDescription,
      readingTime: post.readingTime || generatedMeta.readingTime
    };
    res.json(mappedPost);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch post by slug' });
  }
};

export const getPostsByCategory = async (req, res) => {
  try {
    const category = await Category.findOne({ slug: req.params.slug });
    if (!category) return res.status(404).json({ error: 'Category not found' });

    // Helper function to recursively find all descendant category IDs
    async function getAllDescendantCategoryIds(parentId) {
      const children = await Category.find({ parentId });
      let ids = children.map(child => child._id);
      for (const child of children) {
        const subIds = await getAllDescendantCategoryIds(child._id);
        ids = ids.concat(subIds);
      }
      return ids;
    }

    // Get all descendant category IDs
    const descendantIds = await getAllDescendantCategoryIds(category._id);
    const allCategoryIds = [category._id, ...descendantIds];

    const posts = await Post.find({ categoryIds: { $in: allCategoryIds }, status: 'published' })
      .populate('authorId', 'name email role avatar')
      .populate('categoryIds', 'name slug')
      .populate('tagIds', 'name slug');
    res.json(posts.map(post => ({ ...post.toObject(), id: post._id.toString() })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch posts by category' });
  }
};

// New endpoint for fetching post meta data for SEO
export const getPostMeta = async (req, res) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug, status: 'published' })
      .populate('authorId', 'name')
      .populate('categoryIds', 'name slug')
      .populate('tagIds', 'name slug')
      .select('title slug excerpt metaTitle metaDescription metaKeywords metaImage canonicalUrl ogTitle ogDescription ogImage ogType twitterTitle twitterDescription twitterImage twitterCard focusKeyword readingTime featured createdAt updatedAt');
    
    if (!post) return res.status(404).json({ error: 'Post not found' });
    
    // Generate canonical URL if not set
    const baseUrl = process.env.FRONTEND_URL || 'https://handicap-internatioanl.fr';
    const canonicalUrl = post.canonicalUrl || `${baseUrl}/posts/${post.slug}`;
    
    // Prepare meta data response
    const metaData = {
      // Basic post info
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      author: post.authorId?.name,
      categories: post.categoryIds?.map(cat => ({ name: cat.name, slug: cat.slug })) || [],
      tags: post.tagIds?.map(tag => ({ name: tag.name, slug: tag.slug })) || [],
      readingTime: post.readingTime,
      featured: post.featured,
      publishedAt: post.createdAt,
      updatedAt: post.updatedAt,
      
      // SEO Meta Tags
      metaTitle: post.metaTitle || post.title,
      metaDescription: post.metaDescription || post.excerpt,
      metaKeywords: post.metaKeywords,
      metaImage: post.metaImage,
      canonicalUrl,
      
      // Open Graph Meta Tags
      ogTitle: post.ogTitle || post.metaTitle || post.title,
      ogDescription: post.ogDescription || post.metaDescription || post.excerpt,
      ogImage: post.ogImage || post.metaImage,
      ogType: post.ogType || 'article',
      ogUrl: canonicalUrl,
      
      // Twitter Card Meta Tags
      twitterTitle: post.twitterTitle || post.metaTitle || post.title,
      twitterDescription: post.twitterDescription || post.metaDescription || post.excerpt,
      twitterImage: post.twitterImage || post.metaImage,
      twitterCard: post.twitterCard || 'summary_large_image',
      
      // Additional SEO fields
      focusKeyword: post.focusKeyword,
      
      // Structured data for JSON-LD
      structuredData: {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": post.metaTitle || post.title,
        "description": post.metaDescription || post.excerpt,
        "author": {
          "@type": "Person",
          "name": post.authorId?.name
        },
        "datePublished": post.createdAt,
        "dateModified": post.updatedAt,
        "url": canonicalUrl,
        ...(post.metaImage && {
          "image": {
            "@type": "ImageObject",
            "url": post.metaImage
          }
        }),
        "publisher": {
          "@type": "Organization",
          "name": "CRM Platform"
        }
      }
    };
    
    res.json(metaData);
  } catch (err) {
    console.error('[ERROR] Failed to fetch post meta:', err);
    res.status(500).json({ error: 'Failed to fetch post meta data' });
  }
};

// Get featured posts for homepage
export const getFeaturedPosts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 6;
    const posts = await Post.find({ status: 'published', featured: true })
      .populate('authorId', 'name email role avatar')
      .populate('categoryIds', 'name slug')
      .populate('tagIds', 'name slug')
      .sort({ createdAt: -1 })
      .limit(limit);
    
    res.json(posts.map(post => ({ ...post.toObject(), id: post._id.toString() })));
  } catch (err) {
    console.error('[ERROR] Failed to fetch featured posts:', err);
    res.status(500).json({ error: 'Failed to fetch featured posts' });
  }
}; 