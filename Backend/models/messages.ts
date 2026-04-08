import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  sender: mongoose.Types.ObjectId;
  content: string; // Used for text or captions
  chat: mongoose.Types.ObjectId;
  readBy: mongoose.Types.ObjectId[];
  
  // Rich Messaging Metadata
  message_type: 'text' | 'image' | 'video' | 'voice' | 'file' | 'location' | 'contact' | 'system';
  parent_message?: mongoose.Types.ObjectId; // For replies/threading
  is_forwarded: boolean;
  is_announcement: boolean;
  is_encrypted: boolean;
  is_pinned: boolean;
  client_id?: string; // For idempotency
  
  // Interaction & History
  reactions: {
    user: mongoose.Types.ObjectId;
    emoji: string;
    timestamp: Date;
  }[];
  edit_history: {
    content: string;
    editedAt: Date;
  }[];
  mentions: mongoose.Types.ObjectId[];

  // Media & Assets
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'voice' | 'file'; // Legacy/helper
  fileSize?: number;
  media_metadata?: {
    width?: number;
    height?: number;
    duration?: number; // for audio/video
    mime_type?: string;
    quality?: 'sd' | 'hd';
  };
  
  // Location specific
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
    name?: string;
  };

  // Privacy
  isBurnAfterReading: boolean;
  expiresAt?: Date;

  // Soft-delete per user ("delete for me" hides from that user only)
  deletedFor?: mongoose.Types.ObjectId[];

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
    
    // Type & Threading
    message_type: {
      type: String,
      enum: ['text', 'image', 'video', 'voice', 'file', 'location', 'contact', 'system', 'sticker'],
      default: 'text',
    },
    parent_message: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
    is_forwarded: { type: Boolean, default: false },
    is_announcement: { type: Boolean, default: false },
    is_encrypted: { type: Boolean, default: false },
    is_pinned: { type: Boolean, default: false },
    client_id: { type: String },

    // Interactions
    reactions: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        emoji: { type: String },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    edit_history: [
      {
        content: { type: String },
        editedAt: { type: Date, default: Date.now },
      },
    ],
    mentions: [
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
      type: Number,
    },
    media_metadata: {
      width: { type: Number },
      height: { type: Number },
      duration: { type: Number },
      mime_type: { type: String },
      quality: { type: String, enum: ['sd', 'hd'], default: 'sd' },
    },
    
    // Location
    location: {
      latitude: { type: Number },
      longitude: { type: Number },
      address: { type: String },
      name: { type: String },
    },
    
    // Privacy Logic
    isBurnAfterReading: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      index: { expires: 0 },
    },

    // Soft-delete: users who chose "delete for me"
    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },

  {
    timestamps: true,
  }
);

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
