export interface LanguageConfig {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  subvoice: string;
  sampleText: string;
  description: string;
  region: string;
}

export interface TTSGenerationRequest {
  text: string;
  language: string;
  voice?: string;
  sampleRate?: number;
  temperature?: number;
  topP?: number;
  repetitionPenalty?: number;
  apiKey?: string;
}

export interface TTSGenerationResult {
  id: string;
  text: string;
  language: string;
  voice: string;
  audioUrl: string; // Base64 Data URL (data:audio/wav;base64,...)
  durationMs: number;
  sampleRate: number;
  byteLength: number;
  createdAt: string;
  temperature?: number;
  topP?: number;
  repetitionPenalty?: number;
}

export interface HealthCheckResponse {
  status: 'ok' | 'error';
  message: string;
  model: string;
  supportedLanguagesCount: number;
  hasApiKey: boolean;
}
