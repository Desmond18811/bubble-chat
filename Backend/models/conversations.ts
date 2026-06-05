import mongoose, { Document, Schema } from 'mongoose';

export interface IConversation extends Document {
  chatName: string;
  isGroupChat: boolean;
  users: mongoose.Types.ObjectId[];
  latestMessage?: mongoose.Types.ObjectId;
  groupAdmin?: mongoose.Types.ObjectId;
  
  // Group Metadata
  groupIcon?: string;
  groupDescription?: string;
  pinnedMessages: mongoose.Types.ObjectId[];
  
  // User-specific states
  mutedBy: mongoose.Types.ObjectId[];
  archivedBy: mongoose.Types.ObjectId[];
  deletedBy: mongoose.Types.ObjectId[]; // Users who deleted this chat locally
  pinnedBy: mongoose.Types.ObjectId[]; // Users who pinned this chat locally
  
  // Advanced Features
  ephemeralSettings: {
    isEnabled: boolean;
    duration: number; // in seconds
  };
  theme?: string;
  is_broadcast: boolean;
  organizationId?: mongoose.Types.ObjectId;
  isDefaultOrgChat?: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema: Schema<IConversation> = new Schema(
  {
    chatName: { type: String, trim: true, default: 'sender' },
    isGroupChat: { type: Boolean, default: false },
    users: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    latestMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
    groupAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    
    // Group Metadata
    groupIcon: { type: String, default: '' },
    groupDescription: { type: String, default: '' },
    pinnedMessages: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
      },
    ],
    
    // User Contexts
    mutedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    archivedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    deletedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    pinnedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    
    // Feature Sets
    ephemeralSettings: {
      isEnabled: { type: Boolean, default: false },
      duration: { type: Number, default: 0 }, // 0 means infinite until manually deleted
    },
    theme: { type: String, default: 'default' },
    is_broadcast: { type: Boolean, default: false },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
    isDefaultOrgChat: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const Conversation = mongoose.model<IConversation>('Conversation', ConversationSchema);
