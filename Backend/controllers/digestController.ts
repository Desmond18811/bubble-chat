import { Request, Response } from 'express';
import OpenAI from 'openai';
import { DailyDigest } from '../models/dailyDigest';
import { CalendarEvent } from '../models/calendarEvent';
import { User } from '../models/users';
import { Organization } from '../models/organizations';
import { Task } from '../models/task';
import { generateEmbedding } from '../utils/embeddings';
import { queryVectors, hasPinecone } from '../utils/pinecone';

const CONFIDENCE_THRESHOLD = 0.70;
const HEADS_UP_THRESHOLD = 0.45;

const getDeepSeekClient = () => {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key || key.startsWith('your_') || key.startsWith('add_your_')) return null;
  return new OpenAI({ baseURL: 'https://api.deepseek.com/v1', apiKey: key });
};

const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
const endOfDay = (d: Date) => { const x = new Date(d); x.setHours(23,59,59,999); return x; };

/**
 * Core function: generate a daily digest for one user.
 * Called by the cron scheduler and on-demand by the GET endpoint.
 */
export const generateDigestForUser = async (userId: string, date: Date = new Date()): Promise<any> => {
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);

  const user = await User.findById(userId);
  if (!user?.organization) return null;

  const org = await Organization.findOne({ name: user.organization });
  if (!org) return null;

  // 1. Today's events for this user
  const todayEvents = await CalendarEvent.find({
    organizationId: org._id,
    attendees: userId,
    status: { $ne: 'cancelled' },
    startTime: { $gte: dayStart, $lte: dayEnd },
  }).sort({ startTime: 1 }).lean();

  // 2. Open action items from recent events
  const recentEvents = await CalendarEvent.find({
    organizationId: org._id,
    attendees: userId,
    status: 'ended',
    'actionItems.status': 'pending',
    'actionItems.assignedTo': userId,
    updatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // last 7 days
  }).select('title actionItems').lean();

  const openActionItems = recentEvents.flatMap(e =>
    e.actionItems
      .filter((a: any) => a.status === 'pending' && a.assignedTo?.toString() === userId.toString())
      .map((a: any) => ({ content: a.text, sourceTitle: e.title, type: 'action_item' as const, confidence: 1 }))
  );

  // 3. Recent decisions across org (high-confidence brain knowledge)
  const namespace = org.pineconeNamespace || `org-${org._id}`;
  const highConfidenceItems: any[] = [];
  const headsUpItems: any[] = [];

  if (hasPinecone()) {
    // Seed query with user's role + department for personalized relevance
    const seedQuery = `${user.org_role || user.role || 'employee'} ${user.department || 'general'} latest decisions updates`;
    const embedding = await generateEmbedding(seedQuery);
    if (embedding.length > 0) {
      const matches = await queryVectors(embedding, 8, undefined, namespace);
      for (const m of matches) {
        const item = {
          type: 'decision' as const,
          content: m.metadata?.chunk || '',
          sourceTitle: m.metadata?.title || 'Knowledge Base',
          sourceId: m.id,
          confidence: m.score,
        };
        if (m.score >= CONFIDENCE_THRESHOLD) {
          highConfidenceItems.push(item);
        } else if (m.score >= HEADS_UP_THRESHOLD) {
          headsUpItems.push(item);
        }
      }
    }
  }

  // 4. Build full item list
  const allItems = [
    ...todayEvents.map(e => ({
      type: 'event' as const,
      content: `${e.title} at ${new Date(e.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      sourceTitle: e.title,
      sourceId: e._id.toString(),
      confidence: 1,
    })),
    ...openActionItems,
    ...highConfidenceItems,
  ];

  // 5. AI-synthesize morning brief
  let morningBrief = `Good morning! You have ${todayEvents.length} event(s) today and ${openActionItems.length} open action item(s).`;
  const deepseek = getDeepSeekClient();

  if (deepseek && allItems.length > 0) {
    try {
      const briefData = allItems.slice(0, 10).map(i => `- [${i.type}] ${i.content}`).join('\n');
      const aiRes = await deepseek.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `You are Aida, a smart work assistant. Generate a concise, professional morning brief (5 bullet points max) for ${user.full_name || user.username}. 
Role: ${user.org_role || user.role}. Department: ${user.department || 'general'}.
Be encouraging, specific, and actionable. Return plain text with bullet points.`,
          },
          { role: 'user', content: `Today's agenda and knowledge:\n${briefData}` },
        ],
        temperature: 0.5,
        max_tokens: 300,
      });
      morningBrief = aiRes.choices?.[0]?.message?.content?.trim() || morningBrief;
    } catch (err) {
      console.error('[Digest] DeepSeek brief generation failed:', err);
    }
  }

  // 6. Upsert the daily digest document
  const digest = await DailyDigest.findOneAndUpdate(
    { userId, date: dayStart },
    {
      organizationId: org._id,
      events: todayEvents.map(e => e._id),
      items: allItems,
      morningBrief,
      highConfidenceItems,
      headsUpItems,
      generatedAt: new Date(),
    },
    { upsert: true, new: true }
  );

  return digest;
};

// ─── GET /api/v1/brain/digest ─────────────────────────────────────────────────

export const getDailyDigest = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user?._id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const dateParam = req.query.date ? new Date(req.query.date as string) : new Date();
    const dayStart = startOfDay(dateParam);

    // Try cached digest first
    let digest = await DailyDigest.findOne({ userId, date: dayStart })
      .populate('events', 'title startTime endTime eventType liveKitRoomId status')
      .lean();

    // Generate fresh if not found or stale (older than 2 hours)
    const isStale = digest && (Date.now() - new Date(digest.generatedAt).getTime()) > 2 * 60 * 60 * 1000;
    if (!digest || isStale) {
      digest = await generateDigestForUser(userId.toString(), dateParam);
      if (!digest) return res.status(200).json({ digest: null, message: 'No organization found.' });
    }

    return res.status(200).json({ digest });
  } catch (err: any) {
    console.error('[Digest] getDailyDigest error:', err);
    return res.status(500).json({ error: err.message });
  }
};

// ─── GET /api/v1/brain/digest/history ────────────────────────────────────────

export const getDigestHistory = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user?._id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const days = parseInt(req.query.days as string) || 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const history = await DailyDigest.find({
      userId,
      date: { $gte: startOfDay(since) },
    })
      .populate('events', 'title startTime eventType status')
      .sort({ date: -1 })
      .lean();

    return res.status(200).json({ history, count: history.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// ─── GET /api/v1/brain/expertise ─────────────────────────────────────────────

export const getExpertiseRadar = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user?._id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await User.findById(userId);
    if (!user?.organization) return res.status(400).json({ error: 'No organization found.' });

    const org = await Organization.findOne({ name: user.organization });
    if (!org) return res.status(404).json({ error: 'Organization not found.' });

    const { ExpertiseRadar } = await import('../models/expertiseRadar');
    const { topic } = req.query;

    const filter: any = { organizationId: org._id };
    if (topic) filter.topic = (topic as string).toLowerCase();

    const radar = await ExpertiseRadar.find(filter)
      .populate('userId', 'full_name username avatar role department')
      .sort({ score: -1 })
      .limit(50)
      .lean();

    // Group by topic for the radar view
    const byTopic: Record<string, any[]> = {};
    for (const entry of radar) {
      if (!byTopic[entry.topic]) byTopic[entry.topic] = [];
      byTopic[entry.topic].push({
        user: entry.userId,
        score: entry.score,
        activityCount: entry.activityCount,
      });
    }

    return res.status(200).json({ byTopic, total: radar.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};
