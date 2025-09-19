import axios from 'axios';
import * as crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

export class CryptomusService {
  baseUrl = process.env.CRYPTOMUS_BASE_URL;
  paymentKey = process.env.CRYPTOMUS_PAYMENT_KEY;
  payoutKey = process.env.CRYPTOMUS_PAYOUT_KEY;
  merchantId = process.env.CRYPTOMUS_MERCHANT_ID;

  generateSign(data, apiKey) {
    const jsonString = JSON.stringify(data);
    const base64Data = Buffer.from(jsonString).toString('base64');
    return crypto.createHash('md5').update(base64Data + apiKey).digest('hex');
  }

  async createPayment(paymentDetail) {
    try {
      const requestData = {
        ...paymentDetail,
        is_payment_multiple: false,
        lifetime: '43200',
      };
      const sign = this.generateSign(requestData, this.paymentKey);
      const response = await axios.post(`${this.baseUrl}/payment`, requestData, {
        headers: {
          merchant: this.merchantId,
          sign: sign,
          'Content-Type': 'application/json',
        },
      });
      if (response.data.result?.expired_at) {
        const date = new Date(response.data.result.expired_at * 1000);
        response.data.result.expired_at = date.toISOString();
      }
      return response.data.result;
    } catch (err) {
      console.error('Cryptomus createPayment error:', err.response?.data || err.message);
      throw new Error(`Failed to create payment: ${err.message}`);
    }
  }

  async checkPaymentStatus(uuid) {
    const payloadObject = { uuid };
    const jsonString = JSON.stringify(payloadObject);
    const base64Data = Buffer.from(jsonString).toString('base64');
    const signature = crypto.createHash('md5').update(base64Data + this.paymentKey).digest('hex');
    const headers = {
      merchant: this.merchantId,
      sign: signature,
      'Content-Type': 'application/json',
    };
    try {
      const response = await axios.post(`${this.baseUrl}/payment/info`, payloadObject, { headers });
      return response.data.result;
    } catch (error) {
      console.error('Cryptomus Error:', error.response?.data || error.message);
      throw new Error('Payment status check failed');
    }
  }

  verifyWebhookSignature(req) {
    const signature = req.headers['sign'];
    const secret = process.env.CRYPTOMUS_WEBHOOK_SECRET;
    const body = JSON.stringify(req.body);
    const base64Body = Buffer.from(body).toString('base64');
    const expectedSign = crypto.createHash('md5').update(base64Body + secret).digest('hex');
    return signature === expectedSign;
  }
} 