/**
 * Endpoint Protegido para Gestão de Leads pelos Administradores
 * Rota: /api/admin/leads
 */
import { authenticateAdminRequest } from '../_authHelper.js';
import { getLeadsList, getLeadsStats, updateLeadById } from '../_supabaseHelper.js';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 1. Verificação de Autenticação Segura (Zero Trust)
  const admin = authenticateAdminRequest(req);
  if (!admin) {
    return res.status(401).json({ error: 'Não autorizado. Token de sessão ausente ou expirado.' });
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  // GET: Listagem de leads com busca, filtros e KPIs
  if (req.method === 'GET') {
    try {
      const search = url.searchParams.get('search') || '';
      const status = url.searchParams.get('status') || '';
      const limit = parseInt(url.searchParams.get('limit') || '200', 10);
      const offset = parseInt(url.searchParams.get('offset') || '0', 10);

      const [leadsResult, stats] = await Promise.all([
        getLeadsList({ search, status, limit, offset }),
        getLeadsStats()
      ]);

      return res.status(200).json({
        leads: leadsResult.leads,
        total: leadsResult.total,
        stats,
        isSupabase: leadsResult.isSupabase
      });
    } catch (err) {
      console.error('[API /api/admin/leads GET Error]:', err);
      return res.status(500).json({ error: 'Erro interno ao listar leads.' });
    }
  }

  // PATCH: Atualização de status ou observações de um lead
  if (req.method === 'PATCH') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const { id, status, observacoes, admin_responsavel } = body;

      if (!id) {
        return res.status(400).json({ error: 'ID do lead é obrigatório.' });
      }

      const updatePayload = {};
      if (status) {
        const allowedStatuses = ['NOVO_LEAD', 'AGUARDANDO_PAGAMENTO', 'PAGO', 'EM_CONTATO', 'EM_ATENDIMENTO', 'CANCELADO'];
        if (!allowedStatuses.includes(status)) {
          return res.status(400).json({ error: 'Status informado é inválido.' });
        }
        updatePayload.status = status;
        if (status === 'PAGO' && !updatePayload.pago_em) {
          updatePayload.pago_em = new Date().toISOString();
        }
      }
      if (typeof observacoes === 'string') {
        updatePayload.observacoes = observacoes;
      }
      if (admin_responsavel) {
        updatePayload.admin_responsavel = admin_responsavel;
      } else if (!updatePayload.admin_responsavel) {
        updatePayload.admin_responsavel = admin.user;
      }

      const updated = await updateLeadById(id, updatePayload);
      if (!updated) {
        return res.status(404).json({ error: 'Lead não encontrado.' });
      }

      return res.status(200).json({ success: true, lead: updated });
    } catch (err) {
      console.error('[API /api/admin/leads PATCH Error]:', err);
      return res.status(500).json({ error: 'Erro interno ao atualizar lead.' });
    }
  }

  return res.status(405).json({ error: 'Método não permitido.' });
}
