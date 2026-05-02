import { Request, Response } from 'express';
import { Task } from '../models/task';
import { createNotification } from './notificationController';
import { logActivity } from './activityLogController';

// ─── GET /api/v1/tasks — List tasks for user (optionally filtered) ─────────────
export const getTasks = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user?._id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { type, status, source, from, to, assignedTo } = req.query;
    const filter: any = {
      $or: [{ user_id: userId }, { assignedTo: userId }],
    };

    if (type) filter.type = type;
    if (status) filter.status = status;
    if (source) filter.source = source;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (from || to) {
      filter.start_time = {};
      if (from) filter.start_time.$gte = new Date(from as string);
      if (to) filter.start_time.$lte = new Date(to as string);
    }

    const tasks = await Task.find(filter)
      .sort({ start_time: 1 })
      .populate('assignedTo', 'full_name username avatar')
      .populate('meetingRef', 'title roomId')
      .lean();

    res.status(200).json({ tasks });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to fetch tasks', error: err.message });
  }
};

// ─── POST /api/v1/tasks — Create a task ──────────────────────────────────────
export const createTask = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user?._id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const {
      title, description, start_time, end_time, status, type, priority,
      assignedTo, color, source, meetingRef, isRecurring, recurrence
    } = req.body;

    const task = await Task.create({
      user_id: userId,
      assignedTo: assignedTo || userId,
      type: type || 'task',
      title,
      description,
      start_time,
      end_time,
      status: status || 'todo',
      priority: priority || 'medium',
      color: color || '#6366f1',
      source: source || 'manual',
      meetingRef,
      isRecurring: isRecurring || false,
      recurrence,
    });

    // Notify the assigned person if different from creator
    if (assignedTo && String(assignedTo) !== String(userId)) {
      await createNotification({
        recipient: assignedTo,
        sender: userId,
        type: 'task_assigned',
        title: 'New task assigned to you',
        body: task.title,
        entityId: String(task._id),
        entityType: 'Task',
      });
    }

    await logActivity({
      actor: userId,
      action: 'task_created',
      entityId: String(task._id),
      entityType: 'Task',
      entityLabel: task.title,
    });

    res.status(201).json({ message: 'Task created successfully', task });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to create task', error: err.message });
  }
};

// ─── PUT /api/v1/tasks/:id — Full task update ────────────────────────────────
export const updateTask = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user?._id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { id } = req.params;
    const updateFields = req.body; // Allow partial updates

    const task = await Task.findOneAndUpdate(
      { _id: id, $or: [{ user_id: userId }, { assignedTo: userId }] },
      { $set: updateFields },
      { new: true }
    );

    if (!task) return res.status(404).json({ message: 'Task not found' });

    if (updateFields.status === 'done') {
      await logActivity({
        actor: userId,
        action: 'task_completed',
        entityId: String(task._id),
        entityType: 'Task',
        entityLabel: task.title,
      });
    }

    res.status(200).json({ message: 'Task updated', task });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to update task', error: err.message });
  }
};

// Legacy shim — kept for backward compat with old routes
export const updateTaskStatus = updateTask;

// ─── PUT /api/v1/tasks/:id/snooze — Snooze a task ───────────────────────────
export const snoozeTask = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user?._id;
    const { snoozedUntil } = req.body;
    if (!snoozedUntil) return res.status(400).json({ message: 'snoozedUntil is required' });

    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, $or: [{ user_id: userId }, { assignedTo: userId }] },
      { status: 'snoozed', snoozedUntil: new Date(snoozedUntil) },
      { new: true }
    );

    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.status(200).json({ message: 'Task snoozed', task });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to snooze task', error: err.message });
  }
};

// ─── DELETE /api/v1/tasks/all — Delete all tasks ──────────────────────────────
export const clearAllTasks = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user?._id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    await Task.deleteMany({ user_id: userId });

    await logActivity({
      actor: userId,
      action: 'task_deleted',
      entityId: String(userId),
      entityType: 'User',
      entityLabel: 'Cleared all scheduled tasks',
    });

    res.status(200).json({ message: 'All tasks deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to clear tasks', error: err.message });
  }
};

// ─── DELETE /api/v1/tasks/:id — Delete a task ────────────────────────────────
export const deleteTask = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user?._id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const task = await Task.findOneAndDelete({ _id: req.params.id, user_id: userId });
    if (!task) return res.status(404).json({ message: 'Task not found' });

    await logActivity({
      actor: userId,
      action: 'task_deleted',
      entityId: String(task._id),
      entityType: 'Task',
      entityLabel: task.title,
    });

    res.status(200).json({ message: 'Task deleted' });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to delete task', error: err.message });
  }
};
