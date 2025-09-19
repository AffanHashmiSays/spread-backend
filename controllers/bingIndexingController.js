import BingIndexing from '../models/BingIndexing.js';

// @desc    Get Bing Indexing settings
// @route   GET /api/bing-indexing
// @access  Private/Admin
export const getBingIndexing = async (req, res) => {
  try {
    const data = await BingIndexing.findOne();
    if (!data) {
      return res.status(404).json({ message: 'No Bing Indexing data found', data: null });
    }
    res.json(data);
  } catch (error) {
    console.error('Error getting Bing Indexing data:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Create or update Bing Indexing settings
// @route   POST /api/bing-indexing
// @access  Private/Admin
export const updateBingIndexing = async (req, res) => {
  try {
    const { bingApiKey, bingSiteUrl } = req.body;
    if (!bingApiKey || !bingSiteUrl) {
      return res.status(400).json({ message: 'Please provide both bingApiKey and bingSiteUrl' });
    }
    let data = await BingIndexing.findOne();
    if (data) {
      data.bingApiKey = bingApiKey;
      data.bingSiteUrl = bingSiteUrl;
      await data.save();
    } else {
      data = await BingIndexing.create({ bingApiKey, bingSiteUrl });
    }
    res.status(200).json({
      message: 'Bing Indexing data updated successfully',
      data: {
        id: data._id,
        bingApiKey: data.bingApiKey,
        bingSiteUrl: data.bingSiteUrl,
        updatedAt: data.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating Bing Indexing data:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};
