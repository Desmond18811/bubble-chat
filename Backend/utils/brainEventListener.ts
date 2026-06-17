import { EventEmitter } from 'events';
import { User } from '../models/users';
import { Organization } from '../models/organizations';
import { Conversation } from '../models/conversations';
import { Message } from '../models/messages';
import { OrgDocument } from '../models/orgDocument';
import { chunkText, generateEmbedding } from '../utils/embeddings';
import { upsertVectors, hasPinecone } from '../utils/pinecone';
import { updateExpertiseRadar } from '../controllers/continuityController';
import * as crypto from 'crypto';

/**
 * Central Brain Event Bus.
 * Other parts of the system emit events here;
 * this listener ingests them into the knowledge base without
 * coupling directly to any controller.
 */
export const brainEventBus = new EventEmitter();

// Prevent uncaught listener warnings for production usage
brainEventBus.setMaxListeners(20);

// ─── Internal helper ──────────────────────────────────────────────────────────

const ingestTextToOrg = async (
  text: string,
  title: string,
  tags: string[],
  orgId: string,
  namespace: string,
  createdBy: string,
  department = 'general'
) => {
  const chunks = chunkText(text, 500, 100);
  const pineconeIds: string[] = [];

  if (hasPinecone()) {
    const vectors = [];
    for (const chunk of chunks) {
      const embedding = await generateEmbedding(chunk);
      if (embedding && embedding.length > 0) {
        const vectorId = `brain-evt-${crypto.randomUUID()}`;
        pineconeIds.push(vectorId);
        vectors.push({
          id: vectorId,
          values: embedding,
          metadata: {
            title,
            chunk,
            department,
            accessLevel: 'public',
            organizationId: orgId,
          },
        });
      }
    }
    if (vectors.length > 0) {
      await upsertVectors(vectors, namespace);
    }
  }

  await OrgDocument.create({
    title,
    content: text,
    department,
    accessLevel: 'public',
    createdBy,
    organizationId: orgId,
    pineconeIds,
    tags,
  });

  if (tags.length > 0) {
    await updateExpertiseRadar(createdBy, orgId, tags, 2);
  }
};

// ─── Event: Group Message Sent ────────────────────────────────────────────────

/**
 * Emitted by the message socket/controller when a group message is saved.
 * Payload: { messageId: string, chatId: string, senderId: string }
 */
brainEventBus.on('group_message_sent', async (payload: { messageId: string; chatId: string; senderId: string }) => {
  try {
    const { messageId, chatId, senderId } = payload;

    // Only ingest group chats that belong to an org
    const chat = await Conversation.findById(chatId).select('organizationId chatName isGroupChat');
    if (!chat || !chat.isGroupChat || !chat.organizationId) return;

    const org = await Organization.findById(chat.organizationId);
    if (!org) return;

    const message = await Message.findById(messageId).populate('sender', 'full_name username');
    if (!message || !message.content || message.content.trim().length < 10) return;

    const senderName = (message.sender as any)?.full_name || (message.sender as any)?.username || 'User';
    const content = `[${chat.chatName}] ${senderName}: ${message.content}`;
    const namespace = org.pineconeNamespace || `org-${org._id}`;

    await ingestTextToOrg(
      content,
      `Group Chat: ${chat.chatName}`,
      ['chat', 'group', chat.chatName.toLowerCase()],
      org._id.toString(),
      namespace,
      senderId,
      'communications'
    );

    console.log(`[Brain Event] Ingested group message ${messageId} for org ${org.name}`);
  } catch (err) {
    console.error('[Brain Event] group_message_sent ingestion failed:', err);
  }
});

// ─── Event: Meeting Ended ─────────────────────────────────────────────────────

/**
 * Emitted after a meeting is ended and transcript/summary are ready.
 * Payload: { meetingId: string, organizationId: string, hostId: string, title: string, transcript: string, summary: string, tags?: string[] }
 */
