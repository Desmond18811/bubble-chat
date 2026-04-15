import { Request, Response } from 'express';
import { HfInference } from '@huggingface/inference';
import { Task } from '../models/task';
import { Transaction } from '../models/transaction';
import { Invoice } from '../models/invoice';
import { WorkspaceFile } from '../models/workspaceFile';
import { User } from '../models/users';
import Post from '../models/post';
import mongoose from 'mongoose';

const hf = new HfInference(process.env.HF_API_KEY || '');
const modelId = process.env.GEMMA_MODEL_ID || 'google/gemma-2-9b-it';
const hasKey = () => process.env.HF_API_KEY && process.env.HF_API_KEY !== 'your_hugging_face_api_key_here';

// ─── Helper: call Hugging Face with fallback ──────────────────────────────────
const callHF = async (prompt: string, maxTokens = 400, temp = 0.7): Promise<string> => {
  if (!hasKey()) return '';

  try {
    const response = await hf.textGeneration({
      model: modelId,
      inputs: prompt,
      parameters: { max_new_tokens: maxTokens, temperature: temp, repetition_penalty: 1.1 },
    });
    return response.generated_text.replace(prompt, '').trim();
  } catch (err) {
    console.error('HF API error:', err);
    return '';
  }
};

/**
 * POST /api/v1/aida/chat
 * General context-aware chat with Aida.
 */
export const chatWithAida = async (req: Request, res: Response): Promise<void> => {
  try {
    const { message, context } = req.body;
    const userId = (req.user as any)?._id;

    if (!message) { res.status(400).json({ error: 'Message is required' }); return; }

    const user = await User.findById(userId);
    const userName = user?.full_name || user?.username || 'Voyager';
    const userTag  = user?.uniqueTag || 'anonymous';

    const recentFiles = await WorkspaceFile.find({ uploadedBy: userId }).sort({ createdAt: -1 }).limit(5);
    const todayTasks  = await Task.find({
      $or: [{ user_id: userId }, { assignedTo: userId }],
      start_time: { $gte: new Date(new Date().setHours(0,0,0,0)) },
      status:     { $nin: ['done', 'cancelled'] },
    }).limit(5);

    const fileContext = recentFiles.length > 0
      ? `Recent workspace files: ${recentFiles.map(f => f.name).join(', ')}.`
      : '';
    const taskContext = todayTasks.length > 0
      ? `Today's tasks: ${todayTasks.map(t => t.title).join(', ')}.`
      : '';
    const pageContext = context ? `User is currently in: ${context} section.` : '';

    const prompt = `You are Aida, a luminous, agentic AI assistant built into the Sets platform — a unified work OS.
User: ${userName} (${userTag})
${pageContext}
${fileContext}
${taskContext}

You are context-aware, helpful, and can take actions. Be proactive.
If the user asks you to perform a specific action, you MUST include a JSON block in your response using this exact format:
[ACTION: {"type": "ACTION_TYPE", "payload": "any search string or data"}]

Allowed actions:
- FIND_FILE (payload: search query string)
- SCHEDULE_TASK (payload: task title or description)
- SUMMARIZE_FEED (payload: null)
- FINANCE_CHECK (payload: null)

User: ${message}
Aida:`;

    const rawReply = await callHF(prompt, 500, 0.7);
    
    // Parse for action
    let reply = rawReply;
    let actionResult: any = null;
    let actionMatch = rawReply.match(/\[ACTION:\s*(\{.*?\})\s*\]/is);

    if (actionMatch) {
      try {
        const actionData = JSON.parse(actionMatch[1]);
        reply = reply.replace(actionMatch[0], '').trim();
        actionResult = actionData;
        
        // Execute server-side data fetching for the action if needed
        if (actionData.type === "FIND_FILE") {
           const foundFiles = await WorkspaceFile.find({ 
             uploadedBy: userId, 
             $text: { $search: actionData.payload || "document" } 
           }).limit(3).lean();
           if (foundFiles.length > 0) {
              actionResult.files = foundFiles;
              reply += `\n\nI found ${foundFiles.length} file(s) matching your request.`;
           } else {
              reply += `\n\nI couldn't find any files matching "${actionData.payload}".`;
           }
        }
      } catch(e) {
        console.error("Failed to parse Aida action", e);
      }
    }

    if (!reply) {
       reply = `Hello ${userName}! I'm Aida, your Sets assistant. I can see your workspace, tasks, and calendar — how can I help you today?`;
    }

    res.status(200).json({
      reply,
      action: actionResult
    });
  } catch (error: any) {
    console.error('Aida Chat Error:', error);
    res.status(500).json({ error: 'Error processing your request with Aida.' });
  }
};

/**
 * GET /api/v1/aida/daily-briefing
 * Context-aware daily briefing pulling from Calendar and workspace.
 */
