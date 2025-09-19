import MetaTags from '../models/MetaTags.js';

// @desc    Get meta tags for a page
// @route   GET /api/meta-tags/:page?
// @access  Public
export const getMetaTags = async (req, res) => {
  try {
    const { page = 'default' } = req.params;
    const metaTags = await MetaTags.findOne({ page });
    
    if (!metaTags) {
      return res.status(404).json({
        success: false,
        message: 'Meta tags not found',
        data: null
      });
    }
    
    res.json({
      success: true,
      data: metaTags
    });
  } catch (error) {
    console.error('Error getting meta tags:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Create or update meta tags for a page
// @route   POST /api/meta-tags/:page?
// @access  Private/Admin
export const updateMetaTags = async (req, res) => {
  try {
    const { page = 'default' } = req.params;
    const {
      title,
      description,
      author,
      keywords,
      ogTitle,
      ogDescription,
      ogUrl,
      ogType,
      ogImage,
      ogImageAlt,
      ogImageWidth,
      ogImageHeight,
      twitterCard,
      twitterTitle,
      twitterDescription,
      twitterImage,
      canonicalUrl,
      robots
    } = req.body;

    // Validate required fields
    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Title and description are required'
      });
    }

    // Create or update meta tags
    const metaTags = await MetaTags.findOneAndUpdate(
      { page },
      {
        title,
        description,
        author,
        keywords: Array.isArray(keywords) ? keywords : [],
        ogTitle: ogTitle || title,
        ogDescription: ogDescription || description,
        ogUrl,
        ogType: ogType || 'website',
        ogImage,
        ogImageAlt: ogImageAlt || ogTitle || title,
        ogImageWidth,
        ogImageHeight,
        twitterCard,
        twitterTitle: twitterTitle || title,
        twitterDescription: twitterDescription || description,
        twitterImage: twitterImage || ogImage,
        canonicalUrl,
        robots,
        page
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({
      success: true,
      message: 'Meta tags updated successfully',
      data: metaTags
    });
  } catch (error) {
    console.error('Error updating meta tags:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Delete meta tags for a page
// @route   DELETE /api/meta-tags/:page
// @access  Private/Admin
export const deleteMetaTags = async (req, res) => {
  try {
    const { page } = req.params;
    
    // Prevent deletion of default meta tags
    if (page === 'default') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete default meta tags'
      });
    }

    const result = await MetaTags.deleteOne({ page });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Meta tags not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Meta tags deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting meta tags:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};
