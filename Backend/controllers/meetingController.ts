import { Request, Response } from 'express';
import { Meeting, IMeeting } from '../models/meeting';
import { Task } from '../models/task';
import { User } from '../models/users';
import { HfInference } from '@huggingface/inference';
import { createNotification } from './notificationController';
import { logActivity } from './activityLogController';

const hf = new HfInference(process.env.HF_API_KEY || '');
const modelId = process.env.GEMMA_MODEL_ID || 'google/gemma-2-9b-it';

// ─── Helper: AI-powered transcript processing ─────────────────────────────────

const extractMeetingIntelligence = async (
  transcript: string,
  attendeeNames: string[]
): Promise<{ summary: string; actionItems: { text: string; assignedToName?: string }[] }> => {
  const hasKey = process.env.HF_API_KEY && process.env.HF_API_KEY !== 'your_hugging_face_api_key_here';

  if (!hasKey || !transcript) {
    return {
      summary: 'Meeting summary is available once Hugging Face API key is configured.',
      actionItems: [],
    };
  }

  const attendeeLine = attendeeNames.length > 0 ? `Attendees: ${attendeeNames.join(', ')}.` : '';
  const prompt = `You are Aida, an intelligent meeting assistant. Analyze the following meeting transcript and return structured output.
${attendeeLine}

TRANSCRIPT:
${transcript.substring(0, 3000)}

Provide:
1. A concise 2-3 sentence summary of what was discussed.
2. A list of concrete action items with the person's name assigned to each if mentioned.

Format as JSON: {"summary": "...", "actionItems": [{"text": "...", "assignedToName": "...or null"}]}

JSON:`;

  try {
    const response = await hf.textGeneration({
      model: modelId,
      inputs: prompt,
      parameters: { max_new_tokens: 600, temperature: 0.3 },
    });

    const raw = response.generated_text.replace(prompt, '').trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        summary: parsed.summary || 'No summary generated.',
        actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
      };
    }
  } catch (err) {
    console.error('Aida transcript extraction error:', err);
  }

  return {
    summary: transcript.substring(0, 200) + '...',
    actionItems: [],
  };
};

// ─── POST /api/v1/meetings — Create a meeting record ─────────────────────────
export const createMeeting = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user?._id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { roomId, title, type, attendees, attendeeNames } = req.body;

    const meeting = await Meeting.create({
      roomId: roomId || `room-${Date.now()}`,
      title: title || 'Untitled Meeting',
      host: userId,
      type: type || 'video',
      attendees: attendees || [],
      attendeeNames: attendeeNames || [],
      startedAt: new Date(),
      status: 'live',
    });

    // Notify all attendees
    if (attendees && attendees.length > 0) {
      const hostUser = await User.findById(userId).select('full_name username');
      const hostName = hostUser?.full_name || hostUser?.username || 'Someone';

      for (const attendeeId of attendees) {
        await createNotification({
          recipient: attendeeId,
          sender: userId,
          type: 'meeting_started',
          title: `Meeting started: ${meeting.title}`,
          body: `${hostName} has started a meeting. Join now!`,
          entityId: String(meeting._id),
          entityType: 'Meeting',
        });
      }
    }

    await logActivity({
      actor: userId,
      action: 'meeting_started',
      entityId: String(meeting._id),
      entityType: 'Meeting',
      entityLabel: meeting.title,
    });

    res.status(201).json({ message: 'Meeting created', meeting });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to create meeting', error: err.message });
  }
};

// ─── GET /api/v1/meetings — List meetings for user ───────────────────────────
export const getMeetings = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user?._id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const page  = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '20');
    const skip  = (page - 1) * limit;

    const meetings = await Meeting.find({
      $or: [{ host: userId }, { attendees: userId }],
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('host', 'full_name username avatar')
      .populate('attendees', 'full_name username avatar')
      .lean();

    res.status(200).json({ meetings, page, limit });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to fetch meetings', error: err.message });
  }
};

// ─── GET /api/v1/meetings/:id ─────────────────────────────────────────────────
export const getMeetingById = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user?._id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const meeting = await Meeting.findOne({
      _id: req.params.id,
      $or: [{ host: userId }, { attendees: userId }],
    })
      .populate('host', 'full_name username avatar')
      .populate('attendees', 'full_name username avatar')
      .populate('actionItems.assignedTo', 'full_name username')
      .lean();

    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });
    res.status(200).json({ meeting });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to fetch meeting', error: err.message });
  }
};

