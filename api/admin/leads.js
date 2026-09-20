/**
 * Endpoint Protegido para Gestão de Leads pelos Administradores
 * Rota: /api/admin/leads
 */
import { authenticateAdminRequest } from '../_authHelper.js';
import { getLeadsList, getLeadsStats, updateLeadById, deleteLeadById } from '../_supabaseHelper.js';

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

  // Validação Estrita de Autenticação JWT via Bearer Token
  const admin = authenticateAdminRequest(req);
  if (!admin) {
    return res.status(401).json({ error: 'Sessão administrativa expirada ou inválida. Faça login novamente.' });
  }

  // GET: Lista leads com paginação, filtros e estatísticas consolidadas
  if (req.method === 'GET') {
    try {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const search = url.searchParams.get('search') || '';
      const status = url.searchParams.get('status') || '';
      const limitParam = url.searchParams.get('limit');
      const limit = limitParam ? parseInt(limitParam, 10) : null;
      const offset = parseInt(url.searchParams.get('offset') || '0', 10);

      const [leadsData, statsData] = await Promise.all([
        getLeadsList({ search, status, limit, offset }),
        getLeadsStats()
      ]);

      return res.status(200).json({
        success: true,
        leads: leadsData.leads,
        total: leadsData.total,
        stats: statsData,
        isSupabase: leadsData.isSupabase
      });
    } catch (err) {
      console.error('[API /api/admin/leads GET Error]:', err);
      return res.status(500).json({ error: 'Erro interno ao consultar leads.' });
    }
  }

  // PATCH: Atualização concorrente do status ou observações de um lead
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

  // DELETE: Remover lead de teste do sistema
  if (req.method === 'DELETE') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const id = body.id || url.searchParams.get('id');

      if (!id) {
        return res.status(400).json({ error: 'ID do lead é obrigatório para exclusão.' });
      }

      const deleted = await deleteLeadById(id);
      return res.status(200).json({ success: true, deleted });
    } catch (err) {
      console.error('[API /api/admin/leads DELETE Error]:', err);
      return res.status(500).json({ error: 'Erro interno ao excluir lead.' });
    }
  }

  return res.status(405).json({ error: 'Método não permitido.' });
}
