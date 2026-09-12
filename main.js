/**
 * CT METAMORFOSE — CORE SCRIPTS
 * Interações, Tabs das Modalidades, Contador Regressivo, Validação, Pagamento Sicoob e WhatsApp Link
 */

import { 
  criarCobrancaPixSandbox, 
  detectarBandeiraCartao, 
  validarNumeroCartao, 
  validarValidadeCartao, 
  processarCartaoSandbox 
} from './paymentService.js';

document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initHeroParallax();
  initEspacoShowcase();
  initCountdown();
  initModalitySelectors();
  initFaqAccordion();
  initInputMasks();
  initFormValidation();
  initSicoobCheckout();
  initSmoothScroll();
});

/* ==========================================================================
   1. HEADER SCROLL & MOBILE MENU
   ========================================================================== */
function initHeader() {
  const header = document.getElementById('site-header');
  const toggle = document.getElementById('mobile-toggle');
  const drawer = document.getElementById('mobile-drawer');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });

  if (toggle && drawer) {
    toggle.addEventListener('click', () => {
      const isOpen = drawer.classList.toggle('open');
      toggle.setAttribute('aria-expanded', isOpen);
    });

    drawer.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        drawer.classList.remove('open');
        toggle.setAttribute('aria-expanded', false);
      });
    });
  }
}

/* ==========================================================================
   2. COUNTDOWN TIMER (Para Inauguração)
   ========================================================================== */
function initCountdown() {
  const daysEl = document.getElementById('days');
  const hoursEl = document.getElementById('hours');
  const minutesEl = document.getElementById('minutes');
  const secondsEl = document.getElementById('seconds');

  if (!daysEl || !hoursEl || !minutesEl || !secondsEl) return;

  // Data alvo: 26 de Setembro de 2026 às 18:00 (Horário de Brasília)
  const targetDate = new Date('2026-09-26T18:00:00-03:00');

  function update() {
    const now = new Date().getTime();
    const diff = targetDate.getTime() - now;

    if (diff <= 0) {
      daysEl.textContent = '00';
      hoursEl.textContent = '00';
      minutesEl.textContent = '00';
      secondsEl.textContent = '00';
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    daysEl.textContent = String(days).padStart(2, '0');
    hoursEl.textContent = String(hours).padStart(2, '0');
    minutesEl.textContent = String(minutes).padStart(2, '0');
    secondsEl.textContent = String(seconds).padStart(2, '0');
  }

  update();
  setInterval(update, 1000);
}

/* ==========================================================================
   3. SELEÇÃO DE MODALIDADES
   ========================================================================== */
function initModalitySelectors() {
  // Botões internos dos cards que pré-selecionam no formulário
  document.querySelectorAll('.select-modality-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modality = e.currentTarget.getAttribute('data-modality');
      selectModalityInForm(modality);
      const formSection = document.getElementById('matricula');
      if (formSection) {
        smoothScrollToTarget('#matricula', formSection);
      }
    });
  });
}

function selectModalityInForm(modalityKey) {
  const mapping = {
    'musculacao': 'check-musculacao',
    'funcional': 'check-funcional',
    'danca': 'check-danca'
  };

  const checkboxId = mapping[modalityKey];
  if (checkboxId) {
    const cb = document.getElementById(checkboxId);
    if (cb) {
      cb.checked = true;
      // Dispara evento de mudança para estilos visuais
      cb.dispatchEvent(new Event('change'));
    }
  }
}

/* ==========================================================================
   4. FAQ ACCORDION
   ========================================================================== */
function initFaqAccordion() {
  const items = document.querySelectorAll('.faq-item');

  items.forEach(item => {
    const trigger = item.querySelector('.faq-trigger');
    if (!trigger) return;

    trigger.addEventListener('click', () => {
      const isActive = item.classList.contains('active');

      // Fecha outros itens para accordion limpo
      items.forEach(other => {
        other.classList.remove('active');
        const otherTrigger = other.querySelector('.faq-trigger');
        if (otherTrigger) otherTrigger.setAttribute('aria-expanded', 'false');
      });

      if (!isActive) {
        item.classList.add('active');
        trigger.setAttribute('aria-expanded', 'true');
      }
    });
  });
}

/* ==========================================================================
   5. MÁSCARAS INTELIGENTES (TELEFONE, CPF E DATA DE NASCIMENTO)
   ========================================================================== */
