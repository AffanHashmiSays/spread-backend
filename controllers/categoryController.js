import Category from '../models/Category.js';

export const listCategories = async (req, res) => {
  try {
    const filter = {};
    if (req.query.parentId !== undefined) {
      filter.parentId = req.query.parentId || null;
    }
    // If not admin, only return assigned categories
    if (req.user && req.user.role !== 'ADMIN') {
      filter._id = { $in: req.user.assignedCategoryIds || [] };
    }
    const categories = await Category.find(filter).sort({ name: 1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

export const createCategory = async (req, res) => {
  try {
    const { name, slug, parentId } = req.body;
    if (!name || !slug) return res.status(400).json({ error: 'Name and slug are required' });
    const exists = await Category.findOne({ slug });
    if (exists) return res.status(409).json({ error: 'Slug already exists' });
    const category = await Category.create({ name, slug, parentId: parentId || null });
    res.status(201).json(category);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create category' });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { name, slug, parentId } = req.body;
    const update = { name, slug };
    if (parentId !== undefined) update.parentId = parentId;
    const category = await Category.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!category) return res.status(404).json({ error: 'Category not found' });
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update category' });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ error: 'Category not found' });
    res.json({ message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete category' });
  }
}; 