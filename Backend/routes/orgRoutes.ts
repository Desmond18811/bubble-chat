import express from 'express';
import { ingestDocument, listDocuments, deleteDocument, joinOrganizationByInvite, onboardOrgBrain, getOrgInviteCode } from '../controllers/orgController';
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

export default router;
