/**
 * Módulo Helper para Integração Segura com a API Asaas v3
 * Suporta Sandbox e Produção, com fallback para simulação quando chave não configurada.
 */
import QRCode from 'qrcode';

// Armazena cobranças simuladas em memória durante desenvolvimento
const cobrancasSimuladas = new Map();

import fs from 'fs';
import path from 'path';

/**
 * Lê o arquivo .env diretamente preservando caracteres como $ sem expansão de variáveis
 */
function readEnvDirectly() {
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

/**
 * Retorna as variáveis de ambiente
 */
export function getConfig() {
  const fileEnv = readEnvDirectly();
  const apiKey = (fileEnv.ASAAS_API_KEY || process.env.ASAAS_API_KEY || '').trim();
  
  let env = (fileEnv.ASAAS_ENVIRONMENT || process.env.ASAAS_ENVIRONMENT || '').trim().toLowerCase();

  // Auto-detecção inteligente pelo prefixo oficial da chave Asaas:
  // Chaves de produção do Asaas SEMPRE começam com $aact_prod_
  // Chaves de homologação/sandbox SEMPRE começam com $aact_hmlg_ ou $aact_sandbox_
  if (apiKey.startsWith('$aact_prod_')) {
    env = 'production';
  } else if (apiKey.startsWith('$aact_hmlg_') || apiKey.startsWith('$aact_sandbox_')) {
    env = 'sandbox';
  } else if (!env) {
    env = 'sandbox';
  }

  const whatsapp = (fileEnv.WHATSAPP_NUMBER || process.env.WHATSAPP_NUMBER || '5522998449106').trim();

  const isConfigured = apiKey.length > 10 && !apiKey.includes('SEU_TOKEN_AQUI');
  const baseUrl = env === 'production' 
    ? 'https://api.asaas.com/v3' 
    : 'https://sandbox.asaas.com/api/v3';

  return { apiKey, env, isConfigured, baseUrl, whatsapp };
}

/**
 * Cabeçalhos padrão para chamadas à API do Asaas
 */
function getHeaders(apiKey) {
  return {
    'Content-Type': 'application/json',
    'access_token': apiKey,
    'User-Agent': 'AcademiaMetamorfose-Site/1.0'
  };
}

/**
 * Calculador de CRC16 CCITT (Polinômio 0x1021) para padrão BR Code Pix
 */
function calcularCRC16(payload) {
  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= (payload.charCodeAt(i) << 8);
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Gera string oficial EMV Pix Copia e Cola para simulação
 */
function gerarPixCopiaEColaSimulado({
  chave = 'pix@ctmetamorfose.com.br',
  nomeRecebedor = 'ACADEMIA METAMORFOSE',
  cidadeRecebedor = 'CAMPOS DOS GOYT',
  valor = 129.90,
  txid = 'ASAAS01'
}) {
  const f = (id, val) => {
    const len = val.length.toString().padStart(2, '0');
    return `${id}${len}${val}`;
  };

  const gui = f('00', 'br.gov.bcb.pix');
  const key = f('01', chave);
  const merchantAccount = f('26', gui + key);

  const mcc = f('52', '0000');
  const moeda = f('53', '986'); // BRL
  const amountStr = valor.toFixed(2);
  const amount = f('54', amountStr);
  const pais = f('58', 'BR');
  const nome = f('59', nomeRecebedor.substring(0, 25));
  const cidade = f('60', cidadeRecebedor.substring(0, 15));

  const addDataField = f('05', txid.substring(0, 25));
  const addData = f('62', addDataField);

  const payloadSemCRC =
    f('00', '01') +
    f('01', '12') +
    merchantAccount +
    mcc +
    moeda +
    amount +
    pais +
    nome +
    cidade +
    addData +
    '6304';

  const checksum = calcularCRC16(payloadSemCRC);
  return payloadSemCRC + checksum;
}


/**
 * Cria ou localiza e atualiza um cliente na API do Asaas
 */
export async function buscarOuCriarClienteAsaas({
  nome,
  cpf,
  dataNascimento,
  email,
  telefone,
  modalidades,
  periodo
}) {
  const { apiKey, baseUrl } = getConfig();
  const cpfLimpo = (cpf || '').replace(/\D/g, '');
  const telLimpo = (telefone || '').replace(/\D/g, '');
  const modalidadesStr = Array.isArray(modalidades) 
    ? modalidades.join(', ') 
    : (modalidades || 'Todas as Modalidades');
  
  const obs = [
    dataNascimento ? `Nasc: ${dataNascimento}` : null,
    `Modalidades: ${modalidadesStr}`,
    periodo ? `Horário: ${periodo}` : null
  ].filter(Boolean).join(' | ');

  // 1. Busca por CPF se existir
  if (cpfLimpo) {
    try {
      const searchRes = await fetch(`${baseUrl}/customers?cpfCnpj=${cpfLimpo}`, {
        headers: getHeaders(apiKey)
      });
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.data && searchData.data.length > 0) {
          const customerId = searchData.data[0].id;
          // Atualiza dados e observações do cliente no Asaas para manter sincronizado
          try {
            await fetch(`${baseUrl}/customers/${customerId}`, {
              method: 'POST',
              headers: getHeaders(apiKey),
              body: JSON.stringify({
                name: nome || searchData.data[0].name,
                email: email || searchData.data[0].email,
                mobilePhone: telLimpo || searchData.data[0].mobilePhone,
                observations: obs,
                externalReference: `CPF-${cpfLimpo}`
              })
            });
          } catch (updateErr) {
            console.warn('Erro ao atualizar observações do cliente no Asaas:', updateErr);
          }
          return customerId;
        }
      }
    } catch (err) {
      console.warn('Erro ao buscar cliente por CPF no Asaas:', err);
    }
  }

  // 2. Se não encontrou, cria novo cliente
  const payload = {
    name: nome || 'Aluno Metamorfose',
    cpfCnpj: cpfLimpo || undefined,
    email: email || undefined,
    mobilePhone: telLimpo || undefined,
    observations: obs,
    externalReference: cpfLimpo ? `CPF-${cpfLimpo}` : undefined,
    notificationDisabled: false
  };

  const createRes = await fetch(`${baseUrl}/customers`, {
    method: 'POST',
    headers: getHeaders(apiKey),
    body: JSON.stringify(payload)
  });

  const createData = await createRes.json();
  if (!createRes.ok) {
    throw new Error(createData.errors?.[0]?.description || 'Erro ao cadastrar cliente no Asaas');
  }

  return createData.id;
}

