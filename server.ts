import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { synthesizeSpeech } from './server/ttsService';

dotenv.config();

const app = express();
const PORT = 3000;

// Body parser
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Health Check API
app.get('/api/tts/health', (req, res) => {
  const hasEnvKey = !!process.env.NVIDIA_API_KEY;
  res.json({
    status: 'ok',
    message: 'Resemble AI Chatterbox Multilingual TTS microservice ready',
    model: 'Chatterbox-Multilingual (500M T3 + S3Gen Diffusion Decoder)',
    provider: 'Resemble AI / NVIDIA NIM',
    server: 'grpc.nvcf.nvidia.com:443',
    functionId: 'ddacc747-1269-4fab-bfd9-8f593dead106',
    supportedLanguagesCount: 25,
    hasApiKey: hasEnvKey || true,
  });
});

// Synthesis Endpoint
app.post('/api/tts/generate', async (req, res) => {
  try {
    const {
      text,
      language = 'en-US',
      voice,
      sampleRate = 24000,
      temperature = 0.8,
      topP = 0.7,
      repetitionPenalty = 2.0,
      apiKey,
      format = 'json',
    } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text prompt is required.' });
    }

    if (text.length > 2000) {
      return res.status(400).json({
        error: 'Text length exceeds maximum limit of 2,000 characters for single pass.',
      });
    }

    const voiceName = voice || `Chatterbox-Multilingual.${language}.Male`;
    const finalApiKey = apiKey || process.env.NVIDIA_API_KEY;

    const result = await synthesizeSpeech({
      text: text.trim(),
      languageCode: language,
      voiceName,
      sampleRate: Number(sampleRate) || 24000,
      temperature: Number(temperature) || 0.8,
      topP: Number(topP) || 0.7,
      repetitionPenalty: Number(repetitionPenalty) || 2.0,
      apiKey: finalApiKey,
    });

    if (format === 'binary' || req.headers.accept === 'audio/wav') {
      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Content-Disposition', `attachment; filename="chatterbox_${language}_${Date.now()}.wav"`);
      return res.send(result.wavBuffer);
    }

    const base64Audio = result.wavBuffer.toString('base64');
    const audioUrl = `data:audio/wav;base64,${base64Audio}`;

    return res.json({
      success: true,
      id: `gen_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      audioUrl,
      durationMs: result.durationMs,
      sampleRate: result.sampleRate,
      byteLength: result.wavBuffer.length,
      text: text.trim(),
      language,
      voice: voiceName,
      temperature: Number(temperature),
      topP: Number(topP),
      repetitionPenalty: Number(repetitionPenalty),
      createdAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error generating speech:', error);
    let errorMsg = 'An error occurred while synthesizing speech.';
    if (typeof error === 'string') {
      errorMsg = error;
    } else if (error && typeof error.message === 'string' && error.message !== '[object Object]') {
      errorMsg = error.message;
    } else if (error && typeof error.details === 'string') {
      errorMsg = error.details;
    } else if (error) {
      try {
        const str = JSON.stringify(error);
        errorMsg = str === '{}' ? String(error) : str;
      } catch {
        errorMsg = String(error);
      }
    }

    if (errorMsg.includes('16 UNAUTHENTICATED') || errorMsg.includes('Invalid API key') || errorMsg.includes('unauthorized')) {
      errorMsg = 'NVIDIA API Key is invalid or expired. Please click the Key icon in the top-right header to configure your NVIDIA NIM API Key.';
    }

    return res.status(500).json({
      success: false,
      error: errorMsg,
    });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
