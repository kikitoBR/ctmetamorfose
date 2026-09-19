/**
 * Módulo Helper para Integração Segura com o Supabase (PostgreSQL)
 * Utiliza a API REST oficial do PostgREST via fetch nativo,
 * com fallback local transparente caso as chaves ainda não estejam no .env.
 */
import fs from 'fs';
import path from 'path';

function readEnvFile() {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const env = {};
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
            val = val.slice(1, -1);
          }
          env[key] = val;
        }
      }
      return env;
    }
  } catch (err) {
    // ignore
  }
  return {};
}

export function getSupabaseConfig() {
  const env = readEnvFile();
  const url = (env.SUPABASE_URL || process.env.SUPABASE_URL || '').trim().replace(/\/$/, '');
  const key = (env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim();

  const isConfigured = Boolean(url && key && url.startsWith('http') && !url.includes('seu-projeto'));
  return { url, key, isConfigured };
}

// Fallback Local Seguro (em arquivo data/leads.json) enquanto o Supabase não estiver configurado
const LOCAL_DATA_DIR = path.resolve(process.cwd(), 'data');
const LOCAL_LEADS_FILE = path.resolve(LOCAL_DATA_DIR, 'leads.json');

function getLocalLeads() {
  try {
    if (!fs.existsSync(LOCAL_DATA_DIR)) {
      fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(LOCAL_LEADS_FILE)) {
      return JSON.parse(fs.readFileSync(LOCAL_LEADS_FILE, 'utf8') || '[]');
    }
  } catch (err) {
    console.warn('[Local Leads Storage]:', err.message);
  }
  return [];
}

function saveLocalLeads(leads) {
  try {
    if (!fs.existsSync(LOCAL_DATA_DIR)) {
      fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(LOCAL_LEADS_FILE, JSON.stringify(leads, null, 2), 'utf8');
  } catch (err) {
    console.warn('[Local Leads Save]:', err.message);
  }
}

/**
 * Insere ou atualiza um lead
 */
export async function insertOrUpdateLead(leadData) {
  const config = getSupabaseConfig();

  const leadRecord = {
    id: leadData.id || `lead_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    created_at: leadData.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    nome: leadData.nome,
    cpf: leadData.cpf,
    email: leadData.email || '',
    telefone: leadData.telefone,
    data_nascimento: leadData.dataNascimento || leadData.data_nascimento || '',
    modalidades: leadData.modalidades || [],
    periodo: leadData.periodo || '',
    status: leadData.status || 'AGUARDANDO_PAGAMENTO',
    metodo_pagamento: leadData.metodo_pagamento || leadData.metodoPagamento || '',
    valor: leadData.valor || 129.90,
    asaas_payment_id: leadData.asaas_payment_id || leadData.asaasPaymentId || null,
    asaas_customer_id: leadData.asaas_customer_id || leadData.asaasCustomerId || null,
    asaas_invoice_url: leadData.asaas_invoice_url || leadData.asaasInvoiceUrl || null,
    pago_em: leadData.pago_em || null,
    observacoes: leadData.observacoes || '',
    admin_responsavel: leadData.admin_responsavel || ''
  };

  if (!config.isConfigured) {
    // Modo Local
    const leads = getLocalLeads();
    const existingIndex = leads.findIndex(l => (leadRecord.cpf && l.cpf === leadRecord.cpf) || (leadRecord.id && l.id === leadRecord.id));

    if (existingIndex >= 0) {
      leads[existingIndex] = { ...leads[existingIndex], ...leadRecord, updated_at: new Date().toISOString() };
      saveLocalLeads(leads);
      return leads[existingIndex];
    } else {
      leads.unshift(leadRecord);
      saveLocalLeads(leads);
      return leadRecord;
    }
  }

  // Modo Supabase Oficial
  try {
    const response = await fetch(`${config.url}/rest/v1/leads`, {
      method: 'POST',
      headers: {
        'apikey': config.key,
        'Authorization': `Bearer ${config.key}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=representation'
      },
      body: JSON.stringify(leadRecord)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Erro Supabase (${response.status}): ${errText}`);
    }

    const inserted = await response.json();
    return inserted[0] || leadRecord;
  } catch (err) {
    console.error('[Supabase Insert Error]:', err.message);
    // Fallback gracioso para local se houver falha de rede
    const leads = getLocalLeads();
    leads.unshift(leadRecord);
    saveLocalLeads(leads);
    return leadRecord;
  }
}

/**
 * Atualiza um lead por ID
 */
export async function updateLeadById(id, updateData) {
  const config = getSupabaseConfig();
  const fields = { ...updateData, updated_at: new Date().toISOString() };

  if (!config.isConfigured) {
    const leads = getLocalLeads();
    const idx = leads.findIndex(l => l.id === id);
    if (idx >= 0) {
      leads[idx] = { ...leads[idx], ...fields };
      saveLocalLeads(leads);
      return leads[idx];
    }
    return null;
  }

  try {
    const response = await fetch(`${config.url}/rest/v1/leads?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: {
        'apikey': config.key,
        'Authorization': `Bearer ${config.key}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(fields)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Erro Supabase (${response.status}): ${errText}`);
    }

    const updated = await response.json();
    return updated[0] || null;
  } catch (err) {
    console.error('[Supabase Update Error]:', err.message);
    const leads = getLocalLeads();
    const idx = leads.findIndex(l => l.id === id);
    if (idx >= 0) {
      leads[idx] = { ...leads[idx], ...fields };
      saveLocalLeads(leads);
      return leads[idx];
    }
    return null;
  }
}

