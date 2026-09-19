/**
 * Endpoint de Autenticação Segura de Administradores
 * Rota: /api/admin/auth
 */
import { 
  verifyPassword, 
  generateAdminToken, 
  checkBruteForce, 
  recordFailedAttempt, 
  clearLoginAttempts,
  authenticateAdminRequest 
} from '../_authHelper.js';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';

  // GET: Verifica se o token atual é válido (sessão ativa)
  if (req.method === 'GET') {
    const admin = authenticateAdminRequest(req);
    if (!admin) {
      return res.status(401).json({ authenticated: false, error: 'Sessão expirada ou inválida.' });
    }
    return res.status(200).json({ authenticated: true, user: admin.user });
  }

  // POST: Login com senha e emissão de JWT
  if (req.method === 'POST') {
    // 1. Proteção contra Força Bruta
    const bruteCheck = checkBruteForce(clientIp);
    if (!bruteCheck.allowed) {
      return res.status(429).json({ error: bruteCheck.message });
    }

    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const { password, username } = body;

      if (!password) {
        return res.status(400).json({ error: 'A senha é obrigatória.' });
      }

      // 2. Validação segura da senha
      const isValid = verifyPassword(password);
      if (!isValid) {
        recordFailedAttempt(clientIp);
        return res.status(401).json({ error: 'Senha incorreta. Acesso negado.' });
      }

      // 3. Sucesso: limpa tentativas e emite token JWT
      clearLoginAttempts(clientIp);
      const token = generateAdminToken({ username: username ? username.trim() : 'Administrador CT' });

      return res.status(200).json({
        success: true,
        token,
        user: username ? username.trim() : 'Administrador CT',
        expiresIn: '24h'
      });
    } catch (err) {
      console.error('[API /api/admin/auth Error]:', err);
      return res.status(500).json({ error: 'Erro interno ao processar login.' });
    }
  }

  return res.status(405).json({ error: 'Método não permitido.' });
}
