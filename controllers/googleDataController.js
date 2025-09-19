import GoogleData from '../models/GoogleData.js';

// @desc    Get Google Data
// @route   GET /api/google-data
// @access  Private/Admin
export const getGoogleData = async (req, res) => {
  try {
    const data = await GoogleData.findOne();
    if (!data) {
      return res.status(404).json({ 
        message: 'No Google Data found',
        data: null 
      });
    }
    res.json(data);
  } catch (error) {
    console.error('Error getting Google Data:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update Google Data
// @route   POST /api/google-data
// @access  Private/Admin
export const updateGoogleData = async (req, res) => {
  try {
    const { client_email, private_key } = req.body;
    
    if (!client_email || !private_key) {
      return res.status(400).json({ message: 'Please provide both client_email and private_key' });
    }

    // Get the existing data or create a new one
    let data = await GoogleData.findOne();
    
    if (data) {
      // Update existing
      data.client_email = client_email;
      data.private_key = private_key;
      await data.save();
    } else {
      // Create new
      data = await GoogleData.create({ client_email, private_key });
    }

    res.status(200).json({
      message: 'Google Data updated successfully',
      data: {
        id: data._id,
        client_email: data.client_email,
        updatedAt: data.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating Google Data:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};
