import { MongoClient } from 'mongodb';
import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const config = {
  mongoUri: process.env.MONGODB_URI,
  webhookUrl: 'https://handicap-internatioanl.fr/api/webhook/new-post',
  webhookSecret: 'Qw7!pZ2#rT9$kLm8@vX4^sB1&nH6*eJ3', // Hardcoded secret
  collectionName: 'posts'
};

// Log the configuration
console.log('Webhook Configuration:', {
  webhookUrl: config.webhookUrl,
  webhookSecret: '***' + config.webhookSecret.slice(-4) + '***', // Only show last 4 chars for security
  collectionName: config.collectionName
});

// Extract database name from MONGODB_URI if not provided
if (!process.env.DB_NAME) {
  const dbMatch = config.mongoUri.match(/\/([^/?]+)(?:\?|$)/);
  config.dbName = dbMatch ? dbMatch[1] : 'crm';
}

// Configure axios with a timeout and retry logic
const http = axios.create({
  timeout: 10000, // 10 seconds
  headers: {
    'Content-Type': 'application/json',
    'X-WEBHOOK-SECRET': config.webhookSecret.trim() // Ensure no whitespace
  }
});

// Add request interceptor for logging
http.interceptors.request.use(request => {
  logger.info('Sending webhook request', {
    url: request.url,
    headers: {
      'Content-Type': request.headers['Content-Type'],
      'X-WEBHOOK-SECRET': '***' + (config.webhookSecret ? config.webhookSecret.slice(-4) : 'none') + '***',
      'Content-Length': request.headers['Content-Length']
    },
    method: request.method,
    data: request.data
  });
  return request;
});

// Add response interceptor for logging
http.interceptors.response.use(
  response => {
    logger.info('Webhook response received', {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data
    });
    return response;
  },
  error => {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      logger.error('Webhook error response', {
        status: error.response.status,
        statusText: error.response.statusText,
        headers: error.response.headers,
        data: error.response.data,
        config: {
          url: error.config.url,
          method: error.config.method,
          headers: {
            'Content-Type': error.config.headers['Content-Type'],
            'X-WEBHOOK-SECRET': '***' + (config.webhookSecret ? config.webhookSecret.slice(-4) : 'none') + '***'
          }
        }
      });
    } else if (error.request) {
      // The request was made but no response was received
      logger.error('No response received from webhook', {
        message: error.message,
        code: error.code,
        config: {
          url: error.config.url,
          method: error.config.method,
          headers: error.config.headers
        }
      });
    } else {
      // Something happened in setting up the request that triggered an Error
      logger.error('Error setting up webhook request', {
        message: error.message,
        stack: error.stack
      });
    }
    return Promise.reject(error);
  }
);

// Logging helper
const logger = {
  info: (message, data = {}) => {
    // Only log if there's data or a non-empty message
    if (message || Object.keys(data).length > 0) {
      console.log(`[${new Date().toISOString()}] ${message}`, JSON.stringify(data));
    }
  },
  error: (message, error = {}) => {
    console.error(`[${new Date().toISOString()}] ERROR: ${message}`, error.message || error);
  }
};

// Process change event
async function processChange(change) {
  try {
    // Only process insert operations
    if (change.operationType === 'insert') {
      const post = change.fullDocument;
      
      // Prepare minimal webhook payload with just the slug
      const payload = {
        post: {
          slug: post.slug
        }
      };

      // Send webhook
      try {
        const response = await http.post(config.webhookUrl, payload);
        logger.info('Webhook sent successfully', { 
          slug: post.slug,
          status: response.status,
          url: config.webhookUrl
        });
      } catch (error) {
        const errorDetails = {
          slug: post.slug,
          status: error.response?.status,
          error: error.message,
          url: config.webhookUrl
        };
        
        if (error.code === 'ECONNREFUSED') {
          errorDetails.message = 'Connection refused. Is the webhook server running?';
        } else if (error.code === 'ENOTFOUND') {
          errorDetails.message = 'Webhook host not found. Check the domain in WEBHOOK_URL.';
        } else if (error.code === 'ECONNABORTED') {
          errorDetails.message = 'Connection timeout. The webhook server took too long to respond.';
        }
        
        logger.error('Webhook delivery failed', errorDetails);
        // Don't throw the error to prevent the change stream from closing
      }
      
      return true;
    }
  } catch (error) {
    logger.error('Error processing webhook', {
      error: error.message,
      stack: error.stack,
      response: error.response?.data
    });
    return false;
  }
}

// Main function to watch for changes
async function watchForChanges() {
  let client;
  
  try {
    // Connect to MongoDB
    client = new MongoClient(config.mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000
    });
    
    await client.connect();
    logger.info('Connected to MongoDB');
    
    const db = client.db(config.dbName);
    const collection = db.collection(config.collectionName);
    
    // Watch for changes
    const changeStream = collection.watch([
      { $match: { operationType: 'insert' } }
    ], { fullDocument: 'updateLookup' });
    
    logger.info('Webhook service started');
    
    // Process changes
    changeStream.on('change', async (change) => {
      try {
        await processChange(change);
      } catch (error) {
        logger.error('Error in change stream', error);
      }
    });
    
    // Handle errors
    changeStream.on('error', (error) => {
      logger.error('Change stream error', error);
      // Attempt to restart the change stream on error
      setTimeout(watchForChanges, 5000);
    });
    
    // Handle process termination
    process.on('SIGINT', async () => {
      logger.info('Shutting down webhook listener...');
      await changeStream.close();
      await client.close();
      process.exit(0);
    });
    
  } catch (error) {
    logger.error('Fatal error in watchForChanges', error);
    if (client) await client.close();
    // Attempt to reconnect after a delay
    setTimeout(watchForChanges, 10000);
  }
}

// Start the service
logger.info('Starting webhook listener service', {
  mongoUri: config.mongoUri,
  dbName: config.dbName,
  webhookUrl: config.webhookUrl
});

watchForChanges();

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
});
