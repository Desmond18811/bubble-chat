import OpenAI from 'openai';
import * as fs from 'fs';

const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key is not configured in environment variables');
  }
  return new OpenAI({ apiKey });
};

/**
 * Transcribe an audio file using OpenAI's Whisper-1 model.
 * @param filePath Path to the local audio file to transcribe.
 */
export const transcribeAudio = async (filePath: string): Promise<string> => {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Audio file not found at path: ${filePath}`);
  }

  const openai = getOpenAIClient();
  const response = await openai.audio.transcriptions.create({
    file: fs.createReadStream(filePath),
    model: 'whisper-1',
  });

  return response.text;
};
