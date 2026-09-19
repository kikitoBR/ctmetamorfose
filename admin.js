/**
 * CT METAMORFOSE — PAINEL ADMINISTRATIVO
 * Lógica de Autenticação Segura, Gestão de Leads, Sincronização Asaas e Concorrência Multi-Admin
 */

const TOKEN_KEY = 'metamorfose_admin_jwt';
const USER_KEY = 'metamorfose_admin_user';

// Estado global da aplicação
let state = {
  token: null,
  currentUser: 'Admin',
  leads: [],
  currentFilter: 'ALL',
  searchQuery: '',
  selectedLead: null,
  autoRefreshTimer: null
};

// ==========================================================================
// INICIALIZAÇÃO & AUTENTICAÇÃO
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  setupEventListeners();
});

function initAuth() {
  const savedToken = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  const savedUser = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY) || 'Admin';

  if (savedToken) {
    state.token = savedToken;
    state.currentUser = savedUser;
    verificarSessaoEInicializar();
  } else {
    mostrarTelaLogin();
  }
}

async function verificarSessaoEInicializar() {
  try {
    const res = await fetch('/api/admin/leads?limit=1', {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });

    if (res.ok) {
      mostrarTelaDashboard();
      carregarLeads();
      iniciarAutoRefresh();
    } else {
      encerrarSessao();
    }
  } catch (err) {
    console.error('Erro na validação da sessão:', err);
    mostrarTelaLogin();
  }
}

function mostrarTelaLogin() {
  document.getElementById('login-section').style.display = 'flex';
  document.getElementById('dashboard-section').style.display = 'none';
  pararAutoRefresh();
}

function mostrarTelaDashboard() {
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('dashboard-section').style.display = 'flex';
  const nameEl = document.getElementById('header-admin-name');
  if (nameEl) nameEl.textContent = state.currentUser;
}

function encerrarSessao() {
  state.token = null;
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(USER_KEY);
  mostrarTelaLogin();
  showToast('Sessão encerrada.', 'info');
}

// ==========================================================================
// CONFIGURAÇÃO DE LISTENERS
// ==========================================================================
function setupEventListeners() {
  // 1. Formulário de Login
  const loginForm = document.getElementById('admin-login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await realizarLogin();
    });
  }

  // Toggle visualização de senha
  const btnTogglePwd = document.getElementById('btn-toggle-password');
  const pwdInput = document.getElementById('login-password');
  if (btnTogglePwd && pwdInput) {
    btnTogglePwd.addEventListener('click', () => {
      const isPwd = pwdInput.type === 'password';
      pwdInput.type = isPwd ? 'text' : 'password';
      btnTogglePwd.style.color = isPwd ? 'var(--primary)' : 'var(--text-dim)';
    });
  }

  // 2. Logout
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', encerrarSessao);
  }

  // 3. Botão Sincronizar Asaas
  const btnSync = document.getElementById('btn-sync-asaas');
  if (btnSync) {
    btnSync.addEventListener('click', sincronizarComAsaas);
  }

  // 4. Botão Exportar CSV
  const btnExport = document.getElementById('btn-export-csv');
  if (btnExport) {
    btnExport.addEventListener('click', exportarParaCSV);
  }

  // 5. Botão Recarregar Lista
  const btnRefresh = document.getElementById('btn-refresh-list');
  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => {
      btnRefresh.classList.add('spinning');
      carregarLeads().finally(() => {
        setTimeout(() => btnRefresh.classList.remove('spinning'), 600);
      });
    });
  }

  // 6. Tabs de Filtro de Status
  const filterTabs = document.querySelectorAll('.filter-tab');
  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.currentFilter = tab.dataset.filter;
      renderizarLeads();
    });
  });

  // 7. Campo de Busca com Debounce
  const searchInput = document.getElementById('search-leads-input');
  const btnClearSearch = document.getElementById('btn-clear-search');
  let searchDebounce = null;

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const val = searchInput.value.trim();
      state.searchQuery = val;
      if (btnClearSearch) btnClearSearch.style.display = val ? 'block' : 'none';

      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => {
        carregarLeads();
      }, 350);
    });
  }

  if (btnClearSearch && searchInput) {
    btnClearSearch.addEventListener('click', () => {
      searchInput.value = '';
      state.searchQuery = '';
      btnClearSearch.style.display = 'none';
      carregarLeads();
    });
  }

  // 8. Modal de Detalhes e Notas
  const modalLead = document.getElementById('modal-lead-details');
  const btnCloseModal = document.getElementById('btn-close-lead-modal');
  const btnCancelModal = document.getElementById('btn-cancel-modal');
  const btnSaveModal = document.getElementById('btn-save-lead-details');

  const fecharModal = () => {
    if (modalLead) modalLead.classList.remove('open');
    state.selectedLead = null;
  };

  if (btnCloseModal) btnCloseModal.addEventListener('click', fecharModal);
  if (btnCancelModal) btnCancelModal.addEventListener('click', fecharModal);
  if (modalLead) {
    modalLead.addEventListener('click', (e) => {
      if (e.target === modalLead) fecharModal();
    });
  }

  if (btnSaveModal) {
    btnSaveModal.addEventListener('click', salvarDetalhesLead);
  }
}

