/**
 * Webhook Oficial do Asaas para Notificações em Tempo Real
 * Rota: /api/webhook/asaas
 */
import { updateLeadByPaymentId } from '../_supabaseHelper.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Utilize POST.' });
  }

  // Validação opcional de token de segurança do webhook
  const configuredToken = process.env.ASAAS_WEBHOOK_ACCESS_TOKEN;
  if (configuredToken) {
    const receivedToken = req.headers['asaas-access-token'];
    if (receivedToken !== configuredToken) {
      console.warn('[Asaas Webhook]: Token de acesso inválido');
      return res.status(401).json({ error: 'Acesso não autorizado ao webhook.' });
    }
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { event, payment } = body;

    console.log(`[Asaas Webhook Event]: ${event} para pagamento ${payment?.id}`);

    if (!payment || !payment.id) {
      return res.status(200).json({ received: true, ignored: true, reason: 'Sem payment.id' });
    }

    // Eventos de Pagamento Confirmado
    const confirmedEvents = [
      'PAYMENT_RECEIVED',
      'PAYMENT_CONFIRMED',
      'PAYMENT_DUNNING_RECEIVED'
    ];

    if (confirmedEvents.includes(event)) {
      const updated = await updateLeadByPaymentId(payment.id, {
        status: 'PAGO',
        pago_em: payment.paymentDate || new Date().toISOString()
      });

      console.log(`[Asaas Webhook]: Lead atualizado para PAGO (id: ${payment.id}) ->`, Boolean(updated));
    }

    return res.status(200).json({ received: true, event, paymentId: payment.id });
  } catch (err) {
    console.error('[Asaas Webhook Error]:', err.message);
    // Sempre retorna 200 pro Asaas não ficar retentando se for erro interno de parse
    return res.status(200).json({ received: true, error: err.message });
  }
}
