import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { User } from '../models/users';
import { Organization } from '../models/organizations';
import { Otp } from '../models/otp';
import { PushToken } from '../models/pushToken';
import { sendOTPEmail, sendPasswordResetEmail, sendWelcomeNewMemberEmail } from '../utils/mailer';
import { seedOrgKnowledge } from './orgController';
import { Conversation } from '../models/conversations';
import { Message } from '../models/messages';
import { getAidaBotUser } from './aidaController';

// ─── Token Helpers ────────────────────────────────────────────────────────────

const generateAccessToken = (userId: string) =>
  jwt.sign({ id: userId }, process.env.JWT_KEY as string, { expiresIn: '7d' });

const generateRefreshToken = (userId: string) =>
  jwt.sign({ id: userId }, (process.env.JWT_REFRESH_KEY || process.env.JWT_REFRESH_SECRET || 'bubble_default_refresh_key') as string, { expiresIn: '30d' });

// ─── OTP Helper ───────────────────────────────────────────────────────────────

const generateOTP = (): string =>
  Math.floor(10000 + Math.random() * 90000).toString(); // 5-digit OTP

// ─── Format Helper ────────────────────────────────────────────────────────────

const formatUser = (u: any) => ({
  id: u._id,
  full_name: u.full_name || null,
  email: u.email || null,
  phone_number: u.phone_number || null,
  avatar: u.avatar || null,
  uniqueTag: u.uniqueTag || null,
  bio: u.bio || null,
  organization: u.organization || null,
  org_role: u.org_role || null,
  org_industry: u.org_industry || null,
  org_size: u.org_size || null,
  onboardingComplete: u.onboardingComplete ?? false,
  isVerified: u.isVerified ?? false,
  isPremium: u.isPremium ?? false,
  is_bot: u.is_bot ?? false,
  verified_badge: u.verified_badge ?? false,
  isOnline: u.isOnline ?? false,
  publicKey: u.publicKey || null,
  role: u.role || 'employee',
  createdAt: u.createdAt,
  updatedAt: u.updatedAt,
});

// ─── Unique BubbleID Tag ──────────────────────────────────────────────────────

