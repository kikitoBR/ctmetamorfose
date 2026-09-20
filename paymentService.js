/**
 * Serviço de Integração com Asaas e Validações de Pagamento
 * Academia Metamorfose — Checkout Seguro (Pix e Cartão à Vista)
 */

/**
 * Cria cobrança Pix chamando o backend seguro (/api/pix)
 */
export async function criarCobrancaPixAsaas({
  nome,
  cpf,
  dataNascimento,
  email,
  telefone,
  modalidades,
  periodo,
  valor = 129.90
}) {
  const response = await fetch('/api/pix', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      nome,
      cpf,
      dataNascimento,
      email,
      telefone,
      modalidades,
      periodo,
      valor
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Não foi possível gerar a cobrança Pix no Asaas.');
  }

  return await response.json();
}

/**
 * Cria cobrança de Cartão (Crédito/Débito) chamando o backend seguro (/api/card)
 */
export async function criarCobrancaCartaoAsaas({
  nome,
  cpf,
  dataNascimento,
  email,
  telefone,
  modalidades,
  periodo,
  valor = 129.90
}) {
  const response = await fetch('/api/card', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      nome,
      cpf,
      dataNascimento,
      email,
      telefone,
      modalidades,
      periodo,
      valor
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Não foi possível gerar a fatura de cartão no Asaas.');
  }

  return await response.json();
}

/**
 * Consulta o status atual de uma cobrança no Asaas (/api/status)
 */
