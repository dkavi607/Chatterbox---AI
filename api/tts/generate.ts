import { synthesizeSpeech } from '../../server/ttsService';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        body = {};
      }
    } else if (Buffer.isBuffer(body)) {
      try {
        body = JSON.parse(body.toString('utf-8'));
      } catch (e) {
        body = {};
      }
    }

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
    } = body || {};

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

    if (format === 'binary' || req.headers?.accept === 'audio/wav') {
      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="chatterbox_${language}_${Date.now()}.wav"`
      );
      return res.send(result.wavBuffer);
    }

    const base64Audio = result.wavBuffer.toString('base64');
    const audioUrl = `data:audio/wav;base64,${base64Audio}`;

    return res.status(200).json({
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
    console.error('Error generating speech in Vercel function:', error);
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
}
