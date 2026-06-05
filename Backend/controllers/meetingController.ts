import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Meeting, IMeeting } from '../models/meeting';
import { Task } from '../models/task';
import { User } from '../models/users';
import OpenAI from 'openai';
import { createNotification } from './notificationController';
import { logActivity } from './activityLogController';
import { Organization } from '../models/organizations';
import { Conversation } from '../models/conversations';
import { Message } from '../models/messages';

// ─── DeepSeek client (same engine as aidaController) ─────────────────────────
const deepseekClient = new OpenAI({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY || '',
});

const hasDeepSeekKey = (): boolean => {
  const key = process.env.DEEPSEEK_API_KEY;
  return !!(key && key.length > 10 && key !== 'your_api_key_here');
};

// ─── Helper: AI-powered transcript processing via DeepSeek ───────────────────
const extractMeetingIntelligence = async (
  transcript: string,
  attendeeNames: string[]
): Promise<{
  summary: string;
  actionItems: { text: string; assignedToName?: string }[];
}> => {
  if (!hasDeepSeekKey() || !transcript) {
    return {
      summary: 'Meeting summary unavailable — DeepSeek API key not configured.',
      actionItems: [],
    };
  }

  const attendeeLine =
    attendeeNames.length > 0 ? `Attendees: ${attendeeNames.join(', ')}.` : '';

  try {
    const response = await deepseekClient.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: `You are Aida, an expert meeting intelligence assistant. Analyze transcripts and extract structured data. Always return valid JSON only.`,
        },
        {
          role: 'user',
          content: `Analyze this meeting transcript and return a JSON object.
${attendeeLine}

TRANSCRIPT:
${transcript.substring(0, 3000)}

Extract:
1. A comprehensive summary (who said what, who did what, decisions made, files shared)
2. All action items with who they are assigned to

Return ONLY this JSON (no other text):
{"summary": "...", "actionItems": [{"text": "...", "assignedToName": "...or null"}]}`,
        },
      ],
      max_tokens: 700,
      temperature: 0.3,
    });

    const raw = response.choices[0].message?.content?.trim() || '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        summary: parsed.summary || 'No summary generated.',
        actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
      };
    }
  } catch (err) {
    console.error('[Meeting AI] DeepSeek transcript extraction error:', err);
  }

  return {
    summary: transcript.substring(0, 300) + '...',
    actionItems: [],
  };
};

// ─── POST /api/v1/meetings ── Create a meeting record ────────────────────────

export const createMeeting = async (
  req: Request,
  res: Response
): Promise<any> => {
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

    if (attendees && attendees.length > 0) {
      const hostUser = await User.findById(userId).select('full_name username');
      const hostName =
        hostUser?.full_name || hostUser?.username || 'Someone';

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
    res
      .status(500)
      .json({ message: 'Failed to create meeting', error: err.message });
  }
};

// ─── GET /api/v1/meetings ── List meetings for user ──────────────────────────

export const getMeetings = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = (req as any).user?._id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '20');
    const skip = (page - 1) * limit;

    const meetings = await Meeting.find({
      $or: [{ host: userId }, { attendees: userId }],
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('host', 'full_name username avatar')
      .populate('attendees', 'full_name username avatar')
      .populate('filesShared.uploadedBy', 'full_name username avatar')
      .lean();

    res.status(200).json({ meetings, page, limit });
  } catch (err: any) {
    res
      .status(500)
      .json({ message: 'Failed to fetch meetings', error: err.message });
  }
};

// ─── GET /api/v1/meetings/:id ─────────────────────────────────────────────────

export const getMeetingById = async (
  req: Request,
  res: Response
): Promise<any> => {
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
      .populate('filesShared.uploadedBy', 'full_name username avatar')
      .lean();

    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });
    res.status(200).json({ meeting });
  } catch (err: any) {
    res
      .status(500)
      .json({ message: 'Failed to fetch meeting', error: err.message });
  }
};

