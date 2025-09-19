import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

// Use environment variables with fallback to your provided credentials
const redisConfig = {
  username: process.env.REDIS_USERNAME || 'default',
  password: process.env.REDIS_PASSWORD || 'xZPFEpMK6lLhT7D20yr0NfKhfPXNrE4u',
  socket: {
    host: process.env.REDIS_HOST || 'redis-18143.c339.eu-west-3-1.ec2.redns.redis-cloud.com',
    port: parseInt(process.env.REDIS_PORT || '18143')
  }
};

class RedisClient {
  constructor() {
    this.client = createClient(redisConfig);
    this.client.on('error', (err) => console.error('Redis Client Error', err));
    this.isConnected = false;
  }

  async connect() {
    if (!this.isConnected) {
      await this.client.connect();
      this.isConnected = true;
      console.log('Connected to Redis');
    }
    return this.client;
  }

  async get(key) {
    try {
      const client = await this.connect();
      const value = await client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  async set(key, value, ttl = 3600) { // Default TTL: 1 hour
    try {
      const client = await this.connect();
      const stringValue = JSON.stringify(value);
      if (ttl) {
        return await client.setEx(key, ttl, stringValue);
      }
      return await client.set(key, stringValue);
    } catch (error) {
      console.error('Redis set error:', error);
      return null;
    }
  }

  async del(key) {
    try {
      const client = await this.connect();
      return await client.del(key);
    } catch (error) {
      console.error('Redis delete error:', error);
      return 0;
    }
  }

  async flush() {
    try {
      const client = await this.connect();
      return await client.flushDb();
    } catch (error) {
      console.error('Redis flush error:', error);
      return 'Error flushing database';
    }
  }
}

// Create a singleton instance
export const redisClient = new RedisClient();

// Handle application termination
process.on('SIGINT', async () => {
  if (redisClient.isConnected) {
    await redisClient.client.quit();
    console.log('Redis connection closed');
  }
  process.exit(0);
});

export default redisClient;