/**
 * Cria cobrança Pix no Asaas e busca o QR Code
 */
export async function criarCobrancaPixAsaas({
  nome,
  cpf,
  dataNascimento,
  email,
  telefone,
  modalidades,
  periodo,
  valor = 129.90,
  descricao
}) {
  const config = getConfig();

  // Monta a descrição detalhada para identificação imediata no painel do Asaas
  const modalidadesStr = Array.isArray(modalidades) 
    ? modalidades.join(', ') 
    : (modalidades || 'Todas as Modalidades');

  const descPartes = [
    `Membro Fundador: ${nome || 'Aluno'}`,
    cpf ? `CPF: ${cpf}` : null,
    telefone ? `Tel: ${telefone}` : null,
    `Modalidades: ${modalidadesStr}`,
    periodo ? `Turno: ${periodo}` : null,
    dataNascimento ? `Nasc: ${dataNascimento}` : null
  ].filter(Boolean);

  let descFormatada = descricao || descPartes.join(' | ');
  if (descFormatada.length > 490) {
    descFormatada = descFormatada.substring(0, 487) + '...';
  }

  const cpfLimpo = (cpf || '').replace(/\D/g, '');
  const externalReference = cpfLimpo ? `MATR-${cpfLimpo}` : `METAMORFOSE-${Date.now().toString().slice(-6)}`;

  // Se não configurado com chave real, utiliza simulação elegante
  if (!config.isConfigured) {
    const txid = `ASAAS${Math.floor(100000 + Math.random() * 900000)}`;
    const pixCopiaECola = gerarPixCopiaEColaSimulado({
      chave: 'pix@ctmetamorfose.com.br',
      nomeRecebedor: 'ACADEMIA METAMORFOSE',
      valor,
      txid
    });

    const qrCodeDataUrl = await QRCode.toDataURL(pixCopiaECola, {
      width: 260,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    });

    const simulatedPayment = {
      id: `pay_sim_${txid}`,
      status: 'PENDING',
      valor,
      pixCopiaECola,
      qrCodeDataUrl,
      expiraEmMinutos: 15,
      isSimulated: true,
      ambiente: 'sandbox-demo',
      descricao: descFormatada,
      externalReference,
      aviso: 'Chave ASAAS_API_KEY não configurada no .env. Executando em modo demonstração.',
      criadoEm: new Date().toISOString()
    };

    cobrancasSimuladas.set(simulatedPayment.id, simulatedPayment);
    return simulatedPayment;
  }

  // Com chave de API configurada:
  // 1. Obter ID do cliente
  const customerId = await buscarOuCriarClienteAsaas({
    nome,
    cpf,
    dataNascimento,
    email,
    telefone,
    modalidades,
    periodo
  });

  // 2. Data de vencimento (hoje)
  const hoje = new Date().toISOString().split('T')[0];

  // 3. Criar cobrança PIX com descrição detalhada e identificador externo
  const paymentPayload = {
    customer: customerId,
    billingType: 'PIX',
    value: valor,
    dueDate: hoje,
    description: descFormatada,
    externalReference: externalReference
  };

  const paymentRes = await fetch(`${config.baseUrl}/payments`, {
    method: 'POST',
    headers: getHeaders(config.apiKey),
    body: JSON.stringify(paymentPayload)
  });

  const paymentData = await paymentRes.json();
  if (!paymentRes.ok) {
    throw new Error(paymentData.errors?.[0]?.description || 'Erro ao criar cobrança no Asaas');
  }

  const paymentId = paymentData.id;

  // 4. Obter o QR Code Pix e Copia e Cola
  const qrRes = await fetch(`${config.baseUrl}/payments/${paymentId}/pixQrCode`, {
    headers: getHeaders(config.apiKey)
  });

  const qrData = await qrRes.json();
  if (!qrRes.ok) {
    throw new Error(qrData.errors?.[0]?.description || 'Erro ao obter QR Code Pix do Asaas');
  }

  return {
    id: paymentId,
    status: paymentData.status || 'PENDING',
    valor,
    pixCopiaECola: qrData.payload,
    qrCodeDataUrl: `data:image/png;base64,${qrData.encodedImage}`,
    expirationDate: qrData.expirationDate,
    invoiceUrl: paymentData.invoiceUrl,
    descricao: descFormatada,
    externalReference,
    isSimulated: false,
    ambiente: config.env,
    criadoEm: new Date().toISOString()
  };
}

