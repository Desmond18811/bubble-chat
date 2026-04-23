import { Request, Response } from 'express';
import { HfInference } from '@huggingface/inference';
import { Task } from '../models/task';
import { Transaction } from '../models/transaction';
import { Invoice } from '../models/invoice';
import { WorkspaceFile } from '../models/workspaceFile';
import { User } from '../models/users';
import { Conversation } from '../models/conversations';
import { Message } from '../models/messages';
import Post from '../models/post';
import mongoose from 'mongoose';
import { generateEmbedding } from '../utils/embeddings';
import { queryVectors, hasPinecone } from '../utils/pinecone';

const hf = new HfInference(process.env.HF_API_KEY || '');
const defaultModel = process.env.LLAMA_MODEL_ID || 'meta-llama/Llama-3.1-8B-Instruct';
const fallbackModels = [
  defaultModel,
  'mistralai/Mistral-Nemo-Instruct-2407',
  'mistralai/Mistral-7B-Instruct-v0.3',
  'google/gemma-4-31B-it',
];

const hasKey = () => process.env.HF_API_KEY && process.env.HF_API_KEY !== 'your_hugging_face_api_key_here';

// ─── Helper: call Hugging Face with fallback ──────────────────────────────────
const callHF = async (prompt: string, maxTokens = 400, temp = 0.7): Promise<string> => {
  if (!hasKey()) return '';
  let lastError = null;
  for (const fModel of fallbackModels) {
    try {
      const response = await hf.chatCompletion({
        model: fModel,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature: temp,
      });
      if (response.choices && response.choices.length > 0) {
        return response.choices[0].message?.content?.trim() || '';
      }
    } catch (err: any) {
      lastError = err;
      try {
        const txtRes = await hf.textGeneration({
          model: fModel,
          inputs: prompt,
          parameters: { max_new_tokens: maxTokens, temperature: temp, repetition_penalty: 1.1 },
        });
        if (txtRes.generated_text) return txtRes.generated_text.replace(prompt, '').trim();
      } catch (err2: any) {
        lastError = err2;
        continue;
      }
    }
  }
  return '';
};

// ─── Smart local fallback when no AI key ─────────────────────────────────────
const buildSmartFallback = (userName: string, tasks: any[], files: any[], message: string): string => {
  const msg = message.toLowerCase();
  if (msg.includes('task') || msg.includes('schedule') || msg.includes('calendar')) {
    if (tasks.length === 0) return `Hi ${userName}! No tasks are scheduled for today. Want me to help you add one? Just say "Schedule a task: [task name] at [time]".`;
    return `Hi ${userName}! You have ${tasks.length} task(s) today: ${tasks.map(t => `"${t.title}"`).join(', ')}. Need help managing any of them?`;
  }
  if (msg.includes('file') || msg.includes('workspace') || msg.includes('document')) {
    if (files.length === 0) return `Your workspace is clean! No files uploaded yet. I can help you organise files once you start uploading.`;
    return `You have ${files.length} file(s) in your workspace. Recent: ${files.slice(0, 3).map((f: any) => `"${f.name}"`).join(', ')}. Want me to find something specific?`;
  }
  if (msg.includes('brief') || msg.includes('today') || msg.includes('summary')) {
    const taskPart = tasks.length > 0 ? `You have ${tasks.length} task(s) today.` : 'No tasks today — a free day!';
    const filePart = files.length > 0 ? ` Your workspace has ${files.length} file(s).` : '';
    return `Good day, ${userName}! ${taskPart}${filePart} I'm Aida, your Bubble assistant. How can I help?`;
  }
  return `Hello ${userName}! I'm Aida, your Bubble intelligence assistant. I can help you with tasks, workspace files, meetings, and more. What would you like to do today?`;
};

