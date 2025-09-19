import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema({
  siteName: String,
  siteDescription: String,
  siteUrl: String,
  logoUrl: String,
  faviconUrl: String,
  enableRegistration: { type: Boolean, default: true },
  defaultUserRole: { type: String, default: 'USER' },
  postsPerPage: { type: Number, default: 10 },
  dateFormat: { type: String, default: 'MMMM d, yyyy' },
  timeFormat: { type: String, default: 'h:mm a' },
  emailNotifications: { type: Boolean, default: false },
  smtpHost: String,
  smtpPort: Number,
  smtpUser: String,
  smtpPassword: String,
  smtpFromEmail: String,
  smtpFromName: String,
  customCss: String,
  customJs: String,
  googleAnalyticsId: String,
  recaptchaSiteKey: String,
  recaptchaSecretKey: String,
  footerContent: { type: String, default: '' },
});

export default mongoose.model('Setting', settingSchema); 