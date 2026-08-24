export default function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const hasEnvKey = !!process.env.NVIDIA_API_KEY;
  return res.status(200).json({
    status: 'ok',
    message: 'Resemble AI Chatterbox Multilingual TTS microservice ready',
    model: 'Chatterbox-Multilingual (500M T3 + S3Gen Diffusion Decoder)',
    provider: 'Resemble AI / NVIDIA NIM',
    server: 'grpc.nvcf.nvidia.com:443',
    functionId: 'ddacc747-1269-4fab-bfd9-8f593dead106',
    supportedLanguagesCount: 25,
    hasApiKey: hasEnvKey,
  });
}
