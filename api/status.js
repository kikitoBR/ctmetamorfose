import { consultarStatusCobrancaAsaas } from './_asaasHelper.js';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido. Utilize GET.' });
  }

  const { id } = req.query || {};

  if (!id) {
    return res.status(400).json({ error: 'Parâmetro id da cobrança é obrigatório.' });
  }

  try {
    const statusData = await consultarStatusCobrancaAsaas(id);
    return res.status(200).json(statusData);
  } catch (error) {
    console.error('Erro na rota /api/status:', error);
    return res.status(500).json({
      error: error.message || 'Erro ao consultar status no Asaas'
    });
  }
}
