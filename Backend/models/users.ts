import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  full_name?: string;
  username?: string;
  email?: string;
  phone_number?: string;
  googleId?: string;
  avatar?: string;

  // High-Detail Identity
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  date_of_birth?: Date;
  status_message?: string;
  mood_emoji?: string;
  hobbies?: string[];
  location?: {
    city?: string;
    country?: string;
    timezone?: string;
  };

  // Real-time and Presence
  isOnline: boolean;
  lastSeen: Date;
  last_active_at?: Date;
  socketId?: string;

  // Audio/Video Calling
  zegoToken?: string;

  // Social/Identity metadata
  uniqueTag?: string;
  bio?: string;
  blog?: string;
  links?: string[];
  sharedResources?: string[];
  contacts?: mongoose.Types.ObjectId[];
  blocked_users?: mongoose.Types.ObjectId[];
  followers?: mongoose.Types.ObjectId[];
  following?: mongoose.Types.ObjectId[];

  // Posts (references to Post model)
  posts?: mongoose.Types.ObjectId[];
  postsCount?: number;

  // Verification/Status flags
  isVerified: boolean;
  isPremium: boolean;
  is_bot: boolean;
  verified_badge: boolean;
  role?: 'employee' | 'admin' | 'HR';

  // Organizational Identity
  organization?: string;
  org_role?: string;
  org_industry?: string;
  org_size?: 'solo' | '2-10' | '11-50' | '51-200' | '201-500' | '500+';
  onboardingComplete?: boolean;
  app_background?: 'bubbles' | 'light' | 'dark' | 'custom' | 'glass';
  custom_background?: string;
  unreadCount?: number;

  // Auth
  password?: string;
  refreshToken?: string;

  // E2EE
  publicKey?: string;
  privateKey?: string;

  // Settings
  notification_settings?: {
    muted?: boolean;
    preview?: boolean;
    sounds?: boolean;
  };
  privacy_settings?: {
    profile_photo?: 'everyone' | 'contacts' | 'nobody';
    last_seen?: 'everyone' | 'contacts' | 'nobody';
    read_receipts?: boolean;
    show_online_status?: boolean;
    email_notifications?: boolean;
  };

  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema<IUser> = new Schema(
  {
    full_name: { type: String, trim: true },
    username: { type: String, unique: true, sparse: true, trim: true, lowercase: true },
    email: { type: String, unique: true, sparse: true, trim: true, lowercase: true },
    phone_number: { type: String, unique: true, sparse: true, trim: true },
    googleId: { type: String, unique: true, sparse: true },
    avatar: { type: String, default: '' },

    gender: { type: String, enum: ['male', 'female', 'other', 'prefer_not_to_say'] },
    date_of_birth: { type: Date },
    status_message: { type: String, default: '', maxLength: 150 },
    mood_emoji: { type: String, default: '' },
    hobbies: [{ type: String }],
    location: {
      city: { type: String, default: '' },
      country: { type: String, default: '' },
      timezone: { type: String, default: 'UTC' },
    },

    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },
    last_active_at: { type: Date, default: Date.now },

    password: { type: String, select: false },
    refreshToken: { type: String, select: false },

    isVerified: { type: Boolean, default: false },

    publicKey: { type: String, default: '' },
    privateKey: { type: String, select: false },

    isPremium: { type: Boolean, default: false },
    is_bot: { type: Boolean, default: false },
    verified_badge: { type: Boolean, default: false },
    role: { type: String, enum: ['employee', 'admin', 'HR'], default: 'employee' },

    // Organizational Identity
    organization: { type: String, trim: true, default: '' },
    org_role: { type: String, trim: true, default: '' },
    org_industry: { type: String, trim: true, default: '' },
    org_size: { type: String, enum: ['solo', '2-10', '11-50', '51-200', '201-500', '500+'] },
    onboardingComplete: { type: Boolean, default: false },
    app_background: {
      type: String,
      enum: ['bubbles', 'light', 'dark', 'custom', 'glass'],
      default: 'bubbles'
    },
    custom_background: { type: String, default: '' },

    notification_settings: {
      muted: { type: Boolean, default: false },
      preview: { type: Boolean, default: true },
      sounds: { type: Boolean, default: true },
    },
    privacy_settings: {
      profile_photo: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'everyone' },
      last_seen: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'everyone' },
      read_receipts: { type: Boolean, default: true },
      show_online_status: { type: Boolean, default: true },
      email_notifications: { type: Boolean, default: true },
    },

    socketId: { type: String, default: '' },
    zegoToken: { type: String, default: '' },

    uniqueTag: { type: String, unique: true, sparse: true, trim: true },
    bio: { type: String, default: '', maxLength: 500 },
    blog: { type: String, default: '' },
    links: [{ type: String }],
    sharedResources: [{ type: String }],

    contacts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    blocked_users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // Posts references
    posts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
    postsCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', UserSchema);
