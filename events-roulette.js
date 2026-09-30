/* ============================================================
   JoJo Artist Arena — Ruleta de Eventos de Arena
   events-roulette.js
   ------------------------------------------------------------
   Depende de:
   - window.JJA_EventsData (events-data.js, cargado antes)
   - API pública expuesta por app.js:
       window.JJA_App.applyEventToBattle(event)
         -> aplica el evento al combate activo y refresca la UI
       window.JJA_App.getBattle()
         -> devuelve el objeto battle actual (o null)
   ------------------------------------------------------------
   Responsabilidades:
   - Frecuencia de eventos (sin eventos / 1 por combate / cada X rondas)
   - Aviso "¡INTERFERENCIA DEL DESTINO!" durante el combate
   - Modal con animación de ruleta y reveal
   - Botón "Ver descripción" antes de aplicar
   - Aplicar el evento mediante JJA_App.applyEventToBattle
   ============================================================ */

   (function (global) {
    'use strict';
  
    const { EVENTS, pickRandomEvent, RARITY } = global.JJA_EventsData || {};
    if (!EVENTS) {
      console.error('[EventsRoulette] events-data.js no está cargado.');
      return;
    }
  
    /* =========================================================
       CONFIGURACIÓN / ESTADO
       ========================================================= */
    const FREQ = {
      OFF:         'off',        // "Sin Eventos"
      PER_BATTLE:  'perBattle',  // "1 Evento por combate"
      DYNAMIC:     'dynamic'     // "Eventos dinámicos cada X rondas"
    };
  
    let config = {
      frequency: FREQ.PER_BATTLE,
      dynamicEveryRounds: 2
    };
  
      /* Widget / ruleta */
  const WIDGET_TIMEOUT_S = 8;
  const RING_CIRCUMFERENCE = 2 * Math.PI * 44; // r=44 en el SVG
  const SLICE_COLORS = {
    common:    ['#cfc6b1', '#9e9580'],
    uncommon:  ['#9ec7e0', '#6c93a8'],
    rare:      ['#c9a13a', '#8a6f1f'],
    legendary: ['#e6c66a', '#f7e7a3']
  };

  let widgetTimerHandle = null;
  let widgetSecondsLeft = WIDGET_TIMEOUT_S;
  let widgetRingEl = null;
  let widgetTimerEl = null;
  let wheelSvg = null;
  let wheelSlicesGroup = null;
  let currentRotation = 0; // grados acumulados

    let state = {
      firedThisBattle: false,
      lastRoundFired: -1,
      pendingNotice: false
    };
  
    let selectedEvent = null;
    let isSpinning = false;
  
    /* =========================================================
       REFS DOM (se crean en init)
       ========================================================= */
    let els = {
      noticeBar: null,
      noticeButton: null,
      modalBackdrop: null,
      reel: null,
      reelEntries: null,
      revealName: null,
      revealIcon: null,
      revealRarity: null,
      revealShort: null,
      revealLong: null,
      btnToggleDesc: null,
      btnApply: null,
      btnClose: null
    };
  
    /* =========================================================
       API PÚBLICA
       ========================================================= */
    function setFrequency(freq, everyRounds) {
      if (freq && Object.values(FREQ).includes(freq)) {
        config.frequency = freq;
      }
      if (typeof everyRounds === 'number' && everyRounds > 0) {
        config.dynamicEveryRounds = Math.floor(everyRounds);
      }
      saveConfig();
    }
  
    function getConfig() {
      return { ...config };
    }
  
    /** Reinicia el estado por combate. Llamar desde app.js al iniciar batalla. */
    function resetForBattle() {
      state.firedThisBattle = false;
      state.lastRoundFired = -1;
      state.pendingNotice = false;
      hideNotice();
    }
  
    /**
     * Evaluado por app.js tras cada cambio de turno/ronda.
     * Determina si corresponde un evento y, si sí, muestra el aviso.
     */
    function maybeTriggerEvent(battle) {
      if (!battle || battle.finished) return;
      if (config.frequency === FREQ.OFF) return;
      if (state.pendingNotice) return;
      if (isSpinning) return;
  
      let shouldFire = false;
  
      if (config.frequency === FREQ.PER_BATTLE) {
        if (!state.firedThisBattle) shouldFire = true;
      } else if (config.frequency === FREQ.DYNAMIC) {
        const every = config.dynamicEveryRounds;
        if (battle.round > 1 && battle.round % every === 0 && state.lastRoundFired !== battle.round) {
          shouldFire = true;
        }
      }
  
      if (shouldFire) {
        state.pendingNotice = true;
        state.lastRoundFired = battle.round;
        showNotice();
      }
    }
  
    /** Notificación manual (streamer quiere forzar un evento). */
    function forceTrigger() {
      if (state.pendingNotice) return;
      state.pendingNotice = true;
      showNotice();
    }
  
    /* =========================================================
       AVISO EN PANTALLA
       ========================================================= */
      /* =========================================================
     WIDGET CIRCULAR CON COUNTDOWN
     ========================================================= */
     function showNotice() {
      const widget = els.noticeBar;
      if (!widget) return;

      widget.hidden = false;
      widget.classList.remove('is-urgent');
      widgetSecondsLeft = WIDGET_TIMEOUT_S;

      // 🔊 SFX: arrancar el reloj en loop mientras el widget está visible
      try {
        if (window.JJA_Sound && typeof window.JJA_Sound.startClock === 'function') {
          window.JJA_Sound.startClock();
        }
      } catch (_) {}

      // Preparar anillo
      if (widgetRingEl) {
        widgetRingEl.style.strokeDasharray = String(RING_CIRCUMFERENCE);
        widgetRingEl.style.strokeDashoffset = '0';
      }
      if (widgetTimerEl) widgetTimerEl.textContent = String(widgetSecondsLeft);

      // Tick cada segundo
      if (widgetTimerHandle) clearInterval(widgetTimerHandle);
      widgetTimerHandle = setInterval(() => {
        widgetSecondsLeft -= 1;
        if (widgetTimerEl) widgetTimerEl.textContent = String(Math.max(0, widgetSecondsLeft));

        // Anillo: de 0 (completo) → circunferencia (vacío)
        if (widgetRingEl) {
          const progress = 1 - (widgetSecondsLeft / WIDGET_TIMEOUT_S);
          widgetRingEl.style.strokeDashoffset = String(RING_CIRCUMFERENCE * progress);
        }

        // Urgencia últimos 3s
        if (widgetSecondsLeft <= 3) widget.classList.add('is-urgent');

        // Timeout: auto-abrir el modal
        if (widgetSecondsLeft <= 0) {
          clearInterval(widgetTimerHandle);
          widgetTimerHandle = null;
          hideNotice();
          // Auto-trigger: abre el modal y dispara el giro automáticamente
          setTimeout(() => {
            openModal();
            setTimeout(spin, 200);
          }, 120);
        }
      }, 1000);
    }

    function hideNotice() {
      const widget = els.noticeBar;
      if (!widget) return;

      widget.hidden = true;
      widget.classList.remove('is-urgent');

      if (widgetTimerHandle) {
        clearInterval(widgetTimerHandle);
        widgetTimerHandle = null;
      }

      // 🔊 SFX: detener el reloj inmediatamente
      try {
        if (window.JJA_Sound && typeof window.JJA_Sound.stopClock === 'function') {
          window.JJA_Sound.stopClock();
        }
      } catch (_) {}
    }
  
      /* =========================================================
     CONSTRUCCIÓN DE LA RUEDA CIRCULAR
     - Solo iconos centrados por gajo (sin etiquetas de texto)
     - Soporta emojis (<text>) e imágenes (<image> SVG)
     ========================================================= */
  function buildWheelSlices() {
    if (!wheelSlicesGroup || !EVENTS.length) return;

    const DATA = global.JJA_EventsData || {};
    const isImageIcon   = DATA.isImageIcon   || (() => false);
    const resolveIconPath = DATA.resolveIconPath || ((s) => s);

    const total = EVENTS.length;
    const anglePer = 360 / total;
    const cx = 150, cy = 150;
    const r = 130;                // radio del borde del gajo
    const iconRadius = r * 0.72;  // dónde se centra el icono dentro del gajo

    const rad = (deg) => (deg * Math.PI) / 180;

    wheelSlicesGroup.innerHTML = '';

    EVENTS.forEach((event, i) => {
      const startAngle = i * anglePer - 90;
      const endAngle   = startAngle + anglePer;
      const midAngle   = startAngle + anglePer / 2;

      const x1 = cx + r * Math.cos(rad(startAngle));
      const y1 = cy + r * Math.sin(rad(startAngle));
      const x2 = cx + r * Math.cos(rad(endAngle));
      const y2 = cy + r * Math.sin(rad(endAngle));
      const largeArc = anglePer > 180 ? 1 : 0;

      const fill = event.color || (i % 2 === 0 ? '#e6c66a' : '#c9a13a');

      /* ---------- 1. GAJO ---------- */
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d',
        `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} ` +
        `A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`
      );
      path.setAttribute('fill', fill);
      path.setAttribute('stroke', '#0a0810');
      path.setAttribute('stroke-width', '1.5');
      path.classList.add('wheel__slice');
      path.dataset.eventId = event.id;
      path.dataset.index = String(i);
      wheelSlicesGroup.appendChild(path);

      /* ---------- 2. ICONO CENTRADO EN EL GAJO ---------- */
      const iconX = cx + iconRadius * Math.cos(rad(midAngle));
      const iconY = cy + iconRadius * Math.sin(rad(midAngle));
      const iconSrc = String(event.icon || '❓').trim();

      if (isImageIcon(iconSrc)) {
        // --- Caso: archivo / URL de imagen ---
        const IMG_SIZE = 46;   // lado del cuadrado del icono en px SVG
        const href = resolveIconPath(iconSrc);

        const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
        img.setAttribute('href', href);
        img.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', href); // compat
        img.setAttribute('x', (iconX - IMG_SIZE / 2).toFixed(2));
        img.setAttribute('y', (iconY - IMG_SIZE / 2).toFixed(2));
        img.setAttribute('width', IMG_SIZE);
        img.setAttribute('height', IMG_SIZE);
        img.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        img.classList.add('wheel__slice-icon', 'wheel__slice-icon--img');
        img.dataset.eventId = event.id;

        // Ligera rotación para alinear con el gajo (opcional pero queda elegante)
        const tilt = midAngle + 90;
        img.setAttribute('transform',
          `rotate(${tilt.toFixed(2)} ${iconX.toFixed(2)} ${iconY.toFixed(2)})`
        );

        wheelSlicesGroup.appendChild(img);

      } else {
        // --- Caso: emoji / texto corto ---
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', iconX.toFixed(2));
        text.setAttribute('y', iconY.toFixed(2));
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'central');
        // No rotamos el texto: los emojis se leen mejor rectos
        text.classList.add('wheel__slice-icon', 'wheel__slice-icon--emoji');
        text.dataset.eventId = event.id;
        text.textContent = iconSrc;

        wheelSlicesGroup.appendChild(text);
      }
    });
  }

    /* =========================================================
       MODAL DE RULETA
       ========================================================= */
       function openModal() {
        if (!els.modalBackdrop) return;
        if (isSpinning) return;
         // 🔊 SFX: detener el reloj al abrir el modal
      try {
        if (window.JJA_Sound && typeof window.JJA_Sound.stopClock === 'function') {
          window.JJA_Sound.stopClock();
        }
      } catch (_) {}
    
        selectedEvent = null;
        renderModalEmpty();
        buildWheelSlices();
        els.modalBackdrop.hidden = false;
        document.body.style.overflow = 'hidden';
      }
    
      function closeModal() {
        if (!els.modalBackdrop) return;
        els.modalBackdrop.hidden = true;
        document.body.style.overflow = '';
        state.pendingNotice = false;
        hideNotice();
        isSpinning = false;
        // 🔊 SFX: cortar cualquier audio de ruleta o reloj pendiente
      try {
        if (window.JJA_Sound) {
          if (typeof window.JJA_Sound.stopRoulette === 'function') window.JJA_Sound.stopRoulette();
          if (typeof window.JJA_Sound.stopClock === 'function') window.JJA_Sound.stopClock();
        }
      } catch (_) {}
    
        // Reset botones por si se reabre
        const btnSpin = document.getElementById('eventBtnSpin');
        if (btnSpin) {
          btnSpin.hidden = false;
          btnSpin.disabled = false;
          btnSpin.classList.remove('is-spinning');
        }
        if (els.btnApply) {
          els.btnApply.hidden = true;
          els.btnApply.disabled = true;
        }
        if (els.btnToggleDesc) els.btnToggleDesc.hidden = true;
      }
  
      function renderModalEmpty() {
        // Reveal en estado inicial
        if (els.revealName) els.revealName.textContent = '—';
        if (els.revealIcon) els.revealIcon.textContent = '❓';
        if (els.revealRarity) {
          els.revealRarity.textContent = '';
          els.revealRarity.removeAttribute('data-rarity');
          els.revealRarity.style.color = '';
          els.revealRarity.style.borderColor = '';
        }
        if (els.revealShort) els.revealShort.textContent = '¡Gira para descubrir el destino!';
        if (els.revealLong) {
          els.revealLong.textContent = '';
          els.revealLong.hidden = true;
        }
        if (els.btnToggleDesc) els.btnToggleDesc.hidden = true;
    
        // --- FLUJO DE BOTONES INICIAL ---
        const btnSpin = document.getElementById('eventBtnSpin');
        if (btnSpin) {
          btnSpin.hidden = false;
          btnSpin.disabled = false;
          btnSpin.classList.remove('is-spinning');
        }
        if (els.btnApply) {
          els.btnApply.hidden = true;   // Oculto hasta girar
          els.btnApply.disabled = true;
        }
    
        // Reset reveal box
        const revealBox = document.getElementById('eventReveal');
        if (revealBox) revealBox.classList.remove('is-revealed');
    
        // Reset rueda (rotación a 0 sin transición)
        if (wheelSlicesGroup) {
          wheelSlicesGroup.style.transition = 'none';
          wheelSlicesGroup.style.transform = 'rotate(0deg)';
          void wheelSlicesGroup.getBoundingClientRect();
          wheelSlicesGroup.style.transition = '';
          wheelSlicesGroup.querySelectorAll('.is-winner').forEach((n) => n.classList.remove('is-winner'));
        }
        currentRotation = 0;
    
        const wheelFrame = document.querySelector('.wheel-frame');
        if (wheelFrame) wheelFrame.classList.remove('is-spinning', 'is-locked');
      }
  
      /* =========================================================
     GIRO CON FRENADO FÍSICO
     ========================================================= */
     async function spin() {
      if (isSpinning) return;
      isSpinning = true;

      // --- FLUJO DE BOTONES ---
      const btnSpin  = document.getElementById('eventBtnSpin');
      const btnApply = els.btnApply;
      if (btnSpin) {
        btnSpin.disabled = true;
        btnSpin.classList.add('is-spinning');
      }
      if (btnApply) {
        btnApply.hidden = true;
        btnApply.disabled = true;
      }
      if (els.btnToggleDesc) els.btnToggleDesc.hidden = true;

      if (wheelSlicesGroup) {
        wheelSlicesGroup.querySelectorAll('.is-winner').forEach((n) => n.classList.remove('is-winner'));
      }

      // Estado visual inicial
      if (els.revealName) els.revealName.textContent = '···';
      if (els.revealIcon) els.revealIcon.textContent = '🌀';
      if (els.revealShort) els.revealShort.textContent = 'DODODO...';
      if (els.revealLong) els.revealLong.hidden = true;
      if (els.revealRarity) {
        els.revealRarity.textContent = '';
        els.revealRarity.style.color = '';
        els.revealRarity.style.borderColor = '';
      }
      const revealBox = document.getElementById('eventReveal');
      if (revealBox) revealBox.classList.remove('is-revealed');

      // --- ELEGIR GANADOR ---
      const winner = pickRandomEvent();
      selectedEvent = winner;

      const totalEvents = EVENTS.length;
      const winnerIdx = EVENTS.findIndex((e) => e.id === winner.id);
      const anglePer = 360 / totalEvents;

      const sliceCenter = winnerIdx * anglePer + anglePer / 2;
      const baseTarget = ((360 - sliceCenter) % 360 + 360) % 360;

      const current = currentRotation % 360;
      const deltaToTarget = ((baseTarget - current) % 360 + 360) % 360;

      const fullSpins = 5 + Math.floor(Math.random() * 3);
      const jitter = (Math.random() - 0.5) * (anglePer * 0.4);
      const totalRotation = currentRotation + fullSpins * 360 + deltaToTarget + jitter;

      // --- APLICAR TRANSICIÓN ---
      const wheelFrame = document.querySelector('.wheel-frame');
      if (wheelFrame) wheelFrame.classList.add('is-spinning');

      // Duración fija del giro: 6 segundos
      const SPIN_DURATION_MS = 6000;
      const SPIN_DURATION_S = SPIN_DURATION_MS / 1000;

      if (wheelSlicesGroup) {
        wheelSlicesGroup.style.transition = `transform ${SPIN_DURATION_S}s cubic-bezier(0.15, 0.72, 0.20, 1)`;
        wheelSlicesGroup.style.transformOrigin = '150px 150px';
        wheelSlicesGroup.style.transformBox = 'view-box';

        void wheelSlicesGroup.getBoundingClientRect();

        wheelSlicesGroup.style.transform = `rotate(${totalRotation}deg)`;

        currentRotation = totalRotation;
      }

      // 🔊 SFX: arrancar giro de ruleta (6 s)
      try {
        if (window.JJA_Sound && typeof window.JJA_Sound.startRoulette === 'function') {
          window.JJA_Sound.startRoulette(SPIN_DURATION_MS);
        }
      } catch (_) {}

      // --- ESPERAR FIN ---
      await new Promise((resolve) => setTimeout(resolve, SPIN_DURATION_MS));

      // --- LOCK + REVEAL ---
      if (wheelFrame) {
        wheelFrame.classList.remove('is-spinning');
        wheelFrame.classList.add('is-locked');
      }

      if (wheelSlicesGroup) {
        const winnerPath = wheelSlicesGroup.querySelector(`[data-event-id="${winner.id}"]`);
        if (winnerPath) winnerPath.classList.add('is-winner');
      }

      revealWinner(winner);

      // 🔊 SFX: red de seguridad por si el temporizador no limpió
      try {
        if (window.JJA_Sound && typeof window.JJA_Sound.stopRoulette === 'function') {
          window.JJA_Sound.stopRoulette();
        }
      } catch (_) {}

      isSpinning = false;

      // --- BOTONES FINALES ---
      if (btnSpin) {
        btnSpin.classList.remove('is-spinning');
        btnSpin.hidden = true;
      }
      if (btnApply) {
        btnApply.hidden = false;
        btnApply.disabled = false;
      }
    }
  
  function revealWinner(event) {
    if (!event) return;

    const revealBox = document.getElementById('eventReveal');
    if (revealBox) revealBox.classList.add('is-revealed');

    if (els.revealIcon) {
        const DATA = global.JJA_EventsData || {};
        const isImageIcon = DATA.isImageIcon || (() => false);
        const resolveIconPath = DATA.resolveIconPath || ((s) => s);
        const iconSrc = String(event.icon || '❓').trim();
  
        if (isImageIcon(iconSrc)) {
          const href = resolveIconPath(iconSrc);
          els.revealIcon.innerHTML =
            `<img src="${href}" alt="${event.name}" loading="eager">`;
        } else {
          els.revealIcon.textContent = iconSrc;
        }
      }
    if (els.revealName) els.revealName.textContent = event.name;
    if (els.revealRarity) {
      els.revealRarity.textContent = event.rarity.label;
      els.revealRarity.setAttribute('data-rarity', event.rarity.key);
      els.revealRarity.style.color = event.rarity.color;
      els.revealRarity.style.borderColor = event.rarity.color;
    }
    if (els.revealShort) els.revealShort.textContent = event.short;
    if (els.revealLong) {
      els.revealLong.textContent = event.description;
      els.revealLong.hidden = true;
    }
    if (els.btnToggleDesc) {
      els.btnToggleDesc.hidden = false;
      els.btnToggleDesc.textContent = '📖 Ver descripción';
    }
    if (els.btnApply) els.btnApply.disabled = false;
  }
  
    function toggleDescription() {
      if (!els.revealLong || !els.btnToggleDesc) return;
      const willShow = els.revealLong.hidden;
      els.revealLong.hidden = !willShow;
      els.btnToggleDesc.textContent = willShow ? '📖 Ocultar descripción' : '📖 Ver descripción';
    }
  
    function applySelected() {
      if (!selectedEvent) return;
      if (!global.JJA_App || typeof global.JJA_App.applyEventToBattle !== 'function') {
        console.error('[EventsRoulette] JJA_App.applyEventToBattle no está disponible.');
        return;
      }
  
      // Marcar que ya se disparó en este combate (solo modo PER_BATTLE)
      if (config.frequency === FREQ.PER_BATTLE) {
        state.firedThisBattle = true;
      }
  
      global.JJA_App.applyEventToBattle(selectedEvent);
  
      // Cerrar
      closeModal();
    }
  
    /* =========================================================
       PERSISTENCIA
       ========================================================= */
    const CONFIG_KEY = 'jja_events_config_v1';
  
    function saveConfig() {
      try {
        localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
      } catch (_) { /* noop */ }
    }
  
    function loadConfig() {
      try {
        const raw = localStorage.getItem(CONFIG_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          if (parsed.frequency) config.frequency = parsed.frequency;
          if (typeof parsed.dynamicEveryRounds === 'number') {
            config.dynamicEveryRounds = parsed.dynamicEveryRounds;
          }
        }
      } catch (_) { /* noop */ }
    }
  
    /* =========================================================
       INIT
       ========================================================= */
       function init() {
        loadConfig();
    
        els.noticeBar       = document.getElementById('eventNoticeBar');
        els.noticeButton    = document.getElementById('eventNoticeButton');
        els.modalBackdrop   = document.getElementById('eventModalBackdrop');
        els.revealIcon      = document.getElementById('eventRevealIcon');
        els.revealName      = document.getElementById('eventRevealName');
        els.revealRarity    = document.getElementById('eventRevealRarity');
        els.revealShort     = document.getElementById('eventRevealShort');
        els.revealLong      = document.getElementById('eventRevealLong');
        els.btnToggleDesc   = document.getElementById('eventBtnToggleDesc');
        els.btnApply        = document.getElementById('eventBtnApply');
        els.btnClose        = document.getElementById('eventBtnClose');
    
        widgetRingEl     = document.getElementById('eventWidgetRing');
        widgetTimerEl    = document.getElementById('eventWidgetTimer');
        wheelSvg         = document.getElementById('eventWheelSvg');
        wheelSlicesGroup = document.getElementById('eventWheelSlices');
    
        const btnSpin = document.getElementById('eventBtnSpin');
    
        if (els.noticeButton) els.noticeButton.addEventListener('click', openModal);
        if (btnSpin)          btnSpin.addEventListener('click', spin);
        if (els.btnToggleDesc) els.btnToggleDesc.addEventListener('click', toggleDescription);
        if (els.btnApply)     els.btnApply.addEventListener('click', applySelected);
        if (els.btnClose)     els.btnClose.addEventListener('click', closeModal);
    
        if (els.modalBackdrop) {
          els.modalBackdrop.addEventListener('click', (e) => {
            if (e.target === els.modalBackdrop) closeModal();
          });
        }
      }
  
    document.addEventListener('DOMContentLoaded', init);
  
    /* =========================================================
       EXPORT
       ========================================================= */
    global.JJA_EventsRoulette = {
      FREQ,
      setFrequency,
      getConfig,
      resetForBattle,
      maybeTriggerEvent,
      forceTrigger,
      openModal,
      closeModal
    };
  
  })(window);