// ==========================================================================
// AUTENTICAÇÃO COM PROTEÇÃO ANTI BRUTE-FORCE
// ==========================================================================
async function realizarLogin() {
  const usernameInput = document.getElementById('login-username');
  const passwordInput = document.getElementById('login-password');
  const rememberCheckbox = document.getElementById('login-remember');
  const errorBox = document.getElementById('login-error-box');
  const errorText = document.getElementById('login-error-text');
  const btnSubmit = document.getElementById('btn-submit-login');
  const btnText = btnSubmit ? btnSubmit.querySelector('.btn-text') : null;
  const spinner = btnSubmit ? btnSubmit.querySelector('.spinner-admin') : null;

  if (errorBox) errorBox.style.display = 'none';

  const username = usernameInput ? usernameInput.value.trim() : 'Admin';
  const password = passwordInput ? passwordInput.value : '';

  if (!password) {
    exibirErroLogin('Por favor, informe a senha de acesso.');
    return;
  }

  // Feedback de carregamento
  if (btnSubmit) btnSubmit.disabled = true;
  if (btnText) btnText.textContent = 'AUTENTICANDO...';
  if (spinner) spinner.style.display = 'block';

  try {
    const res = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (res.status === 200 && data.token) {
      state.token = data.token;
      state.currentUser = data.username || username;

      const storage = (rememberCheckbox && rememberCheckbox.checked) ? localStorage : sessionStorage;
      storage.setItem(TOKEN_KEY, data.token);
      storage.setItem(USER_KEY, state.currentUser);

      mostrarTelaDashboard();
      carregarLeads();
      iniciarAutoRefresh();
      showToast(`Bem-vindo, ${state.currentUser}! Conectado com sucesso.`, 'success');
    } else if (res.status === 429) {
      exibirErroLogin(data.error || 'Muitas tentativas incorretas. Acesso bloqueado temporariamente por segurança.');
    } else {
      exibirErroLogin(data.error || 'Credenciais inválidas.');
    }
  } catch (err) {
    console.error('Erro na requisição de login:', err);
    exibirErroLogin('Erro de rede ou conexão com o servidor.');
  } finally {
    if (btnSubmit) btnSubmit.disabled = false;
    if (btnText) btnText.textContent = 'ENTRAR NO PAINEL';
    if (spinner) spinner.style.display = 'none';
  }
}

function exibirErroLogin(msg) {
  const errorBox = document.getElementById('login-error-box');
  const errorText = document.getElementById('login-error-text');
  if (errorBox && errorText) {
    errorText.textContent = msg;
    errorBox.style.display = 'flex';
  }
}

