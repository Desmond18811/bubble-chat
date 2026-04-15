import express from 'express';
import {
  createMeeting,
  getMeetings,
  getMeetingById,
  addTranscriptChunk,
  endMeeting,
  getMeetingActionItems,
} from '../controllers/meetingController';
import passport from 'passport';

const router = express.Router();
const requireAuth = passport.authenticate('jwt', { session: false });

router.use(requireAuth);

router.post('/',                      createMeeting);
router.get('/',                       getMeetings);
router.get('/:id',                    getMeetingById);
router.post('/:id/transcript',        addTranscriptChunk);
router.post('/:id/end',               endMeeting);
router.get('/:id/action-items',       getMeetingActionItems);

export default router;
