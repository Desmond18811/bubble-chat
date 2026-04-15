import express from 'express';
import {
  chatWithAida,
  getDailyBriefing,
  getFinancialAdvice,
  extractActionItems,
  searchWorkspace,
  scheduleSuggestion,
  summarizeFeed,
  flagPayments,
} from '../controllers/aidaController';
import passport from 'passport';

const router = express.Router();
const requireAuth = passport.authenticate('jwt', { session: false });

// Core conversational endpoints
router.post('/chat',               requireAuth, chatWithAida);
router.get('/daily-briefing',      requireAuth, getDailyBriefing);
router.get('/financial-advice',    requireAuth, getFinancialAdvice);

// Agentic action endpoints
router.post('/extract-action-items', requireAuth, extractActionItems);
router.post('/search-workspace',     requireAuth, searchWorkspace);
router.post('/schedule-suggestion',  requireAuth, scheduleSuggestion);
router.post('/summarize-feed',       requireAuth, summarizeFeed);
router.get('/flag-payments',         requireAuth, flagPayments);

export default router;

