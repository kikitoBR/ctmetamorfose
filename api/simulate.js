import { simularAprovacaoPix } from './_asaasHelper.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { id } = req.query || req.body || {};

  if (!id) {
    return res.status(400).json({ error: 'Parâmetro id é obrigatório para simulação.' });
  }

  const result = simularAprovacaoPix(id);
  return res.status(200).json(result);
}
