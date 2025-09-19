import { redisClient } from '../utils/redis.js';

/**
 * Cache middleware for Express routes
 * @param {number} ttl - Time to live in seconds (default: 1 hour)
 * @returns {Function} Express middleware function
 */
export const cache = (ttl = 3600) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const key = `cache:${req.originalUrl || req.url}`;
    
    try {
      // Try to get cached data
      const cachedData = await redisClient.get(key);
      
      if (cachedData) {
        console.log('Serving from cache:', key);
        return res.json(cachedData);
      }

      // If no cache hit, override res.json to cache the response
      const originalJson = res.json;
      res.json = (body) => {
        // Don't cache error responses
        if (res.statusCode < 400) {
          redisClient.set(key, body, ttl).catch(console.error);
        }
        return originalJson.call(res, body);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

/**
 * Middleware to clear cache for specific keys or patterns
 */
export const clearCache = (patterns = []) => {
  return async (req, res, next) => {
    try {
      if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE') {
        const client = await redisClient.connect();
        
        if (patterns.length === 0) {
          // If no patterns provided, clear all cache
          await redisClient.flush();
          return next();
        }

        // Process each pattern
        for (const pattern of patterns) {
          try {
            // Remove 'cache:' prefix if present
            const cleanPattern = pattern.startsWith('cache:') ? pattern.substring(6) : pattern;
            
            // If it's a wildcard pattern, we need to scan and delete matching keys
            if (cleanPattern.includes('*')) {
              // Convert Redis glob pattern to RegExp
              const regexPattern = cleanPattern
                .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
                .replace(/\*/g, '.*');
              
              const regex = new RegExp(`^${regexPattern}$`);
              let cursor = '0';
              
              do {
                // Use SCAN to find keys matching the pattern
                const [newCursor, keys] = await client.scan(
                  cursor,
                  'MATCH', `cache:${cleanPattern.replace('*', '\*')}`
                );
                
                cursor = newCursor;
                
                // Delete all matching keys
                if (keys.length > 0) {
                  await client.del(keys);
                }
              } while (cursor !== '0');
            } else {
              // For exact matches, just delete the key
              await redisClient.del(`cache:${cleanPattern}`);
            }
          } catch (error) {
            console.error(`Error clearing cache for pattern ${pattern}:`, error);
          }
        }
      }
      next();
    } catch (error) {
      console.error('Clear cache error:', error);
      next();
    }
  };
};
