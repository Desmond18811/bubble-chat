import mongoose, { Document, Schema } from 'mongoose';

export interface IOrgDocument extends Document {
    title: string;
    content: string;
    department: string;
    accessLevel: 'public' | 'restricted' | 'admin';
    createdBy: mongoose.Types.ObjectId;
    pineconeIds: string[]; // IDs of chunks in Pinecone
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
}

const OrgDocumentSchema: Schema<IOrgDocument> = new Schema(
    {
        title: { type: String, required: true, trim: true },
        content: { type: String, required: true },
        department: { type: String, default: 'general', trim: true, lowercase: true },
        accessLevel: {
            type: String,
            enum: ['public', 'restricted', 'admin'],
            default: 'public',
        },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        pineconeIds: [{ type: String }],
        tags: [{ type: String }],
    },
    { timestamps: true }
);

OrgDocumentSchema.index({ department: 1, accessLevel: 1 });
OrgDocumentSchema.index({ title: 'text', content: 'text', tags: 'text' });

export const OrgDocument = mongoose.model<IOrgDocument>('OrgDocument', OrgDocumentSchema);