// ─── Get or create the Aida bot user ─────────────────────────────────────────
const getAidaBotUser = async () => {
  let bot = await User.findOne({ is_bot: true, username: 'aida' });
  if (!bot) {
    bot = await User.create({
      full_name: 'Aida',
      username: 'aida',
      email: 'aida@bubble.internal',
      bio: 'Your intelligent workspace companion. Ask me anything about your organization, tasks, meetings, and more.',
      is_bot: true,
      isVerified: true,
      verified_badge: true,
      avatar: '',
      uniqueTag: 'bubble-AIDA-001',
    });
    console.log('[Aida] Bot user created:', bot._id);
  }
  return bot;
};

// ─── RAG: query Pinecone for relevant org context ─────────────────────────────
const getOrgContext = async (message: string, userAccessLevel: string): Promise<string> => {
  if (!hasPinecone()) return '';
  try {
    const embedding = await generateEmbedding(message);
    if (embedding.length === 0) return '';

    const filter: any = { accessLevel: { $in: ['public'] } };
    if (userAccessLevel === 'admin') filter.accessLevel = { $in: ['public', 'restricted', 'admin'] };
    else if (userAccessLevel === 'HR') filter.accessLevel = { $in: ['public', 'restricted'] };

    const results = await queryVectors(embedding, 5, filter);
    if (results.length === 0) return '';

    const relevant = results
      .filter(r => r.score > 0.6)
      .map(r => `[${r.metadata?.department?.toUpperCase() || 'ORG'} — ${r.metadata?.title}]\n${r.metadata?.chunk}`)
      .join('\n\n');

    return relevant;
  } catch (err) {
    console.error('[Aida] RAG context error:', err);
    return '';
  }
};

// ─── Get or create Aida DM Conversation for a user ───────────────────────────
export const getAidaConversation = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.user as any)?._id;
    const bot = await getAidaBotUser();

    // Find existing DM between user and Aida bot
    let conv = await Conversation.findOne({
      isGroupChat: false,
      users: { $all: [userId, bot._id], $size: 2 },
    }).populate('latestMessage');

    if (!conv) {
      conv = await Conversation.create({
        chatName: 'Aida',
        isGroupChat: false,
        users: [userId, bot._id],
      });
    }

    res.status(200).json({
      conversation: {
        _id: conv._id,
        chatName: 'Aida',
        isGroupChat: false,
        users: conv.users,
        latestMessage: conv.latestMessage,
        isAidaBot: true,
        botId: bot._id,
      },
    });
  } catch (error: any) {
    console.error('[Aida] Get conversation error:', error);
    res.status(500).json({ error: 'Failed to get Aida conversation.' });
  }
};