/**
 * Cria cobrança para Cartão (Crédito/Débito) no Asaas e obtém a invoiceUrl segura
 */
export async function criarCobrancaCartaoAsaas({
  nome,
  cpf,
  dataNascimento,
  email,
  telefone,
  modalidades,
  periodo,
  valor = 129.90,
  descricao
}) {
  const config = getConfig();

  const modalidadesStr = Array.isArray(modalidades) 
    ? modalidades.join(', ') 
    : (modalidades || 'Todas as Modalidades');

  const descPartes = [
    `Membro Fundador (Cartão): ${nome || 'Aluno'}`,
    cpf ? `CPF: ${cpf}` : null,
    telefone ? `Tel: ${telefone}` : null,
    `Modalidades: ${modalidadesStr}`,
    periodo ? `Turno: ${periodo}` : null,
    dataNascimento ? `Nasc: ${dataNascimento}` : null
  ].filter(Boolean);

  let descFormatada = descricao || descPartes.join(' | ');
  if (descFormatada.length > 490) {
    descFormatada = descFormatada.substring(0, 487) + '...';
  }

  const cpfLimpo = (cpf || '').replace(/\D/g, '');
  const externalReference = cpfLimpo ? `MATR-CARD-${cpfLimpo}` : `METAMORFOSE-CARD-${Date.now().toString().slice(-6)}`;

  // Se não configurado com chave real, utiliza simulação elegante
  if (!config.isConfigured) {
    const txid = `CARD${Math.floor(100000 + Math.random() * 900000)}`;
    const simulatedPayment = {
      id: `pay_sim_${txid}`,
      status: 'PENDING',
      valor,
      invoiceUrl: `https://sandbox.asaas.com/i/sim_${txid}`,
      isSimulated: true,
      ambiente: 'sandbox-demo',
      descricao: descFormatada,
      externalReference,
      aviso: 'Chave ASAAS_API_KEY não configurada no .env. Executando em modo demonstração.',
      criadoEm: new Date().toISOString()
    };

    cobrancasSimuladas.set(simulatedPayment.id, simulatedPayment);
    return simulatedPayment;
  }

  // Com chave de API configurada:
  // 1. Obter ID do cliente
  const customerId = await buscarOuCriarClienteAsaas({
    nome,
    cpf,
    dataNascimento,
    email,
    telefone,
    modalidades,
    periodo
  });

  // 2. Data de vencimento (hoje)
  const hoje = new Date().toISOString().split('T')[0];

  // 3. Criar cobrança de cartão (sem passar dados sensíveis, para obter invoiceUrl oficial)
  const paymentPayload = {
    customer: customerId,
    billingType: 'CREDIT_CARD',
    value: valor,
    dueDate: hoje,
    description: descFormatada,
    externalReference: externalReference
  };

  const paymentRes = await fetch(`${config.baseUrl}/payments`, {
    method: 'POST',
    headers: getHeaders(config.apiKey),
    body: JSON.stringify(paymentPayload)
  });

  const paymentData = await paymentRes.json();
  if (!paymentRes.ok) {
    throw new Error(paymentData.errors?.[0]?.description || 'Erro ao criar cobrança de cartão no Asaas');
  }

  return {
    id: paymentData.id,
    status: paymentData.status || 'PENDING',
    valor,
    invoiceUrl: paymentData.invoiceUrl,
    descricao: descFormatada,
    externalReference,
    isSimulated: false,
    ambiente: config.env,
    criadoEm: new Date().toISOString()
  };
}