function initInputMasks() {
  // Telefone (DDD + 9 dígitos)
  const phoneInput = document.getElementById('lead-telefone');
  if (phoneInput) {
    phoneInput.addEventListener('input', (e) => {
      let val = e.target.value.replace(/\D/g, '');
      if (val.length > 11) val = val.substring(0, 11);

      if (val.length === 0) {
        e.target.value = '';
      } else if (val.length <= 2) {
        e.target.value = `(${val}`;
      } else if (val.length <= 7) {
        e.target.value = `(${val.substring(0, 2)}) ${val.substring(2)}`;
      } else {
        e.target.value = `(${val.substring(0, 2)}) ${val.substring(2, 7)}-${val.substring(7)}`;
      }
    });
  }

  // CPF (000.000.000-00)
  const cpfInput = document.getElementById('lead-cpf');
  if (cpfInput) {
    cpfInput.addEventListener('input', (e) => {
      let val = e.target.value.replace(/\D/g, '');
      if (val.length > 11) val = val.substring(0, 11);

      if (val.length === 0) {
        e.target.value = '';
      } else if (val.length <= 3) {
        e.target.value = val;
      } else if (val.length <= 6) {
        e.target.value = `${val.substring(0, 3)}.${val.substring(3)}`;
      } else if (val.length <= 9) {
        e.target.value = `${val.substring(0, 3)}.${val.substring(3, 6)}.${val.substring(6)}`;
      } else {
        e.target.value = `${val.substring(0, 3)}.${val.substring(3, 6)}.${val.substring(6, 9)}-${val.substring(9)}`;
      }
    });
  }

  // Data de Nascimento (DD/MM/AAAA)
  const nascInput = document.getElementById('lead-nascimento');
  if (nascInput) {
    nascInput.addEventListener('input', (e) => {
      let val = e.target.value.replace(/\D/g, '');
      if (val.length > 8) val = val.substring(0, 8);

      if (val.length === 0) {
        e.target.value = '';
      } else if (val.length <= 2) {
        e.target.value = val;
      } else if (val.length <= 4) {
        e.target.value = `${val.substring(0, 2)}/${val.substring(2)}`;
      } else {
        e.target.value = `${val.substring(0, 2)}/${val.substring(2, 4)}/${val.substring(4)}`;
      }
    });
  }
}

/**
 * Validação do Algoritmo Oficial de CPF da Receita Federal
 */
function validarCPF(cpfStr) {
  const cpf = cpfStr.replace(/\D/g, '');
  if (cpf.length !== 11) return false;
  // Rejeita sequências com todos os números iguais (ex: 111.111.111-11)
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  // Primeiro dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf.charAt(i), 10) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.charAt(9), 10)) return false;

  // Segundo dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpf.charAt(i), 10) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.charAt(10), 10)) return false;

  return true;
}

/**
 * Validação de Data de Nascimento (Dia, Mês, Ano e Idade mínima de 12 anos)
 */
function validarDataNascimento(dataStr) {
  const clean = dataStr.replace(/\D/g, '');
  if (clean.length !== 8) {
    return { valid: false, message: 'Digite a data completa no formato DD/MM/AAAA.' };
  }

  const dia = parseInt(clean.substring(0, 2), 10);
  const mes = parseInt(clean.substring(2, 4), 10);
  const ano = parseInt(clean.substring(4, 8), 10);

  if (mes < 1 || mes > 12) {
    return { valid: false, message: 'Mês inválido (deve ser entre 01 e 12).' };
  }

  const diasNoMes = new Date(ano, mes, 0).getDate();
  if (dia < 1 || dia > diasNoMes) {
    return { valid: false, message: `Dia inválido para o mês informado (máximo: ${diasNoMes}).` };
  }

  const data = new Date(ano, mes - 1, dia);
  const hoje = new Date();

  if (data > hoje) {
    return { valid: false, message: 'Data de nascimento não pode ser no futuro.' };
  }

  let idade = hoje.getFullYear() - ano;
  const m = hoje.getMonth() - (mes - 1);
  if (m < 0 || (m === 0 && hoje.getDate() < dia)) {
    idade--;
  }

  if (idade < 12) {
    return { valid: false, message: 'É necessário ter no mínimo 12 anos para a pré-matrícula.' };
  }
  if (idade > 110) {
    return { valid: false, message: 'Por favor, informe um ano de nascimento válido.' };
  }

  return { valid: true };
}

/**
 * Validação rigorosa de Nome e Sobrenome Completos
 * Exige pelo menos nome e um sobrenome (mínimo 2 palavras),
 * cada uma com pelo menos 2 letras, sem números ou caracteres especiais indevidos.
 */
function validarNomeCompleto(nomeStr) {
  if (!nomeStr) {
    return { valid: false, message: 'Por favor, informe seu nome e sobrenome completos.' };
  }

  const limpo = nomeStr.trim().replace(/\s+/g, ' ');

  // Apenas letras (incluindo acentos PT-BR), espaços, apóstrofos e hífens
  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]+$/.test(limpo)) {
    return { valid: false, message: 'O nome não deve conter números ou caracteres especiais.' };
  }

  const partes = limpo.split(' ').filter(p => p.length > 0);

  if (partes.length < 2) {
    return { valid: false, message: 'Informe seu nome e sobrenome completos (ex: Carlos Silva).' };
  }

  const primeiroNome = partes[0];
  const ultimoNome = partes[partes.length - 1];

  if (primeiroNome.length < 2) {
    return { valid: false, message: 'O primeiro nome deve conter pelo menos 2 letras.' };
  }

  if (ultimoNome.length < 2) {
    return { valid: false, message: 'O sobrenome deve conter pelo menos 2 letras.' };
  }

  const partesSignificativas = partes.filter(p => p.length >= 2);
  if (partesSignificativas.length < 2) {
    return { valid: false, message: 'Por favor, informe seu sobrenome completo.' };
  }

  return { valid: true };
}

