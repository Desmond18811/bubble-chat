import { Request, Response } from 'express';
import { Task } from '../models/task';

export const getTasks = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user?._id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const tasks = await Task.find({ user_id: userId }).sort({ start_time: 1 });
    res.status(200).json({ tasks });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to fetch tasks', error: err.message });
  }
};

export const createTask = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user?._id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { title, description, start_time, end_time, status } = req.body;
    
    const task = await Task.create({
      user_id: userId,
      title,
      description,
      start_time,
      end_time,
      status: status || 'todo'
    });

    res.status(201).json({ message: 'Task created successfully', task });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to create task', error: err.message });
  }
};

export const updateTaskStatus = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user?._id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { id } = req.params;
    const { status } = req.body;

    const task = await Task.findOneAndUpdate(
      { _id: id, user_id: userId },
      { status },
      { new: true }
    );

    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.status(200).json({ message: 'Task updated', task });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to update task', error: err.message });
  }
};

export const deleteTask = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user?._id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { id } = req.params;
    
    const task = await Task.findOneAndDelete({ _id: id, user_id: userId });
    if (!task) return res.status(404).json({ message: 'Task not found' });

    res.status(200).json({ message: 'Task deleted' });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to delete task', error: err.message });
  }
};
