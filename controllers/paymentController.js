import { CryptomusService } from '../services/cryptomusService.js';
import User from '../models/User.js';

const cryptomus = new CryptomusService();

// POST /api/payments/create
export const createPayment = async (req, res) => {
  try {
    const { subscriptionType, network, currency, url_return } = req.body;
    // Set price based on subscriptionType
    let amount = 0;
    let description = '';
    if (subscriptionType === 'basic') {
      amount = 99;
      description = 'Basic subscription (1 post)';
    } else if (subscriptionType === 'standard') {
      amount = 190;
      description = 'Standard subscription (3 posts/month)';
    } else if (subscriptionType === 'premium') {
      amount = 499;
      description = 'Premium subscription (10 posts/month)';
    } else {
      return res.status(400).json({ error: 'Invalid subscription type' });
    }
    if (!network || !currency) {
      return res.status(400).json({ error: 'Network and currency are required' });
    }
    // Generate a unique order_id for each payment
    const order_id = `${req.user._id.toString()}_${Date.now()}_${subscriptionType}`;
    const paymentDetail = {
      amount: amount.toString(),
      currency, // from frontend
      network,  // from frontend
      order_id, // unique for each payment
      url_return: process.env.CRYPTOMUS_SUCCESS_URL, // Optional: where to redirect after payment
      url_callback: process.env.CRYPTOMUS_WEBHOOK_URL, // Webhook endpoint
      url_success: process.env.CRYPTOMUS_SUCCESS_URL, // Success URL
      description,
    };
    console.log('[DEBUG] paymentDetail:', paymentDetail);
    const result = await cryptomus.createPayment(paymentDetail);
    res.json({ payment_url: result.url, uuid: result.uuid });
  } catch (e) {
    res.status(422).json({ error: e.message });
  }
};

// POST /api/payments/webhook
export const cryptomusWebhook = async (req, res) => {
  try {
    console.log('[WEBHOOK] Received Cryptomus webhook:', JSON.stringify(req.body, null, 2));
    // Verify webhook signature
    // const signatureValid = cryptomus.verifyWebhookSignature(req);
    // console.log('[WEBHOOK] Signature valid:', signatureValid);
    // if (!signatureValid) {
    //   console.log('[WEBHOOK] Invalid signature. Rejecting webhook.');
    //   return res.status(401).json({ error: 'Invalid signature' });
    // }
    const { status, order_id } = req.body;
    // Extract userId and subscriptionType from order_id (format: userId_timestamp_subscriptionType)
    const parts = order_id ? order_id.split('_') : [];
    const userId = parts[0];
    const subscriptionType = parts[2];
    if (status === 'paid' || status === 'paid_over') {
      const now = new Date();
      let update = {};
      if (subscriptionType === 'basic') {
        update = {
          subscriptionType: 'basic',
          subscriptionStatus: 'active',
          subscriptionStart: now,
          subscriptionEnd: null,
          postsThisPeriod: 0,
          lastPostReset: now,
        };
      } else if (subscriptionType === 'standard') {
        const end = new Date(now);
        end.setMonth(end.getMonth() + 1);
        update = {
          subscriptionType: 'standard',
          subscriptionStatus: 'active',
          subscriptionStart: now,
          subscriptionEnd: end,
          postsThisPeriod: 0,
          lastPostReset: now,
        };
      } else if (subscriptionType === 'premium') {
        const end = new Date(now);
        end.setMonth(end.getMonth() + 1);
        update = {
          subscriptionType: 'premium',
          subscriptionStatus: 'active',
          subscriptionStart: now,
          subscriptionEnd: end,
          postsThisPeriod: 0,
          lastPostReset: now,
        };
      } else {
        return res.status(400).json({ error: 'Invalid subscription type in webhook' });
      }
      const updateResult = await User.findByIdAndUpdate(userId, update);
      console.log('[WEBHOOK] Subscription update result:', updateResult);
    } else {
      console.log('[WEBHOOK] Payment status is not paid/paid_over. No subscription update.');
    }
    res.json({ ok: true });
  } catch (e) {
    console.error('[WEBHOOK] Error processing webhook:', e);
    res.status(422).json({ error: e.message });
  }
}; 