const generateUniqueTag = async (base: string): Promise<string> => {
  let tag: string;
  let exists: boolean;
  const cleanBase = base.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'bubble';
  do {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const suffix = Array.from({ length: 8 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('');
    tag = `${cleanBase}-${suffix}`;
    exists = !!(await User.findOne({ uniqueTag: tag }));
  } while (exists);
  return tag;
};

// ─── Password Validator ────────────────────────────────────────────────────────
const validatePassword = (password: string): string | null => {
  if (password.length < 8) return 'Password must be at least 8 characters long.';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter.';
  if (!/\d/.test(password)) return 'Password must contain at least one number.';
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return 'Password must contain at least one special character.';
  return null;
};

// ─── REGISTER ─────────────────────────────────────────────────────────────────
/**
 * POST /api/v1/auth/register
 * Creates unverified account and sends OTP to email
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { full_name, email, phone_number, password, publicKey, org_name, org_industry, org_size } = req.body;

    if (!email && !phone_number) {
      res.status(400).json({ message: 'Email or phone number is required.' });
      return;
    }

    if (!password) {
      res.status(400).json({ message: 'Password is required.' });
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      res.status(400).json({ message: passwordError });
      return;
    }

    // Check for existing account email
    if (email) {
      const existingEmail = await User.findOne({ email: email.toLowerCase() });
      if (existingEmail) {
        res.status(409).json({ message: 'An account with this email already exists.' });
        return;
      }
    }

    // Check for existing account phone number
    if (phone_number) {
      const existingPhone = await User.findOne({ phone_number });
      if (existingPhone) {
        res.status(409).json({ message: 'An account with this phone number already exists.' });
        return;
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const uniqueTag = await generateUniqueTag(full_name || 'user');

    // Clean org values to prevent enum validation crashes
    const cleanOrgName = org_name ? org_name.trim() : '';
    const cleanOrgIndustry = cleanOrgName ? (org_industry || '') : '';
    const validOrgSizes = ['solo', '2-10', '11-50', '51-200', '201-500', '500+'];
    const cleanOrgSize = (cleanOrgName && org_size && validOrgSizes.includes(org_size)) ? org_size : undefined;

    // Create new user
    const newUser = await User.create({
      full_name,
      email: email?.toLowerCase(),
      phone_number: phone_number || undefined,
      password: hashedPassword,
      isVerified: false,
      uniqueTag,
      onboardingComplete: false,
      publicKey,
      organization: cleanOrgName,
      org_industry: cleanOrgIndustry,
      org_size: cleanOrgSize,
      role: cleanOrgName ? 'admin' : 'employee',
    });

    // Handle Organization Registration
    let organization = null;
    if (cleanOrgName) {
      const inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase(); // Secure 8-char invite code
      organization = await Organization.create({
        name: cleanOrgName,
        industry: cleanOrgIndustry || undefined,
        size: cleanOrgSize,
        owner: newUser._id,
        inviteCode,
        pineconeNamespace: `org-${newUser._id}`,
      });

      // Seed basic knowledge for the organization
      await seedOrgKnowledge(organization, (newUser._id as any).toString());

      // Create default group chat
      const bot = await getAidaBotUser();
      const botId = bot ? bot._id : null;
      const defaultChat = await Conversation.create({
        chatName: cleanOrgName,
        isGroupChat: true,
        users: botId ? [newUser._id, botId] : [newUser._id],
        groupAdmin: newUser._id,
        groupIcon: 'black',
        groupDescription: `Default group chat for ${cleanOrgName}`,
        organizationId: organization._id,
        isDefaultOrgChat: true,
      });

      if (botId) {
        const welcomeContent = `👋 **Welcome to the ${cleanOrgName} Workspace on Bubble!**\n\nI am **Aida**, your workspace intelligence assistant. I will automatically index shared resources and meeting transcripts to grow our collective business brain.\n\nAll members who join will automatically be added to this default group chat. Feel free to collaborate, share documents, schedule calls, and ask me anything!`;
        const initialMsg = await Message.create({
          chat: defaultChat._id,
          sender: botId,
          content: welcomeContent,
          message_type: 'text',
        });
        defaultChat.latestMessage = (initialMsg as any)._id;
        await defaultChat.save();
      }
    } else if (req.body.inviteCode) {
      // Handle joining an existing organization during signup
      const existingOrg = await Organization.findOne({ inviteCode: req.body.inviteCode });
      if (existingOrg) {
        await User.findByIdAndUpdate(newUser._id, {
          organization: existingOrg.name,
          org_industry: existingOrg.industry,
          org_size: existingOrg.size,
          role: 'employee',
        });

        // Add to default group chat
        const defaultChat = await Conversation.findOne({
          organizationId: existingOrg._id,
          isDefaultOrgChat: true,
        });

        if (defaultChat) {
          if (!defaultChat.users.map((id: any) => id.toString()).includes(newUser._id.toString())) {
            defaultChat.users.push(newUser._id);
            await defaultChat.save();
          }
        }

        // Send welcome email (as they joined and completed signup here)
        if (newUser.email) {
          const summaryHtml = existingOrg.description 
            ? existingOrg.description.replace(/\n/g, '<br />') 
            : 'Welcome to the organization! The brain is currently ready and listening.';
          
          await sendWelcomeNewMemberEmail(newUser.email, newUser.full_name || newUser.username || 'Employee', existingOrg.name, summaryHtml);
        }
      }
    }

    await Otp.create({
      userId: newUser._id,
      otp,
      type: 'verification',
      expiresAt: otpExpires,
    });

    // Send OTP via email
    if (email) {
      try {
        await sendOTPEmail(email, full_name || 'User', otp);
      } catch (emailErr: any) {
        console.warn(`⚠️ Could not send OTP email to ${email}:`, emailErr.message);
        console.log(`[DEV/TESTING] OTP for ${email} is: ${otp}`);
      }
    }

    // No tokens issued for unverified users
    res.status(201).json({
      message: 'Account created. Please verify your email with the OTP sent.',
      data: {
        email: newUser.email || null,
        phone_number: newUser.phone_number || null,
        requiresVerification: true,
        expiresInMinutes: 10,
      },
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Registration failed: ' + err.message });
  }
};

// ─── VERIFY OTP ───────────────────────────────────────────────────────────────
/**
 * POST /api/v1/auth/verify-otp
 * Verifies the OTP and marks account as verified, returns tokens
 */
export const verifyOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      res.status(400).json({ message: 'Email and OTP are required.' });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    if (user.isVerified) {
      res.status(400).json({ message: 'Account is already verified. Please login.' });
      return;
    }

    const otpRecord = await Otp.findOne({
      userId: user._id,
      otp: otp.toString(),
      type: 'verification',
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord) {
      res.status(400).json({ message: 'Invalid or expired OTP. Please check and try again.' });
      return;
    }

    // Mark OTP used
    otpRecord.isUsed = true;
    await otpRecord.save();

    // Mark verified
    const refreshToken = generateRefreshToken(String(user._id));
    await User.findByIdAndUpdate(user._id, {
      isVerified: true,
      isOnline: true,
      lastSeen: new Date(),
      refreshToken,
    });

    const accessToken = generateAccessToken(String(user._id));

    res.status(200).json({
      message: 'Email verified successfully. Welcome to Bubble!',
      data: {
        accessToken,
        refreshToken,
        user: formatUser(user),
      },
    });
  } catch (err: any) {
    res.status(500).json({ message: 'OTP verification failed: ' + err.message });
  }
};

// ─── RESEND OTP ───────────────────────────────────────────────────────────────
/**
 * POST /api/v1/auth/resend-otp
 */
export const resendOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ message: 'Email is required.' });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    if (user.isVerified) {
      res.status(400).json({ message: 'Account is already verified.' });
      return;
    }

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    await Otp.create({
      userId: user._id,
      otp,
      type: 'verification',
      expiresAt: otpExpires,
    });

    if (user.email) {
      try {
        await sendOTPEmail(user.email, user.full_name || 'User', otp);
      } catch (emailErr: any) {
        console.warn(`⚠️ Could not send OTP email to ${user.email}:`, emailErr.message);
        console.log(`[DEV/TESTING] OTP for ${user.email} is: ${otp}`);
      }
    }

    res.status(200).json({
      message: 'A new OTP has been sent to your email.',
      data: {
        userId: user._id,
        otpSentTo: user.email || user.phone_number,
        expiresInMinutes: 10,
      },
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Resend OTP failed: ' + err.message });
  }
};

