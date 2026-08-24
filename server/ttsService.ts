import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Embedded protobuf definitions to guarantee zero-failure loading on Vercel serverless functions
const RIVA_AUDIO_PROTO_CONTENT = `syntax = "proto3";

package nvidia.riva.audio;

enum AudioEncoding {
  ENCODING_UNSPECIFIED = 0;
  LINEAR_PCM = 1;
  FLAC = 2;
  MULAW = 3;
  ALAW = 4;
  OGGOPUS = 5;
}
`;

const RIVA_TTS_PROTO_CONTENT = `syntax = "proto3";

package nvidia.riva.tts;

import "riva_audio.proto";

message ZeroShotData {
  bytes audio_prompt = 1;
  int32 sample_rate_hz = 2;
  nvidia.riva.audio.AudioEncoding encoding = 3;
  int32 audio_prompt_sample_rate_hz = 4;
  nvidia.riva.audio.AudioEncoding audio_prompt_encoding = 5;
  int32 bit_depth = 6;
  int32 audio_prompt_bit_depth = 7;
}

message SynthesizeSpeechRequest {
  string text = 1;
  string language_code = 2;
  nvidia.riva.audio.AudioEncoding encoding = 3;
  int32 sample_rate_hz = 4;
  string voice_name = 5;
  string id = 6;
  ZeroShotData zero_shot_data = 7;
  map<string, string> custom_configuration = 8;
}

message SynthesizeSpeechResponseMetadata {
  string text = 1;
  string processed_text = 2;
  repeated float predicted_durations = 3;
  repeated string d_tokens = 4;
  repeated float kld = 5;
  repeated string p_tokens = 6;
}

message SynthesizeSpeechResponse {
  bytes audio = 1;
  SynthesizeSpeechResponseMetadata meta = 2;
  string id = 3;
}

message RivaSynthesisConfigRequest {
  string model_name = 1;
}

message RivaSynthesisConfigResponse {
  message ModelConfig {
    string model_name = 1;
    repeated string parameters = 2;
  }
  repeated ModelConfig model_configs = 1;
}

service RivaSpeechSynthesis {
  rpc Synthesize(SynthesizeSpeechRequest) returns (SynthesizeSpeechResponse);
  rpc SynthesizeOnline(SynthesizeSpeechRequest) returns (stream SynthesizeSpeechResponse);
  rpc GetRivaSynthesisConfig(RivaSynthesisConfigRequest) returns (RivaSynthesisConfigResponse);
}
`;

function getProtoService(): any {
  // Check if proto file exists in current working directory or relative directories
  const candidateDirs = [
    path.resolve(process.cwd(), 'proto'),
    path.resolve(__dirname, '../proto'),
    path.resolve(__dirname, '../../proto'),
    path.resolve(__dirname, 'proto'),
  ];

  let protoDir = candidateDirs.find((dir) => fs.existsSync(path.join(dir, 'riva_tts.proto')));

  // If not found (e.g. running in Vercel lambda /var/task), dynamically write to /tmp
  if (!protoDir) {
    const tmpProtoDir = path.join(os.tmpdir(), 'chatterbox_proto');
    try {
      if (!fs.existsSync(tmpProtoDir)) {
        fs.mkdirSync(tmpProtoDir, { recursive: true });
      }
      fs.writeFileSync(path.join(tmpProtoDir, 'riva_audio.proto'), RIVA_AUDIO_PROTO_CONTENT, 'utf8');
      fs.writeFileSync(path.join(tmpProtoDir, 'riva_tts.proto'), RIVA_TTS_PROTO_CONTENT, 'utf8');
      protoDir = tmpProtoDir;
    } catch (e) {
      console.warn('Could not write fallback proto to tmp dir, trying candidate paths:', e);
      protoDir = candidateDirs[0];
    }
  }

  const protoFile = path.join(protoDir, 'riva_tts.proto');
  const packageDefinition = protoLoader.loadSync(protoFile, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
    includeDirs: [protoDir],
  });

  const rivaProto: any = grpc.loadPackageDefinition(packageDefinition);
  return rivaProto.nvidia.riva.tts.RivaSpeechSynthesis;
}

