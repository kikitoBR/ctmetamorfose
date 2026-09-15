import { defineConfig, loadEnv } from 'vite';
import { 
  criarCobrancaPixAsaas, 
  criarCobrancaCartaoAsaas,
  consultarStatusCobrancaAsaas, 
  simularAprovacaoPix,
  getConfig
} from './api/_asaasHelper.js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  // Repassa variáveis do .env para o process.env do Node
  if (env.ASAAS_API_KEY) process.env.ASAAS_API_KEY = env.ASAAS_API_KEY;
  if (env.ASAAS_ENVIRONMENT) process.env.ASAAS_ENVIRONMENT = env.ASAAS_ENVIRONMENT;
  if (env.WHATSAPP_NUMBER) process.env.WHATSAPP_NUMBER = env.WHATSAPP_NUMBER;

  return {
    server: {
      port: 5174
    },
    plugins: [
      {
        name: 'asaas-api-middleware',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            const url = new URL(req.url, `http://${req.headers.host}`);

            // Rota: POST /api/pix
            if (url.pathname === '/api/pix' && req.method === 'POST') {
              let bodyStr = '';
              req.on('data', chunk => { bodyStr += chunk; });
              req.on('end', async () => {
                try {
                  const body = bodyStr ? JSON.parse(bodyStr) : {};
                  const cobranca = await criarCobrancaPixAsaas(body);
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
                  const cobranca = await criarCobrancaCartaoAsaas(body);
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
