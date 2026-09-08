/**
 * ACADEMIA METAMORFOSE — CORE SCRIPTS
 * Interações, Tabs das Modalidades, Contador Regressivo, Validação e WhatsApp Link
 */

document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initHeroParallax();
  initCountdown();
  initModalitiesTabs();
  initFaqAccordion();
  initPhoneMask();
  initFormValidation();
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

  // Data alvo: 14 dias a partir da data atual
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 14);
  targetDate.setHours(9, 0, 0, 0);

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
   3. MODALIDADES INTERACTIVE TABS
   ========================================================================== */
function initModalitiesTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.tab-panel');

  function switchTab(targetId) {
    tabs.forEach(tab => {
      const isTarget = tab.getAttribute('data-target') === targetId;
      tab.classList.toggle('active', isTarget);
      tab.setAttribute('aria-selected', isTarget);
    });

    panels.forEach(panel => {
      const isTarget = panel.id === `panel-${targetId}`;
      panel.classList.toggle('active', isTarget);
    });
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.getAttribute('data-target');
      switchTab(target);
    });
  });

  // Botões internos dos cards que pré-selecionam no formulário
  document.querySelectorAll('.select-modality-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modality = e.currentTarget.getAttribute('data-modality');
      selectModalityInForm(modality);
      const formSection = document.getElementById('matricula');
      if (formSection) {
        formSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // Links do rodapé para modalidades
  document.querySelectorAll('.footer-mod-link').forEach(link => {
    link.addEventListener('click', (e) => {
      const mod = link.getAttribute('data-mod');
      if (mod) {
        switchTab(mod);
      }
    });
  });
}

function selectModalityInForm(modalityKey) {
  const mapping = {
    'musculacao': 'check-musculacao',
    'funcional': 'check-funcional',
    'danca': 'check-danca',
    'luta': 'check-luta'
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
   5. MÁSCARA INTELIGENTE DE TELEFONE (DDD + 9 DÍGITOS)
   ========================================================================== */
function initPhoneMask() {
  const phoneInput = document.getElementById('lead-telefone');
  if (!phoneInput) return;

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

/* ==========================================================================
   6. VALIDAÇÃO ROBUSTA & REDIRECIONAMENTO WHATSAPP
   ========================================================================== */
function initFormValidation() {
  const form = document.getElementById('pre-matricula-form');
  const modal = document.getElementById('success-modal');
  const closeModalBtn = document.getElementById('btn-close-modal');
  const whatsBtn = document.getElementById('btn-modal-whatsapp');
  const displayNameEl = document.getElementById('lead-display-name');

  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const nomeInput = document.getElementById('lead-nome');
    const telInput = document.getElementById('lead-telefone');
    const emailInput = document.getElementById('lead-email');
    const periodoSelect = document.getElementById('lead-periodo');
    const modalidadesChecked = Array.from(form.querySelectorAll('input[name="modalidades"]:checked')).map(cb => cb.value);

    let isValid = true;

    // 1. Validação de Nome
    const errorNome = document.getElementById('error-nome');
    const nomeVal = nomeInput.value.trim();
    if (!nomeVal || nomeVal.length < 3) {
      errorNome.textContent = 'Por favor, informe seu nome completo.';
      isValid = false;
    } else {
      errorNome.textContent = '';
    }

    // 2. Validação de Telefone/WhatsApp (DDD + 9 dígitos)
    const errorTel = document.getElementById('error-telefone');
    const rawTel = telInput.value.replace(/\D/g, '');
    if (rawTel.length < 10 || rawTel.length > 11) {
      errorTel.textContent = 'Digite um número de WhatsApp válido com DDD (11 dígitos).';
      isValid = false;
    } else if (rawTel.length === 11 && rawTel.charAt(2) !== '9') {
      errorTel.textContent = 'Celulares brasileiros devem iniciar com o dígito 9 após o DDD.';
      isValid = false;
    } else {
      errorTel.textContent = '';
    }

    // 3. Validação de E-mail
    const errorEmail = document.getElementById('error-email');
    const emailVal = emailInput.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailVal || !emailRegex.test(emailVal)) {
      errorEmail.textContent = 'Digite um endereço de e-mail válido.';
      isValid = false;
    } else {
      errorEmail.textContent = '';
    }

    // 4. Validação de Modalidades
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
      telefone: rawTel,
      email: emailVal,
      modalidades: modalidadesChecked,
      periodo: periodoSelect.value,
      timestamp: new Date().toISOString()
    };

    try {
      const existingLeads = JSON.parse(localStorage.getItem('metamorfose_leads') || '[]');
      existingLeads.push(leadData);
      localStorage.setItem('metamorfose_leads', JSON.stringify(existingLeads));
    } catch (err) {
      console.warn('Não foi possível salvar no localStorage:', err);
    }

    // Montar link oficial de WhatsApp com mensagem personalizada
    const firstName = nomeVal.split(' ')[0];
    displayNameEl.textContent = firstName.toUpperCase();

    const modsText = modalidadesChecked.join(', ');
    const whatsMessage = `Olá! Meu nome é ${nomeVal} e acabei de me cadastrar na pré-matrícula VIP da Academia Metamorfose.\n\n` +
      `🔥 *Modalidades de Interesse:* ${modsText}\n` +
      `⏰ *Período Preferido:* ${periodoSelect.value}\n\n` +
      `Gostaria de confirmar minha prioridade no 1º Lote de Membro Fundador e garantir minha matrícula isenta!`;

    const encodedMessage = encodeURIComponent(whatsMessage);
    // Número oficial da academia (padrão de demonstração comercial)
    const whatsLink = `https://wa.me/5511999999999?text=${encodedMessage}`;
    whatsBtn.setAttribute('href', whatsLink);

    // Abrir Modal de Sucesso VIP
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');

    // Resetar formulário
    form.reset();
    document.getElementById('check-musculacao').checked = true;
  });

  // Fechar Modal
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
    });
  }

  // Fechar ao clicar fora
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
    }
  });
}

/* ==========================================================================
   7. SMOOTH SCROLL PARA ÂNCORAS
   ========================================================================== */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;

      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        targetEl.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
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

