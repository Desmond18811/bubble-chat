import { Request, Response } from 'express';
import { ActivityLog, ActivityAction } from '../models/activityLog';

// ─── Internal helper — called by other controllers ────────────────────────────

export const logActivity = async (data: {
  actor: any;
  action: ActivityAction;
  entityId?: string;
  entityType?: string;
  entityLabel?: string;
  metadata?: Record<string, any>;
  ip?: string;
  userAgent?: string;
}): Promise<void> => {
  try {
    await ActivityLog.create(data);
  } catch (err) {
    // Non-blocking — don't fail the main request
    console.error('logActivity error:', err);
  }
};

// ─── Middleware helper — attach to routes you want to auto-log ────────────────
export const activityMiddleware = (action: ActivityAction) => {
  return (req: any, res: any, next: any) => {
    res.on('finish', async () => {
      if (res.statusCode < 400 && req.user?._id) {
        await logActivity({
          actor:     req.user._id,
          action,
          ip:        req.ip,
          userAgent: req.headers['user-agent'],
        });
      }
    });
    next();
  };
};

// ─── GET /api/v1/activity ─────────────────────────────────────────────────────
export const getActivityLog = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user?._id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const page    = parseInt((req.query.page as string) || '1');
    const limit   = parseInt((req.query.limit as string) || '50');
    const skip    = (page - 1) * limit;
    const action  = req.query.action as string | undefined;
    const entity  = req.query.entityType as string | undefined;

    const filter: any = { actor: userId };
    if (action) filter.action = action;
    if (entity) filter.entityType = entity;

    const [logs, total] = await Promise.all([
      ActivityLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ActivityLog.countDocuments(filter),
    ]);

    res.status(200).json({ logs, total, page, limit });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to fetch activity log', error: err.message });
  }
};

// ─── DELETE /api/v1/activity — Clear personal activity log ───────────────────
export const clearActivityLog = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user?._id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    await ActivityLog.deleteMany({ actor: userId });
    res.status(200).json({ message: 'Activity log cleared' });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to clear activity log', error: err.message });
  }
};
