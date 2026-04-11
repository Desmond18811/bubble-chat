import express from 'express';
import { chatWithAida, getDailyBriefing, getFinancialAdvice } from '../controllers/aidaController';
import passport from 'passport';

const router = express.Router();
const requireAuth = passport.authenticate('jwt', { session: false });

router.post('/chat', requireAuth, chatWithAida);
router.get('/daily-briefing', requireAuth, getDailyBriefing);
router.get('/financial-advice', requireAuth, getFinancialAdvice);

export default router;
