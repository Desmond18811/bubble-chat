import { Request, Response } from 'express';
import { Task } from '../models/task';
import { createNotification } from './notificationController';
import { logActivity } from './activityLogController';
import { User } from '../models/users';
import { Conversation } from '../models/conversations';
import { Message } from '../models/messages';
import { Organization } from '../models/organizations';
import OpenAI from 'openai';

const deepseekClient = new OpenAI({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY || '',
});

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
      assignedTo, color, source, meetingRef, isRecurring, recurrence, recipients
    } = req.body;

    // Default colors based on types if none provided:
    // scheduled meeting (green dot), event (blue dot)
    let finalColor = color;
    if (!finalColor) {
      if (type === 'meeting') finalColor = '#10b981'; // Green
      else if (type === 'event') finalColor = '#3b82f6'; // Blue
      else finalColor = '#6366f1'; // Default violet
    }

    const task = await Task.create({
      user_id: userId,
      assignedTo: assignedTo || userId,
      recipients: recipients || [],
      type: type || 'task',
      title,
      description,
      start_time,
      end_time,
      status: status || 'todo',
      priority: priority || 'medium',
      color: finalColor,
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

    // Handle Calendar Recipient Notifications
    const hasRecipients = recipients && recipients.length > 0;
    if (hasRecipients) {
      // Send individual notifications to all selected recipients
      for (const recId of recipients) {
        if (String(recId) !== String(userId)) {
          await createNotification({
            recipient: recId,
            sender: userId,
            type: type === 'meeting' ? 'meeting_invite' : 'task_assigned',
            title: type === 'meeting' ? `New Meeting Invitation: ${task.title}` : `New Event Invitation: ${task.title}`,
            body: description || `Scheduled for ${new Date(start_time).toLocaleString()}`,
            entityId: String(task._id),
            entityType: 'Task',
          });
        }
      }
    } else if (type === 'meeting' || type === 'event') {
      // If "Select All" (empty recipients), post to the default organization group chat!
      try {
        const creator = await User.findById(userId);
        if (creator && creator.organization) {
          const org = await Organization.findOne({ name: creator.organization });
          if (org) {
            const defaultChat = await Conversation.findOne({
              organizationId: org._id,
              isDefaultOrgChat: true,
            });

            if (defaultChat) {
              const bot = await User.findOne({ is_bot: true, username: 'aida' });
              const botId = bot ? bot._id : null;
              
              const startStr = new Date(start_time).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
              const eventTypeText = type === 'meeting' ? '📅 Meeting' : '📢 Event';
              const chatContent = `🗓️ **New ${eventTypeText} Scheduled**\n\n**Title:** ${task.title}\n**Time:** ${startStr}\n${description ? `**Description:** ${description}` : ''}`;

              const groupMsg = await Message.create({
                chat: defaultChat._id,
                sender: botId || userId,
                content: chatContent,
                message_type: 'text',
              });

              await Conversation.findByIdAndUpdate(defaultChat._id, {
                $set: { latestMessage: (groupMsg as any)._id },
              });

              // Emit Socket alert
              const { getIO } = await import('../utils/socket');
              const io = getIO();
              const { formatMessage } = await import('./messageController') as any;
              const fullMsg = await Message.findById((groupMsg as any)._id).populate('sender', 'full_name username avatar is_bot');
              const formatted = await formatMessage(fullMsg);
              io.to(String(defaultChat._id)).emit('new_message', formatted);
              defaultChat.users.forEach((u: any) => {
                io.to(u.toString()).emit('new_message', formatted);
              });
              console.log(`[Calendar Alert] Broadcasted calendar creation message to default chat: ${defaultChat._id}`);
            }
          }
        }
      } catch (err) {
        console.error('[Calendar Alert] Default group chat notification post failed:', err);
      }
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

    // If it's a meeting or event being updated, mark as updated and turn color to yellow
    const existingTask = await Task.findById(id);
    if (existingTask && (existingTask.type === 'meeting' || existingTask.type === 'event')) {
      updateFields.isUpdated = true;
      updateFields.color = '#f59e0b'; // Yellow (#f59e0b)
    }

    const task = await Task.findOneAndUpdate(
      { _id: id, $or: [{ user_id: userId }, { assignedTo: userId }] },
      { $set: updateFields },
      { returnDocument: 'after' }
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

// ─── POST /api/v1/tasks/ai-describe — Auto-describe event/meeting details ───
export const aiDescribeEvent = async (req: Request, res: Response): Promise<any> => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt description is required' });
    }

    const key = process.env.DEEPSEEK_API_KEY;
    const hasDeepSeekKey = !!(key && key.length > 10 && !key.startsWith('your_') && !key.startsWith('add_your_'));
    if (!hasDeepSeekKey) {
      return res.status(200).json({
        description: `Scheduled event based on prompt: "${prompt}". (AI description unavailable - DeepSeek key not configured.)`
      });
    }

    const response = await deepseekClient.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'You are a professional business assistant. Based on this brief input from a business owner, write a clear, professional, and well-structured description for this event/meeting. Make it sound formal, organized, and helpful for team alignment. Avoid placeholders, keep it under 3-4 sentences.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 300,
      temperature: 0.6,
    });

    const detailedDescription = response.choices?.[0]?.message?.content || prompt;

    res.status(200).json({ description: detailedDescription });
  } catch (err: any) {
    console.error('[Calendar AI Describe] Error:', err);
    res.status(500).json({ error: 'Failed to generate AI description.' });
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
      { returnDocument: 'after' }
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
