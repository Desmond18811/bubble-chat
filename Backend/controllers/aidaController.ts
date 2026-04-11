import { Request, Response } from 'express';
import { HfInference } from '@huggingface/inference';
import { Task } from '../models/task';
import { Transaction } from '../models/transaction';

const hf = new HfInference(process.env.HF_API_KEY || '');
const modelId = process.env.GEMMA_MODEL_ID || 'google/gemma-2-9b-it';

/**
 * Handle a general chat message with Aida context.
 */
export const chatWithAida = async (req: Request, res: Response): Promise<void> => {
  try {
    const { message } = req.body;
    const userId = (req.user as any)?._id; // Assuming JWT user

    if (!message) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    const prompt = `You are Aida, a helpful AI assistant built on Gemma. \nUser: ${message}\nAida:`;

    const response = await hf.textGeneration({
      model: modelId,
      inputs: prompt,
      parameters: {
        max_new_tokens: 300,
        temperature: 0.7,
      },
    });

    const reply = response.generated_text.replace(prompt, '').trim();

    res.status(200).json({ reply });
  } catch (error: any) {
    console.error('Aida Chat Error:', error);
    res.status(500).json({ error: 'Error processing your request with Aida.' });
  }
};

/**
 * Get Aida to analyze today's calendar and give a briefing.
 */
export const getDailyBriefing = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.user as any)._id;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const todayTasks = await Task.find({
      user_id: userId,
      start_time: { $gte: startOfDay, $lte: endOfDay },
    });

    if (todayTasks.length === 0) {
      res.status(200).json({ reply: "You don't have any tasks scheduled for today. Enjoy your day or add some new goals!" });
      return;
    }

    const taskSummaries = todayTasks.map(t => `- ${t.title} at ${t.start_time.toLocaleTimeString()}`).join('\n');

    const prompt = `You are Aida, a helpful AI. Please summarize the following daily schedule for your user into a friendly daily briefing:
Tasks:
${taskSummaries}

Briefing:`;

    const response = await hf.textGeneration({
      model: modelId,
      inputs: prompt,
      parameters: {
        max_new_tokens: 200,
        temperature: 0.6,
      },
    });

    const reply = response.generated_text.replace(prompt, '').trim();

    res.status(200).json({ reply, tasks: todayTasks });
  } catch (error: any) {
    console.error('Aida Briefing Error:', error);
    res.status(500).json({ error: 'Error getting daily briefing.' });
  }
};

/**
 * Financial Advice based on recent transactions or savings goals.
 */
export const getFinancialAdvice = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.user as any)._id;

    // Get last 10 transactions
    const recentTransactions = await Transaction.find({ user_id: userId }).sort({ createdAt: -1 }).limit(10);
    
    // Create an input string
    const tStrings = recentTransactions.map(t => `${t.type}: ${t.amount/100} ${t.currency}`).join('\n');
    let promptInfo = tStrings;

    if (!promptInfo) {
      promptInfo = "No recent transactions found.";
    }

    const prompt = `You are Aida, a financial advisor AI. The user has the following recent transactions:\n${promptInfo}\nProvide a short, helpful financial advice or spending summary based on this:`;

    const response = await hf.textGeneration({
      model: modelId,
      inputs: prompt,
      parameters: {
        max_new_tokens: 250,
        temperature: 0.5,
      },
    });

    const reply = response.generated_text.replace(prompt, '').trim();

    res.status(200).json({ reply });
  } catch (error: any) {
    console.error('Aida Finance Error:', error);
    res.status(500).json({ error: 'Error getting financial advice.' });
  }
};