// ─── Chat with Aida (persisted in Messages collection) ───────────────────────
export const chatWithAidaInConversation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { message, conversationId } = req.body;
    const userId = (req.user as any)?._id;

    if (!message) { res.status(400).json({ error: 'message is required' }); return; }

    const bot = await getAidaBotUser();
    const user = await User.findById(userId);
    const userName = user?.full_name || user?.username || 'Voyager';
    const userRole = (user as any)?.role || 'employee';

    // Resolve conversation
    let conv;
    if (conversationId) {
      conv = await Conversation.findById(conversationId);
    }
    if (!conv) {
      conv = await Conversation.findOne({
        isGroupChat: false,
        users: { $all: [userId, bot._id], $size: 2 },
      });
    }
    if (!conv) {
      conv = await Conversation.create({
        chatName: 'Aida',
        isGroupChat: false,
        users: [userId, bot._id],
      });
    }

    // Save user message
    const userMsg = await Message.create({
      sender: userId,
      content: message,
      chat: conv._id,
      message_type: 'text',
      readBy: [userId],
    });

    // Fetch context for AI
    const [recentFiles, todayTasks, upcomingTasks] = await Promise.all([
      WorkspaceFile.find({ uploadedBy: userId }).sort({ createdAt: -1 }).limit(5).lean(),
      Task.find({
        $or: [{ user_id: userId }, { assignedTo: userId }],
        start_time: { $gte: new Date(new Date().setHours(0, 0, 0, 0)), $lte: new Date(new Date().setHours(23, 59, 59, 999)) },
        status: { $nin: ['done', 'cancelled'] },
      }).limit(5).lean(),
      Task.find({
        $or: [{ user_id: userId }, { assignedTo: userId }],
        start_time: { $gt: new Date() },
        status: { $nin: ['done', 'cancelled'] },
      }).sort({ start_time: 1 }).limit(3).lean(),
    ]);

    // Fetch conversation history (last 6 messages)
    const history = await Message.find({ chat: conv._id })
      .sort({ createdAt: -1 })
      .limit(6)
      .populate('sender', 'full_name username is_bot')
      .lean();
    const historyText = history.reverse().map((m: any) => {
      const senderName = m.sender?.is_bot ? 'Aida' : (m.sender?.full_name || 'User');
      return `${senderName}: ${m.content}`;
    }).join('\n');

    // RAG org context
    const orgContext = await getOrgContext(message, userRole);

    const fileContext = recentFiles.length > 0 ? `Workspace files: ${recentFiles.map((f: any) => `${f.name} (${f.fileType})`).join(', ')}.` : '';
    const taskContext = todayTasks.length > 0 ? `Today's tasks: ${todayTasks.map((t: any) => `"${t.title}"`).join(', ')}.` : 'No tasks today.';

    const prompt = `You are Aida, a smart AI assistant inside the Bubble organizational platform. You are chatting with ${userName}. Be warm, concise, and helpful.

${orgContext ? `ORGANIZATION KNOWLEDGE (use this to answer company-specific questions):\n${orgContext}\n` : ''}
${fileContext}
${taskContext}

Recent conversation:
${historyText}

User: ${message}
Aida:`;

    const rawReply = await callHF(prompt, 400, 0.65);
    let reply = rawReply || buildSmartFallback(userName, todayTasks, recentFiles, message);

    // Parse for action blocks
    let actionResult: any = null;
    const actionMatch = rawReply.match(/\[ACTION:\s*(\{.*?\})\s*\]/is);
    if (actionMatch) {
      try {
        const actionData = JSON.parse(actionMatch[1]);
        reply = reply.replace(actionMatch[0], '').trim();
        actionResult = actionData;
        if (actionData.type === 'FIND_FILE') {
          const keywords = (actionData.payload || '').toLowerCase().split(/\s+/);
          const allFiles = await WorkspaceFile.find({ uploadedBy: userId }).lean();
          const found = allFiles.filter((f: any) => {
            const text = `${f.name} ${f.description || ''} ${(f.tags || []).join(' ')}`.toLowerCase();
            return keywords.some((kw: string) => kw.length > 2 && text.includes(kw));
          }).slice(0, 3);
          actionResult.files = found;
        }
      } catch (e) { /* ignore */ }
    }

    // Save Aida's reply as a message
    const botMsg = await Message.create({
      sender: bot._id,
      content: reply,
      chat: conv._id,
      message_type: 'text',
      readBy: [bot._id],
    });

    // Update conversation's latestMessage
    await Conversation.findByIdAndUpdate(conv._id, { latestMessage: botMsg._id });

    res.status(200).json({
      reply,
      action: actionResult,
      userMessage: userMsg,
      botMessage: botMsg,
      conversationId: conv._id,
      usedOrgContext: !!orgContext,
    });
  } catch (error: any) {
    console.error('[Aida] Chat in conversation error:', error);
    res.status(500).json({ error: 'Failed to chat with Aida.' });
  }
};

