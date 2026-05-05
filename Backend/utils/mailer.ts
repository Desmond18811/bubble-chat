import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import dns from 'dns';

// Railway outbound IPv6 SMTP is blocked; force IPv4 resolution natively
dns.setDefaultResultOrder('ipv4first');

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
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465', // true only for port 465
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 5000,
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
export const sendOTPEmail = async (to: string, name: string, otp: string) => {
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
        <p style="font-size: 15px; line-height: 1.7; color: #8da4c4; margin: 0 0 12px;">
          Hello ${name},
        </p>
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

/**
 * Send Password Reset email with OTP
 */
export const sendPasswordResetEmail = async (to: string, name: string, otp: string) => {
  const subject = 'Reset Your Bubble Password';

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #000814; border-radius: 16px; overflow: hidden;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #001d3d 0%, #0a0a2e 50%, #1a0533 100%); padding: 40px 32px; text-align: center; border-bottom: 1px solid #7b2d8b33;">
        <div style="font-size: 28px; font-weight: 800; letter-spacing: 6px; color: #ffd60a; text-transform: uppercase;">BUBBLE</div>
        <div style="font-size: 11px; color: #7b2d8b; letter-spacing: 4px; text-transform: uppercase; margin-top: 4px;">The Future of Transmission</div>
      </div>
      
      <!-- Body -->
      <div style="padding: 40px 32px; background-color: #000814;">
        <h2 style="color: #d8e6ff; font-size: 20px; font-weight: 600; margin: 0 0 12px;">Reset Password ⚡️</h2>
        <p style="font-size: 15px; line-height: 1.7; color: #8da4c4; margin: 0 0 12px;">
          Hello ${name},
        </p>
        <p style="font-size: 15px; line-height: 1.7; color: #8da4c4; margin: 0 0 28px;">
          You requested to reset your password. Use the verification code below on the reset screen. This code will expire in 15 minutes.
        </p>
        
        <!-- OTP Box -->
        <div style="background: linear-gradient(135deg, #001d3d, #0a0a2e); border: 1px solid #ffd60a44; padding: 28px 20px; border-radius: 12px; text-align: center; margin: 0 0 28px;">
          <div style="font-size: 42px; font-weight: 900; letter-spacing: 12px; color: #ffd60a; font-variant-numeric: tabular-nums;">${otp}</div>
          <div style="font-size: 12px; color: #5a7a9a; margin-top: 10px; letter-spacing: 1px;">EXPIRES IN 15 MINUTES</div>
        </div>

        <p style="font-size: 13px; color: #5a7a9a; line-height: 1.6; margin: 0;">
          If you did not request a password reset, you can safely ignore this email.
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

/**
 * Send Task/Goal Reminder email with AIda integration styling
 */
export const sendTaskReminderEmail = async (to: string, name: string, taskTitle: string, dueDate: Date, description?: string) => {
  const subject = `Your upcoming objective: ${taskTitle}`;
  const timeString = dueDate.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #000814; border-radius: 16px; overflow: hidden;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #001d3d 0%, #0a0a2e 50%, #1a0533 100%); padding: 40px 32px; text-align: center; border-bottom: 1px solid #7b2d8b33;">
        <div style="font-size: 28px; font-weight: 800; letter-spacing: 6px; color: #ffd60a; text-transform: uppercase;">BUBBLE</div>
        <div style="font-size: 11px; color: #7b2d8b; letter-spacing: 4px; text-transform: uppercase; margin-top: 4px;">AIda Automated Systems</div>
      </div>
      
      <!-- Body -->
      <div style="padding: 40px 32px; background-color: #000814;">
        <h2 style="color: #d8e6ff; font-size: 20px; font-weight: 600; margin: 0 0 12px;">Task Deadline Reminder ⏳</h2>
        <p style="font-size: 15px; line-height: 1.7; color: #8da4c4; margin: 0 0 12px;">
          Hello ${name},
        </p>
        <p style="font-size: 15px; line-height: 1.7; color: #8da4c4; margin: 0 0 28px;">
          This is an automated reminder regarding an upcoming task assigned to you in your Bubble Workspace.
        </p>
        
        <!-- Task Box -->
        <div style="background: linear-gradient(135deg, #001d3d, #0a0a2e); border: 1px solid #ffd60a44; padding: 28px 20px; border-radius: 12px; text-align: left; margin: 0 0 28px;">
          <h3 style="font-size: 18px; font-weight: 700; color: #ffd60a; margin: 0 0 8px;">${taskTitle}</h3>
          <p style="font-size: 13px; color: #5a7a9a; margin: 0 0 12px;">Due: <strong>${timeString}</strong></p>
          ${description ? `<p style="font-size: 14px; color: #8da4c4; margin: 0; line-height: 1.5;">${description}</p>` : ''}
        </div>

        <p style="font-size: 13px; color: #5a7a9a; line-height: 1.6; margin: 0; text-align: center;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:8080'}/workspace" style="display: inline-block; padding: 12px 24px; background-color: #ffd60a; color: #000814; font-weight: 700; text-decoration: none; border-radius: 8px; letter-spacing: 1px;">GO TO WORKSPACE</a>
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
