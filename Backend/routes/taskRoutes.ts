import express from 'express';
import { getTasks, createTask, updateTask, snoozeTask, deleteTask, clearAllTasks } from '../controllers/taskController';
import passport from 'passport';

const router = express.Router();
const requireAuth = passport.authenticate('jwt', { session: false });

router.get('/', requireAuth, getTasks);
router.post('/', requireAuth, createTask);
router.put('/:id', requireAuth, updateTask);
router.put('/:id/snooze', requireAuth, snoozeTask);
router.delete('/all', requireAuth, clearAllTasks);
router.delete('/:id', requireAuth, deleteTask);

export default router;