// ─── Summarize a conversation ─────────────────────────────────────────────────
export const summarizeConversation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req.user as any)?._id;

    // Verify user has access to this conversation
    const conv = await Conversation.findOne({ _id: id, users: userId });
    if (!conv) { res.status(404).json({ error: 'Conversation not found' }); return; }

    const messages = await Message.find({ chat: id })
      .sort({ createdAt: -1 })
      .limit(30)
      .populate('sender', 'full_name username is_bot')
      .lean();

    if (messages.length === 0) {
      res.status(200).json({ summary: 'No messages in this conversation yet.' });
      return;
    }

    const transcript = messages.reverse().map((m: any) => {
      const name = m.sender?.is_bot ? 'Aida' : (m.sender?.full_name || m.sender?.username || 'User');
      return `${name}: ${m.content}`;
    }).join('\n');

    let summary = '';
    if (hasKey()) {
      const prompt = `Summarize this conversation in 2–4 bullet points. Focus on decisions made, action items, and key information shared. Be concise.\n\nConversation:\n${transcript.substring(0, 3000)}\n\nSummary:`;
      summary = await callHF(prompt, 200, 0.5);
    }

    if (!summary) {
      summary = `Conversation with ${messages.length} message(s). Latest message: "${messages[messages.length - 1]?.content?.substring(0, 100)}..."`;
    }

    res.status(200).json({ summary, messageCount: messages.length });
  } catch (error: any) {
    console.error('[Aida] Summarize error:', error);
    res.status(500).json({ error: 'Failed to summarize conversation.' });
  }
};

// ─── Schedule a task from Aida ────────────────────────────────────────────────
export const aidaScheduleTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, startTime, description } = req.body;
    const userId = (req.user as any)?._id;
    if (!title) { res.status(400).json({ error: 'title is required' }); return; }

    const start = startTime ? new Date(startTime) : (() => {
      const d = new Date(); d.setHours(d.getHours() + 1, 0, 0, 0); return d;
    })();
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    const task = await Task.create({
      title,
      description: description || '',
      user_id: userId,
      start_time: start,
      end_time: end,
      status: 'todo',
      priority: 'medium',
    });

    res.status(201).json({
      message: 'Task scheduled by Aida.',
      task,
      reply: `Done! I've scheduled "${title}" for ${start.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}. You can view it on your Calendar.`,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to schedule task.' });
  }
};

/**
 * POST /api/v1/aida/chat
 * Legacy standalone Aida chat (AidaPage — not persisted to messages collection)
 */
