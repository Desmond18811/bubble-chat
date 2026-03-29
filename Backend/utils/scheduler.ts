import cron from 'node-cron';
import crypto from 'crypto';
import { SecurityCode } from '../models/security';

/**
 * Bubble Chat Weekly Security Rotation Service
 * Generates a new, cryptographically strong security number every week.
 */

// 1. Generate a new security code
export const rotateSecurityCode = async () => {
  try {
    // Deactivate old codes
    await SecurityCode.updateMany({ isCurrent: true }, { isCurrent: false });

    // Generate new code: A 12-digit random numeric string for "security numbers"
    // Or a 32-byte hash for "security codes" (using hex for readability)
    const newCode = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const code = await SecurityCode.create({
      code: newCode,
      isCurrent: true,
      expiresAt: expiresAt,
    });

    console.log(`🔒 SECURITY UPDATED: New Weekly Security Code rotation completed. ID: ${code._id}`);
    return code;
  } catch (err) {
    console.error('❌ Error during security code rotation:', err);
  }
};

// 2. Schedule the rotation task
export const initSecurityScheduler = () => {
  // Sunday at 00:00 (Midnight)
  cron.schedule('0 0 * * 0', async () => {
    console.log('⏳ Sunday Midnight: Initiating weekly security rotation...');
    await rotateSecurityCode();
  });

  // Also run it on initialization if no current code exists
  SecurityCode.findOne({ isCurrent: true }).then(async (code) => {
    if (!code) {
      console.log('🛡️ No active security code found. Initializing first-run rotation...');
      await rotateSecurityCode();
    }
  });
};
