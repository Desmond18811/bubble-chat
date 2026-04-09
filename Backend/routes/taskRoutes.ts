import express from 'express';
import { getTasks, createTask, updateTaskStatus, deleteTask } from '../controllers/taskController';
import passport from 'passport';

const router = express.Router();
const requireAuth = passport.authenticate('jwt', { session: false });

router.get('/', requireAuth, getTasks);
router.post('/', requireAuth, createTask);
router.put('/:id', requireAuth, updateTaskStatus);
router.delete('/:id', requireAuth, deleteTask);

export default router;