// ─── POST /api/v1/meetings/:id/transcript ── Submit transcript chunks ─────────
// This is called in real-time from the client's SpeechRecognition events.
// It accumulates chunks in the DB as a background task throughout the call.

export const addTranscriptChunk = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = (req as any).user?._id;
    const { speaker, text, timestamp } = req.body;

    if (!text?.trim()) {
      return res.status(400).json({ message: 'text is required' });
    }

    const meeting = await Meeting.findOneAndUpdate(
      {
        _id: req.params.id,
        $or: [{ host: userId }, { attendees: userId }],
        status: 'live',
      },
      {
        $push: {
          transcriptChunks: {
            speaker: speaker || 'Unknown',
            text: text.trim(),
            timestamp: timestamp || Date.now(),
          },
        },
      },
      { returnDocument: 'after', select: '_id' }
    );

    if (!meeting) {
      return res
        .status(404)
        .json({ message: 'Live meeting not found or access denied' });
    }

    // 204 is preferred for fire-and-forget chunk saves (no body needed)
    res.status(204).end();
  } catch (err: any) {
    res
      .status(500)
      .json({ message: 'Failed to add transcript chunk', error: err.message });
  }
};

// ─── POST /api/v1/meetings/:id/files ── Log a file shared in the meeting ──────
// Called after a workspace file is uploaded so we record it against the meeting.

export const logSharedFile = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = (req as any).user?._id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { fileId, name, fileType, fileSize, fileUrl, linkUrl, source } =
      req.body;

    if (!name) {
      return res.status(400).json({ message: 'name is required' });
    }

    const user = await User.findById(userId).select('full_name username');
    const uploadedByName = user?.full_name || user?.username || 'Unknown';

    const meeting = await Meeting.findOneAndUpdate(
      {
        _id: req.params.id,
        $or: [{ host: userId }, { attendees: userId }],
      },
      {
        $push: {
          filesShared: {
            fileId,
            name,
            fileType: fileType || 'file',
            fileSize,
            fileUrl,
            linkUrl,
            uploadedBy: userId,
            uploadedByName,
            sharedAt: new Date(),
            source: source || 'file_upload',
          },
        },
      },
      { returnDocument: 'after', select: 'filesShared' }
    );

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    const added = meeting.filesShared[meeting.filesShared.length - 1];
    res.status(201).json({ message: 'File logged to meeting', file: added });
  } catch (err: any) {
    res
      .status(500)
      .json({ message: 'Failed to log shared file', error: err.message });
  }
};

// ─── GET /api/v1/meetings/:id/files ── List files shared in a meeting ─────────

export const getMeetingFiles = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = (req as any).user?._id;

    const meeting = await Meeting.findOne({
      _id: req.params.id,
      $or: [{ host: userId }, { attendees: userId }],
    })
      .select('title filesShared')
      .populate('filesShared.uploadedBy', 'full_name username avatar');

    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

    res
      .status(200)
      .json({ title: meeting.title, files: meeting.filesShared });
  } catch (err: any) {
    res
      .status(500)
      .json({ message: 'Failed to fetch meeting files', error: err.message });
  }
};

// ─── POST /api/v1/meetings/:id/screen-share/start ── Record start ─────────────

export const startScreenShare = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = (req as any).user?._id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { shareType, label } = req.body; // shareType: 'screen' | 'window' | 'tab'

    const user = await User.findById(userId).select('full_name username');
    const sharedByName = user?.full_name || user?.username || 'Unknown';

    const meeting = await Meeting.findOneAndUpdate(
      {
        _id: req.params.id,
        $or: [{ host: userId }, { attendees: userId }],
        status: 'live',
      },
      {
        $push: {
          screenShares: {
            sharedBy: userId,
            sharedByName,
            shareType: shareType || 'screen',
            label: label || null,
            startedAt: new Date(),
          },
        },
      },
      { returnDocument: 'after' }
    );

    if (!meeting) {
      return res.status(404).json({ message: 'Live meeting not found' });
    }

    const session =
      meeting.screenShares[meeting.screenShares.length - 1];

    res
      .status(201)
      .json({ message: 'Screen share started', session });
  } catch (err: any) {
    res
      .status(500)
      .json({ message: 'Failed to start screen share', error: err.message });
  }
};