// Micro-cache em memória para status (reduz concorrência na API do Asaas)
const statusCache = new Map();

/**
 * Consulta status da cobrança no Asaas ou na simulação
 */
export async function consultarStatusCobrancaAsaas(paymentId) {
  const config = getConfig();

  // Verifica se temos resultado em cache válido (TTL de 2.5 segundos ou 60s se confirmado)
  if (paymentId && statusCache.has(paymentId)) {
    const cached = statusCache.get(paymentId);
    if (cached.expiresAt > Date.now()) {
      return cached.data;
    }
  }

  // Verifica se é cobrança simulada
  if (paymentId && paymentId.startsWith('pay_sim_')) {
    const item = cobrancasSimuladas.get(paymentId);
    if (!item) return { status: 'NOT_FOUND', confirmed: false };
    return {
      paymentId,
      status: item.status,
      confirmed: item.status === 'RECEIVED' || item.status === 'CONFIRMED',
      isSimulated: true
    };
  }

  if (!config.isConfigured) {
    return { status: 'PENDING', confirmed: false, isSimulated: true };
  }

  const res = await fetch(`${config.baseUrl}/payments/${paymentId}`, {
    headers: getHeaders(config.apiKey)
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.errors?.[0]?.description || 'Erro ao consultar status no Asaas');
  }

  const data = await res.json();
  const confirmed = data.status === 'RECEIVED' || data.status === 'CONFIRMED';

  const result = {
    paymentId: data.id,
    status: data.status,
    confirmed,
    clientPaymentDate: data.clientPaymentDate,
    paymentDate: data.paymentDate,
    value: data.value,
    isSimulated: false
  };

  // Se confirmado, mantém em cache por 60s; se pendente, micro-cache de 2.5s para evitar picos
  if (paymentId) {
    statusCache.set(paymentId, {
      data: result,
      expiresAt: Date.now() + (confirmed ? 60000 : 2500)
    });
  }

  return result;
}

/**
 * Simula a confirmação de um pagamento de teste
 */
export function simularAprovacaoPix(paymentId) {
  if (paymentId) {
    statusCache.delete(paymentId);
  }
  if (cobrancasSimuladas.has(paymentId)) {
    const item = cobrancasSimuladas.get(paymentId);
    item.status = 'RECEIVED';
    cobrancasSimuladas.set(paymentId, item);
    return { success: true, status: 'RECEIVED' };
  }
  return { success: false, message: 'Cobrança não encontrada para simulação' };
}
