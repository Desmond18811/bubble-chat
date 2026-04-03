import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/users';
import { setCache, getCache, deleteCache } from '../utils/redis';
import { sendOTPMail } from '../utils/mailer';
import crypto from 'crypto';
import passport from '../middleware/passport';

const JWT_SECRET = process.env.JWT_KEY as string;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_KEY as string;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Generate a 5-digit OTP */
const generateOTP = () => crypto.randomInt(10000, 99999).toString();

/** Generate unique BubbleID handle (e.g. bubble-A3F9X7K2) */
const generateBubbleID = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return 'bubble-' + Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

/** Password validation: 1 upper, 1 lower, 1 number, 1 special char, min 8 chars */
const isPasswordStrong = (password: string): boolean => {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[!@#$%^&*(),.?":{}|<>]/.test(password)
  );
};

/** Issue a new JWT Access + Refresh token pair */
const issueTokens = async (userId: string, email: string | undefined) => {
  const access_token = jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any });
  const refreshPayload = crypto.randomBytes(40).toString('hex');
  const refreshHash = await bcrypt.hash(refreshPayload, 10);
  const refresh_token = jwt.sign({ id: userId, token: refreshPayload }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN as any });
  await User.findByIdAndUpdate(userId, { refreshToken: refreshHash });
  return { access_token, refresh_token };
};

/** 
 * Build a comprehensive, fully-detailed public user object for all 200 responses.
 * Strips sensitive fields (password, refreshToken, privateKey).
 */