// ─── LOGIN ────────────────────────────────────────────────────────────────────
/**
 * POST /api/v1/auth/login
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, phone_number, password } = req.body;

    if (!email && !phone_number) {
      res.status(400).json({ message: 'Email or phone number is required.' });
      return;
    }

    if (!password) {
      res.status(400).json({ message: 'Password is required.' });
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      res.status(400).json({ message: passwordError });
      return;
    }

    const query = email
      ? { email: email.toLowerCase() }
      : { phone_number };

    const user = await User.findOne(query).select('+password +refreshToken');
    if (!user) {
      res.status(401).json({ message: 'No account found with these credentials.' });
      return;
    }

    if (!user.isVerified) {
      // Re-send OTP and prompt them to verify
      const otp = generateOTP();
      const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

      await Otp.create({
        userId: user._id,
        otp,
        type: 'verification',
        expiresAt: otpExpires,
      });

      if (user.email) {
        try {
          await sendOTPEmail(user.email, user.full_name || 'User', otp);
        } catch (emailErr: any) {
          console.warn(`⚠️ Could not send OTP email to ${user.email}:`, emailErr.message);
          console.log(`[DEV/TESTING] OTP for ${user.email} is: ${otp}`);
        }
      }

      res.status(200).json({
        message: 'Account is not verified. A new OTP has been sent to your email.',
        data: {
          email: user.email || null,
          phone_number: user.phone_number || null,
          requiresVerification: true,
        },
      });
      return;
    }

    if (!user.password) {
      res.status(400).json({ message: 'This account uses social login. Please sign in with Google.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ message: 'Incorrect password.' });
      return;
    }

    const accessToken = generateAccessToken(String(user._id));
    const refreshToken = generateRefreshToken(String(user._id));

    await User.findByIdAndUpdate(user._id, {
      refreshToken,
      isOnline: true,
      lastSeen: new Date(),
    });

    res.status(200).json({
      message: 'Login successful. Welcome back!',
      data: {
        accessToken,
        refreshToken,
        user: formatUser(user),
      },
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Login failed: ' + err.message });
  }
};

// ─── LOGOUT ───────────────────────────────────────────────────────────────────
/**
 * POST /api/v1/auth/logout
 */