export const getDailyBriefing = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.user as any)._id;
    const today  = new Date();
    const start  = new Date(today.setHours(0, 0, 0, 0));
    const end    = new Date(today.setHours(23, 59, 59, 999));

    const [todayTasks, pendingInvoices, user] = await Promise.all([
      Task.find({ $or: [{ user_id: userId }, { assignedTo: userId }], start_time: { $gte: start, $lte: end } }).lean(),
      Invoice.find({ user_id: userId, status: { $in: ['sent', 'overdue'] } }).lean(),
      User.findById(userId),
    ]);

    const userName = user?.full_name || user?.username || 'there';

    if (todayTasks.length === 0 && pendingInvoices.length === 0) {
      res.status(200).json({
        reply: `Good day, ${userName}! Your schedule is clear today. A perfect time to get ahead — want me to suggest some focus tasks?`,
        tasks: [],
      });
      return;
    }

    const taskLines  = todayTasks.map(t => `- [${t.priority}] ${t.title} at ${new Date(t.start_time).toLocaleTimeString()}`).join('\n');
    const invoiceInfo = pendingInvoices.length > 0
      ? `\nPending invoices: ${pendingInvoices.length} awaiting payment.`
      : '';

    const prompt = `You are Aida. Generate a warm, motivating daily briefing for ${userName}.
Tasks today:
${taskLines}${invoiceInfo}

Daily Briefing:`;

    const reply = await callHF(prompt, 300, 0.6);

    res.status(200).json({
      reply: reply || `Good day, ${userName}! You have ${todayTasks.length} task(s) today. Let's make it count!`,
      tasks:    todayTasks,
      invoices: pendingInvoices,
    });
  } catch (error: any) {
    console.error('Aida Briefing Error:', error);
    res.status(500).json({ error: 'Error getting daily briefing.' });
  }
};

/**
 * GET /api/v1/aida/financial-advice
 * Financial analysis based on real transaction and invoice data.
 */
export const getFinancialAdvice = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.user as any)._id;

    const [recentTransactions, overdueInvoices] = await Promise.all([
      Transaction.find({ user_id: userId }).sort({ createdAt: -1 }).limit(10).lean(),
      Invoice.find({ user_id: userId, status: 'overdue' }).lean(),
    ]);

    const tStrings = recentTransactions.map(t => `${t.type}: $${(t.amount/100).toFixed(2)} ${t.currency}`).join('\n') || 'No recent transactions.';
    const invoiceWarning = overdueInvoices.length > 0
      ? `\nOVERDUE: ${overdueInvoices.length} invoice(s) are past due date.`
      : '';

    const prompt = `You are Aida, a financial advisor AI. Analyze these transactions for the user:
${tStrings}${invoiceWarning}

Provide short, actionable financial advice:`;

    const reply = await callHF(prompt, 250, 0.5);

    res.status(200).json({
      reply: reply || `Based on your recent activity, here's a quick snapshot: ${tStrings.split('\n').slice(0,3).join('; ')}.`,
      overdueInvoices,
    });
  } catch (error: any) {
    console.error('Aida Finance Error:', error);
    res.status(500).json({ error: 'Error getting financial advice.' });
  }
};

/**
 * POST /api/v1/aida/extract-action-items
 * AGENTIC: Parse a raw meeting transcript → structured action items.
 */
export const extractActionItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const { transcript, attendeeNames = [] } = req.body;
    if (!transcript) { res.status(400).json({ error: 'transcript is required' }); return; }

    const attendeeLine = attendeeNames.length > 0 ? `Attendees: ${attendeeNames.join(', ')}.` : '';
    const prompt = `You are Aida. Extract concrete action items from this meeting transcript.
${attendeeLine}

TRANSCRIPT:
${transcript.substring(0, 3000)}

Return ONLY valid JSON: {"actionItems": [{"text": "...", "assignedToName": "...or null", "deadline": "...or null"}]}

JSON:`;

    const raw   = await callHF(prompt, 500, 0.3);
    const match = raw.match(/\{[\s\S]*\}/);

    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        res.status(200).json(parsed);
        return;
      } catch { /* fall through */ }
    }

    // Fallback: return empty list, not an error
    res.status(200).json({ actionItems: [], warning: 'Could not parse AI response. Please configure HF_API_KEY for live extraction.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to extract action items.' });
  }
};

/**
 * POST /api/v1/aida/search-workspace
 * AGENTIC: Natural language file search across workspace.
 */
export const searchWorkspace = async (req: Request, res: Response): Promise<void> => {
  try {
    const { query } = req.body;
    const userId = (req.user as any)?._id;
    if (!query) { res.status(400).json({ error: 'query is required' }); return; }

    // Get all user's files
    const files = await WorkspaceFile.find({ uploadedBy: userId }).select('name type source description tags createdAt').lean();

    if (files.length === 0) {
      res.status(200).json({ files: [], message: "Your workspace is empty." });
      return;
    }

    // Semantic keyword matching (fast fallback without AI)
    const keywords = query.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
    const scored = files.map(f => {
      const text = `${f.name} ${f.description || ''} ${(f.tags || []).join(' ')}`.toLowerCase();
      const score = keywords.reduce((s: number, kw: string) => s + (text.includes(kw) ? 1 : 0), 0);
      return { ...f, score };
    }).filter((f: any) => f.score > 0).sort((a: any, b: any) => b.score - a.score);

    // If AI available, use it for ranking/explanation
    let aiSummary = '';
    if (hasKey() && scored.length > 0) {
      const fileList = scored.slice(0, 10).map((f: any) => `- ${f.name} (${f.type})`).join('\n');
      const prompt = `User searched for: "${query}". Here are matching files:\n${fileList}\n\nExplain in one sentence which file is most relevant and why:\n`;
      aiSummary = await callHF(prompt, 100, 0.5);
    }

    res.status(200).json({ files: scored.slice(0, 10), aiSummary });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to search workspace.' });
  }
};