/* ==========================================================================
   6. VALIDAÇÃO ROBUSTA & REDIRECIONAMENTO WHATSAPP
   ========================================================================== */
function initFormValidation() {
  const form = document.getElementById('pre-matricula-form');

  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const nomeInput = document.getElementById('lead-nome');
    const cpfInput = document.getElementById('lead-cpf');
    const nascInput = document.getElementById('lead-nascimento');
    const telInput = document.getElementById('lead-telefone');
    const emailInput = document.getElementById('lead-email');
    const periodoSelect = document.getElementById('lead-periodo');
    const modalidadesChecked = Array.from(form.querySelectorAll('input[name="modalidades"]:checked')).map(cb => cb.value);

    let isValid = true;

    // 1. Validação de Nome e Sobrenome Completos
    const errorNome = document.getElementById('error-nome');
    const nomeVal = nomeInput ? nomeInput.value.trim() : '';
    const nomeRes = validarNomeCompleto(nomeVal);
    if (!nomeRes.valid) {
      errorNome.textContent = nomeRes.message;
      isValid = false;
    } else {
      errorNome.textContent = '';
    }

    // 2. Validação de CPF
    const errorCpf = document.getElementById('error-cpf');
    const cpfVal = cpfInput ? cpfInput.value.trim() : '';
    if (!cpfVal) {
      errorCpf.textContent = 'Por favor, informe seu CPF.';
      isValid = false;
    } else if (!validarCPF(cpfVal)) {
      errorCpf.textContent = 'CPF inválido. Verifique os números digitados.';
      isValid = false;
    } else {
      errorCpf.textContent = '';
    }

    // 3. Validação de Data de Nascimento
    const errorNasc = document.getElementById('error-nascimento');
    const nascVal = nascInput ? nascInput.value.trim() : '';
    if (!nascVal) {
      errorNasc.textContent = 'Por favor, informe sua data de nascimento.';
      isValid = false;
    } else {
      const nascRes = validarDataNascimento(nascVal);
      if (!nascRes.valid) {
        errorNasc.textContent = nascRes.message;
        isValid = false;
      } else {
        errorNasc.textContent = '';
      }
    }

    // 4. Validação de Telefone/WhatsApp (DDD + 9 dígitos)
    const errorTel = document.getElementById('error-telefone');
    const rawTel = telInput ? telInput.value.replace(/\D/g, '') : '';
    if (rawTel.length < 10 || rawTel.length > 11) {
      errorTel.textContent = 'Digite um número de WhatsApp válido com DDD (11 dígitos).';
      isValid = false;
    } else if (rawTel.length === 11 && rawTel.charAt(2) !== '9') {
      errorTel.textContent = 'Celulares brasileiros devem iniciar com o dígito 9 após o DDD.';
      isValid = false;
    } else {
      errorTel.textContent = '';
    }

    // 5. Validação de E-mail
    const errorEmail = document.getElementById('error-email');
    const emailVal = emailInput ? emailInput.value.trim() : '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailVal || !emailRegex.test(emailVal)) {
      errorEmail.textContent = 'Digite um endereço de e-mail válido.';
      isValid = false;
    } else {
      errorEmail.textContent = '';
    }

    // 6. Validação de Modalidades
    const errorMod = document.getElementById('error-modalidades');
    if (modalidadesChecked.length === 0) {
      errorMod.textContent = 'Selecione pelo menos uma modalidade de seu interesse.';
      isValid = false;
    } else {
      errorMod.textContent = '';
    }

    if (!isValid) return;

    // Lead Válido! Salvar no localStorage
    const leadData = {
      nome: nomeVal,
      cpf: cpfVal,
      dataNascimento: nascVal,
      telefone: rawTel,
      email: emailVal,
      modalidades: modalidadesChecked,
      periodo: periodoSelect ? periodoSelect.value : '',
      timestamp: new Date().toISOString()
    };

    try {
      const existingLeads = JSON.parse(localStorage.getItem('metamorfose_leads') || '[]');
      existingLeads.push(leadData);
      localStorage.setItem('metamorfose_leads', JSON.stringify(existingLeads));
    } catch (err) {
      console.warn('Não foi possível salvar no localStorage:', err);
    }

    // Abrir Modal de Checkout Sicoob (Pix e Cartão à Vista)
    if (typeof window.openSicoobCheckout === 'function') {
      window.openSicoobCheckout(leadData);
    }

    // Resetar formulário mantendo modalidades padrão do plano
    form.reset();
    const checkTodas = document.getElementById('check-todas');
    if (checkTodas) checkTodas.checked = true;
    const checkMusc = document.getElementById('check-musculacao');
    if (checkMusc) checkMusc.checked = true;
    const checkFunc = document.getElementById('check-funcional');
    if (checkFunc) checkFunc.checked = true;
    const checkDanc = document.getElementById('check-danca');
    if (checkDanc) checkDanc.checked = true;
  });

  // Garantir que nenhuma modalidade possa ser desmarcada (todas inclusas no Passe Livre)
  const modalityInputs = form.querySelectorAll('input[name="modalidades"]');
  modalityInputs.forEach(input => {
    input.checked = true;
    const parentCard = input.closest('.checkbox-card');
    if (parentCard) {
      parentCard.addEventListener('click', (e) => {
        e.preventDefault();
        input.checked = true;
      });
    }
  });

  // Limpeza de erros em tempo real ao digitar
  const nomeInput = document.getElementById('lead-nome');
  if (nomeInput) {
    nomeInput.addEventListener('input', () => {
      const err = document.getElementById('error-nome');
      if (err && err.textContent && validarNomeCompleto(nomeInput.value).valid) {
        err.textContent = '';
      }
    });
  }

  const cpfInput = document.getElementById('lead-cpf');
  if (cpfInput) {
    cpfInput.addEventListener('input', () => {
      const err = document.getElementById('error-cpf');
      if (err && err.textContent && validarCPF(cpfInput.value)) {
        err.textContent = '';
      }
    });
  }

  const nascInput = document.getElementById('lead-nascimento');
  if (nascInput) {
    nascInput.addEventListener('input', () => {
      const err = document.getElementById('error-nascimento');
      if (err && err.textContent && validarDataNascimento(nascInput.value).valid) {
        err.textContent = '';
      }
    });
  }
}

