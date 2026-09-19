/**
 * Módulo de Autenticação Segura para Múltiplos Administradores
 * Implementa JWT com HMAC SHA-256 nativo (sem dependências externas),
 * verificação de senha criptografada e proteção contra Brute Force por IP.
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Lê variáveis diretamente do .env para evitar problemas em ambientes locais
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

// Configurações de autenticação (sempre lê do arquivo .env atualizado no disco primeiro)
export function getAuthConfig() {
  const env = readEnvFile();
  const password = (env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'metamorfosect').trim();
  const jwtSecret = (env.ADMIN_JWT_SECRET || process.env.ADMIN_JWT_SECRET || 'metamorfose_adm_secret_key_9843217984').trim();
  return { password, jwtSecret };
}

// Armazena tentativas de login para rate limiting em memória
const loginAttempts = new Map();

/**
 * Verifica se um IP está bloqueado por excesso de tentativas (Brute Force Protection)
 */
export function checkBruteForce(ip) {
  // Em localhost / desenvolvimento, não bloqueia
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || ip.includes('localhost')) {
    return { allowed: true };
  }

  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record) return { allowed: true };

  if (record.lockedUntil && record.lockedUntil > now) {
    const remainingSec = Math.ceil((record.lockedUntil - now) / 1000);
    return {
      allowed: false,
      message: `Muitas tentativas incorretas. Tente novamente em ${remainingSec} segundos.`
    };
  }

  // Se o período de bloqueio passou, reseta
  if (record.lockedUntil && record.lockedUntil <= now) {
    loginAttempts.delete(ip);
    return { allowed: true };
  }

  return { allowed: true };
}

/**
 * Registra uma tentativa de login falha
 */
export function recordFailedAttempt(ip) {
  // Em localhost, não bloqueia
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || ip.includes('localhost')) {
    return;
  }

  const now = Date.now();
  const record = loginAttempts.get(ip) || { count: 0, firstAttempt: now };
  record.count += 1;

  // Se passou de 5 tentativas em menos de 15 minutos, bloqueia por 15 minutos
  if (record.count >= 5) {
    record.lockedUntil = now + 15 * 60 * 1000;
  }

  loginAttempts.set(ip, record);
}

/**
 * Limpa o histórico de tentativas após login com sucesso
 */
export function clearLoginAttempts(ip) {
  loginAttempts.delete(ip);
}

/**
 * Compara senhas de forma segura contra timing attacks
 */
export function verifyPassword(providedPassword) {
  const { password } = getAuthConfig();
  if (!providedPassword || typeof providedPassword !== 'string') return false;

  const bufProvided = Buffer.from(providedPassword.trim());
  const bufExpected = Buffer.from(password.trim());

  if (bufProvided.length !== bufExpected.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufProvided, bufExpected);
}

/**
 * Gera um token JWT assinado com HMAC SHA-256
 */
export function generateAdminToken(adminData = {}) {
  const { jwtSecret } = getAuthConfig();

  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    role: 'admin',
    user: adminData.username || 'Administrador',
    issuedAt: Date.now(),
    exp: Date.now() + 24 * 60 * 60 * 1000 // 24 horas de validade
  };

  const b64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const b64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');

  const signature = crypto
    .createHmac('sha256', jwtSecret)
    .update(`${b64Header}.${b64Payload}`)
    .digest('base64url');

  return `${b64Header}.${b64Payload}.${signature}`;
}

/**
 * Valida o token JWT e retorna o payload caso seja válido
 */
export function verifyAdminToken(token) {
  if (!token || typeof token !== 'string') return null;

  const parts = token.trim().split('.');
  if (parts.length !== 3) return null;

  const [b64Header, b64Payload, signature] = parts;
  const { jwtSecret } = getAuthConfig();

  const expectedSignature = crypto
    .createHmac('sha256', jwtSecret)
    .update(`${b64Header}.${b64Payload}`)
    .digest('base64url');

  if (signature !== expectedSignature) {
    return null;
  }

  try {
    const payloadStr = Buffer.from(b64Payload, 'base64url').toString('utf8');
    const payload = JSON.parse(payloadStr);

    if (!payload.exp || Date.now() > payload.exp) {
      return null; // Token expirado
    }

    return payload;
  } catch (err) {
    return null;
  }
}

/**
 * Extrai e valida o token do cabeçalho Authorization
 */
export function authenticateAdminRequest(req) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7).trim();
  return verifyAdminToken(token);
}