/**
 * Atualiza o status do lead buscando pelo asaas_payment_id
 */
export async function updateLeadByPaymentId(asaasPaymentId, updateData) {
  const config = getSupabaseConfig();
  const fields = { ...updateData, updated_at: new Date().toISOString() };

  if (!config.isConfigured) {
    const leads = getLocalLeads();
    const idx = leads.findIndex(l => l.asaas_payment_id === asaasPaymentId);
    if (idx >= 0) {
      leads[idx] = { ...leads[idx], ...fields };
      saveLocalLeads(leads);
      return leads[idx];
    }
    return null;
  }

  try {
    const response = await fetch(`${config.url}/rest/v1/leads?asaas_payment_id=eq.${encodeURIComponent(asaasPaymentId)}`, {
      method: 'PATCH',
      headers: {
        'apikey': config.key,
        'Authorization': `Bearer ${config.key}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(fields)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Erro Supabase (${response.status}): ${errText}`);
    }

    const updated = await response.json();
    return updated[0] || null;
  } catch (err) {
    console.error('[Supabase Update PaymentId Error]:', err.message);
    const leads = getLocalLeads();
    const idx = leads.findIndex(l => l.asaas_payment_id === asaasPaymentId);
    if (idx >= 0) {
      leads[idx] = { ...leads[idx], ...fields };
      saveLocalLeads(leads);
      return leads[idx];
    }
    return null;
  }
}

/**
 * Busca leads com paginação, busca e filtros
 */
export async function getLeadsList({ search = '', status = '', limit = 100, offset = 0 } = {}) {
  const config = getSupabaseConfig();

  if (!config.isConfigured) {
    let leads = getLocalLeads();

    if (status && status !== 'ALL') {
      leads = leads.filter(l => l.status === status);
    }
    if (search) {
      const q = search.toLowerCase();
      leads = leads.filter(l => 
        (l.nome && l.nome.toLowerCase().includes(q)) ||
        (l.cpf && l.cpf.includes(q)) ||
        (l.telefone && l.telefone.includes(q)) ||
        (l.email && l.email.toLowerCase().includes(q))
      );
    }

    const total = leads.length;
    const paginated = leads.slice(offset, offset + limit);

    return {
      leads: paginated,
      total,
      isSupabase: false
    };
  }

  try {
    let queryUrl = `${config.url}/rest/v1/leads?select=*&order=created_at.desc&limit=${limit}&offset=${offset}`;

    if (status && status !== 'ALL') {
      queryUrl += `&status=eq.${encodeURIComponent(status)}`;
    }
    if (search) {
      const q = encodeURIComponent(`%${search}%`);
      queryUrl += `&or=(nome.ilike.${q},cpf.ilike.${q},telefone.ilike.${q},email.ilike.${q})`;
    }

    const response = await fetch(queryUrl, {
      method: 'GET',
      headers: {
        'apikey': config.key,
        'Authorization': `Bearer ${config.key}`,
        'Prefer': 'count=exact'
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Erro Supabase (${response.status}): ${errText}`);
    }

    const contentRange = response.headers.get('content-range');
    let total = 0;
    if (contentRange && contentRange.includes('/')) {
      total = parseInt(contentRange.split('/')[1], 10) || 0;
    }

    const leads = await response.json();
    return {
      leads,
      total: total || leads.length,
      isSupabase: true
    };
  } catch (err) {
    console.error('[Supabase List Error]:', err.message);
    const leads = getLocalLeads();
    return {
      leads: leads.slice(offset, offset + limit),
      total: leads.length,
      isSupabase: false
    };
  }
}

/**
 * Calcula métricas e KPIs consolidados
 */
export async function getLeadsStats() {
  const result = await getLeadsList({ limit: 1000 });
  const all = result.leads;

  const totalLeads = result.total;
  const pagos = all.filter(l => l.status === 'PAGO');
  const aguardando = all.filter(l => l.status === 'AGUARDANDO_PAGAMENTO');
  const emAtendimento = all.filter(l => l.status === 'EM_CONTATO' || l.status === 'EM_ATENDIMENTO');
  const cancelados = all.filter(l => l.status === 'CANCELADO');

  const receitaTotal = pagos.reduce((acc, curr) => acc + (Number(curr.valor) || 129.90), 0);
  const vagasOcupadas = pagos.length;
  const metaLoteFundador = 50;

  return {
    totalLeads,
    vagasOcupadas,
    metaLoteFundador,
    percentualMeta: Math.min(100, Math.round((vagasOcupadas / metaLoteFundador) * 100)),
    receitaTotal,
    aguardandoTotal: aguardando.length,
    emAtendimentoTotal: emAtendimento.length,
    canceladosTotal: cancelados.length,
    isSupabase: result.isSupabase
  };
}
