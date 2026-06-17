import * as fs from 'fs';
import * as path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { transcribeAudio } from '../utils/whisperService';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

async function runTest() {
  console.log('--- Testing Audio Transcoder ---');
  console.log('Using ffmpeg path:', ffmpegInstaller.path);

  const testFileDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(testFileDir)) {
    fs.mkdirSync(testFileDir, { recursive: true });
  }

  const inputWavPath = path.join(testFileDir, 'dummy_voice.wav');
  const inputNoExtPath = path.join(testFileDir, 'dummy_voice_no_ext');

  try {
    // Generate a 1-second silence file as WAV audio using ffmpeg
    console.log('Generating dummy WAV audio file using ffmpeg...');
    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input('anullsrc=r=16000:cl=mono')
        .inputFormat('lavfi')
        .duration(1)
        .on('error', (err) => reject(err))
        .on('end', () => resolve())
        .save(inputWavPath);
    });

    console.log(`Generated WAV dummy file at: ${inputWavPath}`);
    console.log(`File size: ${fs.statSync(inputWavPath).size} bytes`);

    // Rename file to strip extension, simulating a multer file upload
    fs.renameSync(inputWavPath, inputNoExtPath);
    console.log(`Renamed WAV file to extensionless path: ${inputNoExtPath}`);

    // Call transcribeAudio
    console.log('Invoking transcribeAudio on extensionless file...');
    try {
      // If we don't have API keys, this will fail at getOpenAIClient() or API call,
      // but we want to catch if the transcode completed successfully before that.
      await transcribeAudio(inputNoExtPath);
    } catch (err: any) {
      if (err.message.includes('API key') || err.message.includes('ApiKey') || err.message.includes('auth')) {
        console.log('✅ Success: Transcoding completed and reached OpenAI initialization point (Key error expected).');
      } else {
        throw err;
      }
    }

    // Clean up
    if (fs.existsSync(inputNoExtPath)) fs.unlinkSync(inputNoExtPath);
    console.log('✅ Ffmpeg transcoding library check PASSED!');
  } catch (err: any) {
    console.error('❌ Transcoder test failed:', err);
    // Cleanup on failure
    if (fs.existsSync(inputWavPath)) fs.unlinkSync(inputWavPath);
    if (fs.existsSync(inputNoExtPath)) fs.unlinkSync(inputNoExtPath);
    process.exit(1);
  }
}

runTest();