/**
 * POST /api/v1/aida/schedule-suggestion
 * AGENTIC: Suggest the best time to schedule a meeting/task.
 */
export const scheduleSuggestion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { duration = 30, preferredDay } = req.body;
    const userId = (req.user as any)?._id;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const endWindow = new Date(tomorrow);
    endWindow.setDate(endWindow.getDate() + 7);

    // Get existing tasks/events in the next 7 days
    const existingTasks = await Task.find({
      $or: [{ user_id: userId }, { assignedTo: userId }],
      start_time: { $gte: tomorrow, $lte: endWindow },
      status:     { $nin: ['done', 'cancelled'] },
    }).sort({ start_time: 1 }).lean();

    // Find open 30-min slots between 9am-6pm
    const suggestions: { date: string; time: string; label: string }[] = [];
    const cursor = new Date(tomorrow);
    cursor.setHours(9, 0, 0, 0);

    while (cursor <= endWindow && suggestions.length < 5) {
      const slotEnd = new Date(cursor.getTime() + duration * 60 * 1000);

      const conflict = existingTasks.some(t => {
        const tStart = new Date(t.start_time);
        const tEnd   = new Date(t.end_time);
        return cursor < tEnd && slotEnd > tStart;
      });

      if (!conflict && cursor.getHours() < 18) {
        suggestions.push({
          date:  cursor.toISOString().split('T')[0],
          time:  cursor.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          label: `${cursor.toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' })} at ${cursor.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        });
      }

      // Advance by 30 min
      cursor.setMinutes(cursor.getMinutes() + 30);
      if (cursor.getHours() >= 18) {
        cursor.setDate(cursor.getDate() + 1);
        cursor.setHours(9, 0, 0, 0);
      }
    }

    res.status(200).json({
      suggestions,
      message: `Found ${suggestions.length} open slot(s) in the next 7 days for a ${duration}-minute session.`,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to generate schedule suggestion.' });
  }
};

/**
 * POST /api/v1/aida/summarize-feed
 * AGENTIC: Summarize today's Feed activity.
 */
export const summarizeFeed = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.user as any)?._id;
    const today  = new Date();
    today.setHours(0, 0, 0, 0);

    const posts = await Post.find({ createdAt: { $gte: today } })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('author', 'full_name username')
      .lean();

    if (posts.length === 0) {
      res.status(200).json({ summary: "Nothing new in your Feed today — it's all quiet!" });
      return;
    }

    const postLines = posts.map(p => `- ${(p.author as any)?.full_name || 'Someone'}: "${p.content.substring(0, 80)}..."`).join('\n');
    const prompt = `Summarize today's Feed activity in 2-3 sentences for the user:\n${postLines}\n\nSummary:`;

    const summary = await callHF(prompt, 150, 0.6);
    res.status(200).json({
      summary: summary || `${posts.length} post(s) in your Feed today. Scroll down to catch up!`,
      postCount: posts.length,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to summarize feed.' });
  }
};

/**
 * GET /api/v1/aida/flag-payments
 * AGENTIC: Flag unusual expenses or overdue invoices.
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

    // Check for overdue invoices
    if (overdueInvoices.length > 0) {
      flags.push({
        severity: 'critical',
        message: `${overdueInvoices.length} invoice(s) are overdue and need follow-up.`,
      });
    }

    // Check for sent invoices that have passed due date
    if (unpaidInvoices.length > 0) {
      flags.push({
        severity: 'warning',
        message: `${unpaidInvoices.length} sent invoice(s) have passed their due date.`,
      });
    }

    // Check for unusual spending (any single transaction > 10x average)
    if (transactions.length >= 3) {
      const expenses = transactions.filter(t => t.type === 'expense' || t.type === 'withdrawal');
      const avg = expenses.reduce((s, t) => s + t.amount, 0) / (expenses.length || 1);
      const unusual = expenses.filter(t => t.amount > avg * 10);
      if (unusual.length > 0) {
        flags.push({
          severity: 'warning',
          message: `Unusual expense detected: ${unusual.map(t => `$${(t.amount/100).toFixed(2)}`).join(', ')} — significantly above your average.`,
        });
      }
    }

    if (flags.length === 0) {
      flags.push({ severity: 'info', message: 'All your finances look healthy — no flags detected.' });
    }

    res.status(200).json({ flags, overdueInvoices, unpaidInvoices });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to analyze payments.' });
  }
};