/* ==========================================================================
   7. CHECKOUT & PAGAMENTO SICOOB (PIX E CARTÃO À VISTA - SANDBOX)
   ========================================================================== */
function initSicoobCheckout() {
  const modal = document.getElementById('payment-modal');
  const checkoutView = document.getElementById('checkout-view');
  const successView = document.getElementById('payment-success-view');
  const closeBtn = document.getElementById('btn-close-checkout');
  const finishBtn = document.getElementById('btn-finish-checkout');

  const tabBtnPix = document.getElementById('tab-btn-pix');
  const tabBtnCard = document.getElementById('tab-btn-card');
  const tabContentPix = document.getElementById('tab-content-pix');
  const tabContentCard = document.getElementById('tab-content-card');

  const qrContainer = document.getElementById('pix-qrcode-container');
  const copiaColaInput = document.getElementById('pix-copia-cola-input');
  const btnCopyPix = document.getElementById('btn-copy-pix');
  const btnCopyText = document.getElementById('btn-copy-text');
  const copyToast = document.getElementById('copy-success-toast');
  const timerEl = document.getElementById('pix-countdown-timer');
  const btnPixWhats = document.getElementById('btn-pix-whatsapp');
  const btnSimulatePix = document.getElementById('btn-simulate-pix');

  const cardForm = document.getElementById('card-checkout-form');
  const cardNumberInput = document.getElementById('card-number');
  const cardHolderInput = document.getElementById('card-holder');
  const cardExpiryInput = document.getElementById('card-expiry');
  const cardCvvInput = document.getElementById('card-cvv');
  const cardBrandTag = document.getElementById('card-brand-tag');
  const btnSubmitCard = document.getElementById('btn-submit-card');

  const receiptNameEl = document.getElementById('receipt-lead-name');
  const receiptCpfEl = document.getElementById('receipt-lead-cpf');
  const receiptAuthCodeEl = document.getElementById('receipt-auth-code');
  const btnSuccessWhats = document.getElementById('btn-success-whatsapp');

  let currentLead = null;
  let timerInterval = null;

  if (!modal) return;

  // Função Global para abrir o Checkout com os dados do lead
  window.openSicoobCheckout = async (lead) => {
    currentLead = lead;

    // Preenche nome
    const leadNameEl = document.getElementById('checkout-lead-name');
    if (leadNameEl && lead && lead.nome) {
      const primeiroNome = lead.nome.split(' ')[0];
      leadNameEl.textContent = primeiroNome.toUpperCase();
    }

    // Reseta visualização
    if (checkoutView) checkoutView.style.display = 'block';
    if (successView) successView.style.display = 'none';

    // Ativa aba Pix por padrão
    switchTab('pix');

    // Abre o Modal
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');

    // Gera cobrança Pix Sandbox
    try {
      if (qrContainer) {
        qrContainer.innerHTML = '<div class="qr-loading-placeholder" style="color: #64748b; font-size: 0.85rem;">Gerando QR Code Sicoob...</div>';
      }

      const pixData = await criarCobrancaPixSandbox({
        nome: lead.nome,
        cpf: lead.cpf,
        valor: 129.90
      });

      if (qrContainer && pixData.qrCodeDataUrl) {
        qrContainer.innerHTML = `<img src="${pixData.qrCodeDataUrl}" alt="QR Code Pix Sicoob" loading="eager">`;
      }

      if (copiaColaInput) {
        copiaColaInput.value = pixData.pixCopiaECola;
      }

      // Inicia contagem regressiva de 15 minutos
      startPixTimer(15 * 60);

      // Atualiza link de WhatsApp com comprovante Pix
      if (btnPixWhats) {
        const msg = `Olá! Meu nome é ${lead.nome} (CPF: ${lead.cpf}) e confirmo o envio do pagamento da 1ª mensalidade de R$ 129,90 via Pix Sicoob para o Lote Fundador do CT Metamorfose.\n\n` +
          `TXID: ${pixData.txid}\n` +
          `Segue meu comprovante em anexo:`;
        btnPixWhats.setAttribute('href', `https://wa.me/5511999999999?text=${encodeURIComponent(msg)}`);
      }
    } catch (err) {
      console.error('Erro ao gerar Pix Sandbox:', err);
    }
  };

  // Alternância de Abas
  function switchTab(tab) {
    if (tab === 'pix') {
      if (tabBtnPix) {
        tabBtnPix.classList.add('active');
        tabBtnPix.setAttribute('aria-selected', 'true');
      }
      if (tabBtnCard) {
        tabBtnCard.classList.remove('active');
        tabBtnCard.setAttribute('aria-selected', 'false');
      }
      if (tabContentPix) tabContentPix.classList.add('active');
      if (tabContentCard) tabContentCard.classList.remove('active');
    } else {
      if (tabBtnCard) {
        tabBtnCard.classList.add('active');
        tabBtnCard.setAttribute('aria-selected', 'true');
      }
      if (tabBtnPix) {
        tabBtnPix.classList.remove('active');
        tabBtnPix.setAttribute('aria-selected', 'false');
      }
      if (tabContentCard) tabContentCard.classList.add('active');
      if (tabContentPix) tabContentPix.classList.remove('active');
    }
  }

  if (tabBtnPix) tabBtnPix.addEventListener('click', () => switchTab('pix'));
  if (tabBtnCard) tabBtnCard.addEventListener('click', () => switchTab('card'));

  // Copiar Código Pix
  if (btnCopyPix && copiaColaInput) {
    btnCopyPix.addEventListener('click', async () => {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(copiaColaInput.value);
        } else {
          copiaColaInput.select();
          document.execCommand('copy');
        }

        if (btnCopyText) btnCopyText.textContent = '✓ Copiado!';
        if (copyToast) copyToast.classList.add('show');

        setTimeout(() => {
          if (btnCopyText) btnCopyText.textContent = 'Copiar';
          if (copyToast) copyToast.classList.remove('show');
        }, 3000);
      } catch (err) {
        console.warn('Não foi possível copiar automaticamente:', err);
      }
    });
  }

  // Timer Regressivo do Pix
  function startPixTimer(durationSeconds) {
    if (timerInterval) clearInterval(timerInterval);
    let timeLeft = durationSeconds;

    const updateTimer = () => {
      const minutes = Math.floor(timeLeft / 60);
      const seconds = timeLeft % 60;
      if (timerEl) {
        timerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      }
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        if (timerEl) timerEl.textContent = 'Expirado';
      }
      timeLeft--;
    };

    updateTimer();
    timerInterval = setInterval(updateTimer, 1000);
  }

  // Simulação de Aprovação Pix (Sandbox)
  if (btnSimulatePix) {
    btnSimulatePix.addEventListener('click', () => {
      const authCode = `SICOOB-PIX-${Math.floor(100000 + Math.random() * 900000)}`;
      concluirPagamentoSucesso({
        metodo: 'Pix Instantâneo Sicoob',
        authCode
      });
    });
  }

  // Máscaras e Validação do Cartão
  if (cardNumberInput) {
    cardNumberInput.addEventListener('input', (e) => {
      let val = e.target.value.replace(/\D/g, '');
      if (val.length > 16) val = val.substring(0, 16);

      // Agrupa de 4 em 4 dígitos
      const formatted = val.match(/.{1,4}/g)?.join(' ') || val;
      e.target.value = formatted;

      // Detecta bandeira
      const bandeira = detectarBandeiraCartao(val);
      if (cardBrandTag) cardBrandTag.textContent = bandeira;
    });
  }

  if (cardExpiryInput) {
    cardExpiryInput.addEventListener('input', (e) => {
      let val = e.target.value.replace(/\D/g, '');
      if (val.length > 4) val = val.substring(0, 4);

      if (val.length <= 2) {
        e.target.value = val;
      } else {
        e.target.value = `${val.substring(0, 2)}/${val.substring(2)}`;
      }
    });
  }

  if (cardCvvInput) {
    cardCvvInput.addEventListener('input', (e) => {
      let val = e.target.value.replace(/\D/g, '');
      if (val.length > 4) val = val.substring(0, 4);
      e.target.value = val;
    });
  }

  // Submissão do Cartão
  if (cardForm) {
    cardForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const numVal = cardNumberInput ? cardNumberInput.value.replace(/\D/g, '') : '';
      const holderVal = cardHolderInput ? cardHolderInput.value.trim() : '';
      const expVal = cardExpiryInput ? cardExpiryInput.value.trim() : '';
      const cvvVal = cardCvvInput ? cardCvvInput.value.replace(/\D/g, '') : '';

      let isValid = true;

      // 1. Número do Cartão
      const errNum = document.getElementById('error-card-number');
      if (!numVal || numVal.length < 13) {
        if (errNum) errNum.textContent = 'Informe o número completo do cartão.';
        isValid = false;
      } else if (!validarNumeroCartao(numVal)) {
        if (errNum) errNum.textContent = 'Número de cartão inválido. Verifique os dígitos.';
        isValid = false;
      } else {
        if (errNum) errNum.textContent = '';
      }

      // 2. Nome do Titular
      const errHolder = document.getElementById('error-card-holder');
      if (!holderVal || holderVal.length < 3) {
        if (errHolder) errHolder.textContent = 'Informe o nome completo impresso no cartão.';
        isValid = false;
      } else {
        if (errHolder) errHolder.textContent = '';
      }

      // 3. Validade
      const errExp = document.getElementById('error-card-expiry');
      const expRes = validarValidadeCartao(expVal);
      if (!expRes.valid) {
        if (errExp) errExp.textContent = expRes.message;
        isValid = false;
      } else {
        if (errExp) errExp.textContent = '';
      }

      // 4. CVV
      const errCvv = document.getElementById('error-card-cvv');
      if (!cvvVal || cvvVal.length < 3) {
        if (errCvv) errCvv.textContent = 'Código de segurança inválido (3 ou 4 dígitos).';
        isValid = false;
      } else {
        if (errCvv) errCvv.textContent = '';
      }

      if (!isValid) return;

      // Processando no Sicoob Sandbox
      if (btnSubmitCard) {
        btnSubmitCard.disabled = true;
        btnSubmitCard.innerHTML = '<span class="btn-text">PROCESSANDO COM SICOOB...</span>';
      }

      try {
        const resultado = await processarCartaoSandbox({
          numero: numVal,
          titular: holderVal,
          validade: expVal,
          cvv: cvvVal,
          valor: 129.90
        });

        concluirPagamentoSucesso({
          metodo: `Cartão de Crédito à Vista (${resultado.bandeira})`,
          authCode: resultado.authCode
        });

        cardForm.reset();
        if (cardBrandTag) cardBrandTag.textContent = 'CARTÃO';
      } catch (err) {
        alert('Ocorreu um erro ao processar seu cartão. Tente novamente.');
      } finally {
        if (btnSubmitCard) {
          btnSubmitCard.disabled = false;
          btnSubmitCard.innerHTML = '<span class="btn-text">PAGAR R$ 129,90 À VISTA VIA SICOOB</span><svg class="icon-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>';
        }
      }
    });
  }

  // Transição para Tela de Sucesso
  function concluirPagamentoSucesso({ metodo, authCode }) {
    if (checkoutView) checkoutView.style.display = 'none';
    if (successView) successView.style.display = 'block';

    const leadNome = currentLead ? currentLead.nome : 'Atleta';
    const leadCpf = currentLead ? currentLead.cpf : '';

    if (receiptNameEl) receiptNameEl.textContent = leadNome;
    if (receiptCpfEl) receiptCpfEl.textContent = leadCpf || 'Verificado';
    if (receiptAuthCodeEl) receiptAuthCodeEl.textContent = authCode;

    // Atualiza botão de WhatsApp com o comprovante aprovado
    if (btnSuccessWhats) {
      const msg = `Olá! Meu nome é ${leadNome} (CPF: ${leadCpf}) e meu pagamento da 1ª mensalidade de R$ 129,90 foi APROVADO via ${metodo}!\n\n` +
        `🛡️ *Autenticação Bancária:* ${authCode}\n` +
        `🔥 *Plano:* Membro Fundador (Valor Vitalício)\n` +
        `Gostaria de agendar minha visita VIP e retirar meu passe antecipado!`;
      btnSuccessWhats.setAttribute('href', `https://wa.me/5511999999999?text=${encodeURIComponent(msg)}`);
    }

    // Rola modal para o topo suavemente
    modal.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Fechar Modal
  const closeModal = () => {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    if (timerInterval) clearInterval(timerInterval);
  };

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (finishBtn) finishBtn.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
}

