/**
 * Endpoint Público para Cadastro e Atualização de Leads
 * Rota: /api/leads
 */
import { insertOrUpdateLead, updateLeadById } from './_supabaseHelper.js';

export default async function handler(req, res) {
  // Headers CORS
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

  // POST: Cadastra novo lead (quando preenche o formulário)
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const { nome, cpf, dataNascimento, email, telefone, modalidades, periodo } = body;

      if (!nome || !cpf || !telefone) {
        return res.status(400).json({ error: 'Nome, CPF e Telefone são obrigatórios.' });
      }

      // Limpeza e sanitização básica
      const sanitizedCpf = cpf.replace(/[^\d.-]/g, '');
      const sanitizedPhone = telefone.replace(/[^\d()+\s-]/g, '');

      const lead = await insertOrUpdateLead({
        nome: nome.trim(),
        cpf: sanitizedCpf,
        dataNascimento: dataNascimento || '',
        email: email ? email.trim() : '',
        telefone: sanitizedPhone,
        modalidades: Array.isArray(modalidades) ? modalidades : [],
        periodo: periodo || '',
        status: 'AGUARDANDO_PAGAMENTO',
        valor: 129.90
      });

      return res.status(200).json({ success: true, lead });
    } catch (err) {
      console.error('[API /api/leads POST Error]:', err.message);
      return res.status(500).json({ error: 'Erro interno ao salvar lead.' });
    }
  }

  // PATCH: Vincula IDs do Asaas ou status ao lead gerado
  if (req.method === 'PATCH') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const { leadId, cpf, asaasPaymentId, asaasCustomerId, asaasInvoiceUrl, metodoPagamento, metodo_pagamento, status } = body;

      if (!leadId && !cpf) {
        return res.status(400).json({ error: 'leadId ou cpf é obrigatório.' });
      }

      const updateData = {};
      if (asaasPaymentId) updateData.asaas_payment_id = asaasPaymentId;
      if (asaasCustomerId) updateData.asaas_customer_id = asaasCustomerId;
      if (asaasInvoiceUrl) updateData.asaas_invoice_url = asaasInvoiceUrl;
      if (metodoPagamento || metodo_pagamento) updateData.metodo_pagamento = metodoPagamento || metodo_pagamento;
      if (status) {
        updateData.status = status;
        if (status === 'PAGO') {
          updateData.pago_em = new Date().toISOString();
        }
      }

      let updated = null;
      if (leadId) {
        updated = await updateLeadById(leadId, updateData);
      }
      
      // Se não encontrou por leadId mas temos CPF, atualiza por CPF
      if (!updated && cpf) {
        const sanitizedCpf = cpf.replace(/[^\d.-]/g, '');
        updated = await insertOrUpdateLead({ cpf: sanitizedCpf, ...updateData });
      }

      return res.status(200).json({ success: true, lead: updated });
    } catch (err) {
      console.error('[API /api/leads PATCH Error]:', err.message);
      return res.status(500).json({ error: 'Erro interno ao atualizar lead.' });
    }
  }

  return res.status(405).json({ error: 'Método não permitido.' });
}
