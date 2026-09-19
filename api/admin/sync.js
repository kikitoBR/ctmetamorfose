/**
 * Endpoint Protegido para Sincronização Ativa com Asaas
 * Rota: /api/admin/sync
 */
import { authenticateAdminRequest } from '../_authHelper.js';
import { getLeadsList, updateLeadByPaymentId } from '../_supabaseHelper.js';
import { consultarStatusCobrancaAsaas } from '../_asaasHelper.js';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 1. Verificação de Autenticação Segura
  const admin = authenticateAdminRequest(req);
  if (!admin) {
    return res.status(401).json({ error: 'Não autorizado. Token de sessão ausente ou expirado.' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Utilize POST.' });
  }

  try {
    // 2. Busca leads pendentes que possuem cobrança gerada no Asaas
    const leadsResult = await getLeadsList({ limit: 500 });
    const pendingWithPayment = leadsResult.leads.filter(
      l => l.status !== 'PAGO' && Boolean(l.asaas_payment_id)
    );

    let updatedCount = 0;
    const updatedList = [];

    // 3. Consulta status no Asaas para cada cobrança pendente
    for (const lead of pendingWithPayment) {
      try {
        const asaasData = await consultarStatusCobrancaAsaas(lead.asaas_payment_id);
        
        if (asaasData && (asaasData.confirmed || asaasData.status === 'RECEIVED' || asaasData.status === 'CONFIRMED')) {
          const updated = await updateLeadByPaymentId(lead.asaas_payment_id, {
            status: 'PAGO',
            pago_em: asaasData.paymentDate || new Date().toISOString()
          });
          if (updated) {
            updatedCount++;
            updatedList.push({ nome: lead.nome, paymentId: lead.asaas_payment_id });
          }
        }
      } catch (err) {
        console.warn(`[Sync Error for ${lead.asaas_payment_id}]:`, err.message);
      }
    }

    return res.status(200).json({
      success: true,
      totalChecked: pendingWithPayment.length,
      updatedCount,
      updatedLeads: updatedList,
      message: updatedCount > 0 
        ? `${updatedCount} pagamento(s) confirmado(s) e atualizado(s) com sucesso!` 
        : 'Todos os pagamentos pendentes já estão atualizados.'
    });
  } catch (err) {
    console.error('[API /api/admin/sync Error]:', err);
    return res.status(500).json({ error: 'Erro interno durante a sincronização com Asaas.' });
  }
}
