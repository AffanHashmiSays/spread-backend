# Webhook Listener Service

A Node.js service that listens for new post insertions in a MongoDB collection and sends webhook notifications.

## Features

- Watches for new post insertions using MongoDB Change Streams
- Sends HTTP POST requests to a configurable webhook URL
- Includes detailed logging
- Automatically reconnects on connection loss
- Handles errors gracefully without crashing

## Prerequisites

- Node.js 14+
- MongoDB 4.2+ (required for Change Streams)
- npm or yarn

## Installation

1. Navigate to the webhookListener directory:
   ```bash
   cd services/webhookListener
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn
   ```

3. Copy the example environment file and update with your settings:
   ```bash
   cp .env.example .env
   ```

4. Edit the `.env` file with your configuration:
   ```
   MONGO_URI=mongodb://localhost:27017
   DB_NAME=your_database_name
   WEBHOOK_URL=https://yourdomain.com/api/webhook/new-post
   WEBHOOK_SECRET=your_super_secret_value
   ```

## Usage

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

### Running as a Background Service (Linux with systemd)

1. Create a service file at `/etc/systemd/system/webhook-listener.service`:
   ```ini
   [Unit]
   Description=Webhook Listener Service
   After=network.target

   [Service]
   User=your_user
   WorkingDirectory=/path/to/your/app/services/webhookListener
   ExecStart=/usr/bin/npm start
   Restart=always
   Environment=NODE_ENV=production
   EnvironmentFile=/path/to/your/app/services/webhookListener/.env

   [Install]
   WantedBy=multi-user.target
   ```

2. Enable and start the service:
   ```bash
   sudo systemctl enable webhook-listener
   sudo systemctl start webhook-listener
   ```

## Webhook Payload

When a new post is inserted, the service will send a POST request to your webhook URL with the following format:

```json
{
  "post": {
    "slug": "post-slug",
    "title": "Post Title",
    "status": "published",
    "content": "Post content...",
    "excerpt": "Post excerpt...",
    "featuredImage": "image-url.jpg",
    "author": "author-id",
    "categories": ["category-id-1", "category-id-2"],
    "tags": ["tag-id-1", "tag-id-2"],
    "createdAt": "2025-07-03T12:00:00.000Z",
    "updatedAt": "2025-07-03T12:00:00.000Z"
  }
}
```

## Logs

Logs are output to stdout/stderr. When running as a service, you can view logs with:

```bash
journalctl -u webhook-listener -f
```

## Error Handling

The service includes comprehensive error handling and will automatically attempt to reconnect if the database connection is lost or if the change stream encounters an error.

## Security

- The webhook includes an `X-WEBHOOK-SECRET` header that should be validated by the receiving endpoint.
- Ensure your MongoDB instance is properly secured with authentication.
- Run the service with minimal required permissions.

## License

MIT
