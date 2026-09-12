import QRCode from 'qrcode';

/**
 * Calculador de CRC16 CCITT (Polinômio 0x1021) para o padrão BR Code / Pix oficial do Banco Central
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
 * Monta a string oficial EMV "Pix Copia e Cola"
 */
export function gerarPixCopiaECola({
  chave = 'financeiro@ctmetamorfose.com.br',
  nomeRecebedor = 'CT METAMORFOSE',
  cidadeRecebedor = 'CAMPOS DOS GOYT',
  valor = 129.90,
  txid = 'SICOOB01'
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
 * Gera os dados de cobrança Pix no Sandbox do Sicoob
 */
export async function criarCobrancaPixSandbox({ nome, cpf, valor = 129.90 }) {
  const txid = `METAMORFOSE${Math.floor(100000 + Math.random() * 900000)}`;
  const pixCopiaECola = gerarPixCopiaECola({
    chave: 'financeiro@ctmetamorfose.com.br',
    nomeRecebedor: 'CT METAMORFOSE SICOOB',
    cidadeRecebedor: 'CAMPOS DOS GOYT',
    valor,
    txid
  });

  // Gera o QR Code em Base64 Data URL
  const qrCodeDataUrl = await QRCode.toDataURL(pixCopiaECola, {
    width: 240,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#ffffff'
    },
    errorCorrectionLevel: 'M'
  });

  return {
    txid,
    valor,
    pixCopiaECola,
    qrCodeDataUrl,
    expiraEmMinutos: 15,
    ambiente: 'sandbox',
    status: 'ATIVA',
    criadoEm: new Date().toISOString()
  };
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
 * Simula processamento de pagamento com cartão à vista via Sicoob Sandbox
 */
export async function processarCartaoSandbox({
  numero,
  titular,
  validade,
  cvv,
  valor = 129.90
}) {
  // Simula latência de requisição bancária de 1.2 segundos
  await new Promise(resolve => setTimeout(resolve, 1200));

  const authCode = `SICOOB-AUT-${Math.floor(100000 + Math.random() * 900000)}`;
  const bandeira = detectarBandeiraCartao(numero);

  return {
    success: true,
    authCode,
    bandeira,
    valor,
    parcelas: '1x à vista sem juros',
    mensagem: 'Transação aprovada com sucesso no Sicoob Sandbox',
    dataHora: new Date().toLocaleString('pt-BR')
  };
}