// ==========================================================================
// CARREGAMENTO & GESTÃO DE LEADS
// ==========================================================================
async function carregarLeads() {
  if (!state.token) return;

  try {
    let url = '/api/admin/leads';
    const params = new URLSearchParams();
    if (state.searchQuery) params.append('search', state.searchQuery);
    if (params.toString()) url += `?${params.toString()}`;

    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });

    if (res.status === 401) {
      encerrarSessao();
      return;
    }

    const data = await res.json();
    state.leads = data.leads || [];

    atualizarMetricasKPIs();
    renderizarLeads();
  } catch (err) {
    console.error('Erro ao carregar leads:', err);
  }
}

function atualizarMetricasKPIs() {
  const leads = state.leads;
  
  const total = leads.length;
  const pagos = leads.filter(l => l.status === 'PAGO');
  const aguardando = leads.filter(l => l.status === 'AGUARDANDO_PAGAMENTO');
  const contato = leads.filter(l => l.status === 'EM_CONTATO');
  const cancelados = leads.filter(l => l.status === 'CANCELADO');

  const vagasLimite = 50;
  const vagasOcupadas = Math.min(pagos.length, vagasLimite);
  const vagasRestantes = Math.max(0, vagasLimite - vagasOcupadas);
  const percentVagas = Math.round((vagasOcupadas / vagasLimite) * 100);

  const receitaTotal = pagos.reduce((acc, l) => acc + (parseFloat(l.valor) || 129.90), 0);

  // Elementos do DOM
  const totalEl = document.getElementById('kpi-total-leads');
  const vagasOcupadasEl = document.getElementById('kpi-vagas-ocupadas');
  const vagasPercentEl = document.getElementById('kpi-vagas-percent');
  const progressBarEl = document.getElementById('kpi-progress-bar');
  const vagasRestantesEl = document.getElementById('kpi-vagas-restantes');
  const receitaEl = document.getElementById('kpi-receita-total');
  const pagamentosCountEl = document.getElementById('kpi-pagamentos-count');
  const aguardandoEl = document.getElementById('kpi-aguardando');

  if (totalEl) totalEl.textContent = total;
  if (vagasOcupadasEl) vagasOcupadasEl.textContent = vagasOcupadas;
  if (vagasPercentEl) vagasPercentEl.textContent = `${percentVagas}%`;
  if (progressBarEl) progressBarEl.style.width = `${percentVagas}%`;
  if (vagasRestantesEl) vagasRestantesEl.textContent = `${vagasRestantes} vagas restantes`;
  
  if (receitaEl) {
    receitaEl.textContent = receitaTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  if (pagamentosCountEl) {
    pagamentosCountEl.textContent = `${pagos.length} pagamento${pagos.length === 1 ? '' : 's'} quitado${pagos.length === 1 ? '' : 's'}`;
  }
  if (aguardandoEl) aguardandoEl.textContent = aguardando.length;

  // Atualiza contadores nas abas de filtro
  const tabAll = document.getElementById('tab-count-all');
  const tabPago = document.getElementById('tab-count-pago');
  const tabAguardando = document.getElementById('tab-count-aguardando');
  const tabContato = document.getElementById('tab-count-contato');
  const tabCancelado = document.getElementById('tab-count-cancelado');

  if (tabAll) tabAll.textContent = total;
  if (tabPago) tabPago.textContent = pagos.length;
  if (tabAguardando) tabAguardando.textContent = aguardando.length;
  if (tabContato) tabContato.textContent = contato.length;
  if (tabCancelado) tabCancelado.textContent = cancelados.length;
}

function renderizarLeads() {
  const tableBody = document.getElementById('leads-table-body');
  const cardsContainer = document.getElementById('leads-cards-container');
  const showingCount = document.getElementById('table-showing-count');

  // Filtra por status
  let lista = state.leads;
  if (state.currentFilter !== 'ALL') {
    lista = lista.filter(l => l.status === state.currentFilter);
  }

  if (showingCount) {
    showingCount.textContent = `Mostrando ${lista.length} de ${state.leads.length} registros`;
  }

  if (lista.length === 0) {
    const emptyRow = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 3rem 1rem; color: var(--text-dim);">
          <p style="font-size: 1.1rem; margin-bottom: 4px;">Nenhum lead encontrado.</p>
          <span style="font-size: 0.8rem;">Tente ajustar o termo da busca ou o filtro de status selecionado.</span>
        </td>
      </tr>
    `;
    if (tableBody) tableBody.innerHTML = emptyRow;
    if (cardsContainer) cardsContainer.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-dim);">Nenhum lead encontrado.</div>';
    return;
  }

  // 1. Renderizar Tabela Desktop
  if (tableBody) {
    tableBody.innerHTML = lista.map(lead => {
      const idade = calcularIdade(lead.data_nascimento);
      const modalidadesHtml = (Array.isArray(lead.modalidades) ? lead.modalidades : [])
        .map(m => `<span class="pill-modalidade">${formatarModalidade(m)}</span>`)
        .join(' ');
      
      const periodoHtml = lead.periodo 
        ? `<span class="pill-periodo">${lead.periodo.toUpperCase()}</span>` 
        : '';

      const whatsNum = sanitizarTelefone(lead.telefone);
      const whatsMsg = lead.status === 'PAGO'
        ? `Olá ${lead.nome}! Tudo bem? Aqui é do CT Metamorfose. Confirmamos seu pagamento no Lote Fundador e gostaríamos de dar as boas-vindas!`
        : `Olá ${lead.nome}! Tudo bem? Aqui é do CT Metamorfose. Vimos seu interesse nas vagas exclusivas do 1º Lote Fundador. Como podemos ajudar com sua matrícula?`;
      
      const whatsUrl = whatsNum ? `https://wa.me/${whatsNum}?text=${encodeURIComponent(whatsMsg)}` : '#';

      const statusClass = obterClasseStatus(lead.status);
      const dataCadastro = formatarData(lead.created_at);
      const dataPago = lead.pago_em ? `<br><span style="color: #34d399; font-size: 0.72rem;">Pago em ${formatarData(lead.pago_em)}</span>` : '';

      const faturaLink = lead.asaas_invoice_url 
        ? `<a href="${lead.asaas_invoice_url}" target="_blank" class="link-fatura-asaas">Fatura Asaas ↗</a>` 
        : (lead.asaas_payment_id ? `<span class="code-pill">${lead.asaas_payment_id}</span>` : '<span style="color: var(--text-dim); font-size: 0.75rem;">Sem fatura</span>');

      return `
        <tr data-lead-id="${lead.id}">
          <td>
            <div class="lead-aluno-cell">
              <span class="lead-nome">${escapeHtml(lead.nome)}</span>
              <span class="lead-sub-data">
                CPF: ${formatarCPF(lead.cpf)} ${idade ? `• ${idade} anos` : ''}
              </span>
            </div>
          </td>
          <td>
            <div class="lead-contato-cell">
              <a href="${whatsUrl}" target="_blank" class="lead-tel-link" title="Abrir no WhatsApp">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                  <path d="M17.472 14.382c-.301-.15-1.78-.878-2.056-.978-.276-.101-.477-.15-.678.15-.201.3-.777.978-.953 1.179-.176.2-.352.226-.653.075-1.523-.762-2.528-1.365-3.535-3.097-.266-.456.266-.423.762-1.416.084-.168.042-.314-.021-.44-.063-.125-.678-1.635-.929-2.241-.244-.59-.492-.51-.677-.52-.176-.008-.377-.01-.578-.01s-.528.075-.804.377c-.276.301-1.055 1.03-1.055 2.513 0 1.482 1.08 2.915 1.23 3.116.151.201 2.125 3.245 5.15 4.549 2.052.885 2.862.88 3.876.731.84-.124 1.78-.727 2.03-1.431.251-.703.251-1.306.176-1.431-.075-.126-.276-.201-.577-.352z"/>
                  <path d="M12 2a9.93 9.93 0 0 0-8.547 15.01L2 22l5.12-1.343A9.97 9.97 0 1 0 12 2zm0 18.2a8.21 8.21 0 0 1-4.186-1.144l-.3-.178-3.107.815.829-3.03-.195-.31A8.22 8.22 0 1 1 12 20.2z"/>
                </svg>
                ${escapeHtml(lead.telefone)}
              </a>
              <span class="lead-email-text">${escapeHtml(lead.email || 'Não informado')}</span>
            </div>
          </td>
          <td>
            <div class="tags-wrap">
              ${periodoHtml}
              ${modalidadesHtml}
            </div>
          </td>
          <td>
            <select class="status-select-table ${statusClass}" onchange="window.adminAtualizarStatus('${lead.id}', this.value)">
              <option value="AGUARDANDO_PAGAMENTO" ${lead.status === 'AGUARDANDO_PAGAMENTO' ? 'selected' : ''}>🟡 Aguardando</option>
              <option value="PAGO" ${lead.status === 'PAGO' ? 'selected' : ''}>🟢 Pago</option>
              <option value="EM_CONTATO" ${lead.status === 'EM_CONTATO' ? 'selected' : ''}>🔵 Em Contato</option>
              <option value="CANCELADO" ${lead.status === 'CANCELADO' ? 'selected' : ''}>🔴 Cancelado</option>
            </select>
          </td>
          <td>
            <div class="lead-gateway-cell">
              <span class="gateway-valor">R$ ${(parseFloat(lead.valor) || 129.90).toFixed(2).replace('.', ',')}</span>
              <div class="gateway-badge-row">
                <span class="badge-metodo">${escapeHtml(lead.metodo_pagamento || 'PIX')}</span>
                ${faturaLink}
              </div>
            </div>
          </td>
          <td>
            <span class="lead-sub-data">${dataCadastro}</span>
            ${dataPago}
          </td>
          <td>
            <div class="lead-actions-cell">
              <button class="btn-table-action" onclick="window.adminAbrirModalDetalhes('${lead.id}')" title="Ver Detalhes e Notas">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                Notas
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // 2. Renderizar Cards Mobile
  if (cardsContainer) {
    cardsContainer.innerHTML = lista.map(lead => {
      const whatsNum = sanitizarTelefone(lead.telefone);
      const whatsUrl = whatsNum ? `https://wa.me/${whatsNum}` : '#';
      const statusClass = obterClasseStatus(lead.status);

      return `
        <div class="mobile-lead-card">
          <div class="card-top-row">
            <div>
              <div class="card-lead-nome">${escapeHtml(lead.nome)}</div>
              <span class="lead-sub-data">CPF: ${formatarCPF(lead.cpf)}</span>
            </div>
            <select class="status-select-table ${statusClass}" onchange="window.adminAtualizarStatus('${lead.id}', this.value)">
              <option value="AGUARDANDO_PAGAMENTO" ${lead.status === 'AGUARDANDO_PAGAMENTO' ? 'selected' : ''}>🟡 Aguardando</option>
              <option value="PAGO" ${lead.status === 'PAGO' ? 'selected' : ''}>🟢 Pago</option>
              <option value="EM_CONTATO" ${lead.status === 'EM_CONTATO' ? 'selected' : ''}>🔵 Contato</option>
              <option value="CANCELADO" ${lead.status === 'CANCELADO' ? 'selected' : ''}>🔴 Cancelado</option>
            </select>
          </div>

          <div class="card-meta-grid">
            <div>
              <span class="summary-label">Contato:</span>
              <div>${escapeHtml(lead.telefone)}</div>
            </div>
            <div>
              <span class="summary-label">Valor:</span>
              <div class="gateway-valor">R$ ${(parseFloat(lead.valor) || 129.90).toFixed(2).replace('.', ',')}</div>
            </div>
          </div>

          <div class="card-actions-row">
            <a href="${whatsUrl}" target="_blank" class="btn-table-action btn-action-whats" style="flex: 1; justify-content: center;">
              WhatsApp
            </a>
            <button class="btn-table-action" style="flex: 1; justify-content: center;" onclick="window.adminAbrirModalDetalhes('${lead.id}')">
              Ver Notas
            </button>
          </div>
        </div>
      `;
    }).join('');
  }
}

