import mongoose, { Document, Schema } from 'mongoose';

export interface IStory extends Document {
  author: mongoose.Types.ObjectId;
  mediaType: 'image' | 'video' | 'audio' | 'text';
  mediaUrl: string;
  textContent?: string;
  createdAt: Date;
  expiresAt: Date;
}

const StorySchema: Schema<IStory> = new Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    mediaType: {
      type: String,
      enum: ['image', 'video', 'audio', 'text'],
      required: true,
    },
    mediaUrl: {
      type: String,
      default: '',
    },
    textContent: {
      type: String,
      default: '',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      // Default to 24 hours from creation
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), 
    },
  },
);

// TTL index to automatically delete expired stories from MongoDB
StorySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Story = mongoose.model<IStory>('Story', StorySchema);