// ─── PATCH /api/v1/meetings/:id/screen-share/:sessionId/end ── Record end ─────

export const endScreenShare = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = (req as any).user?._id;
    const { sessionId } = req.params;

    const meeting = await Meeting.findOne({
      _id: req.params.id,
      $or: [{ host: userId }, { attendees: userId }],
    });

    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

    const session = (meeting.screenShares as any).id(sessionId);
    if (!session) {
      return res
        .status(404)
        .json({ message: 'Screen share session not found' });
    }

    const endedAt = new Date();
    session.endedAt = endedAt;
    session.duration = Math.round(
      (endedAt.getTime() - new Date(session.startedAt).getTime()) / 1000
    );

    await meeting.save();

    res.status(200).json({ message: 'Screen share ended', session });
  } catch (err: any) {
    res
      .status(500)
      .json({ message: 'Failed to end screen share', error: err.message });
  }
};

// ─── POST /api/v1/meetings/:id/end ── End meeting + AI background extraction ──

export const endMeeting = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = (req as any).user?._id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const searchId = String(req.params.id);
    const isObjectId = mongoose.Types.ObjectId.isValid(searchId);

    const meeting = await Meeting.findOne({
      $or: [
        ...(isObjectId ? [{ _id: searchId }] : []),
        { roomId: searchId },
      ],
      $and: [{ $or: [{ host: userId }, { attendees: userId }] }],
    });

    if (!meeting)
      return res.status(404).json({ message: 'Meeting not found' });

    const endedAt = new Date();
    const duration = Math.round(
      (endedAt.getTime() - meeting.startedAt.getTime()) / 1000
    );

    // Compile raw transcript from accumulated real-time chunks
    const rawTranscript =
      meeting.transcriptChunks
        ?.map(
          (c) => `${c.speaker ? c.speaker + ': ' : ''}${c.text}`
        )
        .join('\n') ||
      req.body.transcriptRaw ||
      '';

    // Mark as ended immediately — AI runs in background
    meeting.endedAt = endedAt;
    meeting.duration = duration;
    meeting.status = 'ended';
    meeting.transcriptRaw = rawTranscript;
    await meeting.save();

    // Broadcast meeting_ended via socket immediately to terminate the view for all participants
    try {
      const { getIO } = await import('../utils/socket');
      const io = getIO();
      io.to(meeting.roomId).emit('meeting_ended', { roomId: meeting.roomId });
      console.log(`[Meeting] Broadcasted meeting_ended for room ${meeting.roomId}`);
    } catch (socketErr) {
      console.error('[Meeting] Socket emit meeting_ended failed:', socketErr);
    }

    // Respond to client immediately so UI isn't blocked
    res.status(200).json({
      message: 'Meeting ended. AI analysis is running in the background.',
      meeting,
    });

    // ── Background AI extraction (non-blocking) ───────────────────────────
    setImmediate(async () => {
      try {
        const intelligence = await extractMeetingIntelligence(
          rawTranscript,
          meeting.attendeeNames || []
        );

        // Resolve action items → map names to user IDs
        const resolvedActionItems = await Promise.all(
          intelligence.actionItems.map(async (ai) => {
            let assignedTo: any = undefined;
            if (ai.assignedToName) {
              const found = await User.findOne({
                $or: [
                  {
                    full_name: {
                      $regex: ai.assignedToName,
                      $options: 'i',
                    },
                  },
                  {
                    username: {
                      $regex: ai.assignedToName,
                      $options: 'i',
                    },
                  },
                ],
                _id: { $in: [...meeting.attendees, meeting.host] },
              }).select('_id');
              if (found) assignedTo = found._id;
            }
            return {
              text: ai.text,
              assignedToName: ai.assignedToName,
              assignedTo,
              status: 'pending',
            };
          })
        );

        // Persist AI results
        await Meeting.findByIdAndUpdate(meeting._id, {
          $set: {
            summary: intelligence.summary,
            actionItems: resolvedActionItems,
          },
        });

        // Auto-create synced Calendar tasks
        const createdTasks = [];
        for (const ai of resolvedActionItems) {
          if (ai.text) {
            const task = await Task.create({
              user_id: ai.assignedTo || meeting.host,
              assignedTo: ai.assignedTo,
              assignedToName: ai.assignedToName,
              type: 'synced',
              source: 'meeting',
              meetingRef: meeting._id,
              title: ai.text,
              description: `From meeting: ${meeting.title}`,
              start_time: new Date(),
              end_time: new Date(Date.now() + 24 * 60 * 60 * 1000),
              priority: 'medium',
              status: 'todo',
            });
            createdTasks.push(task);

            if (ai.assignedTo) {
              await createNotification({
                recipient: ai.assignedTo,
                sender: meeting.host,
                type: 'meeting_action_item',
                title: 'New action item assigned',
                body: `From meeting "${meeting.title}": ${ai.text}`,
                entityId: String(task._id),
                entityType: 'Task',
              });
            }
          }
        }

        // Find default group chat for organization
        const hostUser = await User.findById(meeting.host);
        let org = null;
        if (hostUser && hostUser.organization) {
          org = await Organization.findOne({ name: hostUser.organization });
        }

        const bot = await User.findOne({ is_bot: true, username: 'aida' });
        const botId = bot ? bot._id : null;

        // Post summary + action items in default group chat on behalf of Aida bot
        if (org) {
          const defaultChat = await Conversation.findOne({
            organizationId: org._id,
            isDefaultOrgChat: true,
          });

          if (defaultChat) {
            const formattedActionItems = resolvedActionItems
              .map((ai) => `- ${ai.text} (Assigned to: ${ai.assignedToName || 'Unassigned'})`)
              .join('\n');
            const chatContent = `📢 **Minutes: "${meeting.title}"**\n\n**Summary:**\n${intelligence.summary}\n\n**Action Items:**\n${formattedActionItems || 'None'}\n\n*Full transcript emailed to attendees.*`;

            const groupMsg = await Message.create({
              chat: defaultChat._id,
              sender: botId || meeting.host,
              content: chatContent,
              message_type: 'text',
            });

            await Conversation.findByIdAndUpdate(defaultChat._id, {
              $set: { latestMessage: (groupMsg as any)._id },
            });

            // Emit socket update for new message
            try {
              const { getIO } = await import('../utils/socket');
              const io = getIO();
              const { formatMessage } = await import('./messageController') as any;
              const fullMsg = await Message.findById((groupMsg as any)._id).populate('sender', 'full_name username avatar is_bot');
              const formatted = await formatMessage(fullMsg);
              io.to(String(defaultChat._id)).emit('new_message', formatted);
              defaultChat.users.forEach((u: any) => {
                io.to(u.toString()).emit('new_message', formatted);
              });
            } catch (socketErr) {
              console.error('[Meeting AI] Group chat socket message broadcast failed:', socketErr);
            }
          }
        }

        // Email participants with the restyled Light/Lavender Transcript template
        const { sendMeetingTranscriptEmail } = await import('../utils/mailer');
        const transcriptHtml = rawTranscript ? rawTranscript.replace(/\n/g, '<br />') : 'No transcript recorded.';
        const allParticipants = [meeting.host, ...meeting.attendees];
        for (const participantId of allParticipants) {
          try {
            const user = await User.findById(participantId);
            if (user && user.email) {
              await sendMeetingTranscriptEmail(
                user.email,
                user.full_name || user.username || 'Attendee',
                meeting.title,
                transcriptHtml,
                intelligence.summary
              );
              console.log(`[Meeting Email] Transcript email sent to: ${user.email}`);
            }
          } catch (emailErr) {
            console.error('[Meeting Email] Failed sending transcript email:', emailErr);
          }
        }

        // Chunk & Index transcript to Pinecone under organization namespace to grow the brain
        const { hasPinecone, upsertVectors } = await import('../utils/pinecone');
        const { chunkText, generateEmbedding } = await import('../utils/embeddings');
        const { OrgDocument } = await import('../models/orgDocument');
        const crypto = await import('crypto');

        if (hasPinecone() && org && rawTranscript) {
          try {
            const namespace = org.pineconeNamespace || `org-${org._id}`;
            const transcriptTitle = `Meeting Transcript: ${meeting.title}`;
            const chunks = chunkText(rawTranscript, 500, 100);
            const pineconeIds: string[] = [];
            const vectors = [];

            for (const chunk of chunks) {
              const embedding = await generateEmbedding(chunk);
              if (embedding.length > 0) {
                const id = `meet-chunk-${crypto.randomUUID()}`;
                pineconeIds.push(id);
                vectors.push({
                  id,
                  values: embedding,
                  metadata: {
                    title: transcriptTitle,
                    chunk,
                    department: 'general',
                    accessLevel: 'public',
                    organizationId: org._id,
                    meetingId: meeting._id,
                  },
                });
              }
            }

            if (vectors.length > 0) {
              await upsertVectors(vectors, namespace);
              // Save a local OrgDocument copy so it shows up in Brain files list
              await OrgDocument.create({
                title: transcriptTitle,
                content: rawTranscript,
                department: 'general',
                accessLevel: 'public',
                createdBy: meeting.host,
                organizationId: org._id,
                pineconeIds,
                tags: ['transcript', 'meeting', meeting.title.toLowerCase()],
              });
              console.log(`[Meeting Pinecone] Upserted ${vectors.length} transcript chunks for namespace: ${namespace}`);
            }
          } catch (pineconeErr) {
            console.error('[Meeting Pinecone] Upsert failed:', pineconeErr);
          }
        }

        // Notify all participants that minutes are ready
        for (const participantId of allParticipants) {
          if (String(participantId) !== String(userId)) {
            await createNotification({
              recipient: participantId,
              sender: userId,
              type: 'meeting_ended',
              title: `Meeting ended: ${meeting.title}`,
              body: `${resolvedActionItems.length} action items were extracted. Check your Calendar.`,
              entityId: String(meeting._id),
              entityType: 'Meeting',
            });
          }
        }

        await logActivity({
          actor: userId,
          action: 'meeting_ended',
          entityId: String(meeting._id),
          entityType: 'Meeting',
          entityLabel: meeting.title,
          metadata: {
            duration,
            actionItemCount: resolvedActionItems.length,
            tasksCreated: createdTasks.length,
          },
        });
      } catch (bgErr) {
        console.error(
          '[Meeting AI] Background extraction failed:',
          bgErr
        );
      }
    });
  } catch (err: any) {
    res
      .status(500)
      .json({ message: 'Failed to end meeting', error: err.message });
  }
};

// ─── GET /api/v1/meetings/:id/action-items ────────────────────────────────────

export const getMeetingActionItems = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = (req as any).user?._id;
    const meeting = await Meeting.findOne({
      _id: req.params.id,
      $or: [{ host: userId }, { attendees: userId }],
    })
      .select('title actionItems summary')
      .populate('actionItems.assignedTo', 'full_name username avatar');

    if (!meeting)
      return res.status(404).json({ message: 'Meeting not found' });

    res.status(200).json({
      title: meeting.title,
      summary: meeting.summary,
      actionItems: meeting.actionItems,
    });
  } catch (err: any) {
    res
      .status(500)
      .json({ message: 'Failed to fetch action items', error: err.message });
  }
};