// ==========================================================================
// CONCORRÊNCIA MULTI-ADMIN & ATUALIZAÇÃO EM TEMPO REAL
// ==========================================================================
window.adminAtualizarStatus = async function(leadId, novoStatus) {
  if (!state.token) return;

  try {
    const res = await fetch('/api/admin/leads', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify({
        id: leadId,
        status: novoStatus,
        admin_responsavel: state.currentUser
      })
    });

    if (res.ok) {
      // Atualiza o estado local imediatamente
      const idx = state.leads.findIndex(l => l.id === leadId);
      if (idx >= 0) {
        state.leads[idx].status = novoStatus;
        if (novoStatus === 'PAGO' && !state.leads[idx].pago_em) {
          state.leads[idx].pago_em = new Date().toISOString();
        }
        state.leads[idx].admin_responsavel = state.currentUser;
      }
      atualizarMetricasKPIs();
      renderizarLeads();
      showToast('Status atualizado com sucesso!', 'success');
    } else {
      showToast('Erro ao atualizar status do lead.', 'error');
      carregarLeads(); // Restaura estado do backend
    }
  } catch (err) {
    console.error('Erro na atualização de status:', err);
    showToast('Falha na comunicação com o servidor.', 'error');
  }
};

window.adminAbrirModalDetalhes = function(leadId) {
  const lead = state.leads.find(l => l.id === leadId);
  if (!lead) return;

  state.selectedLead = lead;

  const modal = document.getElementById('modal-lead-details');
  const nomeEl = document.getElementById('modal-lead-nome');
  const cpfEl = document.getElementById('modal-lead-cpf');
  const idadeEl = document.getElementById('modal-lead-idade');
  const telEl = document.getElementById('modal-lead-tel');
  const emailEl = document.getElementById('modal-lead-email');
  const modsEl = document.getElementById('modal-lead-modalidades');
  const perEl = document.getElementById('modal-lead-periodo');
  const asaasIdEl = document.getElementById('modal-lead-asaas-id');
  const btnInvoice = document.getElementById('modal-btn-view-invoice');
  const datasEl = document.getElementById('modal-lead-datas');
  const selectStatus = document.getElementById('modal-select-status');
  const textareaNotes = document.getElementById('modal-textarea-notes');
  const lastEditEl = document.getElementById('modal-last-admin-edit');
  const btnWhats = document.getElementById('modal-btn-open-whats');

  if (nomeEl) nomeEl.textContent = lead.nome;
  if (cpfEl) cpfEl.textContent = `CPF: ${formatarCPF(lead.cpf)}`;
  
  const idade = calcularIdade(lead.data_nascimento);
  if (idadeEl) idadeEl.textContent = idade ? `${idade} anos (${lead.data_nascimento || '--'})` : (lead.data_nascimento || 'Data Nasc. não inf.');

  if (telEl) telEl.textContent = lead.telefone;
  if (emailEl) emailEl.textContent = lead.email || 'Não informado';
  
  const modalidades = Array.isArray(lead.modalidades) ? lead.modalidades.map(formatarModalidade).join(', ') : 'Musculação Completa';
  if (modsEl) modsEl.textContent = modalidades;
  if (perEl) perEl.textContent = (lead.periodo || 'Qualquer horário').toUpperCase();

  if (asaasIdEl) asaasIdEl.textContent = lead.asaas_payment_id || 'Nenhum ID gerado';
  if (btnInvoice) {
    if (lead.asaas_invoice_url) {
      btnInvoice.style.display = 'inline-block';
      btnInvoice.href = lead.asaas_invoice_url;
    } else {
      btnInvoice.style.display = 'none';
    }
  }

  const dtCriado = formatarData(lead.created_at);
  const dtPago = lead.pago_em ? ` • Pago em ${formatarData(lead.pago_em)}` : '';
  if (datasEl) datasEl.textContent = `Criado em ${dtCriado}${dtPago}`;

  if (selectStatus) selectStatus.value = lead.status || 'AGUARDANDO_PAGAMENTO';
  if (textareaNotes) textareaNotes.value = lead.observacoes || '';

  if (lastEditEl) {
    lastEditEl.textContent = lead.admin_responsavel 
      ? `Última edição por: ${lead.admin_responsavel}` 
      : 'Sem histórico de edição';
  }

  if (btnWhats) {
    const whatsNum = sanitizarTelefone(lead.telefone);
    btnWhats.href = whatsNum ? `https://wa.me/${whatsNum}` : '#';
  }

  if (modal) modal.classList.add('open');
};

