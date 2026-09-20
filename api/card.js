import { criarCobrancaCartaoAsaas } from './_asaasHelper.js';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Utilize POST.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { nome, cpf, dataNascimento, email, telefone, modalidades, periodo, valor, descricao } = body;

    if (!nome || !cpf) {
      return res.status(400).json({ error: 'Nome e CPF são obrigatórios para gerar o pagamento com cartão.' });
    }

    // O valor oficial do Lote Membro Fundador é R$ 129,90 e é travado estritamente no backend.
    // Qualquer tentativa de manipulação de preço no frontend é ignorada por segurança.
    const VALOR_OFICIAL = 129.90;

    const cobranca = await criarCobrancaCartaoAsaas({
      nome,
      cpf,
      dataNascimento,
      email,
      telefone,
      modalidades,
      periodo,
      valor: VALOR_OFICIAL,
      descricao
    });

    return res.status(200).json(cobranca);
  } catch (error) {
    console.error('Erro na rota /api/card:', error);
    return res.status(500).json({
      error: error.message || 'Erro interno ao processar cobrança de cartão no Asaas'
    });
  }
}