export const chatWithAida = async (req: Request, res: Response): Promise<void> => {
  try {
    const { message, context } = req.body;
    const userId = (req.user as any)?._id;
    if (!message) { res.status(400).json({ error: 'Message is required' }); return; }

    const user = await User.findById(userId);
    const userName = user?.full_name || user?.username || 'Voyager';
    const userTag = user?.uniqueTag || 'anonymous';
    const userRole = (user as any)?.role || 'employee';

    const [recentFiles, todayTasks, upcomingTasks] = await Promise.all([
      WorkspaceFile.find({ uploadedBy: userId }).sort({ createdAt: -1 }).limit(5).lean(),
      Task.find({
        $or: [{ user_id: userId }, { assignedTo: userId }],
        start_time: { $gte: new Date(new Date().setHours(0, 0, 0, 0)), $lte: new Date(new Date().setHours(23, 59, 59, 999)) },
        status: { $nin: ['done', 'cancelled'] },
      }).limit(5).lean(),
      Task.find({
        $or: [{ user_id: userId }, { assignedTo: userId }],
        start_time: { $gt: new Date() },
        status: { $nin: ['done', 'cancelled'] },
      }).sort({ start_time: 1 }).limit(3).lean(),
    ]);

    // RAG org context
    const orgContext = await getOrgContext(message, userRole);

    const fileContext = recentFiles.length > 0 ? `Recent workspace files: ${recentFiles.map((f: any) => `${f.name} (${f.fileType})`).join(', ')}.` : 'Workspace is empty.';
    const taskContext = todayTasks.length > 0 ? `Today's pending tasks: ${todayTasks.map((t: any) => `"${t.title}" at ${new Date(t.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`).join(', ')}.` : 'No tasks today.';
    const upcomingContext = upcomingTasks.length > 0 ? `Upcoming: ${upcomingTasks.map((t: any) => `"${t.title}" on ${new Date(t.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`).join(', ')}.` : '';
    const pageContext = context ? `User is currently in: ${context} section.` : '';

    const prompt = `You are Aida, a smart AI productivity assistant in the Bubble platform. You know the user's name — always address them personally as "${userName.split(' ')[0]}". Be warm, concise, and highly actionable.
User: ${userName} (${userTag})
${pageContext}
${orgContext ? `ORGANIZATION KNOWLEDGE:\n${orgContext}\n` : ''}
${fileContext}
${taskContext}
${upcomingContext}

Capabilities you have:
1. Schedule tasks/meetings to the Calendar
2. Create templates (meeting agendas, project plans, daily schedules, etc.)
3. Search workspace files
4. Summarize meetings and extract action items
5. Give daily briefings and productivity tips
6. Answer questions about the organization using company knowledge

Available action blocks (embed inline in your reply when needed):
- Schedule a task/meeting: [ACTION: {"type":"SCHEDULE_TASK","title":"...","startTime":"ISO or natural language","description":"..."}]
- Find a file: [ACTION: {"type":"FIND_FILE","payload":"search query"}]
- Open Calendar: [ACTION: {"type":"OPEN_CALENDAR"}]
- Create Template: [ACTION: {"type":"CREATE_TEMPLATE","templateType":"meeting_agenda|daily_plan|project_brief|weekly_review","title":"...","content":"full template text"}]

When the user asks to plan their schedule, create a detailed day/week plan. When asked for a template, generate a complete ready-to-use template inline. Always end with a helpful follow-up question.

User message: ${message}
Aida:`;

    const rawReply = await callHF(prompt, 400, 0.65);

    let reply = rawReply;
    let actionResult: any = null;
    const actionMatch = rawReply.match(/\[ACTION:\s*(\{.*?\})\s*\]/is);

    if (actionMatch) {
      try {
        const actionData = JSON.parse(actionMatch[1]);
        reply = reply.replace(actionMatch[0], '').trim();
        actionResult = actionData;

        if (actionData.type === 'FIND_FILE') {
          const keywords = (actionData.payload || '').toLowerCase().split(/\s+/);
          const allFiles = await WorkspaceFile.find({ uploadedBy: userId }).lean();
          const found = allFiles.filter((f: any) => {
            const text = `${f.name} ${f.description || ''} ${(f.tags || []).join(' ')}`.toLowerCase();
            return keywords.some((kw: string) => kw.length > 2 && text.includes(kw));
          }).slice(0, 3);
          actionResult.files = found;
          if (found.length > 0) reply += `\n\nI found ${found.length} matching file(s).`;
        }

        if (actionData.type === 'SCHEDULE_TASK') {
          reply = reply || `I'll schedule "${actionData.title}" for you. One moment...`;
        }

        if (actionData.type === 'CREATE_TEMPLATE') {
          reply = reply || `Here's your **${actionData.title || actionData.templateType}** template, ${userName.split(' ')[0]}!`;
          actionResult.templateContent = actionData.content;
        }
      } catch (e) {
        console.error('Failed to parse Aida action', e);
      }
    }

    if (!reply) reply = buildSmartFallback(userName, todayTasks, recentFiles, message);

    res.status(200).json({ reply, action: actionResult, usedOrgContext: !!orgContext });
  } catch (error: any) {
    console.error('Aida Chat Error:', error);
    res.status(500).json({ error: 'Error processing your request with Aida.' });
  }
};

/**
 * GET /api/v1/aida/daily-briefing
 */
export const getDailyBriefing = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.user as any)._id;
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setHours(23, 59, 59, 999);

    const [todayTasks, pendingInvoices, upcomingMeetings, user] = await Promise.all([
      Task.find({ $or: [{ user_id: userId }, { assignedTo: userId }], start_time: { $gte: start, $lte: end } }).lean(),
      Invoice.find({ user_id: userId, status: { $in: ['sent', 'overdue'] } }).lean(),
      (async () => {
        try {
          const Meeting = (await import('../models/meeting')).Meeting;
          return Meeting.find({ $or: [{ host: userId }, { attendees: userId }], startedAt: { $gte: start, $lte: end } }).lean();
        } catch { return []; }
      })(),
      User.findById(userId),
    ]);

    const userName = user?.full_name || user?.username || 'there';
    const now = new Date();
    const hour = now.getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    const localBriefing = [
      `${greeting}, ${userName}!`,
      todayTasks.length > 0 ? `You have ${todayTasks.length} task(s) scheduled today.` : 'Your schedule is clear today.',
      upcomingMeetings.length > 0 ? `${upcomingMeetings.length} meeting(s) on your calendar.` : '',
      pendingInvoices.length > 0 ? `⚠️ ${pendingInvoices.length} invoice(s) need attention.` : '',
    ].filter(Boolean).join(' ');

    if (hasKey() && todayTasks.length > 0) {
      const taskLines = todayTasks.map((t: any) => `- ${t.title} at ${new Date(t.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`).join('\n');
      const prompt = `Write a warm, 2-sentence morning briefing for ${userName}. Keep it motivating.\nTasks today:\n${taskLines}\nBriefing:`;
      const aiReply = await callHF(prompt, 150, 0.6);
      if (aiReply) {
        res.status(200).json({ reply: aiReply, tasks: todayTasks, invoices: pendingInvoices, meetings: upcomingMeetings });
        return;
      }
    }

    res.status(200).json({ reply: localBriefing, tasks: todayTasks, invoices: pendingInvoices, meetings: upcomingMeetings });
  } catch (error: any) {
    console.error('Aida Briefing Error:', error);
    res.status(500).json({ error: 'Error getting daily briefing.' });
  }
};

/**
 * GET /api/v1/aida/financial-advice
 */
export const getFinancialAdvice = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.user as any)._id;
    const [recentTransactions, overdueInvoices] = await Promise.all([
      Transaction.find({ user_id: userId }).sort({ createdAt: -1 }).limit(10).lean(),
      Invoice.find({ user_id: userId, status: 'overdue' }).lean(),
    ]);

    const tStrings = recentTransactions.map((t: any) => `${t.type}: $${(t.amount / 100).toFixed(2)} ${t.currency}`).join('\n') || 'No recent transactions.';
    const expenses = recentTransactions.filter((t: any) => t.type === 'expense' || t.type === 'withdrawal');
    const totalSpent = expenses.reduce((s, t) => s + t.amount, 0) / 100;
    const localReply = overdueInvoices.length > 0
      ? `You have ${overdueInvoices.length} overdue invoice(s) requiring immediate attention. Total recent spend: $${totalSpent.toFixed(2)}.`
      : recentTransactions.length > 0
        ? `Recent activity: ${tStrings.split('\n').slice(0, 3).join('; ')}. Total recent spend: $${totalSpent.toFixed(2)}.`
        : 'No recent financial activity found.';

    if (hasKey() && recentTransactions.length > 0) {
      const invoiceWarning = overdueInvoices.length > 0 ? `\nOVERDUE: ${overdueInvoices.length} invoice(s) past due.` : '';
      const prompt = `You are a financial advisor AI. Give one short, helpful tip based on these transactions:\n${tStrings}${invoiceWarning}\nAdvice:`;
      const aiReply = await callHF(prompt, 150, 0.5);
      if (aiReply) { res.status(200).json({ reply: aiReply, overdueInvoices }); return; }
    }

    res.status(200).json({ reply: localReply, overdueInvoices });
  } catch (error: any) {
    res.status(500).json({ error: 'Error getting financial advice.' });
  }
};