async function salvarDetalhesLead() {
  if (!state.selectedLead || !state.token) return;

  const leadId = state.selectedLead.id;
  const selectStatus = document.getElementById('modal-select-status');
  const textareaNotes = document.getElementById('modal-textarea-notes');
  const btnSave = document.getElementById('btn-save-lead-details');
  const spinner = btnSave ? btnSave.querySelector('.save-spinner') : null;
  const btnText = btnSave ? btnSave.querySelector('.save-btn-text') : null;

  const novoStatus = selectStatus ? selectStatus.value : state.selectedLead.status;
  const novasNotas = textareaNotes ? textareaNotes.value.trim() : '';

  if (btnSave) btnSave.disabled = true;
  if (spinner) spinner.style.display = 'block';
  if (btnText) btnText.textContent = 'Salvando...';

  try {
    const res = await fetch('/api/admin/leads', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify({
        id: leadId,
        status: novoStatus,
        observacoes: novasNotas,
        admin_responsavel: state.currentUser
      })
    });

    if (res.ok) {
      showToast('Lead atualizado com sucesso!', 'success');
      const modal = document.getElementById('modal-lead-details');
      if (modal) modal.classList.remove('open');
      await carregarLeads();
    } else {
      showToast('Erro ao salvar alterações.', 'error');
    }
  } catch (err) {
    console.error('Erro ao salvar notas do lead:', err);
    showToast('Falha na comunicação com o servidor.', 'error');
  } finally {
    if (btnSave) btnSave.disabled = false;
    if (spinner) spinner.style.display = 'none';
    if (btnText) btnText.textContent = 'Salvar Alterações';
  }
}

