import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';

// Load protobuf definition
const PROTO_PATH = path.resolve(process.cwd(), 'proto/riva_tts.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
  includeDirs: [path.resolve(process.cwd(), 'proto')],
});

const rivaProto: any = grpc.loadPackageDefinition(packageDefinition);
const ttsService = rivaProto.nvidia.riva.tts.RivaSpeechSynthesis;

const DEFAULT_API_KEY = process.env.NVIDIA_API_KEY || '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';
const FUNCTION_ID = 'ddacc747-1269-4fab-bfd9-8f593dead106';
const SERVER = 'grpc.nvcf.nvidia.com:443';

// Create gRPC client instance
let cachedClient: any = null;

function getClient() {
  if (!cachedClient) {
    const sslCreds = grpc.credentials.createSsl();
    cachedClient = new ttsService(SERVER, sslCreds, {
      'grpc.max_receive_message_length': 64 * 1024 * 1024,
      'grpc.max_send_message_length': 64 * 1024 * 1024,
    });
  }
  return cachedClient;
}

/**
 * Creates a standard 44-byte WAV header for 16-bit mono PCM audio
 */
export function pcmToWav(pcmData: Buffer, sampleRate: number = 24000, numChannels: number = 1): Buffer {
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmData.length;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0); // ChunkID
  buffer.writeUInt32LE(36 + dataSize, 4); // ChunkSize
  buffer.write('WAVE', 8); // Format

  // fmt subchunk
  buffer.write('fmt ', 12); // Subchunk1ID
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(numChannels, 22); // NumChannels
  buffer.writeUInt32LE(sampleRate, 24); // SampleRate
  buffer.writeUInt32LE(byteRate, 28); // ByteRate
  buffer.writeUInt16LE(blockAlign, 32); // BlockAlign
  buffer.writeUInt16LE(bitsPerSample, 34); // BitsPerSample

  // data subchunk
  buffer.write('data', 36); // Subchunk2ID
  buffer.writeUInt32LE(dataSize, 40); // Subchunk2Size

  // copy PCM samples
  pcmData.copy(buffer, 44);

  return buffer;
}

export interface SynthesizeOptions {
  text: string;
  languageCode: string;
  voiceName?: string;
  sampleRate?: number;
  temperature?: number;
  topP?: number;
  repetitionPenalty?: number;
  apiKey?: string;
}

export async function synthesizeSpeech(options: SynthesizeOptions): Promise<{
  wavBuffer: Buffer;
  pcmBuffer: Buffer;
  durationMs: number;
  sampleRate: number;
}> {
  const {
    text,
    languageCode = 'en-US',
    voiceName = `Chatterbox-Multilingual.${languageCode}.Male`,
    sampleRate = 24000,
    temperature = 0.8,
    topP = 0.7,
    repetitionPenalty = 2.0,
    apiKey = DEFAULT_API_KEY,
  } = options;

  if (!text || text.trim().length === 0) {
    throw new Error('Text input cannot be empty');
  }

  const client = getClient();
  const metadata = new grpc.Metadata();
  metadata.add('authorization', `Bearer ${apiKey.trim()}`);
  metadata.add('function-id', FUNCTION_ID);

  const customConfiguration: Record<string, string> = {
    temperature: temperature.toString(),
    top_p: topP.toString(),
    repetition_penalty: repetitionPenalty.toString(),
    max_speech_token_len: '500',
  };

  const request = {
    text: text.trim(),
    language_code: languageCode,
    encoding: 'LINEAR_PCM',
    sample_rate_hz: sampleRate,
    voice_name: voiceName,
    custom_configuration: customConfiguration,
  };

  return new Promise((resolve, reject) => {
    client.Synthesize(request, metadata, (err: any, response: any) => {
      if (err) {
        console.error('NVIDIA NIM TTS gRPC Error:', err);
        return reject(
          new Error(
            err.details || err.message || 'Failed to synthesize speech via NVIDIA NIM gRPC service.'
          )
        );
      }

      if (!response || !response.audio || response.audio.length === 0) {
        return reject(new Error('NVIDIA NIM returned an empty audio response.'));
      }

      const pcmBuffer = Buffer.from(response.audio);
      const wavBuffer = pcmToWav(pcmBuffer, sampleRate, 1);

      // Duration: samples = bytes / 2 (for 16-bit mono), duration = samples / sampleRate * 1000
      const totalSamples = pcmBuffer.length / 2;
      const durationMs = Math.round((totalSamples / sampleRate) * 1000);

      resolve({
        wavBuffer,
        pcmBuffer,
        durationMs,
        sampleRate,
      });
    });
  });
}