/**
 * Rolagem inteligente e precisa para links âncoras.
 * No Desktop: Mantém o comportamento nativo (scrollIntoView), confirmado como perfeito.
 * No Mobile: Se o destino for a matrícula/formulário (#matricula, #formulario),
 * navega cirurgicamente para o card do formulário (.form-card), compensando o cabeçalho fixo (65px)
 * e evitando que o usuário precise rolar mais de 500px de conteúdo descritivo no mobile.
 */
function smoothScrollToTarget(targetId, targetEl) {
  const isMobile = window.innerWidth <= 992;

  // No Desktop: Mantém o comportamento original inalterado
  if (!isMobile) {
    if (targetEl) {
      targetEl.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
    return;
  }

  // No Mobile: Otimização precisa de destino e offset
  let finalTarget = targetEl;

  if (targetId === '#matricula' || targetId === '#formulario' || targetId === '#pre-matricula-form') {
    const formCard = document.querySelector('.form-card') || document.getElementById('pre-matricula-form');
    if (formCard) {
      finalTarget = formCard;
    }
  }

  if (!finalTarget) return;

  const mobileHeader = document.getElementById('site-header');
  const headerHeight = mobileHeader ? mobileHeader.offsetHeight : 65;
  const breathingRoom = 12;
  const totalOffset = headerHeight + breathingRoom;

  const elementPosition = finalTarget.getBoundingClientRect().top;
  const offsetPosition = elementPosition + window.pageYOffset - totalOffset;

  window.scrollTo({
    top: Math.max(0, offsetPosition),
    behavior: 'smooth'
  });
}

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#' || !targetId) return;

      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();

        // Fecha o drawer mobile caso esteja aberto
        const drawer = document.getElementById('mobile-drawer');
        const toggle = document.getElementById('mobile-toggle');
        if (drawer && drawer.classList.contains('open')) {
          drawer.classList.remove('open');
          if (toggle) toggle.setAttribute('aria-expanded', 'false');
        }

        smoothScrollToTarget(targetId, targetEl);
      }
    });
  });

  // Se a página for aberta diretamente com a âncora #matricula no mobile, ajusta o foco no card do formulário
  if (window.location.hash === '#matricula' && window.innerWidth <= 992) {
    setTimeout(() => {
      const formCard = document.querySelector('.form-card');
      if (formCard) {
        smoothScrollToTarget('#matricula', formCard);
      }
    }, 350);
  }
}