// ─── POST /api/v1/meetings/:id/transcript — Submit transcript chunks ──────────
export const addTranscriptChunk = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user?._id;
    const { speaker, text, timestamp } = req.body;

    const meeting = await Meeting.findOneAndUpdate(
      { _id: req.params.id, $or: [{ host: userId }, { attendees: userId }] },
      {
        $push: { transcriptChunks: { speaker, text, timestamp } },
        $set:  { transcriptRaw: undefined }, // Will be compiled on end
      },
      { new: true }
    );

    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });
    res.status(200).json({ message: 'Transcript chunk added' });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to add transcript chunk', error: err.message });
  }
};

// ─── POST /api/v1/meetings/:id/end — End meeting + AI extraction ─────────────
export const endMeeting = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user?._id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const meeting = await Meeting.findOne({
      _id: req.params.id,
      $or: [{ host: userId }, { attendees: userId }],
    });
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

    const endedAt = new Date();
    const duration = Math.round((endedAt.getTime() - meeting.startedAt.getTime()) / 1000);

    // Compile raw transcript from chunks
    const rawTranscript = meeting.transcriptChunks
      ?.map(c => `${c.speaker ? c.speaker + ': ' : ''}${c.text}`)
      .join('\n') || req.body.transcriptRaw || '';

    // AI extraction
    const intelligence = await extractMeetingIntelligence(
      rawTranscript,
      meeting.attendeeNames || []
    );

    // Resolve action items → map assignedToName to actual user IDs where possible
    const resolvedActionItems = await Promise.all(
      intelligence.actionItems.map(async (ai) => {
        let assignedTo = undefined;
        if (ai.assignedToName) {
          const found = await User.findOne({
            $or: [
              { full_name: { $regex: ai.assignedToName, $options: 'i' } },
              { username: { $regex: ai.assignedToName, $options: 'i' } },
            ],
            _id: { $in: [...meeting.attendees, meeting.host] },
          }).select('_id');
          if (found) assignedTo = found._id;
        }
        return { text: ai.text, assignedToName: ai.assignedToName, assignedTo, status: 'pending' };
      })
    );

    // Update meeting
    meeting.endedAt    = endedAt;
    meeting.duration   = duration;
    meeting.status     = 'ended';
    meeting.transcriptRaw = rawTranscript;
    meeting.summary    = intelligence.summary;
    meeting.actionItems = resolvedActionItems as any;
    await meeting.save();

    // Auto-create synced tasks in Calendar for each action item
    const createdTasks = [];
    for (const ai of resolvedActionItems) {
      if (ai.text) {
        const task = await Task.create({
          user_id:       ai.assignedTo || meeting.host,
          assignedTo:    ai.assignedTo,
          assignedToName:ai.assignedToName,
          type:          'synced',
          source:        'meeting',
          meetingRef:    meeting._id,
          title:         ai.text,
          description:   `From meeting: ${meeting.title}`,
          start_time:    new Date(),
          end_time:      new Date(Date.now() + 24 * 60 * 60 * 1000),
          priority:      'medium',
          status:        'todo',
        });
        createdTasks.push(task);

        // Notify the assignee
        if (ai.assignedTo) {
          await createNotification({
            recipient: ai.assignedTo,
            sender:    meeting.host,
            type:      'meeting_action_item',
            title:     'New action item assigned',
            body:      `From meeting "${meeting.title}": ${ai.text}`,
            entityId:  String(task._id),
            entityType:'Task',
          });
        }
      }
    }

    // Notify all attendees that meeting ended and minutes are ready
    const allParticipants = [meeting.host, ...meeting.attendees];
    for (const participantId of allParticipants) {
      if (String(participantId) !== String(userId)) {
        await createNotification({
          recipient: participantId,
          sender:    userId,
          type:      'meeting_ended',
          title:     `Meeting ended: ${meeting.title}`,
          body:      `${resolvedActionItems.length} action items were extracted. Check your Calendar.`,
          entityId:  String(meeting._id),
          entityType:'Meeting',
        });
      }
    }

    await logActivity({
      actor:       userId,
      action:      'meeting_ended',
      entityId:    String(meeting._id),
      entityType:  'Meeting',
      entityLabel: meeting.title,
      metadata:    { duration, actionItemCount: resolvedActionItems.length },
    });

    res.status(200).json({
      message:     'Meeting ended and intelligence extracted',
      meeting,
      tasksCreated: createdTasks,
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to end meeting', error: err.message });
  }
};

// ─── GET /api/v1/meetings/:id/action-items ────────────────────────────────────
export const getMeetingActionItems = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user?._id;
    const meeting = await Meeting.findOne({
      _id: req.params.id,
      $or: [{ host: userId }, { attendees: userId }],
    }).select('title actionItems summary').populate('actionItems.assignedTo', 'full_name username avatar');

    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });
    res.status(200).json({ title: meeting.title, summary: meeting.summary, actionItems: meeting.actionItems });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to fetch action items', error: err.message });
  }
};
