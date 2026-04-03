import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  full_name?: string;
  email?: string;
  phone_number?: string;
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
  sharedResources?: string[];
  contacts?: mongoose.Types.ObjectId[];
  
  // Auth
  password?: string;
  isVerified: boolean;
  refreshToken?: string;
  
  // Privacy & Billing
  publicKey?: string; // Stored as base64 string
  privateKey?: string; // Stored securely on backend for simplified E2EE
  isPremium: boolean;



  
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema<IUser> = new Schema(
  {
    full_name: {
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
    phone_number: {
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
    refreshToken: {
      type: String,
      select: false,
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
    privateKey: {
      type: String,
      select: false,
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
        type: String,
      }
    ],
    contacts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      }
    ]
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model<IUser>('User', UserSchema);