/* ==========================================================================
   8. HERO PARALLAX SCROLL & FADE-OUT (EXCLUSIVO MOBILE)
   Mantém a imagem fixa em profundidade e dissolve suavemente no mobile.
   No Desktop (> 768px), o fundo roda o Ken Burns cinematográfico 100% via GPU.
   ========================================================================== */
function initHeroParallax() {
  const heroSection = document.getElementById('inicio');
  const heroBg = document.getElementById('hero-parallax-bg');
  if (!heroSection || !heroBg) return;

  const isMobile = () => window.innerWidth <= 768;

  let heroHeight = heroSection.offsetHeight;
  window.addEventListener('resize', () => {
    heroHeight = heroSection.offsetHeight;
    if (!isMobile()) {
      // Limpa inline styles no desktop para liberar o CSS Ken Burns puro
      heroBg.style.transform = '';
      heroBg.style.opacity = '';
    }
  }, { passive: true });

  let ticking = false;

  function update() {
    if (!isMobile()) return;

    const scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;

    if (scrollY <= heroHeight + 50) {
      const translateY = scrollY * 0.44;
      const fadeThreshold = heroHeight * 0.85;
      const opacity = Math.max(0, 1 - (scrollY / fadeThreshold));

      heroBg.style.transform = `translate3d(0, ${translateY.toFixed(1)}px, 0)`;
      heroBg.style.opacity = opacity.toFixed(3);
    } else if (heroBg.style.opacity !== '0') {
      heroBg.style.opacity = '0';
    }

    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!isMobile()) return;
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive: true });

  if (isMobile()) {
    update();
  }
}

