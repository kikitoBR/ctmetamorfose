import { getConfig } from './_asaasHelper.js';

/**
 * Endpoint Vercel Serverless: GET /api/config
 * Retorna configurações públicas da aplicação (status de ambiente, WhatsApp oficial)
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const cfg = getConfig();
    return res.status(200).json({
      isConfigured: cfg.isConfigured,
      environment: cfg.env,
      whatsapp: cfg.whatsapp || '5522998449106'
    });
  } catch (err) {
    return res.status(500).json({ 
      error: err.message, 
      whatsapp: '5522998449106' 
    });
  }
}
