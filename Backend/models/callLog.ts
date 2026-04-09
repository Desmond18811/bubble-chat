import mongoose, { Schema, Document } from 'mongoose';

export interface ICallLog extends Document {
  user: mongoose.Types.ObjectId;
  roomId: string;
  type: 'voice' | 'video';
  label: string;
  timestamp: Date;
  duration?: number;
  missed: boolean;
}

const CallLogSchema = new Schema<ICallLog>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    roomId: { type: String, required: true },
    type: { type: String, enum: ['voice', 'video'], required: true },
    label: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now },
    duration: { type: Number },
    missed: { type: Boolean, default: false },
  },
  { timestamps: false }
);

export default mongoose.model<ICallLog>('CallLog', CallLogSchema);
