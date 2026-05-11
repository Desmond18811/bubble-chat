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

    const { Meeting } = require('../models/meeting');
    await Meeting.deleteMany({ host: userId });

    res.json({ message: 'Call logs cleared successfully.' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/v1/meet/logs/:id
export const deleteCallLog = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    const { id } = req.params;

    // Try deleting from CallLog
    const logResult = await CallLog.deleteOne({ _id: id, user: userId });

    // Also try deleting from Meeting if it's a meeting id
    const { Meeting } = require('../models/meeting');
    const meetResult = await Meeting.deleteOne({ _id: id, host: userId });

    if (logResult.deletedCount === 0 && meetResult.deletedCount === 0) {
      return res.status(404).json({ message: 'Call log not found or access denied.' });
    }

    res.json({ message: 'Call log deleted successfully.' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// NEW: GET /api/v1/meet/logs/:roomId/transcript
// Returns the full transcript log for a room (meeting) with AI intelligence
export const getRoomTranscript = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    const { roomId } = req.params;

    // Import Meeting model dynamically to avoid circular deps
    const { Meeting } = require('../models/meeting');
    const { WorkspaceFile } = require('../models/workspaceFile');

    // Find the meeting by roomId
    const meeting = await Meeting.findOne({
      roomId,
      $or: [{ host: userId }, { attendees: userId }],
    })
      .populate('host', 'full_name username avatar')
      .populate('attendees', 'full_name username avatar')
      .populate('actionItems.assignedTo', 'full_name username')
      .lean();

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting transcript not found.' });
    }

    // Get files shared during this meeting
    const sharedFiles = await WorkspaceFile.find({
      sourceReference: roomId,
      source: 'meeting',
    })
      .populate('uploadedBy', 'full_name username avatar')
      .lean();

    // Build structured transcript log
    const transcriptLog = {
      roomId,
      meetingId: meeting._id,
      title: meeting.title,
      startedAt: meeting.startedAt,
      endedAt: meeting.endedAt,
      duration: meeting.duration,
      status: meeting.status,

      // Participants
      host: meeting.host,
      attendees: meeting.attendees,

      // Full transcript with speaker attribution
      transcript: (meeting.transcriptChunks || []).map((chunk: any) => ({
        speaker: chunk.speaker || 'Unknown',
        text: chunk.text,
        timestamp: chunk.timestamp,
      })),

      // AI-generated summary
      summary: meeting.summary || null,

      // Action items / tasks assigned
      actionItems: (meeting.actionItems || []).map((item: any) => ({
        task: item.text,
        assignedTo: item.assignedToName || (item.assignedTo?.full_name) || null,
        assignedToUser: item.assignedTo || null,
        status: item.status,
      })),

      // Files shared during the meeting
      filesShared: sharedFiles.map((f: any) => ({
        id: f._id,
        name: f.name,
        fileType: f.fileType,
        mimeType: f.mimeType,
        fileSize: f.fileSize,
        uploadedBy: f.uploadedBy,
        fileUrl: f.fileUrl, // proxy URL used for preview/download
        createdAt: f.createdAt,
      })),
    };

    res.json({ transcript: transcriptLog });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/v1/meet/logs/:roomId/transcript/chunks
// Save transcript chunks from live meeting (called from frontend speech recognition)
export const saveTranscriptChunk = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    const { roomId } = req.params;
    const { speaker, text, timestamp } = req.body;

    if (!text) { res.status(400).json({ message: 'text is required' }); return; }

    const { Meeting } = require('../models/meeting');

    // Find or create a meeting record for this room
    let meeting = await Meeting.findOne({ roomId });

    if (!meeting) {
      meeting = await Meeting.create({
        roomId,
        title: 'Live Meeting',
        host: userId,
        attendees: [userId],
        status: 'live',
        startedAt: new Date(),
      });
    }

    // Push the chunk
    meeting.transcriptChunks = meeting.transcriptChunks || [];
    meeting.transcriptChunks.push({
      speaker: speaker || 'Unknown',
      text: text.trim(),
      timestamp: timestamp || Date.now(),
    });

    // Also append to raw transcript
    const line = speaker ? `[${speaker}]: ${text.trim()}` : text.trim();
    meeting.transcriptRaw = (meeting.transcriptRaw || '') + '\n' + line;

    await meeting.save();
    res.status(201).json({ message: 'Chunk saved.', chunkCount: meeting.transcriptChunks.length });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}; 