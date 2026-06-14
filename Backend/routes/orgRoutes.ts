import express from 'express';
import {
  ingestDocument,
  listDocuments,
  deleteDocument,
  joinOrganizationByInvite,
  onboardOrgBrain,
  getOrgInviteCode,
  updateOrgProfile,
  getOrgMembers,
  getOrgTranscripts
} from '../controllers/orgController';
import passport from 'passport';

const router = express.Router();
const requireAuth = passport.authenticate('jwt', { session: false });

// Org knowledge base
router.post('/documents', requireAuth, ingestDocument);
router.get('/documents', requireAuth, listDocuments);
router.delete('/documents/:id', requireAuth, deleteDocument);
router.post('/join', requireAuth, joinOrganizationByInvite);
router.post('/brain/onboard', requireAuth, onboardOrgBrain);
router.get('/invite-code', requireAuth, getOrgInviteCode);
router.put('/profile', requireAuth, updateOrgProfile);
router.get('/members', requireAuth, getOrgMembers);
router.get('/transcripts', requireAuth, getOrgTranscripts);

export default router;
