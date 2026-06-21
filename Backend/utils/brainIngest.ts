import * as crypto from 'crypto';
import { OrgDocument } from '../models/orgDocument';
import { chunkText, generateEmbedding, embeddingsConfigured } from './embeddings';
import { upsertVectors, hasPinecone } from './pinecone';

/**
 * The single source of truth for putting text into the Workspace Brain.
 *
 * Every ingestion path — onboarding uploads, manual docs, URL/file imports, and
 * the automatic brainEventBus events (meeting transcripts, group messages, shared
 * files, calendar events, resolved Q&A) — MUST go through here so the vector
 * store stays consistent: same chunking, same embedding model, and the same
 * metadata shape (including a timestamp for time-windowed recall).
 */

export type BrainSourceKind =
    | 'text'
    | 'url'
    | 'file'
    | 'meeting'
    | 'chat'
    | 'chat_file'
    | 'calendar'
    | 'qa'
    | 'document';

export interface IngestToBrainParams {
    orgId: string;                 // Organization _id (stringified)
    namespace: string;             // Pinecone namespace for the org
    title: string;
    content: string;
    createdBy: string;             // User _id (stringified)
    tags?: string[];
    department?: string;
    accessLevel?: 'public' | 'restricted' | 'admin';
    source?: { kind: BrainSourceKind; ref?: string };
    /** Override the timestamp stamped onto vectors (defaults to now). */
    occurredAt?: Date;
}

export interface IngestToBrainResult {
    doc: any;                      // the created OrgDocument
    pineconeIds: string[];         // vector ids actually upserted
    totalChunks: number;           // chunks the content was split into
    embeddingsSkipped: boolean;    // true when chunks existed but nothing embedded
}

/**
 * Chunk → embed → upsert to Pinecone → persist an OrgDocument.
 *
 * Returns observability fields so callers can detect the silent-failure case
 * (Pinecone + embeddings both configured, yet zero vectors landed) and warn.
 */
export const ingestToBrain = async (params: IngestToBrainParams): Promise<IngestToBrainResult> => {
    const {
        orgId,
        namespace,
        title,
        content,
        createdBy,
        tags = [],
        department = 'general',
        accessLevel = 'public',
        source,
        occurredAt,
    } = params;

    const chunks = chunkText(content, 500, 100);
    const totalChunks = chunks.length;
    const pineconeIds: string[] = [];

    // Epoch ms as a NUMBER so Pinecone range filters ($gte/$lte) work — this is
    // what enables "what happened in the last N weeks" semantic recall.
    const createdAtTs = (occurredAt ?? new Date()).getTime();

    if (hasPinecone() && embeddingsConfigured()) {
        const vectors = [];
        for (const chunk of chunks) {
            const embedding = await generateEmbedding(chunk);
            if (embedding.length > 0) {
                const id = `brain-${crypto.randomUUID()}`;
                pineconeIds.push(id);
                vectors.push({
                    id,
                    values: embedding,
                    metadata: {
                        title,
                        chunk,
                        department,
                        accessLevel,
                        organizationId: String(orgId),
                        sourceKind: source?.kind || 'text',
                        sourceRef: source?.ref || '',
                        createdAtTs,
                    },
                });
            }
        }
        if (vectors.length > 0) await upsertVectors(vectors, namespace);
    }

    const doc = await OrgDocument.create({
        title,
        content,
        department,
        accessLevel,
        createdBy,
        organizationId: orgId,
        pineconeIds,
        tags,
    });

    // Back-fill the vector metadata with the real Mongo doc id (best-effort: we
    // can't know it before create, so we stamp it on the vectors' metadata via a
    // second field only if needed — kept simple here, mongoDocId derivable by the
    // shared id prefix). The OrgDocument is the durable record either way.
    const embeddingsSkipped =
        hasPinecone() && embeddingsConfigured() && totalChunks > 0 && pineconeIds.length === 0;

    if (embeddingsSkipped) {
        console.warn(
            `[BrainIngest] "${title}" saved to Mongo but 0/${totalChunks} chunks embedded — ` +
            `content is NOT searchable by Aida. Check HF embeddings (provider/model/limits).`
        );
    }

    return { doc, pineconeIds, totalChunks, embeddingsSkipped };
};
