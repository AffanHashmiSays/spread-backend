import express from 'express';
import { cache, clearCache } from '../middleware/cache.js';
import { redisClient } from '../utils/redis.js';

const router = express.Router();

// Example of a cached GET endpoint
router.get('/cached-data', cache(600), async (req, res) => {
  // This is a mock database call that would be cached
  const data = {
    message: 'This data is cached for 10 minutes',
    timestamp: new Date().toISOString()
  };
  
  res.json(data);
});

// Example of a POST endpoint that clears specific cache
router.post('/update-data', clearCache(['cache:/api/data']), async (req, res) => {
  // Process the update...
  
  res.json({ 
    success: true, 
    message: 'Data updated and cache cleared',
    timestamp: new Date().toISOString()
  });
});

// Utility endpoint to flush all Redis cache (for testing/development)
router.get('/flush-cache', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Not allowed in production' });
  }
  
  await redisClient.flush();
  res.json({ message: 'Cache flushed successfully' });
});

export default router;
