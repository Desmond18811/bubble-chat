import mongoose, { Document, Schema } from 'mongoose';

export interface IPushToken extends Document {
  userId: mongoose.Types.ObjectId;
  token: string;
  deviceType: string;
  createdAt: Date;
  updatedAt: Date;
}

const PushTokenSchema: Schema<IPushToken> = new Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    token: { type: String, required: true, unique: true },
    deviceType: { type: String, default: 'unknown' },
  },
  { timestamps: true }
);

export const PushToken = mongoose.model<IPushToken>('PushToken', PushTokenSchema);