brainEventBus.on('meeting_ended', async (payload: {
  meetingId: string;
  organizationId: string;
  hostId: string;
  title: string;
  transcript: string;
  summary: string;
  tags?: string[];
}) => {
  try {
    const { meetingId, organizationId, hostId, title, transcript, summary, tags = [] } = payload;
    if (!transcript && !summary) return;

    const org = await Organization.findById(organizationId);
    if (!org) return;

    const namespace = org.pineconeNamespace || `org-${org._id}`;
    const allTags = ['meeting', 'transcript', ...tags];
    const content = summary ? `${summary}\n\n${transcript}` : transcript;

    await ingestTextToOrg(
      content,
      `Meeting: ${title}`,
      allTags,
      org._id.toString(),
      namespace,
      hostId,
      'meetings'
    );

    console.log(`[Brain Event] Re-indexed meeting ${meetingId} into org ${org.name} brain`);
  } catch (err) {
    console.error('[Brain Event] meeting_ended ingestion failed:', err);
  }
});

// ─── Event: Calendar Event Created ───────────────────────────────────────────

/**
 * Emitted when a calendar event or meeting is created.
 * Payload: { eventId: string, organizationId: string, createdBy: string, title: string, description?: string, agenda?: string, eventType: string, startTime: string }
 */
brainEventBus.on('calendar_event_created', async (payload: {
  eventId: string;
  organizationId: string;
  createdBy: string;
  title: string;
  description?: string;
  agenda?: string;
  eventType: string;
  startTime: string;
}) => {
  try {
    const { eventId, organizationId, createdBy, title, description, agenda, eventType, startTime } = payload;

    const org = await Organization.findById(organizationId);
    if (!org) return;

    const namespace = org.pineconeNamespace || `org-${org._id}`;
    const content = [
      `Calendar Event: ${title}`,
      `Type: ${eventType}`,
      `Date: ${new Date(startTime).toLocaleString()}`,
      description ? `Description: ${description}` : '',
      agenda ? `Agenda: ${agenda}` : '',
    ].filter(Boolean).join('\n');

    await ingestTextToOrg(
      content,
      `Event: ${title}`,
      ['calendar', 'event', eventType],
      org._id.toString(),
      namespace,
      createdBy,
      'meetings'
    );

    console.log(`[Brain Event] Ingested calendar event "${title}" for org ${org.name}`);
  } catch (err) {
    console.error('[Brain Event] calendar_event_created ingestion failed:', err);
  }
});

// ─── Event: Org Document Uploaded ────────────────────────────────────────────

/**
 * Emitted when a document is manually uploaded to the org workspace/storage.
 * Payload: { documentId: string, organizationId: string, uploadedBy: string, title: string, content: string, tags?: string[], department?: string }
 */
brainEventBus.on('document_uploaded', async (payload: {
  documentId: string;
  organizationId: string;
  uploadedBy: string;
  title: string;
  content: string;
  tags?: string[];
  department?: string;
}) => {
  try {
    const { organizationId, uploadedBy, title, content, tags = [], department = 'general' } = payload;
    if (!content || content.trim().length < 20) return;

    const org = await Organization.findById(organizationId);
    if (!org) return;

    const namespace = org.pineconeNamespace || `org-${org._id}`;
    await ingestTextToOrg(
      content,
      title,
      ['document', ...tags],
      org._id.toString(),
      namespace,
      uploadedBy,
      department
    );

    console.log(`[Brain Event] Ingested uploaded document "${title}" for org ${org.name}`);
  } catch (err) {
    console.error('[Brain Event] document_uploaded ingestion failed:', err);
  }
});

/**
 * Initialize the brain event listener.
 * Call this once from index.ts after DB connection.
 * 
 * Events handled:
 *  - group_message_sent      : auto-ingest group chat messages (DMs are NEVER ingested — E2E privacy)
 *  - meeting_ended           : ingest meeting transcript + summary after a call ends
 *  - calendar_event_created  : ingest event metadata for discoverability and agenda pre-fill
 *  - document_uploaded       : ingest manually uploaded org documents immediately
 */
export const initBrainEventListener = () => {
  console.log('🧠 [Brain Event Listener] Initialized — listening for group_message_sent, meeting_ended, calendar_event_created, document_uploaded. DMs excluded (E2E encrypted).');
};
