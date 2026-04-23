import { Request, Response } from 'express';
import { OrgDocument } from '../models/orgDocument';
import { chunkText, generateEmbedding } from '../utils/embeddings';
import { upsertVectors, deleteVectors, hasPinecone } from '../utils/pinecone';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/v1/org/documents
 * Ingest a company document: save to MongoDB + chunk → embed → upsert to Pinecone
 */
export const ingestDocument = async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, content, department = 'general', accessLevel = 'public', tags = [] } = req.body;
        const userId = (req.user as any)?._id;

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
                    const id = `org-${uuidv4()}`;
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
export const listDocuments = async (req: Request, res: Response): Promise<void> => {
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
export const deleteDocument = async (req: Request, res: Response): Promise<void> => {
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
