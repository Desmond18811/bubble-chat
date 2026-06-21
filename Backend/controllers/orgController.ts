import { Request, Response } from 'express';
import { OrgDocument } from '../models/orgDocument';
import { Organization } from '../models/organizations';
import { User } from '../models/users';
import { chunkText, generateEmbedding } from '../utils/embeddings';
import { upsertVectors, deleteVectors, hasPinecone } from '../utils/pinecone';
import * as crypto from 'crypto';
import { Conversation } from '../models/conversations';
import { Message } from '../models/messages';
import { sendWelcomeNewMemberEmail } from '../utils/mailer';
import { getAidaBotUser } from './aidaController';
import { Meeting } from '../models/meeting';
import OpenAI from 'openai';

const deepseekClient = new OpenAI({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY || '',
});

export interface AuthRequest extends Request {
    user?: any;
}

/**
 * Idempotently ensure the founder of an organization has an Organization document.
 * Created on demand when a `signupKind: 'organization'` admin reaches onboarding
 * without having gone through the legacy register-time org-creation path (e.g. the
 * seed user, an OAuth signup that picked "organization" later, or any flow that
 * collects the org name during profile setup instead of at register).
 *
 * Returns the org (existing or newly created), or null if the user isn't a founder
 * or doesn't yet have an organization name to anchor the create on.
 */
export const ensureOrganizationForFounder = async (userId: any) => {
    // 1. Existing org by ownership.
    let org = await Organization.findOne({ owner: userId });
    if (org) return org;

    const user = await User.findById(userId);
    if (!user) return null;

    // 2. Existing org matched by the user's "organization" string field.
    if (user.organization) {
        org = await Organization.findOne({ name: user.organization });
        if (org) return org;
    }

    // 3. Auto-create only for org founders (signupKind=organization + admin role)
    // who have provided an org name. Skips individuals and invited employees.
    const isFounder = user.signupKind === 'organization' && user.role === 'admin' && !!user.organization;
    if (!isFounder) return null;

    // Defensive: only forward `size` if it matches the Organization enum.
    // An empty string or stale legacy value would otherwise throw a Mongoose
    // ValidationError at create time and surface as a generic 500.
    const VALID_SIZES = ['solo', '2-10', '11-50', '51-200', '201-500', '500+'];
    const safeSize = VALID_SIZES.includes(user.org_size as any) ? user.org_size : undefined;

    const inviteCode = crypto.randomBytes(16).toString('hex').toUpperCase();
    org = await Organization.create({
        name: user.organization,
        industry: user.org_industry || undefined,
        size: safeSize,
        owner: userId,
        inviteCode,
        pineconeNamespace: `org-${userId}`,
    });

    // Canonical org reference on the user.
    await User.findByIdAndUpdate(userId, { organizationId: org._id });

    // Default group chat with the Aida bot — same shape as the register flow.
    try {
        const existingChat = await Conversation.findOne({
            organizationId: org._id,
            isDefaultOrgChat: true,
        });
        if (!existingChat) {
            const bot = await getAidaBotUser();
            const botId = bot ? bot._id : null;
            const defaultChat = await Conversation.create({
                chatName: org.name,
                isGroupChat: true,
                users: botId ? [userId, botId] : [userId],
                groupAdmin: userId,
                groupIcon: 'black',
                groupDescription: `Default group chat for ${org.name}`,
                organizationId: org._id,
                isDefaultOrgChat: true,
            });
            if (botId) {
                const welcomeContent = `👋 **Welcome to the ${org.name} Workspace on Bubble!**\n\nI am **Aida**, your workspace intelligence assistant. I will automatically index shared resources and meeting transcripts to grow our collective business brain.\n\nAll members who join will automatically be added to this default group chat. Feel free to collaborate, share documents, schedule calls, and ask me anything!`;
                const initialMsg = await Message.create({
                    chat: defaultChat._id,
                    sender: botId,
                    content: welcomeContent,
                    message_type: 'text',
                });
                defaultChat.latestMessage = (initialMsg as any)._id;
                await defaultChat.save();
            }
        }
    } catch (chatErr) {
        // Group chat creation is best-effort — the org itself is the contract.
        console.error('[ensureOrganizationForFounder] default chat init failed:', chatErr);
    }

    return org;
};

