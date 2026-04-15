import mongoose, { Document, Schema } from 'mongoose';

export interface IActionItem {
  _id?: mongoose.Types.ObjectId;
  text: string;
  assignedTo?: mongoose.Types.ObjectId;
  assignedToName?: string;
  deadline?: Date;
  status: 'pending' | 'done';
  taskRef?: mongoose.Types.ObjectId; // linked Task._id once synced to Calendar
}

export interface IMeeting extends Document {
  roomId: string;
  title: string;
  host: mongoose.Types.ObjectId;
  attendees: mongoose.Types.ObjectId[];
  attendeeNames?: string[];

  // Call metadata
  type: 'video' | 'voice' | 'group';
  startedAt: Date;
  endedAt?: Date;
  duration?: number; // seconds

  // Transcript & Intelligence
  transcriptRaw?: string;
  transcriptChunks?: { speaker?: string; text: string; timestamp?: number }[];
  summary?: string;
  actionItems: IActionItem[];
  filesShared?: string[]; // workspace file IDs mentioned in meeting

  // Status
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';

  createdAt: Date;
  updatedAt: Date;
}

const ActionItemSchema = new Schema<IActionItem>(
  {
    text:            { type: String, required: true },
    assignedTo:      { type: Schema.Types.ObjectId, ref: 'User' },
    assignedToName:  { type: String },
    deadline:        { type: Date },
    status:          { type: String, enum: ['pending', 'done'], default: 'pending' },
    taskRef:         { type: Schema.Types.ObjectId, ref: 'Task' },
  },
  { _id: true }
);

const MeetingSchema = new Schema<IMeeting>(
  {
    roomId:        { type: String, required: true, index: true },
    title:         { type: String, default: 'Untitled Meeting' },
    host:          { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    attendees:     [{ type: Schema.Types.ObjectId, ref: 'User' }],
    attendeeNames: [{ type: String }],

    type: { type: String, enum: ['video', 'voice', 'group'], default: 'video' },
    startedAt: { type: Date, default: Date.now },
    endedAt:   { type: Date },
    duration:  { type: Number },

    transcriptRaw:    { type: String },
    transcriptChunks: [
      {
        speaker:   { type: String },
        text:      { type: String },
        timestamp: { type: Number },
      },
    ],
    summary:     { type: String },
    actionItems: [ActionItemSchema],
    filesShared: [{ type: String }],

    status: {
      type: String,
      enum: ['scheduled', 'live', 'ended', 'cancelled'],
      default: 'live',
    },
  },
  { timestamps: true }
);

MeetingSchema.index({ host: 1, createdAt: -1 });
MeetingSchema.index({ attendees: 1, createdAt: -1 });

export const Meeting = mongoose.model<IMeeting>('Meeting', MeetingSchema);