const DEFAULT_API_KEY = process.env.NVIDIA_API_KEY || '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';
const FUNCTION_ID = 'ddacc747-1269-4fab-bfd9-8f593dead106';
const SERVER = 'grpc.nvcf.nvidia.com:443';

// Create gRPC client instance
let cachedClient: any = null;

function getClient() {
  if (!cachedClient) {
    const ttsService = getProtoService();
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

// Map language codes to supported NVIDIA NIM model endpoints
const SUPPORTED_NIM_VOICES: Record<string, { lang: string; voice: string }> = {
  'en-US': { lang: 'en-US', voice: 'Chatterbox-Multilingual.en-US.Male' },
  'es-ES': { lang: 'es-ES', voice: 'Chatterbox-Multilingual.es-ES.Male' },
  'fr-FR': { lang: 'fr-FR', voice: 'Chatterbox-Multilingual.fr-FR.Male' },
  'de-DE': { lang: 'de-DE', voice: 'Chatterbox-Multilingual.de-DE.Male' },
  'it-IT': { lang: 'it-IT', voice: 'Chatterbox-Multilingual.it-IT.Male' },
  'ja-JP': { lang: 'ja-JP', voice: 'Chatterbox-Multilingual.ja-JP.Male' },
  'zh-CN': { lang: 'zh-CN', voice: 'Chatterbox-Multilingual.zh-CN.Male' },
  'ko-KR': { lang: 'ko-KR', voice: 'Chatterbox-Multilingual.ko-KR.Male' },
  'hi-IN': { lang: 'hi-IN', voice: 'Chatterbox-Multilingual.hi-IN.Male' },
  'si-LK': { lang: 'hi-IN', voice: 'Chatterbox-Multilingual.hi-IN.Male' }, // South Asian Indic phoneme bridge
  'ta-LK': { lang: 'hi-IN', voice: 'Chatterbox-Multilingual.hi-IN.Male' }, // South Asian Indic phoneme bridge
  'pt-BR': { lang: 'pt-BR', voice: 'Chatterbox-Multilingual.pt-BR.Male' },
  'ru-RU': { lang: 'ru-RU', voice: 'Chatterbox-Multilingual.ru-RU.Male' },
  'ar-XA': { lang: 'ar-XA', voice: 'Chatterbox-Multilingual.ar-XA.Male' },
  'nl-NL': { lang: 'nl-NL', voice: 'Chatterbox-Multilingual.nl-NL.Male' },
  'pl-PL': { lang: 'pl-PL', voice: 'Chatterbox-Multilingual.pl-PL.Male' },
  'tr-TR': { lang: 'tr-TR', voice: 'Chatterbox-Multilingual.tr-TR.Male' },
  'sv-SE': { lang: 'sv-SE', voice: 'Chatterbox-Multilingual.sv-SE.Male' },
  'da-DK': { lang: 'da-DK', voice: 'Chatterbox-Multilingual.da-DK.Male' },
  'fi-FI': { lang: 'fi-FI', voice: 'Chatterbox-Multilingual.fi-FI.Male' },
  'el-GR': { lang: 'el-GR', voice: 'Chatterbox-Multilingual.el-GR.Male' },
  'he-IL': { lang: 'he-IL', voice: 'Chatterbox-Multilingual.he-IL.Male' },
  'ms-MY': { lang: 'ms-MY', voice: 'Chatterbox-Multilingual.ms-MY.Male' },
  'no-NO': { lang: 'no-NO', voice: 'Chatterbox-Multilingual.no-NO.Male' },
  'sw-KE': { lang: 'sw-KE', voice: 'Chatterbox-Multilingual.sw-KE.Male' },
};

// Helper to transliterate Sinhala Unicode to natural phonetic Latin for TTS engines
export function transliterateSinhalaToPhonetic(text: string): string {
  if (!text || !/[\u0D80-\u0DFF]/.test(text)) {
    return text;
  }

  const vowels: Record<string, string> = {
    '\u0D85': 'a', '\u0D86': 'aa', '\u0D87': 'ae', '\u0D88': 'aae',
    '\u0D89': 'i', '\u0D8A': 'ee', '\u0D8B': 'u', '\u0D8C': 'oo',
    '\u0D8D': 'ru', '\u0D8E': 'roo', '\u0D8F': 'li', '\u0D90': 'lee',
    '\u0D91': 'e', '\u0D92': 'ee', '\u0D93': 'ai', '\u0D94': 'o',
    '\u0D95': 'oo', '\u0D96': 'au'
  };

  const consonants: Record<string, string> = {
    '\u0D9A': 'k', '\u0D9B': 'kh', '\u0D9C': 'g', '\u0D9D': 'gh', '\u0D9E': 'ng', '\u0D9F': 'ng',
    '\u0DA0': 'ch', '\u0DA1': 'chh', '\u0DA2': 'j', '\u0DA3': 'jh', '\u0DA4': 'ny', '\u0DA5': 'gny', '\u0DA6': 'nj',
    '\u0DA7': 't', '\u0DA8': 'th', '\u0DA9': 'd', '\u0DAA': 'dh', '\u0DAB': 'n', '\u0DAC': 'nd',
    '\u0DAD': 'th', '\u0DAE': 'th', '\u0DAF': 'd', '\u0DB0': 'dh', '\u0DB1': 'n', '\u0DB3': 'nd',
    '\u0DB4': 'p', '\u0DB5': 'ph', '\u0DB6': 'b', '\u0DB7': 'bh', '\u0DB8': 'm', '\u0DB9': 'mb',
    '\u0DBA': 'y', '\u0DBB': 'r', '\u0DBD': 'l', '\u0DC0': 'w',
    '\u0DC1': 'sh', '\u0DC2': 'sh', '\u0DC3': 's', '\u0DC4': 'h', '\u0DC5': 'l', '\u0DC6': 'f'
  };

  const vowelSigns: Record<string, string> = {
    '\u0DCF': 'aa', '\u0DD0': 'ae', '\u0DD1': 'aae', '\u0DD2': 'i',
    '\u0DD3': 'ee', '\u0DD4': 'u', '\u0DD6': 'oo', '\u0DD8': 'ru',
    '\u0DD9': 'e', '\u0DDA': 'ee', '\u0DDB': 'ai', '\u0DDC': 'o',
    '\u0DDD': 'oo', '\u0DDE': 'au', '\u0DDF': 'roo'
  };

  let result = '';
  const len = text.length;

  for (let i = 0; i < len; i++) {
    const char = text[i];
    const code = char.charCodeAt(0);

    // If outside Sinhala range, keep as-is
    if (code < 0x0D80 || code > 0x0DFF) {
      if (char === '\u200D') continue; // Zero-width joiner
      result += char;
      continue;
    }

    // Check independent vowels
    if (vowels[char]) {
      result += vowels[char];
      continue;
    }

    // Check anusvara (ං) and visarga (ඃ)
    if (char === '\u0D82') {
      result += 'ng';
      continue;
    }
    if (char === '\u0D83') {
      result += 'h';
      continue;
    }

    // Check consonants
    if (consonants[char]) {
      const baseConsonant = consonants[char];
      const nextChar = i + 1 < len ? text[i + 1] : '';

      // Check for zero width joiner combinations (like rakaransaya / yansaya)
      if (nextChar === '\u0DCA') { // Virama / Hal
        const afterHal = i + 2 < len ? text[i + 2] : '';
        const afterZWJ = i + 3 < len ? text[i + 3] : '';
        if (afterHal === '\u200D' && afterZWJ) {
          if (afterZWJ === '\u0DBA') { // Yansaya (්‍ය)
            result += baseConsonant + 'y';
            i += 3;
            continue;
          }
          if (afterZWJ === '\u0DBB') { // Rakaransaya (්‍ර)
            result += baseConsonant + 'r';
            i += 3;
            continue;
          }
        }
        // Just Virama: silent vowel
        result += baseConsonant;
        i++; // skip virama
        continue;
      }

      if (vowelSigns[nextChar]) {
        result += baseConsonant + vowelSigns[nextChar];
        i++; // skip vowel sign
        continue;
      }

      // Default inherent vowel 'a'
      result += baseConsonant + 'a';
      continue;
    }

    // Fallback
    result += char;
  }

  // Clean up repeated vowels and spacing
  return result
    .replace(/\s+/g, ' ')
    .replace(/aa+/g, 'aa')
    .replace(/ee+/g, 'ee')
    .replace(/oo+/g, 'oo')
    .trim();
}

// Helper to transliterate Tamil Unicode to natural phonetic Latin for TTS engines
export function transliterateTamilToPhonetic(text: string): string {
  if (!text || !/[\u0B80-\u0BFF]/.test(text)) {
    return text;
  }

  const tamilMap: Record<string, string> = {
    'அ': 'a', 'ஆ': 'aa', 'இ': 'i', 'ஈ': 'ee', 'உ': 'u', 'ஊ': 'oo', 'எ': 'e', 'ஏ': 'ee', 'ஐ': 'ai', 'ஒ': 'o', 'ஓ': 'oo', 'ஔ': 'au',
    'க': 'ka', 'ங': 'nga', 'ச': 'cha', 'ஞ': 'nya', 'ட': 'ta', 'ண': 'na', 'த': 'tha', 'ந': 'na', 'ப': 'pa', 'ம': 'ma', 'ய': 'ya',
    'ர': 'ra', 'ல': 'la', 'வ': 'va', 'ழ': 'zha', 'ள': 'la', 'ற': 'ra', 'ன': 'na', 'ஜ': 'ja', 'ஷ': 'sha', 'ஸ': 'sa', 'ஹ': 'ha',
    'ா': 'aa', 'ி': 'i', 'ீ': 'ee', 'ு': 'u', 'ூ': 'oo', 'ெ': 'e', 'ே': 'ee', 'ை': 'ai', 'ொ': 'o', 'ோ': 'oo', 'ௌ': 'au', '்': ''
  };

  let out = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = i + 1 < text.length ? text[i + 1] : '';
    if (tamilMap[c]) {
      if (next === '்') {
        out += tamilMap[c].replace(/a$/, '');
        i++;
      } else if (tamilMap[next] && 'ாிீுூெேைொோௌ'.includes(next)) {
        out += tamilMap[c].replace(/a$/, '') + tamilMap[next];
        i++;
      } else {
        out += tamilMap[c];
      }
    } else {
      out += c;
    }
  }
  return out;
}

// Helper to split long text into safe micro-chunks (<= 50 chars) to prevent Triton 500 speech token truncation
function splitTextIntoSentences(text: string, maxCharsPerChunk = 50): string[] {
  const cleaned = text.trim();
  if (cleaned.length <= maxCharsPerChunk) {
    return [cleaned];
  }

  // Split by common sentence & phrase delimiters
  const rawSentences = cleaned.split(/(?<=[.!?;\n।|။,،:–—\s])/g).map((s) => s.trim()).filter(Boolean);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const part of rawSentences) {
    if ((currentChunk + ' ' + part).trim().length > maxCharsPerChunk && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = part;
    } else {
      currentChunk = currentChunk ? `${currentChunk} ${part}` : part;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks.length > 0 ? chunks : [cleaned];
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
    sampleRate = 24000,
    temperature = 0.8,
    topP = 0.7,
    repetitionPenalty = 2.0,
    apiKey = DEFAULT_API_KEY,
  } = options;

  if (!text || text.trim().length === 0) {
    throw new Error('Text input cannot be empty');
  }

  // Resolve mapped NIM language and voice
  const mapping = SUPPORTED_NIM_VOICES[languageCode] || {
    lang: 'en-US',
    voice: 'Chatterbox-Multilingual.en-US.Male',
  };

  const finalLanguageCode = mapping.lang;
  const finalVoiceName = options.voiceName && !options.voiceName.includes('si-LK') && !options.voiceName.includes('ta-LK')
    ? options.voiceName
    : mapping.voice;

  const client = getClient();
  const metadata = new grpc.Metadata();
  metadata.add('authorization', `Bearer ${apiKey.trim()}`);
  metadata.add('function-id', FUNCTION_ID);

  const customConfiguration: Record<string, string> = {
    temperature: temperature.toString(),
    top_p: topP.toString(),
    repetition_penalty: repetitionPenalty.toString(),
    max_speech_token_len: '800',
  };

  const executeSingleCall = (chunkText: string, lang: string, voice: string): Promise<Buffer> => {
    const request = {
      text: chunkText.trim(),
      language_code: lang,
      encoding: 'LINEAR_PCM',
      sample_rate_hz: sampleRate,
      voice_name: voice,
      custom_configuration: customConfiguration,
    };

    return new Promise((resolve, reject) => {
      client.Synthesize(request, metadata, (err: any, response: any) => {
        if (err) {
          return reject(err);
        }
        if (!response || !response.audio || response.audio.length === 0) {
          return reject(new Error('NVIDIA NIM returned an empty audio response.'));
        }
        resolve(Buffer.from(response.audio));
      });
    });
  };

  // Pre-process Sinhala / Tamil scripts to phonetic representations
  let processedText = text.trim();
  if (languageCode === 'si-LK' || /[\u0D80-\u0DFF]/.test(processedText)) {
    processedText = transliterateSinhalaToPhonetic(processedText);
  } else if (languageCode === 'ta-LK' || /[\u0B80-\u0BFF]/.test(processedText)) {
    processedText = transliterateTamilToPhonetic(processedText);
  }

  const synthesizeChunkWithFallback = async (chunkText: string): Promise<Buffer> => {
    try {
      return await executeSingleCall(chunkText, finalLanguageCode, finalVoiceName);
    } catch (primaryErr: any) {
      console.warn(`Primary synthesis chunk failed for "${chunkText}":`, primaryErr?.message || primaryErr);
      
      // If truncation or token limit error occurred, split chunk into smaller halves
      if (primaryErr?.message?.includes('truncated') || primaryErr?.message?.includes('token') || chunkText.length > 30) {
        const words = chunkText.split(/\s+/).filter(Boolean);
        if (words.length > 1) {
          const mid = Math.ceil(words.length / 2);
          const part1 = words.slice(0, mid).join(' ');
          const part2 = words.slice(mid).join(' ');
          console.log(`Sub-chunking into smaller pieces: "${part1}" + "${part2}"`);
          const buf1 = await synthesizeChunkWithFallback(part1);
          const buf2 = await synthesizeChunkWithFallback(part2);
          return Buffer.concat([buf1, buf2]);
        }
      }

      // Voice or model fallback
      const fallbackLang = languageCode === 'si-LK' || languageCode === 'ta-LK' ? 'hi-IN' : 'en-US';
      const fallbackVoice = fallbackLang === 'hi-IN' ? 'Chatterbox-Multilingual.hi-IN.Male' : 'Chatterbox-Multilingual.en-US.Male';
      try {
        return await executeSingleCall(chunkText, fallbackLang, fallbackVoice);
      } catch (fallbackErr: any) {
        throw new Error(
          fallbackErr?.details || fallbackErr?.message || primaryErr?.message || 'Speech synthesis failed'
        );
      }
    }
  };

  // Split text into compact safe chunks (<= 45 chars) to prevent Triton 500 speech token truncation
  const chunks = splitTextIntoSentences(processedText, 45);
  const pcmBuffers: Buffer[] = [];

  // Add 60ms silence between chunks for smooth natural flow
  const silenceSamples = Math.floor(sampleRate * 0.06);
  const silenceBuffer = Buffer.alloc(silenceSamples * 2, 0); // 16-bit mono = 2 bytes per sample

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (!chunk.trim()) continue;
    const chunkPcm = await synthesizeChunkWithFallback(chunk);
    pcmBuffers.push(chunkPcm);
    if (i < chunks.length - 1) {
      pcmBuffers.push(silenceBuffer);
    }
  }

  const combinedPcmBuffer = Buffer.concat(pcmBuffers);
  const wavBuffer = pcmToWav(combinedPcmBuffer, sampleRate, 1);

  // Duration: samples = bytes / 2 (for 16-bit mono), duration = samples / sampleRate * 1000
  const totalSamples = combinedPcmBuffer.length / 2;
  const durationMs = Math.round((totalSamples / sampleRate) * 1000);

  return {
    wavBuffer,
    pcmBuffer: combinedPcmBuffer,
    durationMs,
    sampleRate,
  };
}
