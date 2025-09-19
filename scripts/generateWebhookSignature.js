// Usage: node scripts/generateWebhookSignature.js '{"status":"paid","order_id":"USERID_TIMESTAMP_subscriptionType"}' YOUR_CRYPTOMUS_WEBHOOK_SECRET

const crypto = require('crypto');

if (process.argv.length < 4) {
  console.log('Usage: node scripts/generateWebhookSignature.js <json_payload> <webhook_secret>');
  process.exit(1);
}

const jsonPayload = process.argv[2];
const secret = process.argv[3];

const base64Body = Buffer.from(jsonPayload).toString('base64');
const sign = crypto.createHash('md5').update(base64Body + secret).digest('hex');

console.log('Signature:', sign); 