/**
 * POST /api/v1/aida/extract-action-items
 */
export const extractActionItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const { transcript, attendeeNames = [] } = req.body;
    if (!transcript) { res.status(400).json({ error: 'transcript is required' }); return; }

    if (!hasKey()) {
      const lines = transcript.split(/[.\n]/);
      const actionItems: any[] = [];
      const actionPatterns = /\b(will|should|must|needs? to|action:|todo:|task:)\b/i;
      lines.forEach((line: string) => {
        const trimmed = line.trim();
        if (trimmed.length > 10 && actionPatterns.test(trimmed)) {
          const assignedTo = attendeeNames.find((n: string) => trimmed.toLowerCase().includes(n.toLowerCase())) || null;
          actionItems.push({ text: trimmed, assignedToName: assignedTo, deadline: null });
        }
      });
      res.status(200).json({ actionItems: actionItems.slice(0, 10), warning: 'Local extraction — configure HF_API_KEY for AI extraction.' });
      return;
    }

    const attendeeLine = attendeeNames.length > 0 ? `Attendees: ${attendeeNames.join(', ')}.` : '';
    const prompt = `Extract action items from this transcript. ${attendeeLine}\nTRANSCRIPT:\n${transcript.substring(0, 3000)}\nReturn ONLY valid JSON: {"actionItems": [{"text": "...", "assignedToName": "...or null", "deadline": "...or null"}]}\nJSON:`;
    const raw = await callHF(prompt, 500, 0.3);
    const match = raw.match(/\{[\s\S]*\}/);

    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        res.status(200).json(parsed); return;
      } catch { /* fall through */ }
    }

    res.status(200).json({ actionItems: [], warning: 'Could not parse AI response.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to extract action items.' });
  }
};

