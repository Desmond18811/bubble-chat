import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/users';
import { setCache, getCache, deleteCache } from '../utils/redis';
import { sendOTPMail } from '../utils/mailer';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_KEY || 'bubble_default_key';

/**
 * Generate a 6-digit OTP
 */
const generateOTP = () => crypto.randomInt(100000, 999999).toString();

/**
 * Signup Flow
 */
export const register = async (req: Request, res: Response) => {
  const { email, password, name, publicKey } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = await User.create({
      email,
      password: hashedPassword,
      name,
      isVerified: false,
      publicKey: publicKey || '',
    });


    const otp = generateOTP();
    // Save to Redis for 10 minutes (600 seconds)
    await setCache(`otp:${email}`, otp, 600);
    await sendOTPMail(email, otp);

    res.status(201).json({ 
      message: 'User registered. Please verify your email with the OTP sent.',
      userId: newUser._id,
      email: newUser.email
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Verify OTP Flow
 */
export const verifyOTP = async (req: Request, res: Response) => {
  const { email, otp } = req.body;

  try {
    const cachedOTP = await getCache(`otp:${email}`);
    if (!cachedOTP || cachedOTP !== otp) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const user = await User.findOneAndUpdate({ email }, { isVerified: true }, { new: true });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await deleteCache(`otp:${email}`);

    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.status(200).json({ message: 'Email verified successfully', token, user });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Login Flow
 */
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(404).json({ message: 'Invalid credentials' });
    }

    if (!user.isVerified) {
       return res.status(403).json({ message: 'Please verify your email first' });
    }

    const isMatch = await bcrypt.compare(password, user.password as string);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.status(200).json({ token, user, message: 'Logged in successfully' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Forgot Password Flow
 */
export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const otp = generateOTP();
    await setCache(`otp:reset:${email}`, otp, 600);
    await sendOTPMail(email, otp);

    res.status(200).json({ message: 'Reset OTP sent to your email' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Reset Password Flow
 */
export const resetPassword = async (req: Request, res: Response) => {
  const { email, otp, newPassword } = req.body;

  try {
    const cachedOTP = await getCache(`otp:reset:${email}`);
    if (!cachedOTP || cachedOTP !== otp) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await User.findOneAndUpdate({ email }, { password: hashedPassword });
    await deleteCache(`otp:reset:${email}`);

    res.status(200).json({ message: 'Password reset successfully' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