// ==========================================================================
// SINCRONIZAÇÃO EM LOTE COM O ASAAS
// ==========================================================================
async function sincronizarComAsaas() {
  if (!state.token) return;

  const btnSync = document.getElementById('btn-sync-asaas');
  if (btnSync) btnSync.classList.add('spinning');

  showToast('Consultando pagamentos no Asaas...', 'info');

  try {
    const res = await fetch('/api/admin/sync', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${state.token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await res.json();

    if (res.ok) {
      const atualizados = data.updatedCount || 0;
      const verificados = data.checkedCount || 0;
      if (atualizados > 0) {
        showToast(`Sincronização concluída: ${atualizados} pagamento(s) confirmado(s)!`, 'success');
      } else {
        showToast(`Asaas sincronizado (${verificados} cobranças checadas). Nenhuma nova baixa.`, 'info');
      }
      await carregarLeads();
    } else {
      showToast(data.error || 'Erro ao sincronizar com o Asaas.', 'error');
    }
  } catch (err) {
    console.error('Erro na sincronização Asaas:', err);
    showToast('Falha na conexão com a API Asaas.', 'error');
  } finally {
    if (btnSync) {
      setTimeout(() => btnSync.classList.remove('spinning'), 600);
    }
  }
}

// ==========================================================================
// EXPORTAÇÃO PARA CSV (EXCEL FRIENDLY COM UTF-8 BOM)
// ==========================================================================
function exportarParaCSV() {
  if (!state.leads || state.leads.length === 0) {
    showToast('Não há dados para exportar.', 'info');
    return;
  }

  const cabecalho = [
    'ID',
    'Nome Completo',
    'CPF',
    'Telefone',
    'Email',
    'Data Nascimento',
    'Modalidades',
    'Periodo',
    'Status',
    'Metodo Pagamento',
    'Valor (R$)',
    'ID Cobranca Asaas',
    'Data Cadastro',
    'Data Pagamento',
    'Observacoes Administrativas',
    'Admin Responsavel'
  ];

  const linhas = state.leads.map(lead => {
    const modalidades = Array.isArray(lead.modalidades) ? lead.modalidades.join(' + ') : '';
    return [
      lead.id || '',
      lead.nome || '',
      lead.cpf || '',
      lead.telefone || '',
      lead.email || '',
      lead.data_nascimento || '',
      modalidades,
      lead.periodo || '',
      lead.status || '',
      lead.metodo_pagamento || '',
      (parseFloat(lead.valor) || 129.90).toFixed(2),
      lead.asaas_payment_id || '',
      lead.created_at || '',
      lead.pago_em || '',
      (lead.observacoes || '').replace(/"/g, '""').replace(/\n/g, ' '),
      lead.admin_responsavel || ''
    ].map(campo => `"${campo}"`).join(';');
  });

  const csvContent = '\uFEFF' + [cabecalho.join(';'), ...linhas].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `leads-metamorfose-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast('Planilha CSV gerada com sucesso!', 'success');
}

// ==========================================================================
// POLLING AUTOMÁTICO (ATUALIZAÇÃO ENTRE MÚLTIPLOS ADMINISTRADORES)
// ==========================================================================
function iniciarAutoRefresh() {
  pararAutoRefresh();
  // Consulta automática a cada 30 segundos
  state.autoRefreshTimer = setInterval(() => {
    if (state.token) {
      carregarLeads();
    }
  }, 30000);
}

function pararAutoRefresh() {
  if (state.autoRefreshTimer) {
    clearInterval(state.autoRefreshTimer);
    state.autoRefreshTimer = null;
  }
}

// ==========================================================================
// UTILITÁRIOS E HELPERS VISUAIS
// ==========================================================================
function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast-item ${type}`;

  const iconSvg = type === 'success'
    ? '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>'
    : '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';

  toast.innerHTML = `
    ${iconSvg}
    <span>${escapeHtml(msg)}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(12px)';
    setTimeout(() => {
      if (toast.parentElement) toast.parentElement.removeChild(toast);
    }, 250);
  }, 4000);
}

function obterClasseStatus(status) {
  switch (status) {
    case 'PAGO': return 'pago';
    case 'AGUARDANDO_PAGAMENTO': return 'aguardando';
    case 'EM_CONTATO': return 'contato';
    case 'CANCELADO': return 'cancelado';
    default: return 'aguardando';
  }
}

function formatarCPF(cpf) {
  if (!cpf) return '';
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return cpf;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

function sanitizarTelefone(tel) {
  if (!tel) return '';
  let digits = tel.replace(/\D/g, '');
  if (digits.length === 10 || digits.length === 11) {
    digits = `55${digits}`;
  }
  return digits;
}

function calcularIdade(dataNasc) {
  if (!dataNasc) return null;
  // Suporta YYYY-MM-DD ou DD/MM/YYYY
  let dia, mes, ano;
  if (dataNasc.includes('-')) {
    const parts = dataNasc.split('-');
    ano = parseInt(parts[0], 10);
    mes = parseInt(parts[1], 10) - 1;
    dia = parseInt(parts[2], 10);
  } else if (dataNasc.includes('/')) {
    const parts = dataNasc.split('/');
    dia = parseInt(parts[0], 10);
    mes = parseInt(parts[1], 10) - 1;
    ano = parseInt(parts[2], 10);
  } else {
    return null;
  }

  const hoje = new Date();
  let idade = hoje.getFullYear() - ano;
  const m = hoje.getMonth() - mes;
  if (m < 0 || (m === 0 && hoje.getDate() < dia)) {
    idade--;
  }
  return isNaN(idade) || idade < 0 || idade > 120 ? null : idade;
}

function formatarModalidade(key) {
  const map = {
    'musculacao': 'Musculação',
    'funcional': 'Funcional',
    'danca': 'Dança',
    'kids': 'Espaço Kids'
  };
  return map[key] || key;
}

function formatarData(isoStr) {
  if (!isoStr) return '--';
  try {
    const date = new Date(isoStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return isoStr;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