/**
 * POST /api/v1/aida/search-workspace
 */
export const searchWorkspace = async (req: Request, res: Response): Promise<void> => {
  try {
    const { query } = req.body;
    const userId = (req.user as any)?._id;
    if (!query) { res.status(400).json({ error: 'query is required' }); return; }

    const files = await WorkspaceFile.find({ uploadedBy: userId }).select('name fileType source description tags createdAt').lean();
    if (files.length === 0) { res.status(200).json({ files: [], message: 'Your workspace is empty.' }); return; }

    const keywords = query.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
    const scored = files.map((f: any) => {
      const text = `${f.name} ${f.description || ''} ${(f.tags || []).join(' ')}`.toLowerCase();
      const score = keywords.reduce((s: number, kw: string) => s + (text.includes(kw) ? 1 : 0), 0);
      return { ...f, score };
    }).filter((f: any) => f.score > 0).sort((a: any, b: any) => b.score - a.score);

    let aiSummary = '';
    if (hasKey() && scored.length > 0) {
      const fileList = scored.slice(0, 10).map((f: any) => `- ${f.name} (${f.fileType})`).join('\n');
      const prompt = `User searched "${query}". Matching files:\n${fileList}\nWhich is most relevant and why? (one sentence):`;
      aiSummary = await callHF(prompt, 100, 0.5);
    }

    res.status(200).json({ files: scored.slice(0, 10), aiSummary });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to search workspace.' });
  }
};

/**
 * POST /api/v1/aida/schedule-suggestion
 */
