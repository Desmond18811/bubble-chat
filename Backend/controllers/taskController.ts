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
      assignedTo, color, source, meetingRef, isRecurring, recurrence, recipients,
      meetingType
    } = req.body;

    const finalPriority = priority || 'medium';

    // Default colors based on types/priority if none provided:
    // scheduled meeting (green dot), event (blue dot), tasks (violet dot), urgent (red dot)
    let finalColor = color;
    if (!finalColor) {
      if (finalPriority === 'urgent') finalColor = '#ef4444'; // Red
      else if (type === 'meeting') finalColor = '#10b981'; // Green
      else if (type === 'event') finalColor = '#3b82f6'; // Blue
      else finalColor = '#6366f1'; // Violet
    }

    const task = await Task.create({
      user_id: userId,
      assignedTo: assignedTo || userId,
      recipients: recipients || [],
      type: type || 'task',
      meetingType,
      title,
      description,
      start_time,
      end_time,
      status: status || 'todo',
      priority: finalPriority,
      color: finalColor,
      source: source || 'manual',
      meetingRef,
      isRecurring: isRecurring || false,
      recurrence,
    });

    // Send in-app notification to all assignees/recipients (and creator if self-assigned)
    const recipientsToNotify = new Set<string>();
    if (assignedTo) {
      recipientsToNotify.add(String(assignedTo));
    }
    if (recipients && recipients.length > 0) {
      recipients.forEach((r: any) => recipientsToNotify.add(String(r)));
    }
    // If self-assigned
    if (recipientsToNotify.size === 0) {
      recipientsToNotify.add(String(userId));
    }

    for (const recId of recipientsToNotify) {
      await createNotification({
        recipient: recId,
        sender: userId,
        type: type === 'meeting' ? 'meeting_invite' : 'task_assigned',
        title: type === 'meeting' ? `Meeting Invitation: ${task.title}` : `Task/Event Invitation: ${task.title}`,
        body: description || `Scheduled for ${new Date(start_time).toLocaleString()}`,
        entityId: String(task._id),
        entityType: 'Task',
      });
    }

    const hasRecipients = recipients && recipients.length > 0;

    // ── Send Email Invitations ───────────────────────────────────────────────
    try {
      const creator = await User.findById(userId).select('full_name username organization');
      const creatorName = creator?.full_name || creator?.username || 'A teammate';

      const emailList: { email: string; name: string }[] = [];

      if (hasRecipients) {
        // Send email to specific selected recipients
        for (const recId of recipients) {
          const recUser = await User.findById(recId).select('email full_name username');
          if (recUser && recUser.email) {
            emailList.push({ email: recUser.email, name: recUser.full_name || recUser.username || 'Attendee' });
          }
        }
      } else if ((type === 'meeting' || type === 'event') && creator && creator.organization) {
        // Broadcast: Send email to everyone in the organization
        const orgUsers = await User.find({ organization: creator.organization }).select('email full_name username');
        for (const recUser of orgUsers) {
          if (recUser.email) {
            emailList.push({ email: recUser.email, name: recUser.full_name || recUser.username || 'Attendee' });
          }
        }
      } else if (assignedTo) {
        // Single task assignment
        const recUser = await User.findById(assignedTo).select('email full_name username');
        if (recUser && recUser.email) {
          emailList.push({ email: recUser.email, name: recUser.full_name || recUser.username || 'Assignee' });
        }
      }

      // If priority is urgent, trigger immediate push & send high-importance email alerts
      if (finalPriority === 'urgent') {
        const pushTargets = Array.from(recipientsToNotify);
        const { sendPushNotification } = await import('../utils/push');
        sendPushNotification(
          pushTargets,
          `🚨 URGENT ACTION: ${task.title}`,
          description || `Immediate attention needed for this critical agenda.`,
          {
            entityId: String(task._id),
            entityType: 'Task',
            priority: 'high'
          }
        ).catch(err => console.error('[Push] Urgent push notification error:', err));

        const { sendMail } = await import('../utils/mailer');
        for (const recipientInfo of emailList) {
          const urgentHtml = `
            <div style="font-family: 'Poppins', 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #fff5f5; border-radius: 28px; overflow: hidden; border: 1px solid #feb2b2; box-shadow: 0 15px 35px -5px rgba(229, 62, 62, 0.1);">
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #e53e3e 0%, #9b2c2c 100%); padding: 44px 36px; text-align: center;">
                <div style="font-size: 30px; font-weight: 900; letter-spacing: 6px; color: #ffffff; text-transform: uppercase;">URGENT ACTION REQUIRED</div>
                <div style="font-size: 11px; color: rgba(255,255,255,0.8); letter-spacing: 4px; text-transform: uppercase; margin-top: 6px; font-weight: 700;">Bubble Priority System</div>
              </div>
              
              <!-- Body -->
              <div style="padding: 44px 36px; background-color: #ffffff;">
                <h2 style="color: #9b2c2c; font-size: 20px; font-weight: 800; margin: 0 0 14px; font-family: 'Space Grotesk', 'Segoe UI', sans-serif;">
                  ⚠️ Task Priority Set to URGENT
                </h2>
                <p style="font-size: 14.5px; line-height: 1.7; color: #2d3748; margin: 0 0 12px;">Hello ${recipientInfo.name},</p>
                <p style="font-size: 14.5px; line-height: 1.7; color: #2d3748; margin: 0 0 28px;">
                  You have been assigned or invited to a high-priority event that demands immediate response.
                </p>
        
                <!-- Event Card -->
                <div style="background-color: #fff5f5; border: 1px solid #fed7d7; padding: 24px; border-radius: 20px; text-align: left; margin-bottom: 28px;">
                  <h3 style="font-size: 16px; font-weight: 800; color: #e53e3e; margin: 0 0 12px;">
                    ${task.title}
                  </h3>
                  <p style="font-size: 13.5px; color: #2d3748; margin: 0 0 8px; line-height: 1.5;">
                    <strong>Scheduled Time:</strong> ${new Date(start_time).toLocaleString()}
                  </p>
                  ${description ? `
                    <div style="border-top: 1px solid #feb2b2; padding-top: 12px; font-size: 13px; color: #4a5568; line-height: 1.6;">
                      <strong>Description:</strong><br />
                      ${description.replace(/\n/g, '<br />')}
                    </div>
                  ` : ''}
                </div>
        
                <div style="text-align: center; margin: 28px 0 10px;">
                  <a href="${process.env.FRONTEND_URL || 'http://localhost:8080'}/dashboard" style="display: inline-block; padding: 14px 28px; background-color: #e53e3e; color: #ffffff; font-weight: 800; font-size: 13px; text-decoration: none; border-radius: 14px; letter-spacing: 1px; box-shadow: 0 6px 20px rgba(229, 62, 62, 0.25);">
                    VIEW WORKSPACE
                  </a>
                </div>
              </div>
            </div>
          `;
          sendMail(recipientInfo.email, `🚨 URGENT ACTION REQUIRED: ${task.title}`, urgentHtml).catch((err) =>
            console.error(`[Urgent Email] Failed to send email to ${recipientInfo.email}:`, err)
          );
        }
      } else {
        // Regular notification email
        const { sendCalendarEventEmail } = await import('../utils/mailer');
        for (const recipientInfo of emailList) {
          sendCalendarEventEmail(
            recipientInfo.email,
            recipientInfo.name,
            title,
            type || 'task',
            start_time || new Date(),
            end_time || new Date(),
            description,
            creatorName
          ).catch((err) => console.error(`[Calendar Email] Failed to send email to ${recipientInfo.email}:`, err));
        }
      }
    } catch (emailErr) {
      console.error('[Calendar Email] Failed to queue invitation emails:', emailErr);
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
