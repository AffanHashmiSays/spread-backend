import Media from '../models/Media.js';
import path from 'path';
import fs from 'fs';

export const listMedia = async (req, res) => {
  try {
    const media = await Media.find().populate('uploadedBy', 'name email role').sort({ uploadedAt: -1 });
    res.json(media);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch media' });
  }
};

export const uploadMedia = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { originalname, filename, mimetype, size } = req.file;
    const url = `/uploads/${filename}`;
    const media = await Media.create({
      filename: originalname,
      url,
      type: mimetype,
      size,
      uploadedBy: req.user.id,
    });
    res.status(201).json(media);
  } catch (err) {
    res.status(500).json({ error: 'Failed to upload media' });
  }
};

export const deleteMedia = async (req, res) => {
  try {
    const media = await Media.findById(req.params.id);
    if (!media) return res.status(404).json({ error: 'Media not found' });
    if (media.uploadedBy.toString() !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    // Delete file from disk
    const filePath = path.join(process.cwd(), 'uploads', path.basename(media.url));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    await media.deleteOne();
    res.json({ message: 'Media deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete media' });
  }
}; 