import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

// ──────────────────────────────────────────────────────
// Transport Factory — Gmail (default) or Postmark
// Set EMAIL_PROVIDER=postmark in .env to switch
// ──────────────────────────────────────────────────────
const createTransport = () => {
  const provider = process.env.EMAIL_PROVIDER || 'gmail';

  if (provider === 'postmark') {
    // Postmark via SMTP relay
    return nodemailer.createTransport({
      host: 'smtp.postmarkapp.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.POSTMARK_API_KEY,
        pass: process.env.POSTMARK_API_KEY,
      },
    });
  }

  // Default: Gmail
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: true, // true for port 465
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const transporter = createTransport();

const FROM_NAME = process.env.SMTP_FROM_NAME || 'Bubble Chat';
const FROM_ADDRESS = process.env.SMTP_USER || 'noreply@bubble.chat';

export const sendMail = async (to: string, subject: string, html: string) => {
  try {
    const info = await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_ADDRESS}>`,
      to,
      subject,
      html,
    });
    console.log(`✅ Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`❌ Mailer error:`, error);
    throw new Error('Failed to send email');
  }
};

/**
 * Send OTP email with the Bubble space theme template
 */
export const sendOTPMail = async (to: string, otp: string) => {
  const subject = 'Your Bubble Verification Code';
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #000814; border-radius: 16px; overflow: hidden;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #001d3d 0%, #0a0a2e 50%, #1a0533 100%); padding: 40px 32px; text-align: center; border-bottom: 1px solid #7b2d8b33;">
        <div style="font-size: 28px; font-weight: 800; letter-spacing: 6px; color: #ffd60a; text-transform: uppercase;">BUBBLE</div>
        <div style="font-size: 11px; color: #7b2d8b; letter-spacing: 4px; text-transform: uppercase; margin-top: 4px;">The Future of Transmission</div>
      </div>
      
      <!-- Body -->
      <div style="padding: 40px 32px; background-color: #000814;">
        <h2 style="color: #d8e6ff; font-size: 20px; font-weight: 600; margin: 0 0 12px;">Security Flash 🔐</h2>
        <p style="font-size: 15px; line-height: 1.7; color: #8da4c4; margin: 0 0 28px;">
          A verification code has been requested for your Bubble account. Use the code below to complete your action:
        </p>
        
        <!-- OTP Box -->
        <div style="background: linear-gradient(135deg, #001d3d, #0a0a2e); border: 1px solid #ffd60a44; padding: 28px 20px; border-radius: 12px; text-align: center; margin: 0 0 28px;">
          <div style="font-size: 42px; font-weight: 900; letter-spacing: 12px; color: #ffd60a; font-variant-numeric: tabular-nums;">${otp}</div>
          <div style="font-size: 12px; color: #5a7a9a; margin-top: 10px; letter-spacing: 1px;">EXPIRES IN 10 MINUTES</div>
        </div>

        <p style="font-size: 13px; color: #5a7a9a; line-height: 1.6; margin: 0;">
          If you did not request this code, please ignore this email. Your account remains secure.
        </p>
      </div>

      <!-- Footer -->
      <div style="padding: 20px 32px; background-color: #000511; border-top: 1px solid #0a1628; text-align: center;">
        <p style="font-size: 11px; color: #3a5a7a; margin: 0; letter-spacing: 1px;">BUBBLE CHAT · SECURE TRANSMISSIONS</p>
      </div>
    </div>
  `;
  return await sendMail(to, subject, html);
};
