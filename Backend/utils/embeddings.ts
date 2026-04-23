import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.HF_API_KEY || '');

// Free embedding model — 384 dimensions, fast
const EMBEDDING_MODEL = 'BAAI/bge-small-en-v1.5';

/**
 * Generate a single embedding vector for a piece of text.
 * Returns an empty array if the HF key is not configured.
 */
export const generateEmbedding = async (text: string): Promise<number[]> => {
    const key = process.env.HF_API_KEY;
    if (!key || key === 'your_hugging_face_api_key_here') return [];

    try {
        const response = await hf.featureExtraction({
            model: EMBEDDING_MODEL,
            inputs: text.trim().substring(0, 8192),
        });

        // featureExtraction can return number[] | number[][] | number[][][]
        if (Array.isArray(response)) {
            // If it's a nested array (batch), take the first element
            if (Array.isArray(response[0])) {
                return response[0] as number[];
            }
            return response as number[];
        }
        return [];
    } catch (err) {
        console.error('[Embeddings] Failed to generate embedding:', err);
        return [];
    }
};

/**
 * Split long text into overlapping chunks suitable for embedding.
 * @param text     Source text
 * @param maxChars Maximum characters per chunk (default 500)
 * @param overlap  Overlap characters between consecutive chunks (default 100)
 */
export const chunkText = (text: string, maxChars = 500, overlap = 100): string[] => {
    const chunks: string[] = [];
    const cleaned = text.replace(/\s+/g, ' ').trim();

    if (cleaned.length <= maxChars) return [cleaned];

    let start = 0;
    while (start < cleaned.length) {
        const end = Math.min(start + maxChars, cleaned.length);
        chunks.push(cleaned.slice(start, end));
        start += maxChars - overlap;
    }
    return chunks;
};

/**
 * Generate embeddings for multiple texts in a single function call.
 * Returns array aligned with the input array — failed embeddings are [].
 */
export const generateEmbeddings = async (texts: string[]): Promise<number[][]> => {
    const results: number[][] = [];
    for (const text of texts) {
        const emb = await generateEmbedding(text);
        results.push(emb);
    }
    return results;
};
