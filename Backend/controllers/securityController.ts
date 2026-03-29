import { Request, Response } from 'express';
import { SecurityCode } from '../models/security';

/**
 * Get the current weekly security code
 * GET /api/security/current
 */
export const getCurrentSecurityCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentCode = await SecurityCode.findOne({ isCurrent: true });
    
    if (!currentCode) {
      res.status(404).json({ message: 'No active security transmission found' });
      return;
    }

    res.json({
      code: currentCode.code,
      generatedAt: currentCode.createdAt,
      expiresAt: currentCode.expiresAt
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Security System Error: ' + error.message });
  }
};
