import { Request, Response } from 'express';
import { OrgDocument } from '../models/orgDocument';
import { Organization } from '../models/organizations';
import { User } from '../models/users';
import { chunkText, generateEmbedding } from '../utils/embeddings';
import { upsertVectors, deleteVectors, hasPinecone } from '../utils/pinecone';
import * as crypto from 'crypto';

export interface AuthRequest extends Request {
    user?: any;
}

/**
 * POST /api/v1/org/documents
 * Ingest a company document: save to MongoDB + chunk → embed → upsert to Pinecone
 */
export const ingestDocument = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { title, content, department = 'general', accessLevel = 'public', tags = [], organizationId } = req.body;
        const userId = (req.user as any)?._id;
        const orgId = organizationId || (req.user as any)?.organizationId; // Try to get from body or user context

        if (!title || !content) {
            res.status(400).json({ error: 'title and content are required' });
            return;
        }

        const chunks = chunkText(content, 500, 100);
        const pineconeIds: string[] = [];

        if (hasPinecone()) {
            const vectors = [];
            for (const chunk of chunks) {
                const embedding = await generateEmbedding(chunk);
                if (embedding.length > 0) {
                    const id = `org-${crypto.randomUUID()}`;
                    pineconeIds.push(id);
                    vectors.push({
                        id,
                        values: embedding,
                        metadata: { title, chunk, department, accessLevel },
                    });
                }
            }
            if (vectors.length > 0) await upsertVectors(vectors);
        }

        const doc = await OrgDocument.create({
            title,
            content,
            department,
            accessLevel,
            createdBy: userId,
            organizationId: orgId,
            pineconeIds,
            tags,
        });

        res.status(201).json({
            message: `Document ingested. ${pineconeIds.length} chunk(s) embedded into Pinecone.`,
            document: doc,
            embeddedChunks: pineconeIds.length,
            pineconeEnabled: hasPinecone(),
        });
    } catch (error: any) {
        console.error('[OrgController] Ingest error:', error);
        res.status(500).json({ error: 'Failed to ingest document.' });
    }
};

/**
 * GET /api/v1/org/documents
 * List all org documents (admin: all; others: public only for their dept)
 */
export const listDocuments = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const user = req.user as any;
        const filter: any = {};

        // Non-admins see only public docs
        if (!user?.is_bot && user?.role !== 'admin') {
            filter.accessLevel = 'public';
        }

        const docs = await OrgDocument.find(filter)
            .select('title department accessLevel tags createdAt')
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json({ documents: docs, count: docs.length });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to list documents.' });
    }
};

/**
 * DELETE /api/v1/org/documents/:id
 */
export const deleteDocument = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const doc = await OrgDocument.findById(req.params.id);
        if (!doc) { res.status(404).json({ error: 'Document not found' }); return; }

        if (doc.pineconeIds.length > 0) await deleteVectors(doc.pineconeIds);
        await doc.deleteOne();

        res.status(200).json({ message: 'Document deleted.' });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to delete document.' });
    }
};

/**
 * Seed basic organization knowledge into Pinecone
 * (Simulated AI enrichment for now)
 */
export const seedOrgKnowledge = async (org: any, ownerId: string) => {
    try {
        const title = `About ${org.name}`;
        const content = `Organization Name: ${org.name}\nIndustry: ${org.industry || 'Unknown'}\nSize: ${org.size || 'Unknown'}\nMission: To lead in ${org.industry || 'the business world'}.\nValues: Innovation, Collaboration, and Transparency.`;

        const chunks = chunkText(content, 500, 100);
        const pineconeIds: string[] = [];

        if (hasPinecone()) {
            const vectors = [];
            for (const chunk of chunks) {
                const embedding = await generateEmbedding(chunk);
                if (embedding.length > 0) {
                    const id = `org-seed-${crypto.randomUUID()}`;
                    pineconeIds.push(id);
                    vectors.push({
                        id,
                        values: embedding,
                        metadata: { title, chunk, department: 'general', accessLevel: 'public', organizationId: org._id },
                    });
                }
            }
            if (vectors.length > 0) await upsertVectors(vectors);
        }

        await OrgDocument.create({
            title,
            content,
            department: 'general',
            accessLevel: 'public',
            createdBy: ownerId,
            organizationId: org._id,
            pineconeIds,
            tags: ['seed', 'about', org.name.toLowerCase()],
        });

        console.log(`[OrgController] Seed knowledge created for ${org.name}`);
    } catch (error) {
        console.error('[OrgController] Seeding error:', error);
    }
};

/**
 * Join an organization using an invite code
 * POST /api/v1/org/join
 */
export const joinOrganizationByInvite = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { inviteCode } = req.body;
        const userId = (req.user as any)?._id;

        if (!inviteCode) {
            res.status(400).json({ error: 'Invite code is required' });
            return;
        }

        const org = await Organization.findOne({ inviteCode });
        if (!org) {
            res.status(404).json({ error: 'Invalid invite code.' });
            return;
        }

        // Logic for email domain verification could be added here if needed
        // For now, link user to org
        await User.findByIdAndUpdate(userId, {
            organization: org.name,
            org_industry: org.industry,
            role: 'employee',
        });

        res.status(200).json({
            message: `Successfully joined ${org.name}!`,
            organization: org,
        });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to join organization.' });
    }
};
