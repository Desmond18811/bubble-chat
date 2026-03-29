import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  sender: mongoose.Types.ObjectId;
  content: string; // Used for text or captions
  chat: mongoose.Types.ObjectId;
  readBy: mongoose.Types.ObjectId[];
  
  // High-Quality File Storage Support
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'voice' | 'file';
  fileSize?: number;

  // Privacy
  isBurnAfterReading: boolean;
  expiresAt?: Date;

  createdAt: Date;

  updatedAt: Date;
}

const MessageSchema: Schema<IMessage> = new Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      trim: true,
      default: '', 
    },
    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    // High-Quality Asset storage link
    mediaUrl: {
      type: String,
    },
    mediaType: {
      type: String,
      enum: ['image', 'video', 'voice', 'file'],
    },
    fileSize: {
      type: Number, // Stored in bytes for quick frontend restrictions rendering 
    },
    
    // Privacy Logic Additions
    isBurnAfterReading: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      index: { expires: 0 }, // MongoDB TTL Index: Document deletes when Date hits expiresAt
    }
  },

  {
    timestamps: true,
  }
);

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