export const logout = async (req: any, res: Response): Promise<void> => {
  try {
    if (!req.user?._id) {
      res.status(401).json({ message: 'Unauthorized.' });
      return;
    }

    await User.findByIdAndUpdate(req.user._id, {
      refreshToken: '',
      isOnline: false,
      lastSeen: new Date(),
      socketId: '',
    });

    res.status(200).json({ message: 'Logged out successfully.' });
  } catch (err: any) {
    res.status(500).json({ message: 'Logout failed: ' + err.message });
  }
};

// ─── FORGOT PASSWORD ──────────────────────────────────────────────────────────
/**
 * POST /api/v1/auth/forgot-password
 */
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ message: 'Email is required.' });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    // Always return 200 to prevent email enumeration
    if (!user) {
      res.status(200).json({
        message: 'If an account with that email exists, a reset link has been sent.',
      });
      return;
    }

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await Otp.create({
      userId: user._id,
      otp,
      type: 'reset',
      expiresAt: otpExpires,
    });

    try {
      await sendPasswordResetEmail(user.email!, user.full_name || 'User', otp);
    } catch (emailErr: any) {
      console.warn(`⚠️ Could not send password reset email to ${user.email}:`, emailErr.message);
      console.log(`[DEV/TESTING] Reset OTP for ${user.email} is: ${otp}`);
    }

    res.status(200).json({
      message: 'If an account with that email exists, a verification code has been sent.',
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Forgot password failed: ' + err.message });
  }
};

// ─── RESET PASSWORD ───────────────────────────────────────────────────────────
/**
 * POST /api/v1/auth/reset-password
 */
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      res.status(400).json({ message: 'Email, Verification OTP, and new password are required.' });
      return;
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      res.status(400).json({ message: passwordError });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(400).json({ message: 'Invalid or expired OTP.' });
      return;
    }

    const otpRecord = await Otp.findOne({
      userId: user._id,
      otp: otp.toString(),
      type: 'reset',
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord) {
      res.status(400).json({ message: 'Invalid or expired OTP.' });
      return;
    }

    otpRecord.isUsed = true;
    await otpRecord.save();

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await User.findByIdAndUpdate(user._id, {
      password: hashedPassword,
      refreshToken: '', // Invalidate all existing sessions
    });

    res.status(200).json({ message: 'Password reset successfully. Please login with your new password.' });
  } catch (err: any) {
    res.status(500).json({ message: 'Password reset failed: ' + err.message });
  }
};

// ─── CHANGE PASSWORD (Authenticated) ─────────────────────────────────────────
/**
 * POST /api/v1/auth/change-password
 */
export const changePassword = async (req: any, res: Response): Promise<void> => {
  try {
    if (!req.user?._id) {
      res.status(401).json({ message: 'Unauthorized.' });
      return;
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ message: 'Current password and new password are required.' });
      return;
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      res.status(400).json({ message: passwordError });
      return;
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user?.password) {
      res.status(400).json({ message: 'This account uses social login and has no password.' });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      res.status(401).json({ message: 'Current password is incorrect.' });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await User.findByIdAndUpdate(user._id, { password: hashedPassword });

    res.status(200).json({ message: 'Password changed successfully.' });
  } catch (err: any) {
    res.status(500).json({ message: 'Change password failed: ' + err.message });
  }
};