/**
 * Shared core: persist + embed an extracted body of text as an OrgDocument.
 * Used by ingestDocument, ingestDocumentFromUrl, and ingestDocumentFromFile.
 */
const persistOrgDocument = async (params: {
    userId: any;
    title: string;
    content: string;
    department?: string;
    accessLevel?: string;
    tags?: string[];
    organizationId?: any;
    source?: { kind: 'text' | 'url' | 'file'; ref?: string };
}) => {
    const {
        userId,
        title,
        content,
        department = 'general',
        accessLevel = 'public',
        tags = [],
        organizationId,
        source,
    } = params;

    // Locate the user's org via explicit id, ownership, or org-name fallback.
    let org = null;
    if (organizationId) org = await Organization.findById(organizationId);
    if (!org) org = await Organization.findOne({ owner: userId });
    if (!org) {
        const user = await User.findById(userId);
        if (user && user.organization) org = await Organization.findOne({ name: user.organization });
    }

    const orgId = org ? org._id : undefined;
    const namespace = org ? (org.pineconeNamespace || `org-${org._id}`) : undefined;

    const chunks = chunkText(content, 500, 100);
    const pineconeIds: string[] = [];

    if (hasPinecone() && namespace) {
        const vectors = [];
        for (const chunk of chunks) {
            const embedding = await generateEmbedding(chunk);
            if (embedding.length > 0) {
                const id = `org-${crypto.randomUUID()}`;
                pineconeIds.push(id);
                vectors.push({
                    id,
                    values: embedding,
                    metadata: {
                        title,
                        chunk,
                        department,
                        accessLevel,
                        organizationId: orgId,
                        sourceKind: source?.kind || 'text',
                        sourceRef: source?.ref || '',
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
        createdBy: userId,
        organizationId: orgId,
        pineconeIds,
        tags,
    });

    return { doc, pineconeIds };
};

/**
 * POST /api/v1/org/documents
 * Ingest a company document: save to MongoDB + chunk → embed → upsert to Pinecone
 */
export const ingestDocument = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { title, content, department, accessLevel, tags, organizationId } = req.body;
        const userId = (req.user as any)?._id;

        if (!title || !content) {
            res.status(400).json({ error: 'title and content are required' });
            return;
        }

        const { doc, pineconeIds } = await persistOrgDocument({
            userId, title, content, department, accessLevel, tags, organizationId,
            source: { kind: 'text' },
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

// Extract the YouTube video ID from any reasonable URL shape.
const extractYouTubeId = (url: string): string | null => {
    const patterns = [
        /[?&]v=([a-zA-Z0-9_-]{11})/,
        /youtu\.be\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/(?:embed|shorts|live)\/([a-zA-Z0-9_-]{11})/,
    ];
    for (const p of patterns) {
        const m = url.match(p);
        if (m) return m[1];
    }
    return null;
};

/**
 * POST /api/v1/org/documents/from-url
 * Ingest a document by URL. YouTube URLs → fetch transcript. Other URLs →
 * fetch + strip HTML to text. Stored exactly like a manual paste afterwards.
 */
export const ingestDocumentFromUrl = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { url, title: titleInput, department, accessLevel, tags, organizationId } = req.body;
        const userId = (req.user as any)?._id;

        if (!url || typeof url !== 'string') {
            res.status(400).json({ error: 'url is required' });
            return;
        }

        let content = '';
        let title = titleInput?.trim() || '';
        let sourceRef = url;

        const videoId = extractYouTubeId(url);
        if (videoId) {
            // YouTube path — pull transcript via youtube-transcript.
            try {
                const { YoutubeTranscript } = await import('youtube-transcript');
                const items = await YoutubeTranscript.fetchTranscript(videoId);
                content = items.map((i: any) => i.text).join(' ').replace(/\s+/g, ' ').trim();
                if (!title) title = `YouTube transcript — ${videoId}`;
                sourceRef = `https://youtube.com/watch?v=${videoId}`;
            } catch (err: any) {
                res.status(422).json({ error: 'Could not fetch a transcript for that YouTube video. It may be missing captions.' });
                return;
            }
        } else {
            // Generic web page path — fetch and crudely strip HTML.
            try {
                const fetchRes = await fetch(url);
                if (!fetchRes.ok) {
                    res.status(422).json({ error: `Could not fetch ${url} (HTTP ${fetchRes.status}).` });
                    return;
                }
                const html = await fetchRes.text();
                content = html
                    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
                    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
                    .replace(/<[^>]+>/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
                if (!title) {
                    const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
                    title = m ? m[1].trim() : url;
                }
            } catch (err: any) {
                res.status(422).json({ error: `Could not fetch content from ${url}.` });
                return;
            }
        }

        if (!content || content.length < 20) {
            res.status(422).json({ error: 'Extracted content was empty or too short to ingest.' });
            return;
        }

        const { doc, pineconeIds } = await persistOrgDocument({
            userId, title, content, department, accessLevel,
            tags: Array.isArray(tags) ? tags : ['url-import'],
            organizationId,
            source: { kind: 'url', ref: sourceRef },
        });

        res.status(201).json({
            message: `Imported from URL. ${pineconeIds.length} chunk(s) embedded.`,
            document: doc,
            embeddedChunks: pineconeIds.length,
            extractedLength: content.length,
        });
    } catch (error: any) {
        console.error('[OrgController] ingestDocumentFromUrl error:', error);
        res.status(500).json({ error: 'Failed to ingest from URL.' });
    }
};

/**
 * POST /api/v1/org/documents/from-file (multipart 'file' field)
 * Accepts PDF or text/markdown uploads, extracts text, then ingests.
 */
export const ingestDocumentFromFile = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const file = (req as any).file;
        if (!file) {
            res.status(400).json({ error: 'No file uploaded (multipart field name must be "file").' });
            return;
        }

        const { title: titleInput, department, accessLevel, tags, organizationId } = req.body || {};
        const userId = (req.user as any)?._id;
        const filename = file.originalname || 'document';
        const mime = (file.mimetype || '').toLowerCase();

        let content = '';
        if (mime === 'application/pdf' || filename.toLowerCase().endsWith('.pdf')) {
            const pdfParse = (await import('pdf-parse')).default as any;
            const parsed = await pdfParse(file.buffer);
            content = (parsed?.text || '').replace(/\s+\n/g, '\n').trim();
        } else if (mime.startsWith('text/') || /\.(txt|md|markdown|csv)$/i.test(filename)) {
            content = file.buffer.toString('utf8').trim();
        } else {
            res.status(415).json({ error: `Unsupported file type: ${mime || filename}. Use PDF or text files.` });
            return;
        }

        if (!content || content.length < 20) {
            res.status(422).json({ error: 'File contained no extractable text.' });
            return;
        }

        const parsedTags = (() => {
            if (!tags) return ['file-import'];
            if (Array.isArray(tags)) return tags;
            try { return JSON.parse(tags); } catch { return [tags]; }
        })();

        const { doc, pineconeIds } = await persistOrgDocument({
            userId,
            title: titleInput?.trim() || filename,
            content,
            department,
            accessLevel,
            tags: parsedTags,
            organizationId,
            source: { kind: 'file', ref: filename },
        });

        res.status(201).json({
            message: `Imported from file. ${pineconeIds.length} chunk(s) embedded.`,
            document: doc,
            embeddedChunks: pineconeIds.length,
            extractedLength: content.length,
        });
    } catch (error: any) {
        console.error('[OrgController] ingestDocumentFromFile error:', error);
        res.status(500).json({ error: 'Failed to ingest file.' });
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

        // Find organization matching the user to enforce isolation
        let org = await Organization.findOne({ owner: user._id });
        if (!org && user.organization) {
            org = await Organization.findOne({ name: user.organization });
        }

        if (!org) {
            res.status(200).json({ documents: [], count: 0 });
            return;
        }

        filter.organizationId = org._id;

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
        console.error('[listDocuments] error:', error);
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

        // Link user to org (canonical id + legacy name for back-compat)
        await User.findByIdAndUpdate(userId, {
            organization: org.name,
            organizationId: org._id,
            org_industry: org.industry,
            org_size: org.size,
            role: 'employee',
        });

        // Add to default group chat
        const defaultChat = await Conversation.findOne({
            organizationId: org._id,
            isDefaultOrgChat: true,
        });

        if (defaultChat) {
            if (!defaultChat.users.map((id: any) => id.toString()).includes(userId.toString())) {
                defaultChat.users.push(userId);
                await defaultChat.save();
            }
        } else {
            // Org has no default chat — new joiners land in an org with nothing to talk in.
            // Loud-log so ops can backfill before more users sign up against this org.
            console.warn(`[org/join] Organization ${org._id} (${org.name}) has no default org chat — user ${userId} joined without group access.`);
        }

        // Send welcome email with company overview summary
        const joinedUser = await User.findById(userId);
        if (joinedUser && joinedUser.email) {
            const profileDoc = await OrgDocument.findOne({
                organizationId: org._id,
                tags: 'onboarding'
            });
            const summaryHtml = profileDoc 
                ? profileDoc.content.replace(/\n/g, '<br />') 
                : org.description 
                ? org.description.replace(/\n/g, '<br />') 
                : 'Welcome to the organization! The brain is currently ready and listening.';
            
            await sendWelcomeNewMemberEmail(joinedUser.email, joinedUser.full_name || joinedUser.username || 'Employee', org.name, summaryHtml);
        }

        res.status(200).json({
            message: `Successfully joined ${org.name}!`,
            organization: org,
        });
    } catch (error: any) {
        console.error('[OrgController] Join error:', error);
        res.status(500).json({ error: 'Failed to join organization.' });
    }
};

/**
 * POST /api/v1/org/brain/onboard
 * Setup initial detailed company brain profile
 */
export const onboardOrgBrain = async (req: AuthRequest, res: Response): Promise<void> => {
  // Track the stage we're in so any thrown error tells the client exactly
  // which step blew up (instead of a single opaque "Failed to onboard…").
  let stage: string = 'init';
  try {
    const userId = (req.user as any)?._id;
    const { description } = req.body;

    if (!description) {
      res.status(400).json({ error: 'business description is required' });
      return;
    }

    stage = 'ensure_organization';

    // Find or create the organization for this founder. Self-heals for users who
    // didn't get an Organization document at register time (seed users, OAuth, etc.).
    const org = await ensureOrganizationForFounder(userId);
    if (!org) {
      res.status(404).json({
        error: 'Organization not found. Make sure you finished organization info in the previous step.',
        stage,
      });
      return;
    }

    stage = 'prepare_text';
    let detailedProfileText = `Company Name: ${org.name}\n\nUser Description:\n${description}`;
    let aiSummary = description;

    console.log('[onboardOrgBrain] Checking DeepSeek Key status. Length:', process.env.DEEPSEEK_API_KEY ? process.env.DEEPSEEK_API_KEY.length : 0);
    const key = process.env.DEEPSEEK_API_KEY;
    const hasDeepSeekKey = !!(key && key.length > 10 && !key.startsWith('your_') && !key.startsWith('add_your_'));
    if (hasDeepSeekKey) {
      try {
        const response = await deepseekClient.chat.completions.create({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: 'You are Aida, an expert business analyst and organizational strategist. Generate a highly detailed, professional, and structured company overview based on the owner\'s description. Highlight mission, target audience, core services/products, and strategy. Avoid placeholders.'
            },
            {
              role: 'user',
              content: `Create a detailed profile for organization "${org.name}" in the industry "${org.industry || 'general'}".\nDescription: ${description}`
            }
          ],
          max_tokens: 1200,
          temperature: 0.7,
        });
        const generated = response.choices?.[0]?.message?.content;
        if (generated) {
          detailedProfileText = generated;
          aiSummary = generated.substring(0, 1000); // snippet
        }
      } catch (aiErr) {
        console.error('[OnboardOrgBrain] AI generation failed, using raw description:', aiErr);
      }
    }

    // Index to Pinecone
    const title = `Detailed Company Profile - ${org.name}`;
    const chunks = chunkText(detailedProfileText, 500, 100);
    const pineconeIds: string[] = [];
    const namespace = org.pineconeNamespace || `org-${org._id}`;

    if (hasPinecone()) {
      stage = 'embed_and_upsert';
      const vectors = [];
      for (const chunk of chunks) {
        const embedding = await generateEmbedding(chunk);
        if (embedding.length > 0) {
          const id = `org-brain-${crypto.randomUUID()}`;
          pineconeIds.push(id);
          vectors.push({
            id,
            values: embedding,
            metadata: { title, chunk, department: 'general', accessLevel: 'public', organizationId: org._id },
          });
        }
      }
      if (vectors.length > 0) await upsertVectors(vectors, namespace);
    }

    stage = 'persist_org_document';
    const doc = await OrgDocument.create({
      title,
      content: detailedProfileText,
      department: 'general',
      accessLevel: 'public',
      createdBy: userId,
      organizationId: org._id,
      pineconeIds,
      tags: ['profile', 'about', 'onboarding'],
    });

    stage = 'update_org_brain_flags';
    org.description = aiSummary;
    org.brainSeeded = true;
    org.brainSeedCompletedAt = new Date();
    await org.save();

    stage = 'advance_onboarding_step';
    await User.findByIdAndUpdate(userId, {
      onboardingStep: 'complete',
      onboardingComplete: true,
    });

    stage = 'find_or_create_default_chat';
    let defaultChat = await Conversation.findOne({
      organizationId: org._id,
      isDefaultOrgChat: true,
    });

    const bot = await getAidaBotUser();
    const botId = bot ? bot._id : null;

    if (!defaultChat) {
      defaultChat = await Conversation.create({
        chatName: org.name,
        isGroupChat: true,
        users: botId ? [userId, botId] : [userId],
        groupAdmin: userId,
        groupIcon: 'black',
        groupDescription: `Default group chat for ${org.name}`,
        organizationId: org._id,
        isDefaultOrgChat: true,
      });

      // Post initial welcome message from Aida bot
      if (botId) {
        const welcomeContent = `👋 **Welcome to the ${org.name} Workspace on Bubble!**\n\nI am **Aida**, your workspace intelligence assistant. I have initialized the organization's **Brain** knowledge base with your company profile.\n\nAll members who join will automatically be added to this default group chat. Feel free to collaborate, share documents, schedule calls, and ask me anything!`;
        const initialMsg = await Message.create({
          chat: defaultChat._id,
          sender: botId,
          content: welcomeContent,
          message_type: 'text',
        });
        defaultChat.latestMessage = (initialMsg as any)._id;
        await defaultChat.save();
      }
    }

    res.status(200).json({
      message: 'Organization brain successfully onboarded and default group chat initialized.',
      organization: org,
      documentId: doc._id,
      defaultChatId: defaultChat._id,
    });
  } catch (error: any) {
    console.error(`[OnboardOrgBrain] error at stage=${stage}:`, error);
    // Surface the underlying message so the UI shows something actionable
    // instead of a generic "Failed to onboard organization brain."
    res.status(500).json({
      error: `Failed to onboard organization brain at ${stage}: ${error?.message || 'unknown error'}`,
      stage,
    });
  }
};

/**
 * GET /api/v1/org/invite-code
 * Retrieve the current user's organization name and invite code.
 */
export const getOrgInviteCode = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = (req.user as any)?._id;
    const user = await User.findById(userId);
    if (!user || !user.organization) {
      res.status(404).json({ error: 'User is not part of any organization.' });
      return;
    }

    const org = await Organization.findOne({ name: user.organization });
    if (!org) {
      res.status(404).json({ error: 'Organization details not found.' });
      return;
    }

    const isAdmin = org.owner.toString() === userId.toString();
    const inviteCode = (isAdmin || (org.allowMembersToShareInvite ?? true)) ? org.inviteCode : "";

    res.status(200).json({
      name: org.name,
      inviteCode,
      logo: org.logo || '',
      description: org.description || '',
      allowMembersToShareInvite: org.allowMembersToShareInvite ?? true,
      isAdmin,
    });
  } catch (error: any) {
    console.error('[GetOrgInviteCode] error:', error);
    res.status(500).json({ error: 'Failed to retrieve organization invite code.' });
  }
};

