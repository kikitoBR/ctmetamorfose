/**
 * ACADEMIA METAMORFOSE — CORE SCRIPTS
 * Interações, Tabs das Modalidades, Contador Regressivo, Validação e WhatsApp Link
 */

document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initHeroParallax();
  initEspacoShowcase();
  initCountdown();
  initModalitySelectors();
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
        formSection.scrollIntoView({ behavior: 'smooth' });
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

/* ==========================================================================
   ESPAÇO SHOWCASE (FILTERS, MOBILE CAROUSEL DOTS & LIGHTBOX ZOOM)
   ========================================================================== */
function initEspacoShowcase() {
  const filterBtns = document.querySelectorAll('.espaco-filter-btn');
  const cards = document.querySelectorAll('.espaco-card');
  const containers = document.querySelectorAll('.dual-photo-container');

  // 1. Filtros por Categoria
  if (filterBtns.length > 0 && cards.length > 0) {
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const filter = btn.getAttribute('data-filter');

        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        cards.forEach(card => {
          const cat = card.getAttribute('data-category');
          if (filter === 'all' || cat === filter) {
            card.classList.remove('filtered-out');
          } else {
            card.classList.add('filtered-out');
          }
        });
      });
    });
  }

  // 2. Sincronização dos Dots e Auto-Scroll Fluido no Carrossel Mobile
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
      if (parentCard && parentCard.classList.contains('filtered-out')) return;

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
        lightboxCaption.textContent = captionText || 'Espaço Academia Metamorfose';
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

