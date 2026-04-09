import mongoose, { Document, Schema } from 'mongoose';

export interface ITask extends Document {
  user_id: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  start_time: Date;
  end_time: Date;
  status: 'todo' | 'in-progress' | 'done';
}

const TaskSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String },
    start_time: { type: Date, required: true },
    end_time: { type: Date, required: true },
    status: { type: String, enum: ['todo', 'in-progress', 'done'], default: 'todo' },
  },
  { timestamps: true }
);

export const Task = mongoose.model<ITask>('Task', TaskSchema);
