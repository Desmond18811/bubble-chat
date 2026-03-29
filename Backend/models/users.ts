import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  name?: string;
  email?: string;
  phone?: string;
  googleId?: string;
  avatar?: string;
  
  // Real-time and Presence
  isOnline: boolean;
  lastSeen: Date;
  socketId?: string;
  
  // Audio/Video Calling metrics
  zegoToken?: string;
  
  // Contacts App metadata
  uniqueTag?: string;
  bio?: string;
  blog?: string;
  links?: string[];
  sharedResources?: string[]; // optionally save important file URLs passed around
  
  // Auth
  password?: string;
  isVerified: boolean;
  
  // Privacy & Billing
  publicKey?: string; // Stored as base64 string
  isPremium: boolean;



  
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema<IUser> = new Schema(
  {
    name: {
      type: String,
      trim: true,
    },
    // Authentication methods
    email: {
      type: String,
      unique: true,
      sparse: true, // Only unique if the field exists
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    avatar: {
      type: String,
      default: '',
    },
    
    // Status
    isOnline: {
      type: Boolean,
      default: false,
    },
    // Authentication
    password: {
      type: String,
      select: false, // Don't return password by default
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    
    // Privacy & Billing
    publicKey: {
      type: String, // Stringified Base64 Public Key for E2EE
      default: '',
    },
    isPremium: {
      type: Boolean,
      default: false,
    },

    lastSeen: {

      type: Date,
      default: Date.now,
    },
    
    // WebSockets (Socket.IO)
    socketId: {
      type: String,
      default: '',
      // Used to target real-time text messages to this specific user
    },
    
    // ZegoCloud
    zegoToken: {
      type: String,
      default: '',
    },
    
    // Contact Info Page
    uniqueTag: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    bio: {
      type: String,
      default: '',
      maxLength: 500,
    },
    blog: {
      type: String,
      default: '',
    },
    links: [
      {
        type: String,
      }
    ],
    sharedResources: [
      {
        type: String, // could map to Message objectId or string url. URL is easier.
      }
    ]
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model<IUser>('User', UserSchema);