/* ==========================================================================
   ESPAÇO SHOWCASE (MOBILE CAROUSEL DOTS & LIGHTBOX ZOOM)
   ========================================================================== */
function initEspacoShowcase() {
  const containers = document.querySelectorAll('.dual-photo-container');

  // Sincronização dos Dots e Auto-Scroll Fluido no Carrossel Mobile
  containers.forEach(container => {
    const track = container.querySelector('.dual-photo-track');
    const dots = container.querySelectorAll('.carousel-dots .dot');
    const items = container.querySelectorAll('.photo-item');
    const parentCard = container.closest('.espaco-card');

    if (!track || dots.length === 0 || items.length === 0) return;

    let isScrolling = false;
    let currentSlide = 0;
    let userInteractedUntil = 0;
    let animFrameId = null;

    // Atualiza o dot ativo durante o scroll manual ou animado
    track.addEventListener('scroll', () => {
      if (isScrolling) return;
      isScrolling = true;
      requestAnimationFrame(() => {
        const scrollLeft = track.scrollLeft;
        const maxScroll = Math.max(1, track.scrollWidth - track.clientWidth);
        // Calcula o índice proporcional ao progresso do scroll
        const activeIndex = scrollLeft > maxScroll * 0.45 ? 1 : 0;

        currentSlide = activeIndex;

        dots.forEach((dot, idx) => {
          if (idx === activeIndex) {
            dot.classList.add('active');
          } else {
            dot.classList.remove('active');
          }
        });
        isScrolling = false;
      });
    }, { passive: true });

    // Cancela animação ativa se o usuário tocar na tela
    const cancelActiveAnim = () => {
      if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
        track.style.scrollSnapType = 'x mandatory';
      }
    };

    const pauseOnInteraction = () => {
      cancelActiveAnim();
      userInteractedUntil = Date.now() + 6500; // pausa por 6.5s
    };

    track.addEventListener('touchstart', pauseOnInteraction, { passive: true });
    track.addEventListener('pointerdown', pauseOnInteraction, { passive: true });

    // Animação fluida com interpolação contínua (desativa snap temporariamente para evitar teleport)
    function smoothSlideTo(targetScrollLeft, duration = 650) {
      cancelActiveAnim();

      // Desliga snap durante a animação programática
      track.style.scrollSnapType = 'none';

      const startLeft = track.scrollLeft;
      const distance = targetScrollLeft - startLeft;

      if (Math.abs(distance) < 2) {
        track.style.scrollSnapType = 'x mandatory';
        return;
      }

      const startTime = performance.now();

      function easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      }

      function step(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = easeInOutCubic(progress);

        track.scrollLeft = startLeft + distance * ease;

        if (progress < 1) {
          animFrameId = requestAnimationFrame(step);
        } else {
          track.scrollLeft = targetScrollLeft;
          track.style.scrollSnapType = 'x mandatory';
          animFrameId = null;
        }
      }

      animFrameId = requestAnimationFrame(step);
    }

    // Posição de parada exata de cada slide
    function getSlideScrollPosition(index) {
      if (index === 0) return 0;
      return Math.max(0, track.scrollWidth - track.clientWidth);
    }

    // Clique no dot para navegar manualmente com rolagem animada
    dots.forEach((dot, idx) => {
      dot.addEventListener('click', () => {
        pauseOnInteraction();
        currentSlide = idx;
        const targetX = getSlideScrollPosition(idx);
        smoothSlideTo(targetX, 550);
      });
    });

    // Auto-Scroll no Mobile: animação de rolagem contínua a cada 3.5 segundos
    setInterval(() => {
      if (window.innerWidth > 768) return; // apenas na versão mobile
      if (Date.now() < userInteractedUntil) return; // respeita interação recente do usuário

      // Executa apenas se o carrossel estiver visível no viewport (poupa CPU/bateria)
      const rect = container.getBoundingClientRect();
      const inView = rect.top < window.innerHeight && rect.bottom > 0;
      if (!inView) return;

      currentSlide = (currentSlide + 1) % items.length;
      const targetX = getSlideScrollPosition(currentSlide);
      smoothSlideTo(targetX, 650);
    }, 3500);
  });

  // 3. Lightbox Modal Zoom
  const lightboxModal = document.getElementById('lightbox-modal');
  const lightboxOverlay = document.getElementById('lightbox-overlay');
  const lightboxClose = document.getElementById('lightbox-close');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxCaption = document.getElementById('lightbox-caption');

  if (lightboxModal && lightboxImg) {
    function openLightbox(imgSrc, captionText) {
      lightboxImg.src = imgSrc;
      if (lightboxCaption) {
        lightboxCaption.textContent = captionText || 'Espaço CT Metamorfose';
      }
      lightboxModal.classList.add('active');
      lightboxModal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
      lightboxModal.classList.remove('active');
      lightboxModal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      setTimeout(() => {
        if (!lightboxModal.classList.contains('active')) {
          lightboxImg.src = '';
        }
      }, 300);
    }

    // Clique nos photo-items para abrir zoom
    document.querySelectorAll('.photo-item').forEach(item => {
      item.addEventListener('click', () => {
        const img = item.querySelector('img');
        const tag = item.querySelector('.photo-tag');
        if (img) {
          const caption = tag ? tag.textContent.trim() : (img.alt || '');
          openLightbox(img.src, caption);
        }
      });
    });

    if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
    if (lightboxOverlay) lightboxOverlay.addEventListener('click', closeLightbox);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && lightboxModal.classList.contains('active')) {
        closeLightbox();
      }
    });
  }
}

