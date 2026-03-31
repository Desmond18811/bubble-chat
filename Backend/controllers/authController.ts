import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/users';
import { setCache, getCache, deleteCache } from '../utils/redis';
import { sendOTPMail } from '../utils/mailer';
import crypto from 'crypto';
import passport from '../middleware/passport';

const JWT_SECRET = process.env.JWT_KEY as string || 'default_jwt_secret_for_development';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_KEY as string || 'default_jwt_refresh_secret_for_development';

/**
 * Generate a 5-digit OTP
 */
const generateOTP = () => crypto.randomInt(10000, 99999).toString();

/**
 * Register New User
 * Payload: { email, full_name, password, confirm_password, phone_number }
 */
export const register = async (req: Request, res: Response) => {
  const { email, full_name, password, confirm_password, phone_number } = req.body;

  if (password !== confirm_password) {
    return res.status(400).json({ message: "Passwords do not match" });
  }

  try {
    const existingUser = await User.findOne({ 
      $or: [{ email }, { phone_number }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email or phone number' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = await User.create({
      full_name,
      email,
      phone_number,
      password: hashedPassword,
      isVerified: false,
    });

    // Background task: generate RSA keypair behind the scenes
    crypto.generateKeyPair('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    }, async (err, generatedPublicKey, generatedPrivateKey) => {
      if (!err) {
        await User.findByIdAndUpdate(newUser._id, {
          publicKey: generatedPublicKey,
          privateKey: generatedPrivateKey
        });
      }
    });

    const otp = generateOTP();
    // Save to Redis for 10 minutes (600 seconds)
    await setCache(`otp:${email}`, otp, 600);
    await sendOTPMail(email, otp);

    res.status(201).json({
      message: 'User registered. Please verify your email with the 5-digit OTP sent.',
      userId: newUser._id,
      email: newUser.email
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Resend OTP (Registration / Account Verification)
 */
export const resendOTP = async (req: Request, res: Response) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    const otp = generateOTP();
    await setCache(`otp:${email}`, otp, 600);
    await sendOTPMail(email, otp);

    res.status(200).json({ message: 'OTP resent successfully.' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

/**
 * Verify OTP Flow
 */
export const verifyOTP = async (req: Request, res: Response) => {
  const { email, otp } = req.body;

  try {
    const cachedOTP = await getCache(`otp:${email}`);
    if (!cachedOTP || String(cachedOTP) !== String(otp)) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const user = await User.findOneAndUpdate({ email }, { isVerified: true }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });

    await deleteCache(`otp:${email}`);

    // Generate Access & Refresh Tokens
    const accessToken = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '15m' });
    const refreshTokenPayload = crypto.randomBytes(40).toString('hex');
    const refreshTokenHash = await bcrypt.hash(refreshTokenPayload, 10);
    
    const refresh_token = jwt.sign({ id: user._id, token: refreshTokenPayload }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
    
    // Save refresh hash to DB
    await User.findByIdAndUpdate(user._id, { refreshToken: refreshTokenHash });

    res.status(200).json({ 
      message: 'Email verified successfully', 
      access_token: accessToken,
      refresh_token,
      user 
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Login Flow - Handles Email or Phone through Passport Local
 */
export const login = (req: Request, res: Response, next: any) => {
  passport.authenticate('local', { session: false }, async (err: any, user: any, info: any) => {
    if (err) return res.status(500).json({ message: err.message });
    if (!user) return res.status(400).json({ message: info?.message || 'Invalid credentials' });
    if (!user.isVerified) return res.status(403).json({ message: 'Please verify your account first' });

    // Generate Tokens
    const accessToken = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '15m' });
    const refreshTokenPayload = crypto.randomBytes(40).toString('hex');
    const refreshTokenHash = await bcrypt.hash(refreshTokenPayload, 10);
    const refresh_token = jwt.sign({ id: user._id, token: refreshTokenPayload }, JWT_REFRESH_SECRET, { expiresIn: '7d' });

    await User.findByIdAndUpdate(user._id, { refreshToken: refreshTokenHash });

    user.password = undefined;
    user.refreshToken = undefined;

    res.status(200).json({ 
      message: 'Logged in successfully',
      access_token: accessToken, 
      refresh_token,
      user
    });
  })(req, res, next);
};

/**
 * Refresh Access Token
 */
export const refreshAccessToken = async (req: Request, res: Response) => {
    const { refresh_token } = req.body;
    if (!refresh_token) return res.status(401).json({ message: 'Refresh token required' });

    try {
        const decoded: any = jwt.verify(refresh_token, JWT_REFRESH_SECRET);
        const user = await User.findById(decoded.id).select('+refreshToken');
        
        if (!user || !user.refreshToken) {
            return res.status(403).json({ message: 'Invalid session' });
        }

        const isValid = await bcrypt.compare(decoded.token, user.refreshToken);
        if (!isValid) return res.status(403).json({ message: 'Invalid refresh token' });

        // Rotate Tokens
        const newAccessToken = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '15m' });
        const newRefreshTokenPayload = crypto.randomBytes(40).toString('hex');
        const newRefreshTokenHash = await bcrypt.hash(newRefreshTokenPayload, 10);
        const new_refresh_token = jwt.sign({ id: user._id, token: newRefreshTokenPayload }, JWT_REFRESH_SECRET, { expiresIn: '7d' });

        await User.findByIdAndUpdate(user._id, { refreshToken: newRefreshTokenHash });

        res.status(200).json({
            access_token: newAccessToken,
            refresh_token: new_refresh_token
        });
    } catch (err) {
        res.status(403).json({ message: 'Expired or invalid refresh token' });
    }
};

/**
 * Logout
 */
export const logout = async (req: Request, res: Response) => {
    // Requires JWT middleware (req.user)
    try {
        if (req.user) {
            await User.findByIdAndUpdate((req.user as any)._id, { refreshToken: '' });
        }
        res.status(200).json({ message: 'Logged out successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to logout' });
    }
};

/**
 * Get Current Profile
 */
export const getMe = async (req: Request, res: Response) => {
    res.status(200).json({ user: req.user });
}

/**
 * Forgot Password Flow
 */
export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const otp = generateOTP();
    await setCache(`otp:reset:${email}`, otp, 600);
    await sendOTPMail(email, otp);

    res.status(200).json({ message: 'Reset OTP sent to your email' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Verify Reset OTP
 */
export const verifyResetOTP = async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  try {
    const cachedOTP = await getCache(`otp:reset:${email}`);
    if (!cachedOTP || String(cachedOTP) !== String(otp)) {
      return res.status(400).json({ message: 'Invalid or expired reset OTP' });
    }
    // We don't delete yet. Client needs it for final reset step.
    res.status(200).json({ message: 'OTP verified. You can now reset your password.' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Reset Password Flow
 */
export const resetPassword = async (req: Request, res: Response) => {
  const { email, otp, new_password, confirm_password } = req.body;

  if (new_password !== confirm_password) {
    return res.status(400).json({ message: 'Passwords do not match' });
  }

  try {
    const cachedOTP = await getCache(`otp:reset:${email}`);
    if (!cachedOTP || String(cachedOTP) !== String(otp)) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const hashedPassword = await bcrypt.hash(new_password, 12);
    await User.findOneAndUpdate({ email }, { password: hashedPassword });
    await deleteCache(`otp:reset:${email}`);

    res.status(200).json({ message: 'Password reset successfully' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