export const scheduleSuggestion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { duration = 30 } = req.body;
    const userId = (req.user as any)?._id;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const endWindow = new Date(tomorrow);
    endWindow.setDate(endWindow.getDate() + 7);

    const existingTasks = await Task.find({
      $or: [{ user_id: userId }, { assignedTo: userId }],
      start_time: { $gte: tomorrow, $lte: endWindow },
      status: { $nin: ['done', 'cancelled'] },
    }).sort({ start_time: 1 }).lean();

    const suggestions: { date: string; time: string; label: string }[] = [];
    const cursor = new Date(tomorrow);
    cursor.setHours(9, 0, 0, 0);

    while (cursor <= endWindow && suggestions.length < 5) {
      const slotEnd = new Date(cursor.getTime() + duration * 60 * 1000);
      const conflict = existingTasks.some((t: any) => {
        const tStart = new Date(t.start_time);
        const tEnd = new Date(t.end_time);
        return cursor < tEnd && slotEnd > tStart;
      });
      if (!conflict && cursor.getHours() < 18) {
        suggestions.push({
          date: cursor.toISOString().split('T')[0],
          time: cursor.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
          label: `${cursor.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} at ${cursor.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`,
        });
      }
      cursor.setMinutes(cursor.getMinutes() + 30);
      if (cursor.getHours() >= 18) { cursor.setDate(cursor.getDate() + 1); cursor.setHours(9, 0, 0, 0); }
    }

    res.status(200).json({ suggestions, message: `Found ${suggestions.length} open slot(s) for a ${duration}-min session.` });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to generate schedule suggestion.' });
  }
};

/**
 * POST /api/v1/aida/summarize-feed
 */
export const summarizeFeed = async (req: Request, res: Response): Promise<void> => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const posts = await Post.find({ createdAt: { $gte: today } })
      .sort({ createdAt: -1 }).limit(20)
      .populate('author', 'full_name username').lean();

    if (posts.length === 0) { res.status(200).json({ summary: "Nothing new in your Feed today — it's quiet!" }); return; }

    const postLines = posts.map((p: any) => `- ${p.author?.full_name || 'Someone'}: "${p.content?.substring(0, 80)}"`).join('\n');

    if (hasKey()) {
      const prompt = `Summarize today's social feed in 2 sentences:\n${postLines}\nSummary:`;
      const summary = await callHF(prompt, 150, 0.6);
      if (summary) { res.status(200).json({ summary, postCount: posts.length }); return; }
    }

    res.status(200).json({
      summary: `${posts.length} post(s) in your Feed today. Latest from: ${posts.slice(0, 3).map((p: any) => p.author?.username || 'someone').join(', ')}.`,
      postCount: posts.length,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to summarize feed.' });
  }
};

/**
 * GET /api/v1/aida/flag-payments
 */
export const flagPayments = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.user as any)?._id;
    const [transactions, overdueInvoices, unpaidInvoices] = await Promise.all([
      Transaction.find({ user_id: userId }).sort({ createdAt: -1 }).limit(30).lean(),
      Invoice.find({ user_id: userId, status: 'overdue' }).lean(),
      Invoice.find({ user_id: userId, status: 'sent', dueDate: { $lte: new Date() } }).lean(),
    ]);

    const flags: { severity: 'info' | 'warning' | 'critical'; message: string }[] = [];
    if (overdueInvoices.length > 0) flags.push({ severity: 'critical', message: `${overdueInvoices.length} invoice(s) are overdue.` });
    if (unpaidInvoices.length > 0) flags.push({ severity: 'warning', message: `${unpaidInvoices.length} sent invoice(s) have passed their due date.` });

    if (transactions.length >= 3) {
      const expenses = transactions.filter((t: any) => t.type === 'expense' || t.type === 'withdrawal');
      const avg = expenses.reduce((s, t) => s + t.amount, 0) / (expenses.length || 1);
      const unusual = expenses.filter(t => t.amount > avg * 10);
      if (unusual.length > 0) flags.push({ severity: 'warning', message: `Unusual expense detected: ${unusual.map(t => `$${(t.amount / 100).toFixed(2)}`).join(', ')} — significantly above your average.` });
    }

    if (flags.length === 0) flags.push({ severity: 'info', message: 'All finances look healthy — no flags detected.' });

    res.status(200).json({ flags, overdueInvoices, unpaidInvoices });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to analyze payments.' });
  }
};
