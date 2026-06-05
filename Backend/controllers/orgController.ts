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
import OpenAI from 'openai';

const deepseekClient = new OpenAI({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY || '',
});

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

        if (!title || !content) {
            res.status(400).json({ error: 'title and content are required' });
            return;
        }

        // Find organization
        let org = null;
        if (organizationId) {
            org = await Organization.findById(organizationId);
        }
        if (!org) {
            org = await Organization.findOne({ owner: userId });
        }
        if (!org) {
            const user = await User.findById(userId);
            if (user && user.organization) {
                org = await Organization.findOne({ name: user.organization });
            }
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
                        metadata: { title, chunk, department, accessLevel, organizationId: orgId },
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

        // Link user to org
        await User.findByIdAndUpdate(userId, {
            organization: org.name,
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
  try {
    const userId = (req.user as any)?._id;
    const { description } = req.body;

    if (!description) {
      res.status(400).json({ error: 'business description is required' });
      return;
    }

    // Find the organization owned by this user
    let org = await Organization.findOne({ owner: userId });
    if (!org) {
      // Fallback: search for any organization matching the user's organization string
      const user = await User.findById(userId);
      if (user && user.organization) {
        org = await Organization.findOne({ name: user.organization });
      }
    }

    if (!org) {
      res.status(404).json({ error: 'Organization not found. Please create an organization first.' });
      return;
    }

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

    // Save MongoDB OrgDocument
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

    // Update org description
    org.description = aiSummary;
    await org.save();

    // Create/update default group chat
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
    console.error('[OnboardOrgBrain] error:', error);
    res.status(500).json({ error: 'Failed to onboard organization brain.' });
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

    res.status(200).json({
      name: org.name,
      inviteCode: org.inviteCode,
    });
  } catch (error: any) {
    console.error('[GetOrgInviteCode] error:', error);
    res.status(500).json({ error: 'Failed to retrieve organization invite code.' });
  }
};
