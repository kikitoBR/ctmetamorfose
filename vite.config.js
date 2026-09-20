import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { 
  criarCobrancaPixAsaas, 
  criarCobrancaCartaoAsaas,
  consultarStatusCobrancaAsaas, 
  simularAprovacaoPix,
  getConfig
} from './api/_asaasHelper.js';
import leadsHandler from './api/leads.js';
import adminAuthHandler from './api/admin/auth.js';
import adminLeadsHandler from './api/admin/leads.js';
import adminSyncHandler from './api/admin/sync.js';
import webhookAsaasHandler from './api/webhook/asaas.js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  // Repassa variáveis do .env para o process.env do Node
  if (env.ASAAS_API_KEY) process.env.ASAAS_API_KEY = env.ASAAS_API_KEY;
  if (env.ASAAS_ENVIRONMENT) process.env.ASAAS_ENVIRONMENT = env.ASAAS_ENVIRONMENT;
  if (env.WHATSAPP_NUMBER) process.env.WHATSAPP_NUMBER = env.WHATSAPP_NUMBER;
  if (env.SUPABASE_URL) process.env.SUPABASE_URL = env.SUPABASE_URL;
  if (env.SUPABASE_SERVICE_ROLE_KEY) process.env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
  if (env.ADMIN_PASSWORD) process.env.ADMIN_PASSWORD = env.ADMIN_PASSWORD;
  if (env.ADMIN_JWT_SECRET) process.env.ADMIN_JWT_SECRET = env.ADMIN_JWT_SECRET;
  if (env.ASAAS_WEBHOOK_ACCESS_TOKEN) process.env.ASAAS_WEBHOOK_ACCESS_TOKEN = env.ASAAS_WEBHOOK_ACCESS_TOKEN;

  return {
    server: {
      port: 5174
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(process.cwd(), 'index.html'),
          admin: path.resolve(process.cwd(), 'admin.html')
        }
      }
    },
    plugins: [
      {
        name: 'asaas-api-middleware',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            const url = new URL(req.url, `http://${req.headers.host}`);

            // Adapta resposta do connect para suportar .status().json() do Vercel
            if (!res.status) {
              res.status = function(code) {
                res.statusCode = code;
                return this;
              };
            }
            if (!res.json) {
              res.json = function(data) {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
                return this;
              };
            }

            // Helper para ler body de requests POST/PATCH
            const parseBody = () => new Promise(resolve => {
              let bodyStr = '';
              req.on('data', chunk => { bodyStr += chunk; });
              req.on('end', () => {
                try {
                  req.body = bodyStr ? JSON.parse(bodyStr) : {};
                } catch (e) {
                  req.body = bodyStr;
                }
                resolve(req.body);
              });
            });

            // Rota amigável: /admin -> /admin.html
            if (url.pathname === '/admin' || url.pathname === '/admin/') {
              req.url = '/admin.html';
              return next();
            }

            // Rota: /api/leads
            if (url.pathname === '/api/leads') {
              if (req.method === 'POST' || req.method === 'PATCH') {
                await parseBody();
              }
              return leadsHandler(req, res);
            }

            // Rota: /api/admin/auth
            if (url.pathname === '/api/admin/auth') {
              if (req.method === 'POST') {
                await parseBody();
              }
              return adminAuthHandler(req, res);
            }

            // Rota: /api/admin/leads
            if (url.pathname === '/api/admin/leads') {
              if (req.method === 'POST' || req.method === 'PATCH' || req.method === 'DELETE') {
                await parseBody();
              }
              return adminLeadsHandler(req, res);
            }

            // Rota: /api/admin/sync
            if (url.pathname === '/api/admin/sync') {
              if (req.method === 'POST') {
                await parseBody();
              }
              return adminSyncHandler(req, res);
            }

            // Rota: /api/webhook/asaas
            if (url.pathname === '/api/webhook/asaas') {
              if (req.method === 'POST') {
                await parseBody();
              }
              return webhookAsaasHandler(req, res);
            }

            // Rota: POST /api/pix
            if (url.pathname === '/api/pix' && req.method === 'POST') {
              let bodyStr = '';
              req.on('data', chunk => { bodyStr += chunk; });
              req.on('end', async () => {
                try {
                  const body = bodyStr ? JSON.parse(bodyStr) : {};
                  const cobranca = await criarCobrancaPixAsaas({ ...body, valor: 129.90 });
                  res.setHeader('Content-Type', 'application/json');
                  res.statusCode = 200;
                  res.end(JSON.stringify(cobranca));
                } catch (err) {
                  console.error('[API /api/pix Error]:', err.message);
                  res.setHeader('Content-Type', 'application/json');
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: err.message }));
                }
              });
              return;
            }

            // Rota: POST /api/card
            if (url.pathname === '/api/card' && req.method === 'POST') {
              let bodyStr = '';
              req.on('data', chunk => { bodyStr += chunk; });
              req.on('end', async () => {
                try {
                  const body = bodyStr ? JSON.parse(bodyStr) : {};
                  const cobranca = await criarCobrancaCartaoAsaas({ ...body, valor: 129.90 });
                  res.setHeader('Content-Type', 'application/json');
                  res.statusCode = 200;
                  res.end(JSON.stringify(cobranca));
                } catch (err) {
                  console.error('[API /api/card Error]:', err.message);
                  res.setHeader('Content-Type', 'application/json');
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: err.message }));
                }
              });
              return;
            }

            // Rota: GET /api/status?id=...
            if (url.pathname === '/api/status' && req.method === 'GET') {
              const id = url.searchParams.get('id');
              if (!id) {
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Parâmetro id é obrigatório' }));
                return;
              }
              try {
                const statusData = await consultarStatusCobrancaAsaas(id);
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 200;
                res.end(JSON.stringify(statusData));
              } catch (err) {
                console.error('[API /api/status Error]:', err.message);
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 500;
                res.end(JSON.stringify({ error: err.message }));
              }
              return;
            }

            // Rota: POST /api/simulate?id=...
            if (url.pathname === '/api/simulate' && req.method === 'POST') {
              const id = url.searchParams.get('id');
              const result = simularAprovacaoPix(id);
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify(result));
              return;
            }

            // Rota: GET /api/config (fornece configs públicas seguras)
            if (url.pathname === '/api/config' && req.method === 'GET') {
              const cfg = getConfig();
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify({
                isConfigured: cfg.isConfigured,
                environment: cfg.env,
                whatsapp: cfg.whatsapp
              }));
              return;
            }

            next();
          });
        }
      }
    ]
  };
});
