import Tag from '../models/Tag.js';

export const listTags = async (req, res) => {
  try {
    const filter = {};
    // If not admin, only return assigned tags
    if (req.user && req.user.role !== 'ADMIN') {
      filter._id = { $in: req.user.assignedTagIds || [] };
    }
    const tags = await Tag.find(filter).sort({ name: 1 });
    res.json(tags);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
};

export const createTag = async (req, res) => {
  try {
    const { name, slug } = req.body;
    if (!name || !slug) return res.status(400).json({ error: 'Name and slug are required' });
    const exists = await Tag.findOne({ slug });
    if (exists) return res.status(409).json({ error: 'Slug already exists' });
    const tag = await Tag.create({ name, slug });
    res.status(201).json(tag);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create tag' });
  }
};

export const updateTag = async (req, res) => {
  try {
    const { name, slug } = req.body;
    const tag = await Tag.findByIdAndUpdate(req.params.id, { name, slug }, { new: true });
    if (!tag) return res.status(404).json({ error: 'Tag not found' });
    res.json(tag);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update tag' });
  }
};

export const deleteTag = async (req, res) => {
  try {
    const tag = await Tag.findByIdAndDelete(req.params.id);
    if (!tag) return res.status(404).json({ error: 'Tag not found' });
    res.json({ message: 'Tag deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete tag' });
  }
}; 