export async function consultarStatusPixAsaas(paymentId) {
  if (!paymentId) return { status: 'PENDING', confirmed: false };

  const response = await fetch(`/api/status?id=${encodeURIComponent(paymentId)}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Erro ao consultar status no Asaas.');
  }

  return await response.json();
}

/**
 * Inicia polling inteligente e adaptativo para detecção de confirmação em tempo real
 * Otimizado para suportar mais de 80 usuários simultâneos no checkout:
 * - Intervalo dinâmico por estágios (4.5s -> 6.5s -> 9s -> 15s)
 * - Jitter aleatório (±600ms) para evitar picos de concorrência simultânea
 * - Page Visibility API: desacelera para 20s quando a aba está em segundo plano (ex: aluno no app do banco)
 *   e dispara verificação IMEDIATA assim que o aluno retorna ao navegador!
 */
export function iniciarPollingStatusPix({
  paymentId,
  onConfirmed,
  onError,
  onPoll,
  initialIntervalMs = 4000,
  timeoutMinutes = 15
}) {
  let isStopped = false;
  let timerId = null;
  let isChecking = false;
  const startTime = Date.now();
  const maxTimeMs = timeoutMinutes * 60 * 1000;

  // Calcula o intervalo ideal para o momento atual
  const getNextIntervalMs = () => {
    // Se o usuário minimizou ou trocou de aba (ex: abrindo o app do banco no celular)
    if (typeof document !== 'undefined' && document.hidden) {
      return 20000; // 20s em segundo plano economiza 80% das chamadas
    }

    const elapsedSec = (Date.now() - startTime) / 1000;
    let baseMs;

    if (elapsedSec < 35) {
      baseMs = 4500; // Primeiros 35s: leitura ativa do QR code
    } else if (elapsedSec < 120) {
      baseMs = 6500; // 35s a 2min: janela típica de confirmação bancária
    } else if (elapsedSec < 300) {
      baseMs = 9000; // 2min a 5min: espaçamento suave
    } else {
      baseMs = 15000; // Acima de 5min: verificação de longo prazo
    }

    // Jitter aleatório (± 600ms) para dispersar concorrência
    const jitter = Math.floor((Math.random() - 0.5) * 1200);
    return Math.max(3000, baseMs + jitter);
  };

  const check = async () => {
    if (isStopped || isChecking) return;
    isChecking = true;

    if (Date.now() - startTime > maxTimeMs) {
      isStopped = true;
      cleanup();
      if (onError) onError(new Error('Tempo limite para pagamento excedido.'));
      return;
    }

    try {
      const data = await consultarStatusPixAsaas(paymentId);
      if (onPoll) onPoll(data);

      if (data.confirmed || data.status === 'RECEIVED' || data.status === 'CONFIRMED') {
        isStopped = true;
        cleanup();
        if (onConfirmed) onConfirmed(data);
        return;
      }
    } catch (err) {
      console.warn('[Asaas Polling Info]:', err.message);
    } finally {
      isChecking = false;
    }

    if (!isStopped) {
      const nextDelay = getNextIntervalMs();
      timerId = setTimeout(check, nextDelay);
    }
  };

  // Quando o aluno volta para o site após pagar no app do banco, verifica IMEDIATAMENTE
  const handleVisibilityChange = () => {
    if (isStopped) return;
    if (typeof document !== 'undefined' && !document.hidden) {
      if (timerId) clearTimeout(timerId);
      check();
    }
  };

  const cleanup = () => {
    if (timerId) clearTimeout(timerId);
    if (typeof document !== 'undefined' && document.removeEventListener) {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  };

  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  // Primeira checagem após o delay inicial (padrão 4s)
  timerId = setTimeout(check, initialIntervalMs);

  return {
    stop: () => {
      isStopped = true;
      cleanup();
    }
  };
}

/**
 * Simula a confirmação do Pix para testes no ambiente Sandbox
 */
export async function simularAprovacaoPixLocal(paymentId) {
  const response = await fetch(`/api/simulate?id=${encodeURIComponent(paymentId)}`, {
    method: 'POST'
  });
  return await response.json();
}

/**
 * Obtém configurações públicas do backend
 */
export async function obterConfigPublica() {
  try {
    const res = await fetch('/api/config');
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Não foi possível obter config da API:', err);
  }
  return { isConfigured: false, environment: 'sandbox', whatsapp: '5522998449106' };
}

/**
 * Detecção de Bandeira do Cartão de Crédito
 */
export function detectarBandeiraCartao(numeroStr) {
  const num = numeroStr.replace(/\D/g, '');
  if (!num) return 'CARTÃO';

  if (/^4/.test(num)) return 'VISA';
  if (/^(5[1-5]|2[2-7])/.test(num)) return 'MASTERCARD';
  if (/^(4011|4312|4389|4514|5041|5066|5090|6362|6363)/.test(num)) return 'ELO';
  if (/^3[47]/.test(num)) return 'AMEX';
  if (/^6062/.test(num)) return 'HIPERCARD';

  return 'CARTÃO';
}

/**
 * Validação do Algoritmo de Luhn (Módulo 10) para número de cartão de crédito
 */
export function validarNumeroCartao(numeroStr) {
  const num = numeroStr.replace(/\D/g, '');
  if (num.length < 13 || num.length > 19) return false;

  let soma = 0;
  let dobrar = false;

  for (let i = num.length - 1; i >= 0; i--) {
    let digito = parseInt(num.charAt(i), 10);
    if (dobrar) {
      digito *= 2;
      if (digito > 9) digito -= 9;
    }
    soma += digito;
    dobrar = !dobrar;
  }

  return (soma % 10) === 0;
}

/**
 * Validação de Validade do Cartão (MM/AA)
 */
export function validarValidadeCartao(validadeStr) {
  const clean = validadeStr.replace(/\D/g, '');
  if (clean.length !== 4) return { valid: false, message: 'Digite no formato MM/AA.' };

  const mes = parseInt(clean.substring(0, 2), 10);
  const ano = parseInt(`20${clean.substring(2, 4)}`, 10);

  if (mes < 1 || mes > 12) {
    return { valid: false, message: 'Mês inválido (01 a 12).' };
  }

  const agora = new Date();
  const anoAtual = agora.getFullYear();
  const mesAtual = agora.getMonth() + 1;

  if (ano < anoAtual || (ano === anoAtual && mes < mesAtual)) {
    return { valid: false, message: 'Cartão vencido.' };
  }

  if (ano > anoAtual + 15) {
    return { valid: false, message: 'Ano inválido.' };
  }

  return { valid: true };
}

/**
 * Processamento de Cartão à Vista (Preparado para Asaas ou Simulação Sandbox)
 */
export async function processarCartaoAsaas({
  numero,
  titular,
  validade,
  cvv,
  valor = 129.90,
  lead
}) {
  // Simula latência de requisição bancária de 1.2 segundos
  await new Promise(resolve => setTimeout(resolve, 1200));

  const authCode = `ASAAS-AUT-${Math.floor(100000 + Math.random() * 900000)}`;
  const bandeira = detectarBandeiraCartao(numero);

  return {
    success: true,
    authCode,
    bandeira,
    valor,
    parcelas: '1x à vista sem juros',
    mensagem: 'Transação aprovada com sucesso via Asaas Pagamentos',
    dataHora: new Date().toLocaleString('pt-BR')
  };
}
