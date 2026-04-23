import express from 'express';
import { ingestDocument, listDocuments, deleteDocument } from '../controllers/orgController';
import passport from 'passport';

const router = express.Router();
const requireAuth = passport.authenticate('jwt', { session: false });

// Org knowledge base
router.post('/documents', requireAuth, ingestDocument);
router.get('/documents', requireAuth, listDocuments);
router.delete('/documents/:id', requireAuth, deleteDocument);

export default router;