/**
 * PUT /api/v1/org/profile
 * Update organization profile settings (name, industry, size, description, logo, allowMembersToShareInvite)
 */
export const updateOrgProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?._id;
  const { name, industry, size, description, logo, allowMembersToShareInvite } = req.body;

  try {
    // 1. Find the organization owned by this user
    let org = await Organization.findOne({ owner: userId });
    if (!org) {
      res.status(404).json({ error: 'Organization not found or you are not the owner.' });
      return;
    }

    const oldName = org.name;

    // 2. Perform updates
    if (name !== undefined && name.trim()) org.name = name.trim();
    if (industry !== undefined) org.industry = industry;
    if (size !== undefined) org.size = size;
    if (description !== undefined) org.description = description;
    if (logo !== undefined) org.logo = logo;
    if (allowMembersToShareInvite !== undefined) org.allowMembersToShareInvite = allowMembersToShareInvite;

    await org.save();

    // 3. If organization name changed, update the user profile field of all members!
    if (name !== undefined && name.trim() && oldName !== name.trim()) {
      const newName = name.trim();
      await User.updateMany(
        { organization: oldName },
        { $set: { organization: newName } }
      );
      // Also update any default group chat name of this organization
      await Conversation.updateMany(
        { organizationId: org._id, isDefaultOrgChat: true },
        { $set: { chatName: newName } }
      );
    }

    res.status(200).json({
      message: 'Organization profile updated successfully.',
      organization: org,
    });
  } catch (error: any) {
    console.error('[updateOrgProfile] error:', error);
    res.status(500).json({ error: 'Failed to update organization profile.' });
  }
};

