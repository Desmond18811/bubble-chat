import { Resend } from 'resend';
import dotenv from 'dotenv';
dotenv.config();

// ──────────────────────────────────────────────────────
// Resend HTTP API — works on Railway (no SMTP blocking)
// Set RESEND_API_KEY in your Railway environment variables
// Get a free key at https://resend.com (3,000 emails/month free)
// ──────────────────────────────────────────────────────

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_ADDRESS = process.env.SMTP_FROM_EMAIL || 'noreply@yourdomain.com';
const FROM_NAME = process.env.SMTP_FROM_NAME || 'Bubble Chat';

export const sendMail = async (to: string, subject: string, html: string) => {
  if (!process.env.RESEND_API_KEY) {
    console.error(`❌ Mailer: RESEND_API_KEY is missing from environment variables.`);
    throw new Error('RESEND_API_KEY is not configured');
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_ADDRESS}>`,
      to,
      subject,
      html,
    });

    if (error) {
      console.error(`❌ Resend API Error for ${to}:`, error);
      throw new Error(error.message);
    }

    console.log(`✅ Email successfully queued for transmission to ${to}. Tracking ID: ${data?.id}`);
    return data;
  } catch (err: any) {
    console.error(`❌ Mailer critical failure for ${to}:`, err.message);
    throw err;
  }
};

/**
 * Send OTP email with the Bubble space light/lavender theme template
 */
export const sendOTPEmail = async (to: string, name: string, otp: string) => {
  const subject = 'Your Bubble Verification Code';
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f8fafc; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(139, 92, 246, 0.05);">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #f5f3ff 0%, #e0e7ff 100%); padding: 40px 32px; text-align: center; border-bottom: 1px solid #ddd6fe;">
        <div style="font-size: 28px; font-weight: 800; letter-spacing: 6px; color: #7c3aed; text-transform: uppercase;">BUBBLE</div>
        <div style="font-size: 11px; color: #8b5cf6; letter-spacing: 4px; text-transform: uppercase; margin-top: 4px; font-weight: 600;">The Future of Transmission</div>
      </div>
      
      <!-- Body -->
      <div style="padding: 40px 32px; background-color: #ffffff;">
        <h2 style="color: #0f172a; font-size: 20px; font-weight: 700; margin: 0 0 12px;">Security Flash 🔐</h2>
        <p style="font-size: 15px; line-height: 1.7; color: #334155; margin: 0 0 12px;">Hello ${name},</p>
        <p style="font-size: 15px; line-height: 1.7; color: #475569; margin: 0 0 28px;">
          A verification code has been requested for your Bubble account. Use the code below to complete your action:
        </p>
        
        <!-- OTP Box -->
        <div style="background-color: #f5f3ff; border: 1px solid #ddd6fe; padding: 28px 20px; border-radius: 16px; text-align: center; margin: 0 0 28px;">
          <div style="font-size: 42px; font-weight: 900; letter-spacing: 12px; color: #7c3aed; font-variant-numeric: tabular-nums;">${otp}</div>
          <div style="font-size: 12px; color: #8b5cf6; margin-top: 10px; letter-spacing: 1px; font-weight: 600;">EXPIRES IN 10 MINUTES</div>
        </div>

        <p style="font-size: 13px; color: #64748b; line-height: 1.6; margin: 0;">
          If you did not request this code, please ignore this email. Your account remains secure.
        </p>
      </div>

      <!-- Footer -->
      <div style="padding: 20px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
        <p style="font-size: 11px; color: #94a3b8; margin: 0; letter-spacing: 1px; font-weight: 600;">BUBBLE SPACE · SECURE TRANSMISSIONS</p>
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
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f8fafc; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(139, 92, 246, 0.05);">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #f5f3ff 0%, #e0e7ff 100%); padding: 40px 32px; text-align: center; border-bottom: 1px solid #ddd6fe;">
        <div style="font-size: 28px; font-weight: 800; letter-spacing: 6px; color: #7c3aed; text-transform: uppercase;">BUBBLE</div>
        <div style="font-size: 11px; color: #8b5cf6; letter-spacing: 4px; text-transform: uppercase; margin-top: 4px; font-weight: 600;">The Future of Transmission</div>
      </div>
      
      <!-- Body -->
      <div style="padding: 40px 32px; background-color: #ffffff;">
        <h2 style="color: #0f172a; font-size: 20px; font-weight: 700; margin: 0 0 12px;">Reset Password ⚡️</h2>
        <p style="font-size: 15px; line-height: 1.7; color: #334155; margin: 0 0 12px;">Hello ${name},</p>
        <p style="font-size: 15px; line-height: 1.7; color: #475569; margin: 0 0 28px;">
          You requested to reset your password. Use the verification code below on the reset screen. This code will expire in 15 minutes.
        </p>
        
        <!-- OTP Box -->
        <div style="background-color: #f5f3ff; border: 1px solid #ddd6fe; padding: 28px 20px; border-radius: 16px; text-align: center; margin: 0 0 28px;">
          <div style="font-size: 42px; font-weight: 900; letter-spacing: 12px; color: #7c3aed; font-variant-numeric: tabular-nums;">${otp}</div>
          <div style="font-size: 12px; color: #8b5cf6; margin-top: 10px; letter-spacing: 1px; font-weight: 600;">EXPIRES IN 15 MINUTES</div>
        </div>

        <p style="font-size: 13px; color: #64748b; line-height: 1.6; margin: 0;">
          If you did not request a password reset, you can safely ignore this email.
        </p>
      </div>

      <!-- Footer -->
      <div style="padding: 20px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
        <p style="font-size: 11px; color: #94a3b8; margin: 0; letter-spacing: 1px; font-weight: 600;">BUBBLE SPACE · SECURE TRANSMISSIONS</p>
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
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f8fafc; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(139, 92, 246, 0.05);">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #f5f3ff 0%, #e0e7ff 100%); padding: 40px 32px; text-align: center; border-bottom: 1px solid #ddd6fe;">
        <div style="font-size: 28px; font-weight: 800; letter-spacing: 6px; color: #7c3aed; text-transform: uppercase;">BUBBLE</div>
        <div style="font-size: 11px; color: #8b5cf6; letter-spacing: 4px; text-transform: uppercase; margin-top: 4px; font-weight: 600;">AIda Automated Systems</div>
      </div>
      
      <!-- Body -->
      <div style="padding: 40px 32px; background-color: #ffffff;">
        <h2 style="color: #0f172a; font-size: 20px; font-weight: 700; margin: 0 0 12px;">Task Deadline Reminder ⏳</h2>
        <p style="font-size: 15px; line-height: 1.7; color: #334155; margin: 0 0 12px;">Hello ${name},</p>
        <p style="font-size: 15px; line-height: 1.7; color: #475569; margin: 0 0 28px;">
          This is an automated reminder regarding an upcoming task assigned to you in your Bubble Workspace.
        </p>
        
        <!-- Task Box -->
        <div style="background-color: #f5f3ff; border: 1px solid #ddd6fe; padding: 28px 20px; border-radius: 16px; text-align: left; margin: 0 0 28px;">
          <h3 style="font-size: 18px; font-weight: 700; color: #7c3aed; margin: 0 0 8px;">${taskTitle}</h3>
          <p style="font-size: 13px; color: #8b5cf6; margin: 0 0 12px; font-weight: 600;">Due: <strong>${timeString}</strong></p>
          ${description ? `<p style="font-size: 14px; color: #475569; margin: 0; line-height: 1.5;">${description}</p>` : ''}
        </div>

        <p style="font-size: 13px; color: #5a7a9a; line-height: 1.6; margin: 0; text-align: center;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:8080'}/workspace" style="display: inline-block; padding: 14px 28px; background-color: #8b5cf6; color: #ffffff; font-weight: 700; text-decoration: none; border-radius: 12px; letter-spacing: 1px; box-shadow: 0 4px 14px rgba(139, 92, 246, 0.2);">GO TO WORKSPACE</a>
        </p>
      </div>

      <!-- Footer -->
      <div style="padding: 20px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
        <p style="font-size: 11px; color: #94a3b8; margin: 0; letter-spacing: 1px; font-weight: 600;">BUBBLE CHAT · SECURE TRANSMISSIONS</p>
      </div>
    </div>
  `;
  return await sendMail(to, subject, html);
};

