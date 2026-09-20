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

  let id = (req.query && req.query.id) || (req.body && req.body.id);
  if (!id && req.url) {
    try {
      const parsedUrl = new URL(req.url, 'http://localhost');
      id = parsedUrl.searchParams.get('id');
    } catch (e) {}
  }

  if (!id) {
    return res.status(400).json({ error: 'Parâmetro id é obrigatório para simulação.' });
  }

  const result = simularAprovacaoPix(id);
  return res.status(200).json(result);
}
