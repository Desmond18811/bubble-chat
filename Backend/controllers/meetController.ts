import { Request, Response } from 'express';
import CallLog from '../models/callLog';

// GET /api/v1/meet/logs
export const getCallLogs = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    const logs = await CallLog.find({ user: userId })
      .sort({ timestamp: -1 })
      .limit(50)
      .lean();
    res.json({ logs });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/v1/meet/logs
export const createCallLog = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    const { roomId, type, label, duration, missed } = req.body;
    const log = await CallLog.create({
      user: userId,
      roomId,
      type,
      label: label || `${type === 'video' ? 'Video' : 'Voice'} Call`,
      duration,
      missed: missed || false,
      timestamp: new Date(),
    });
    res.status(201).json({ log });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

// DELETE /api/v1/meet/logs
export const clearCallLogs = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    await CallLog.deleteMany({ user: userId });
    res.json({ message: 'Call logs cleared successfully.' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
