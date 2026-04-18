import cron from 'node-cron';
import crypto from 'crypto';
import { SecurityCode } from '../models/security';

/**
 * Bubble Chat Weekly Security Rotation Service
 * Generates a new, cryptographically strong security number every week.
 */

// 1. Generate a new security code
export const rotateSecurityCode = async () => {
  try {
    await SecurityCode.updateMany({ isCurrent: true }, { isCurrent: false });

    const newCode = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const code = await SecurityCode.create({
      code: newCode,
      isCurrent: true,
      expiresAt: expiresAt,
    });

    console.log(`🔒 SECURITY UPDATED: New Weekly Security Code rotation completed. ID: ${code._id}`);
    return code;
  } catch (err) {
    console.error('❌ Error during security code rotation:', err);
  }
};

// 2. Schedule the security rotation task
export const initSecurityScheduler = () => {
  // Sunday at 00:00 (Midnight)
  cron.schedule('0 0 * * 0', async () => {
    console.log('⏳ Sunday Midnight: Initiating weekly security rotation...');
    await rotateSecurityCode();
  });

  SecurityCode.findOne({ isCurrent: true }).then(async (code) => {
    if (!code) {
      console.log('🛡️ No active security code found. Initializing first-run rotation...');
      await rotateSecurityCode();
    }
  });
};

// ─── Background Transcript Processor ─────────────────────────────────────────

/**
 * Processes ended meetings that have unprocessed transcripts.
 * Runs every 5 minutes. Uses HuggingFace if available, otherwise extracts
 * action items via local pattern matching.
 */
export const processTranscriptQueue = async () => {
  try {
    const { Meeting } = await import('../models/meeting');
    const { HfInference } = await import('@huggingface/inference');

    const hasHfKey = () => process.env.HF_API_KEY && process.env.HF_API_KEY !== 'your_hugging_face_api_key_here';

    // Find ended meetings with raw transcript but no summary yet
    const unprocessed = await Meeting.find({
      status: 'ended',
      $or: [
        { transcriptRaw: { $exists: true, $ne: '' } },
        { transcriptChunks: { $exists: true, $not: { $size: 0 } } },
      ],
      summary: { $in: [null, ''] as any },
    }).limit(5);

    if (unprocessed.length === 0) return;

    console.log(`🎙️ [Transcript] Processing ${unprocessed.length} meeting transcript(s)...`);

    for (const meeting of unprocessed) {
      try {
        // Build full transcript text
        let fullText = meeting.transcriptRaw || '';
        if (!fullText && meeting.transcriptChunks?.length) {
          fullText = meeting.transcriptChunks
            .map(c => c.speaker ? `[${c.speaker}]: ${c.text}` : c.text)
            .join('\n');
        }

        if (!fullText || fullText.trim().length < 20) {
          // Mark as processed with placeholder
          meeting.summary = 'No transcript content available for this meeting.';
          await meeting.save();
          continue;
        }

        // Extract action items via local pattern matching (always available)
        const lines = fullText.split(/[.\n!?]/);
        const actionPatterns = /\b(will|should|must|needs? to|action:|todo:|task:|going to|i'll|we'll)\b/i;
        const localActionItems: { text: string; assignedToName: string | null; deadline: null }[] = [];
        const attendeeNames = meeting.attendeeNames || [];

        lines.forEach(line => {
          const trimmed = line.trim();
          if (trimmed.length > 15 && actionPatterns.test(trimmed)) {
            const assignedTo = attendeeNames.find(n => trimmed.toLowerCase().includes(n.toLowerCase())) || null;
            localActionItems.push({ text: trimmed, assignedToName: assignedTo, deadline: null });
          }
        });

        let summary = `Meeting: ${meeting.title}. Duration: ${meeting.duration ? Math.floor(meeting.duration / 60) + ' minutes' : 'unknown'}. `;
        if (localActionItems.length > 0) {
          summary += `${localActionItems.length} action item(s) identified.`;
        } else {
          summary += 'No action items detected.';
        }

        // Try AI enhancement if HF key available
        if (hasHfKey()) {
          try {
            const hf = new HfInference(process.env.HF_API_KEY!);
            const modelId = process.env.MIXTRAL_MODEL_ID || 'mistralai/Mixtral-8x7B-Instruct-v0.1';

            const prompt = `Summarize this meeting transcript in 2-3 sentences. Be concise.\n\nTranscript:\n${fullText.substring(0, 2000)}\n\nSummary:`;

            const aiRes = await hf.chatCompletion({
              model: modelId,
              messages: [{ role: 'user', content: prompt }],
              max_tokens: 200,
              temperature: 0.4,
            });
            const aiSummary = aiRes.choices?.[0]?.message?.content?.trim();
            if (aiSummary) summary = aiSummary;

            // AI action item extraction
            const actionPrompt = `Extract action items from this transcript as JSON.\nTranscript: ${fullText.substring(0, 1500)}\nReturn: {"actionItems":[{"text":"...","assignedToName":"...or null"}]}\nJSON:`;
            const aiActionRes = await hf.chatCompletion({
              model: modelId,
              messages: [{ role: 'user', content: actionPrompt }],
              max_tokens: 400,
              temperature: 0.2,
            });
            const rawAction = aiActionRes.choices?.[0]?.message?.content || '';
            const jsonMatch = rawAction.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              if (parsed.actionItems?.length > 0) {
                meeting.actionItems = parsed.actionItems.map((item: any) => ({
                  text: item.text,
                  assignedToName: item.assignedToName || null,
                  status: 'pending',
                }));
              }
            }
          } catch (aiErr) {
            console.warn(`[Transcript] AI processing failed for meeting ${meeting._id}, using local extraction.`, aiErr);
          }
        } else if (localActionItems.length > 0) {
          meeting.actionItems = localActionItems.map(item => ({
            text: item.text,
            assignedToName: item.assignedToName || null,
            status: 'pending',
          } as any));
        }

        meeting.summary = summary;
        await meeting.save();
        console.log(`✅ [Transcript] Processed meeting ${meeting._id}: "${meeting.title}"`);
      } catch (meetingErr) {
        console.error(`❌ [Transcript] Failed for meeting ${meeting._id}:`, meetingErr);
      }
    }
  } catch (err) {
    console.error('❌ [Transcript] Queue processing error:', err);
  }
};

// 3. Initialize transcript background processor
export const initTranscriptProcessor = () => {
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    await processTranscriptQueue();
  });

  // Run once at startup
  setTimeout(async () => {
    await processTranscriptQueue();
  }, 10000); // 10s after boot

  console.log('🎙️ [Transcript] Background processor initialized (runs every 5 min).');
};