export const sendMessageRequestEmail = async (to: string, targetName: string, senderName: string, senderOrg: string) => {
  const subject = `Message Request from ${senderName} at ${senderOrg}`;
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f8fafc; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(139, 92, 246, 0.05);">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #f5f3ff 0%, #e0e7ff 100%); padding: 40px 32px; text-align: center; border-bottom: 1px solid #ddd6fe;">
        <div style="font-size: 28px; font-weight: 800; letter-spacing: 6px; color: #7c3aed; text-transform: uppercase;">BUBBLE</div>
        <div style="font-size: 11px; color: #8b5cf6; letter-spacing: 4px; text-transform: uppercase; margin-top: 4px; font-weight: 600;">EXTERNAL TRANSMISSION</div>
      </div>
      <!-- Body -->
      <div style="padding: 40px 32px; background-color: #ffffff;">
        <h2 style="color: #0f172a; font-size: 20px; font-weight: 700; margin: 0 0 12px;">New Message Request 👋</h2>
        <p style="font-size: 15px; line-height: 1.7; color: #334155; margin: 0 0 12px;">Hello ${targetName},</p>
        <p style="font-size: 15px; line-height: 1.7; color: #475569; margin: 0 0 28px;">
          You have received a new cross-organization message request from <strong>${senderName}</strong> at <strong>${senderOrg}</strong>.
        </p>
        <div style="text-align: center; margin: 0 0 28px;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:8080'}/messages" style="display: inline-block; padding: 14px 28px; background-color: #8b5cf6; color: #ffffff; font-weight: 800; font-size: 14px; text-decoration: none; border-radius: 12px; letter-spacing: 1px; box-shadow: 0 4px 14px rgba(139,92,246,0.3);">
            VIEW REQUEST
          </a>
        </div>
        <p style="font-size: 13px; color: #64748b; line-height: 1.6; margin: 0;">
          If you do not wish to connect with this sender, you can simply decline the request inside your Bubble workspace.
        </p>
      </div>
      <!-- Footer -->
      <div style="padding: 20px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
        <p style="font-size: 11px; color: #94a3b8; margin: 0; letter-spacing: 1px; font-weight: 600;">BUBBLE CHAT · SECURE TRANSMISSIONS</p>
      </div>
    </div>
  `;
  return await sendMail(to, subject, html);
};

/**
 * Send meeting transcripts & AI summaries to participants in light lavender theme
 */
export const sendMeetingTranscriptEmail = async (
  to: string,
  name: string,
  meetingTitle: string,
  transcriptHtml: string,
  summary: string
) => {
  const subject = `Meeting Summary & Transcript: ${meetingTitle}`;

  // Simple chat log parser for raw transcripts to build beautiful dialog bubbles
  let parsedTranscriptHtml = '';
  const lines = transcriptHtml.split(/<br\s*\/?>|\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex > 0 && colonIndex < 30) {
      const speaker = trimmed.substring(0, colonIndex).trim();
      const text = trimmed.substring(colonIndex + 1).trim();
      const isAida = speaker.toLowerCase().includes('aida') || speaker.toLowerCase().includes('assistant');
      
      parsedTranscriptHtml += `
        <div style="margin-bottom: 16px; text-align: left;">
          <div style="font-size: 10px; font-weight: 800; color: ${isAida ? '#6c5ce7' : '#1f2030'}; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; font-family: 'Poppins', 'Segoe UI', sans-serif;">
            ${speaker}
          </div>
          <div style="display: inline-block; background-color: ${isAida ? '#f3f0ff' : '#f8fafc'}; border: 1px solid ${isAida ? '#e5dbff' : '#e2e8f0'}; border-radius: 16px; padding: 12px 16px; font-size: 13.5px; line-height: 1.5; color: #2d3748; max-width: 85%; font-family: 'Segoe UI', sans-serif; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
            ${text}
          </div>
        </div>
      `;
    } else {
      parsedTranscriptHtml += `
        <div style="margin-bottom: 12px; font-size: 13px; line-height: 1.6; color: #718096; text-align: left; font-style: italic; font-family: 'Segoe UI', sans-serif; padding-left: 8px; border-left: 2px solid #e2e8f0;">
          ${trimmed}
        </div>
      `;
    }
  }
  if (!parsedTranscriptHtml) {
    parsedTranscriptHtml = `<div style="text-align: center; color: #a0aec0; font-style: italic; font-size: 13.5px; padding: 20px 0;">No transcript recorded.</div>`;
  }

  const html = `
    <div style="font-family: 'Poppins', 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #fbfbfe; border-radius: 28px; overflow: hidden; border: 1px solid #eae7fa; box-shadow: 0 15px 35px -5px rgba(108, 92, 231, 0.06);">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #6c5ce7 0%, #4834d4 100%); padding: 44px 36px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.1);">
        <div style="font-size: 30px; font-weight: 900; letter-spacing: 6px; color: #ffffff; text-transform: uppercase; text-shadow: 0 2px 4px rgba(0,0,0,0.15);">BUBBLESPACE</div>
        <div style="font-size: 11px; color: rgba(255,255,255,0.75); letter-spacing: 4px; text-transform: uppercase; margin-top: 6px; font-weight: 700;">Meeting Intelligence Suite</div>
      </div>
      
      <!-- Body -->
      <div style="padding: 44px 36px; background-color: #ffffff;">
        <h2 style="color: #1f2030; font-size: 22px; font-weight: 800; margin: 0 0 14px; font-family: 'Space Grotesk', 'Segoe UI', sans-serif;">Meeting Minutes 📝</h2>
        <p style="font-size: 14.5px; line-height: 1.7; color: #4a5568; margin: 0 0 12px;">Hello ${name},</p>
        <p style="font-size: 14.5px; line-height: 1.7; color: #4a5568; margin: 0 0 28px;">
          Here are the summary and details for your conversation: <strong style="color: #6c5ce7;">${meetingTitle}</strong>.
        </p>
        
        <!-- Summary Box -->
        <div style="background-color: #efedfb; border-left: 5px solid #6c5ce7; padding: 22px; border-radius: 18px; margin-bottom: 32px; text-align: left; box-shadow: inset 0 1px 3px rgba(108,92,231,0.05);">
          <h3 style="font-size: 14px; font-weight: 800; color: #6c5ce7; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 1px; font-family: 'Poppins', 'Segoe UI', sans-serif;">Aida AI Summary</h3>
          <p style="font-size: 14px; color: #2d3748; margin: 0; line-height: 1.65; font-family: 'Segoe UI', sans-serif;">${summary || 'No summary available.'}</p>
        </div>

        <!-- Transcript Heading -->
        <h3 style="font-size: 14px; font-weight: 800; color: #1f2030; margin: 0 0 14px; text-transform: uppercase; letter-spacing: 1.5px; text-align: left; font-family: 'Poppins', 'Segoe UI', sans-serif;">Parsed Dialogue</h3>
        
        <div style="background-color: #ffffff; border: 1px solid #eae7fa; padding: 24px; border-radius: 20px; max-height: 320px; overflow-y: auto; text-align: left; box-shadow: 0 4px 12px rgba(108,92,231,0.02);">
          ${parsedTranscriptHtml}
        </div>
        
        <p style="font-size: 12px; color: #9a9aab; line-height: 1.7; margin-top: 28px; text-align: center; font-family: 'Segoe UI', sans-serif;">
          This transcript and summary have been indexed inside your organization's Brain for instant search and retrieval.
        </p>
      </div>

      <!-- Footer -->
      <div style="padding: 24px 36px; background-color: #fbfbfe; border-top: 1px solid #eae7fa; text-align: center;">
        <p style="font-size: 10px; color: #9a9aab; margin: 0; letter-spacing: 1.5px; font-weight: 700; text-transform: uppercase;">BUBBLESPACE · SECURE TRANSMISSIONS</p>
      </div>
    </div>
  `;
  return await sendMail(to, subject, html);
};

/**
 * Send welcome email containing the AI-generated company overview summary to new members
 */
export const sendWelcomeNewMemberEmail = async (
  to: string,
  name: string,
  orgName: string,
  onboardingSummaryHtml: string
) => {
  const subject = `Welcome to ${orgName} on Bubblespace!`;
  const html = `
    <div style="font-family: 'Poppins', 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #fbfbfe; border-radius: 28px; overflow: hidden; border: 1px solid #eae7fa; box-shadow: 0 15px 35px -5px rgba(108, 92, 231, 0.06);">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #6c5ce7 0%, #4834d4 100%); padding: 44px 36px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.1);">
        <div style="font-size: 30px; font-weight: 900; letter-spacing: 6px; color: #ffffff; text-transform: uppercase; text-shadow: 0 2px 4px rgba(0,0,0,0.15);">BUBBLESPACE</div>
        <div style="font-size: 11px; color: rgba(255,255,255,0.75); letter-spacing: 4px; text-transform: uppercase; margin-top: 6px; font-weight: 700;">Organization Welcome</div>
      </div>
      
      <!-- Body -->
      <div style="padding: 44px 36px; background-color: #ffffff;">
        <h2 style="color: #1f2030; font-size: 22px; font-weight: 800; margin: 0 0 14px; font-family: 'Space Grotesk', 'Segoe UI', sans-serif;">Welcome aboard! 🚀</h2>
        <p style="font-size: 14.5px; line-height: 1.7; color: #4a5568; margin: 0 0 12px;">Hello ${name},</p>
        <p style="font-size: 14.5px; line-height: 1.7; color: #4a5568; margin: 0 0 24px;">
          You have successfully joined <strong style="color: #6c5ce7;">${orgName}</strong> on Bubblespace. Here is a brief AI-compiled overview of the company to help get you up to speed instantly:
        </p>
        
        <!-- Company Profile Box -->
        <div style="background-color: #efedfb; border-left: 5px solid #6c5ce7; padding: 24px; border-radius: 18px; margin-bottom: 32px; text-align: left; font-size: 14px; line-height: 1.7; color: #2d3748; font-family: 'Segoe UI', sans-serif; box-shadow: inset 0 1px 3px rgba(108,92,231,0.05);">
          ${onboardingSummaryHtml || 'No company overview is available yet.'}
        </div>

        <div style="text-align: center; margin: 32px 0 10px;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:8080'}/dashboard" style="display: inline-block; padding: 16px 32px; background-color: #6c5ce7; color: #ffffff; font-weight: 800; font-size: 14px; text-decoration: none; border-radius: 16px; letter-spacing: 1px; box-shadow: 0 6px 20px rgba(108, 92, 231, 0.25); font-family: 'Poppins', sans-serif; transition: all 0.2s;">
            ENTER WORKSPACE
          </a>
        </div>
      </div>

      <!-- Footer -->
      <div style="padding: 24px 36px; background-color: #fbfbfe; border-top: 1px solid #eae7fa; text-align: center;">
        <p style="font-size: 10px; color: #9a9aab; margin: 0; letter-spacing: 1px; font-weight: 700; text-transform: uppercase;">BUBBLESPACE · SECURE TRANSMISSIONS</p>
      </div>
    </div>
  `;
  return await sendMail(to, subject, html);
};