const formatUser = (user: any) => ({
  id: user._id,
  full_name: user.full_name || null,
  email: user.email || null,
  phone_number: user.phone_number || null,
  avatar: user.avatar || null,
  bio: user.bio || null,
  blog: user.blog || null,
  links: user.links || [],
  uniqueTag: user.uniqueTag || null,        // BubbleID e.g. bubble-A3F9X7K2
  publicKey: user.publicKey || null,         // RSA public key for E2EE
  googleId: user.googleId || null,
  isVerified: user.isVerified,
  isPremium: user.isPremium,
  isOnline: user.isOnline,
  lastSeen: user.lastSeen || null,
  contacts: user.contacts || [],
  sharedResources: user.sharedResources || [],
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

// ─────────────────────────────────────────────────────────────────────────────
// Auth Handlers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Register New User
 * POST /api/v1/auth/register
 * Payload: { email, full_name, password, confirm_password, phone_number }
 */
export const register = async (req: Request, res: Response) => {
  const { email, full_name, password, confirm_password, phone_number } = req.body;

  if (password !== confirm_password) {
    return res.status(400).json({ message: 'Passwords do not match' });
  }
  if (!isPasswordStrong(password)) {
    return res.status(400).json({
      message: 'Password must be at least 8 characters and include 1 uppercase, 1 lowercase, 1 number, and 1 special character.',
    });
  }

  try {
    const existingUser = await User.findOne({ $or: [{ email }, { phone_number }] });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email or phone number' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Auto-generate a unique BubbleID — retry on collision
    let uniqueTag = generateBubbleID();
    while (await User.findOne({ uniqueTag })) {
      uniqueTag = generateBubbleID();
    }

    const newUser = await User.create({
      full_name,
      email,
      phone_number,
      password: hashedPassword,
      isVerified: false,
      uniqueTag,
    });

    // Background: generate RSA E2EE keypair
    crypto.generateKeyPair('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    }, async (err, pub, priv) => {
      if (!err) await User.findByIdAndUpdate(newUser._id, { publicKey: pub, privateKey: priv });
    });

    const otp = generateOTP();
    await setCache(`otp:${email}`, otp, 600); // 10 minute TTL
    await sendOTPMail(email, otp);

    res.status(201).json({
      message: 'Registration successful! A 5-digit verification code has been sent to your email.',
      user: {
        id: newUser._id,
        full_name: newUser.full_name,
        email: newUser.email,
        phone_number: newUser.phone_number,
        uniqueTag: newUser.uniqueTag,
        isVerified: newUser.isVerified,
        createdAt: newUser.createdAt,
      },
      next_step: 'POST /api/v1/auth/verify-otp with { email, otp }',
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Resend OTP (Registration / Account Verification)
 * POST /api/v1/auth/resend-otp
 */
export const resendOTP = async (req: Request, res: Response) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.isVerified) return res.status(400).json({ message: 'Account is already verified' });

    const otp = generateOTP();
    await setCache(`otp:${email}`, otp, 600);
    await sendOTPMail(email, otp);

    res.status(200).json({
      message: 'OTP resent successfully.',
      email,
      expires_in: '10 minutes',
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Verify OTP — verifies account and issues session tokens
 * POST /api/v1/auth/verify-otp
 */
export const verifyOTP = async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  try {
    const cachedOTP = await getCache(`otp:${email}`);
    if (!cachedOTP || String(cachedOTP) !== String(otp)) {
      return res.status(400).json({ message: 'Invalid or expired OTP. Please request a new one.' });
    }

    const user = await User.findOneAndUpdate({ email }, { isVerified: true }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });

    await deleteCache(`otp:${email}`);

    const { access_token, refresh_token } = await issueTokens(String(user._id), user.email);

    res.status(200).json({
      message: 'Email verified successfully. You are now logged in.',
      access_token,
      refresh_token,
      token_type: 'Bearer',
      expires_in: JWT_EXPIRES_IN,
      user: formatUser(user),
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Login — email, phone, or BubbleID + password
 * POST /api/v1/auth/login
 */
export const login = (req: Request, res: Response, next: any) => {
  passport.authenticate('local', { session: false }, async (err: any, user: any, info: any) => {
    if (err) return res.status(500).json({ message: err.message });
    if (!user) return res.status(401).json({ message: info?.message || 'Invalid credentials' });
    if (!user.isVerified) {
      return res.status(403).json({
        message: 'Account not verified. Please check your email for the OTP.',
        next_step: 'POST /api/v1/auth/resend-otp with { email }',
      });
    }

    const { access_token, refresh_token } = await issueTokens(String(user._id), user.email);

    res.status(200).json({
      message: 'Logged in successfully.',
      access_token,
      refresh_token,
      token_type: 'Bearer',
      expires_in: JWT_EXPIRES_IN,
      user: formatUser(user),
    });
  })(req, res, next);
};

/**
 * Google OAuth — initiate redirect
 * GET /api/v1/auth/google
 */
export const googleLogin = passport.authenticate('google', {
  scope: ['profile', 'email'],
  session: false,
});

/**
 * Google OAuth Callback — handles Google's redirect back
 * GET /api/v1/auth/google/callback
 */
export const googleCallback = (req: Request, res: Response, next: any) => {
  passport.authenticate('google', { session: false }, async (err: any, user: any) => {
    if (err || !user) {
      const clientUrl = process.env.ORIGIN || 'http://localhost:8080';
      return res.redirect(`${clientUrl}/login?error=google_auth_failed`);
    }

    const { access_token, refresh_token } = await issueTokens(String(user._id), user.email);

    // Redirect to frontend with tokens in query params (client stores in localStorage)
    const clientUrl = process.env.ORIGIN || 'http://localhost:8080';
    res.redirect(
      `${clientUrl}/auth/google/callback?access_token=${access_token}&refresh_token=${refresh_token}`
    );
  })(req, res, next);
};

/**
 * Refresh Access Token (rotation)
 * POST /api/v1/auth/refresh
 */
export const refreshAccessToken = async (req: Request, res: Response) => {
  const { refresh_token } = req.body;
  if (!refresh_token) return res.status(401).json({ message: 'Refresh token required' });

  try {
    const decoded: any = jwt.verify(refresh_token, JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id).select('+refreshToken');

    if (!user || !user.refreshToken) {
      return res.status(403).json({ message: 'Invalid session. Please log in again.' });
    }

    const isValid = await bcrypt.compare(decoded.token, user.refreshToken);
    if (!isValid) return res.status(403).json({ message: 'Invalid refresh token. Please log in again.' });

    const { access_token: newAccessToken, refresh_token: newRefreshToken } = await issueTokens(String(user._id), user.email);

    res.status(200).json({
      message: 'Tokens rotated successfully.',
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      token_type: 'Bearer',
      expires_in: JWT_EXPIRES_IN,
    });
  } catch (err) {
    res.status(403).json({ message: 'Expired or invalid refresh token. Please log in again.' });
  }
};

/**
 * Logout — revoke refresh token
 * POST /api/v1/auth/logout
 */
export const logout = async (req: Request, res: Response) => {
  try {
    if (req.user) {
      await User.findByIdAndUpdate((req.user as any)._id, { refreshToken: '' });
    }
    res.status(200).json({
      message: 'Logged out successfully. Refresh token has been revoked.',
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to logout' });
  }
};

/**
 * Get Current Authenticated User Profile
 * GET /api/v1/auth/me
 */
export const getMe = async (req: Request, res: Response) => {
  const user = await User.findById((req.user as any)._id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  res.status(200).json({
    message: 'Profile retrieved successfully.',
    user: formatUser(user),
  });
};

/**
 * Forgot Password — send reset OTP
 * POST /api/v1/auth/forgot-password
 */
export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'No account found with that email' });

    const otp = generateOTP();
    await setCache(`otp:reset:${email}`, otp, 600);
    await sendOTPMail(email, otp);

    res.status(200).json({
      message: 'Password reset OTP sent to your email.',
      email,
      expires_in: '10 minutes',
      next_step: 'POST /api/v1/auth/verify-reset-otp with { email, otp }',
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Verify Reset OTP — validates OTP before allowing password change
 * POST /api/v1/auth/verify-reset-otp
 */
export const verifyResetOTP = async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  try {
    const cachedOTP = await getCache(`otp:reset:${email}`);
    if (!cachedOTP || String(cachedOTP) !== String(otp)) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }
    res.status(200).json({
      message: 'OTP verified. You may now set a new password.',
      email,
      next_step: 'POST /api/v1/auth/reset-password with { email, otp, new_password, confirm_password }',
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Reset Password — finalize password change
 * POST /api/v1/auth/reset-password
 */
export const resetPassword = async (req: Request, res: Response) => {
  const { email, otp, new_password, confirm_password } = req.body;

  if (new_password !== confirm_password) {
    return res.status(400).json({ message: 'Passwords do not match' });
  }
  if (!isPasswordStrong(new_password)) {
    return res.status(400).json({
      message: 'Password must be at least 8 characters and include 1 uppercase, 1 lowercase, 1 number, and 1 special character.',
    });
  }

  try {
    const cachedOTP = await getCache(`otp:reset:${email}`);
    if (!cachedOTP || String(cachedOTP) !== String(otp)) {
      return res.status(400).json({ message: 'Invalid or expired OTP. Please request a new reset code.' });
    }

    const hashedPassword = await bcrypt.hash(new_password, 12);
    const user = await User.findOneAndUpdate({ email }, { password: hashedPassword }, { new: true });
    await deleteCache(`otp:reset:${email}`);

    res.status(200).json({
      message: 'Password reset successfully. You can now log in with your new password.',
      email,
      next_step: 'POST /api/v1/auth/login with { email, password }',
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
