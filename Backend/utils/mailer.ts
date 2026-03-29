import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: true, // true for port 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS, // App password needed
  },
});

export const sendMail = async (to: string, subject: string, html: string) => {
  try {
    const info = await transporter.sendMail({
      from: `"Bubble Chat" <${process.env.SMTP_USER}>`,
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
 * Specifically for OTPs to maintain consistent template.
 */
export const sendOTPMail = async (to: string, otp: string) => {
  const subject = 'Your Bubble Verification Code';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #010f20; color: #d8e6ff;">
      <h2 style="color: #ffe792; text-align: center;">Security Flash</h2>
      <p style="font-size: 16px; line-height: 1.5;">Hello,</p>
      <p style="font-size: 16px; line-height: 1.5;">You've requested a security code for your Bubble Chat account. Please use the following One-Time Password (OTP) to verify your action:</p>
      <div style="background-color: #071a2f; padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #ffe792;">${otp}</span>
      </div>
      <p style="font-size: 14px; color: #9eacc3;">This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
      <hr style="border: 0; border-top: 1px solid #3b495c; margin: 20px 0;">
      <p style="font-size: 12px; text-align: center; color: #9eacc3;">Bubble Chat - The Future of Transmission</p>
    </div>
  `;
  return await sendMail(to, subject, html);
};