/**
 * GET /api/v1/org/members
 * Get all members of the current user's organization
 */
export const getOrgMembers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = (req.user as any)?._id;
    const user = await User.findById(userId);
    if (!user || !user.organization) {
      res.status(200).json({ members: [] });
      return;
    }

    const members = await User.find({ organization: user.organization })
      .select('full_name username email avatar role isOnline lastSeen')
      .sort({ full_name: 1, username: 1 })
      .lean();

    res.status(200).json({ members });
  } catch (error: any) {
    console.error('[getOrgMembers] error:', error);
    res.status(550).json({ error: 'Failed to retrieve organization members.' });
  }
};

/**
 * GET /api/v1/org/transcripts
 * Get all transcripts/minutes for meetings in the user's organization
 */
export const getOrgTranscripts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = (req.user as any)?._id;
    const user = await User.findById(userId);
    if (!user || !user.organization) {
      res.status(404).json({ error: 'User is not part of any organization.' });
      return;
    }

    // Find all users in this organization
    const orgUsers = await User.find({ organization: user.organization }).select('_id');
    const orgUserIds = orgUsers.map(u => u._id);

    // Find ended meetings hosted by any member of the organization
    const meetings = await Meeting.find({
      host: { $in: orgUserIds },
      status: 'ended'
    })
    .populate('host', 'full_name username avatar')
    .sort({ endedAt: -1 })
    .lean();

    // Map meetings to detailed transcript structures
    const transcripts = meetings.map(m => ({
      _id: m._id,
      title: m.title,
      roomId: m.roomId,
      type: m.type,
      startedAt: m.startedAt,
      endedAt: m.endedAt,
      duration: m.duration,
      host: m.host,
      transcriptRaw: m.transcriptRaw || '',
      summary: m.summary || '',
      actionItems: m.actionItems || []
    }));

    res.status(200).json({ transcripts });
  } catch (error: any) {
    console.error('[getOrgTranscripts] error:', error);
    res.status(500).json({ error: 'Failed to retrieve organization transcripts.' });
  }
};