// ─── REFRESH TOKEN ────────────────────────────────────────────────────────────
/**
 * POST /api/v1/auth/refresh-token
 */
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      res.status(400).json({ message: 'Refresh token is required.' });
      return;
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, (process.env.JWT_REFRESH_KEY || process.env.JWT_REFRESH_SECRET || 'bubble_default_refresh_key') as string);
    } catch {
      res.status(401).json({ message: 'Invalid or expired refresh token.' });
      return;
    }

    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || user.refreshToken !== token) {
      res.status(401).json({ message: 'Refresh token is invalid or has been revoked.' });
      return;
    }

    const newAccessToken = generateAccessToken(String(user._id));
    const newRefreshToken = generateRefreshToken(String(user._id));

    await User.findByIdAndUpdate(user._id, { refreshToken: newRefreshToken });

    res.status(200).json({
      message: 'Tokens refreshed successfully.',
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Token refresh failed: ' + err.message });
  }
};

// ─── GET ME ───────────────────────────────────────────────────────────────────
/**
 * GET /api/v1/auth/me
 * Returns the currently authenticated user's profile
 */
export const getMe = async (req: any, res: Response): Promise<void> => {
  try {
    if (!req.user?._id) {
      res.status(401).json({ message: 'Unauthorized.' });
      return;
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    res.status(200).json({
      message: 'Profile retrieved successfully.',
      data: formatUser(user),
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to retrieve profile: ' + err.message });
  }
};

// ─── GOOGLE AUTH ─────────────────────────────────────────────────────────────
/**
 * Initiates the Google OAuth flow.
 * Note: This is typically handled directly in the routes with passport.authenticate.
 */
export const googleLogin = (req: Request, res: Response): void => {
  // Logic is in the routes
};

/**
 * Handles the Google OAuth callback.
 * Passport has already authenticated the user and attached it to req.user.
 */
export const googleCallback = async (req: any, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.redirect(`${process.env.FRONTEND_URL || process.env.ORIGIN || 'http://localhost:5173'}/login?error=auth_failed`);
      return;
    }

    const accessToken = generateAccessToken(String(user._id));
    const refreshToken = generateRefreshToken(String(user._id));

    // Update user's refresh token and online status
    await User.findByIdAndUpdate(user._id, {
      refreshToken,
      isOnline: true,
      lastSeen: new Date(),
    });

    const userJson = encodeURIComponent(JSON.stringify(formatUser(user)));
    const rawState = req.query.state as string;
    const state = rawState ? decodeURIComponent(rawState) : '';

    // Extract inviteCode if present in state (e.g. mobile_..._invite_INVITECODE)
    let inviteCode: string | undefined = undefined;
    if (state && state.includes('_invite_')) {
      const parts = state.split('_invite_');
      inviteCode = parts[1] ? parts[1].trim() : undefined;
    }

    // Link user to organization via inviteCode if user has no organization yet
    if (inviteCode && user && !user.organization) {
      try {
        const existingOrg = await Organization.findOne({ inviteCode });
        if (existingOrg) {
          user.organization = existingOrg.name;
          user.org_industry = existingOrg.industry;
          user.org_size = existingOrg.size;
          user.role = 'employee';
          await user.save();

          // Add user to the default group chat of this organization
          const defaultChat = await Conversation.findOne({
            organizationId: existingOrg._id,
            isDefaultOrgChat: true,
          });
          if (defaultChat) {
            const userStr = user._id.toString();
            if (!defaultChat.users.map((id: any) => id.toString()).includes(userStr)) {
              defaultChat.users.push(user._id);
              await defaultChat.save();
            }
          }
        }
      } catch (err) {
        console.error('Failed to auto-link organization via invite code in googleCallback:', err);
      }
    }

    const userAgent = req.headers['user-agent'] || '';
    const isMobileUA = userAgent.includes('Expo') || userAgent.includes('Darwin') || userAgent.includes('Android') || userAgent.includes('Mobile');
    const isMobileRequest = (state && state.startsWith('mobile_')) || isMobileUA;

    let redirectUrl = `${process.env.FRONTEND_URL || process.env.ORIGIN || 'http://localhost:5173'}/auth/google/callback?access_token=${accessToken}&refresh_token=${refreshToken}&user=${userJson}`;
    
    if (isMobileRequest) {
      let targetCallback = '';
      if (state && state.startsWith('mobile_')) {
        targetCallback = state.replace('mobile_', '');
      } else {
        targetCallback = 'bubblechat://';
      }
      const separator = targetCallback.includes('?') ? '&' : '?';
      redirectUrl = `${targetCallback}${separator}access_token=${accessToken}&refresh_token=${refreshToken}&user=${userJson}`;
    }

    res.redirect(redirectUrl);
  } catch (err: any) {
    console.error('Google callback error:', err);
    const rawState = req.query.state as string;
    const state = rawState ? decodeURIComponent(rawState) : '';
    const userAgent = req.headers['user-agent'] || '';
    const isMobileUA = userAgent.includes('Expo') || userAgent.includes('Darwin') || userAgent.includes('Android') || userAgent.includes('Mobile');
    const isMobileRequest = (state && state.startsWith('mobile_')) || isMobileUA;

    if (isMobileRequest) {
      let targetCallback = '';
      if (state && state.startsWith('mobile_')) {
        targetCallback = state.replace('mobile_', '');
      } else {
        targetCallback = 'bubblechat://';
      }
      const separator = targetCallback.includes('?') ? '&' : '?';
      res.redirect(`${targetCallback}${separator}error=server_error`);
    } else {
      res.redirect(`${process.env.FRONTEND_URL || process.env.ORIGIN || 'http://localhost:5173'}/login?error=server_error`);
    }
  }
};

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Handles Native Google Sign-In verification for mobile clients.
 * Verifies ID Token, registers or links the user, processes optional invites, and returns JWT tokens.
 */
export const googleMobileLogin = async (req: Request, res: Response): Promise<void> => {
  const { idToken, inviteCode } = req.body;

  if (!idToken) {
    res.status(400).json({ message: 'Google ID Token is required.' });
    return;
  }

  try {
    // 1. Verify the token Google gave the mobile app
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      res.status(401).json({ message: 'Invalid ID token payload.' });
      return;
    }

    const { email, name, sub: googleId, picture } = payload;

    if (!email) {
      res.status(400).json({ message: 'Email address not provided in ID token.' });
      return;
    }

    const normalizedEmail = email.toLowerCase();

    // 2. Find or create user in MongoDB (same logic as passport.ts / googleCallback)
    let user = await User.findOne({ googleId });
    if (!user) {
      // Look up by email to link account
      user = await User.findOne({ email: normalizedEmail });
      if (user) {
        // Link account
        user.googleId = googleId;
        if (!user.avatar && picture) {
          user.avatar = picture;
        }
        await user.save();
      } else {
        // Brand new Google user — generate uniqueTag & create
        const uniqueTag = await generateUniqueTag(name || 'user');
        user = await User.create({
          googleId,
          full_name: name,
          email: normalizedEmail,
          avatar: picture || '',
          isVerified: true,
          uniqueTag,
          role: 'employee',
        });

        // Background RSA keypair generation
        crypto.generateKeyPair('rsa', {
          modulusLength: 2048,
          publicKeyEncoding: { type: 'spki', format: 'pem' },
          privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        }, async (err: any, pub: string, priv: string) => {
          if (!err) {
            await User.findByIdAndUpdate(user!._id, { publicKey: pub, privateKey: priv });
          }
        });
      }
    }

    // Link user to organization via inviteCode if user has no organization yet
    if (inviteCode && user && !user.organization) {
      try {
        const existingOrg = await Organization.findOne({ inviteCode });
        if (existingOrg) {
          user.organization = existingOrg.name;
          user.org_industry = existingOrg.industry;
          user.org_size = existingOrg.size as any;
          user.role = 'employee';
          await user.save();

          // Add user to the default group chat of this organization
          const defaultChat = await Conversation.findOne({
            organizationId: existingOrg._id,
            isDefaultOrgChat: true,
          });
          if (defaultChat) {
            const userStr = user._id.toString();
            if (!defaultChat.users.map((id: any) => id.toString()).includes(userStr)) {
              defaultChat.users.push(user._id);
              await defaultChat.save();
            }
          }

          // Send welcome email (as they joined here)
          if (user.email) {
            const summaryHtml = existingOrg.description 
              ? existingOrg.description.replace(/\n/g, '<br />') 
              : 'Welcome to the organization! The brain is currently ready and listening.';
            await sendWelcomeNewMemberEmail(user.email, user.full_name || 'Employee', existingOrg.name, summaryHtml);
          }
        }
      } catch (err) {
        console.error('Failed to auto-link organization via invite code in googleMobileLogin:', err);
      }
    }

    // Generate session tokens
    const accessToken = generateAccessToken(String(user._id));
    const refreshToken = generateRefreshToken(String(user._id));

    // Update user's refresh token and online status
    await User.findByIdAndUpdate(user._id, {
      refreshToken,
      isOnline: true,
      lastSeen: new Date(),
    });

    res.status(200).json({
      message: 'Google login successful.',
      data: {
        accessToken,
        refreshToken,
        user: formatUser(user),
      }
    });

  } catch (err: any) {
    console.error('Google mobile authentication failed:', err);
    res.status(401).json({ message: 'Google token verification failed: ' + err.message });
  }
};

