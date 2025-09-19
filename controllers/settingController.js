import Setting from '../models/Setting.js';

export const getSettings = async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = await Setting.create({});
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
};

export const updateSettings = async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = await Setting.create({});
    }
    Object.assign(settings, req.body);
    await settings.save();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
};

export const getFooter = async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = await Setting.create({});
    }
    res.json({ footerContent: settings.footerContent || '' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch footer content' });
  }
};

export const updateFooter = async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = await Setting.create({});
    }
    settings.footerContent = req.body.footerContent || '';
    await settings.save();
    res.json({ footerContent: settings.footerContent });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update footer content' });
  }
};

export const createFooter = async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = await Setting.create({ footerContent: req.body.footerContent || '' });
    } else {
      settings.footerContent = req.body.footerContent || '';
      await settings.save();
    }
    res.status(201).json({ footerContent: settings.footerContent });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create footer content' });
  }
}; 