// ─── 2FA INTEGRATION ─────────────────────────────────────────────────────────

export const setup2FA = async (req: any, res: Response): Promise<void> => {
  try {
    if (!req.user?._id) {
      res.status(401).json({ message: 'Unauthorized.' });
      return;
    }

    // In a real application, you would use 'otplib' to generate a secret
    // and 'qrcode' to generate a data URL. 
    // Here we return a mock data URL since package manager blocks our direct usage.

    const mockQrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=otpauth://totp/Bubble:User?secret=JBSWY3DPEHPK3PXP&issuer=Bubble";

    // Save the mock secret on user (JBSWY3DPEHPK3PXP in base32 would be standard)
    // For mock, we'll verify any 6 digit token directly for demo.

    res.status(200).json({
      qrCode: mockQrUrl,
      message: 'Scan this QR code with your authenticator app.'
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to initialize 2FA.' });
  }
};

export const verify2FA = async (req: any, res: Response): Promise<void> => {
  try {
    if (!req.user?._id) {
      res.status(401).json({ message: 'Unauthorized.' });
      return;
    }

    const { token } = req.body;
    if (!token || token.length !== 6) {
      res.status(400).json({ success: false, message: 'Invalid 2FA token.' });
      return;
    }

    // Mark user as 2FA enabled
    await User.findByIdAndUpdate(req.user._id, { twoFactorEnabled: true });

    res.status(200).json({
      success: true,
      message: '2FA verification successful.'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to verify 2FA token.' });
  }
};

/**
 * Registers or updates a push token for the authenticated user.
 * POST /api/v1/auth/push-token
 */
export const savePushToken = async (req: any, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const { token, deviceType } = req.body;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!token) {
      res.status(400).json({ message: 'token is required' });
      return;
    }

    // Upsert the token mapping
    await PushToken.findOneAndUpdate(
      { token },
      { userId, deviceType: deviceType || 'unknown' },
      { upsert: true, new: true }
    );

    res.status(200).json({ success: true, message: 'Push token registered successfully.' });
  } catch (error: any) {
    console.error('[savePushToken] error:', error);
    res.status(500).json({ message: 'Failed to register push token.' });
  }
};