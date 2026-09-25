/* ============================================================
   JoJo Artist Arena — Roster Manager
   Lógica: persistencia, Base64, stats derivadas, import/export
   ============================================================ */

   (function () {
    'use strict';
    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
      // Afinidades personalizadas
    const customAffinityField = $('#customAffinityField');
    const customAffinityInput = $('#customAffinityInput');
    /* =========================================================
       CONSTANTES
       ========================================================= */
    const STORAGE_KEY = 'jja_roster_v1';
    const READY_KEY   = 'jja_ready_for_draw_v1';
    const MAX_PARTICIPANTS = 50;
  
    const DMG_BONUS = { A: 50, B: 35, C: 20, D: 10, E: 0 };
    const HP_BASE   = 80;
    const HP_PER_LV = 15;
    const DEFAULT_LEVEL = 1;
  
    const STAT_KEYS = ['power', 'speed', 'range', 'durability', 'precision', 'potential'];
    const STAT_SHORT = { power: 'PWR', speed: 'SPD', range: 'RNG', durability: 'DUR', precision: 'PRC', potential: 'POT' };
    const STAT_LABEL = {
      power: 'Poder',
      speed: 'Velocidad',
      range: 'Alcance',
      durability: 'Durabilidad',
      precision: 'Precisión',
      potential: 'Potencial'
    };

    /* =========================================================
     MÓDULO 2 — CONSTANTES
     ========================================================= */
    const STAGES_KEY = 'jja_stages_v1';
    const CURRENT_BATTLE_KEY = 'jja_current_battle_v1';
    const STAGE_BONUS_PERCENT = 15;
    const CUSTOM_AFFINITIES_KEY = 'jojo_custom_affinities';
    const BASE_AFFINITIES = [
      'Físico', 'Fuego', 'Agua', 'Hielo', 'Electricidad',
      'Magnetismo', 'Tiempo', 'Gravedad', 'Veneno'
    ];

    /* =========================================================
     MÓDULO 3 — CONSTANTES
     ========================================================= */
    const CRIT_MULTIPLIER = 1.5;
    const DUR_REDUCTION = { A: 0.20, B: 0.15, C: 0.10, D: 0.05, E: 0.00 };
    const SPD_INITIATIVE = { A: 5, B: 4, C: 3, D: 2, E: 1 };
    const CRIT_CHANCE = { A: 0.30, B: 0.22, C: 0.15, D: 0.08, E: 0.03 };
    const BASIC_ATTACK_BASE = 15;
    const PWR_BASIC_BONUS = { A: 18, B: 12, C: 8, D: 4, E: 0 };
    const HP_LOW_THRESHOLD = 0.30;
    const HP_MID_THRESHOLD = 0.60;

    /* =========================================================
     MÓDULO 4 — CONSTANTES Y ESTADO
     ========================================================= */
    const MODE_KEY = 'jja_game_mode_v1';
    const ROUND_KEY = 'jja_tournament_round_v1';

    let currentMode = 'royale'; // 'royale' | 'free'
    let tournamentRound = 1;

    /* =========================================================
        MÓDULO 2 — REFS DOM
        ========================================================= */
    // Vistas
    const rosterView      = document.querySelector('.gallery-wrap');
    const tournamentView  = $('#tournamentView');
    const btnBackToRoster = $('#btnBackToRoster');

    // Escenarios
    const stageCarousel   = $('#stageCarousel');
    const stageEmpty      = $('#stageEmpty');
    const btnAddStage     = $('#btnAddStage');
    const stageModalBackdrop = $('#stageModalBackdrop');
    const btnCloseStageModal = $('#btnCloseStageModal');
    const btnCancelStage  = $('#btnCancelStage');
    const stageForm       = $('#stageForm');
    const stageNameInput  = $('#stageNameInput');
    const stageAffinityInput = $('#stageAffinityInput');
    const stageImageInput = $('#stageImageInput');
    const stagePreviewImage = $('#stagePreviewImage');
    const stagePreviewPlaceholder = $('#stagePreviewPlaceholder');
    const stageModalTitle = $('#stageModalTitle');

    // Ruleta
    const btnSpinRoulette = $('#btnSpinRoulette');
    const rouletteOnoma   = $('#rouletteOnoma');
    const reelP1          = $('#reelP1');
    const reelP2          = $('#reelP2');
    const reelStage       = $('#reelStage');
    const rouletteEmblem  = $('#rouletteEmblem');

    // Versus
    const versusScreen    = $('#versusScreen');
    const versusStageBg   = $('#versusStageBg');
    const versusStageName = $('#versusStageName');
    const versusStageMod  = $('#versusStageMod');
    const versusImgP1     = $('#versusImgP1');
    const versusImgP2     = $('#versusImgP2');
    const versusNameP1    = $('#versusNameP1');
    const versusNameP2    = $('#versusNameP2');
    const versusOwnerP1   = $('#versusOwnerP1');
    const versusOwnerP2   = $('#versusOwnerP2');
    const versusHpP1      = $('#versusHpP1');
    const versusHpP2      = $('#versusHpP2');
    const versusAffP1     = $('#versusAffP1');
    const versusAffP2     = $('#versusAffP2');
    const versusBonusP1   = $('#versusBonusP1');
    const versusBonusP2   = $('#versusBonusP2');
    const btnRespin       = $('#btnRespin');
    const btnStartFight   = $('#btnStartFight');
  
    /* =========================================================
     MÓDULO 3 — REFS DOM
     ========================================================= */
    // Vista de batalla
    const battleView        = $('#battleView');
    const battleBg          = $('#battleBg');
    const battleStageName   = $('#battleStageName');
    const battleTurnIndicator = $('#battleTurnIndicator');
    const battleRoundDisplay = $('#battleRoundDisplay');
    const btnExitBattle     = $('#btnExitBattle');

    // Luchadores
    const fighterP1         = $('#fighterP1');
    const fighterP2         = $('#fighterP2');

    const battleNameP1      = $('#battleNameP1');
    const battleNameP2      = $('#battleNameP2');
    const battleOwnerP1     = $('#battleOwnerP1');
    const battleOwnerP2     = $('#battleOwnerP2');
    const battleAffP1       = $('#battleAffP1');
    const battleAffP2       = $('#battleAffP2');
    const battleSpriteP1    = $('#battleSpriteP1');
    const battleSpriteP2    = $('#battleSpriteP2');
    const spriteFallbackP1  = $('#spriteFallbackP1');
    const spriteFallbackP2  = $('#spriteFallbackP2');
    const statusP1          = $('#statusP1');
    const statusP2          = $('#statusP2');

    const hpFillP1          = $('#hpFillP1');
    const hpFillP2          = $('#hpFillP2');
    const hpTextP1          = $('#hpTextP1');
    const hpTextP2          = $('#hpTextP2');

    // Panel de acciones
    const turnLabel         = $('#turnLabel');
    const turnTimer         = $('#turnTimer');
    const btnBasicAttack    = $('#btnBasicAttack');
    const basicAttackMeta   = $('#basicAttackMeta');
    const skillBtn0         = $('#skillBtn0');
    const skillBtn1         = $('#skillBtn1');
    const skillBtn2         = $('#skillBtn2');
    const skillName0        = $('#skillName0');
    const skillName1        = $('#skillName1');
    const skillName2        = $('#skillName2');
    const skillMeta0        = $('#skillMeta0');
    const skillMeta1        = $('#skillMeta1');
    const skillMeta2        = $('#skillMeta2');

    // Log y banner
    const battleLogStream   = $('#battleLogStream');
    const turnBanner        = $('#turnBanner');
    const turnBannerText    = $('#turnBannerText');

    // Modal de victoria
    const victoryBackdrop   = $('#victoryBackdrop');
    const victoryKicker     = $('#victoryKicker');
    const victoryTitle      = $('#victoryTitle');
    const victoryPortrait   = $('#victoryPortrait');
    const victoryPortraitFallback = $('#victoryPortraitFallback');
    const victoryStandName  = $('#victoryStandName');
    const victoryArtistName = $('#victoryArtistName');
    const victoryHp         = $('#victoryHp');
    const victoryTurns      = $('#victoryTurns');
    const victoryDamage     = $('#victoryDamage');
    const btnRematch        = $('#btnRematch');
    const btnBackToRosterFromVictory = $('#btnBackToRosterFromVictory');

      /* =========================================================
     MÓDULO 4 — REFS DOM
     ========================================================= */
  const modeBtnRoyale         = $('#modeBtnRoyale');
  const modeBtnFree           = $('#modeBtnFree');
  const btnResetTournament    = $('#btnResetTournament');
  const tournamentStatus      = $('#tournamentStatus');
  const tournamentAliveCount  = $('#tournamentAliveCount');
  const tournamentDefeatedCount = $('#tournamentDefeatedCount');
  const tournamentRoundEl = $('#tournamentRound');

  const championBackdrop      = $('#championBackdrop');
  const championPortrait      = $('#championPortrait');
  const championPortraitFallback = $('#championPortraitFallback');
  const championStandName     = $('#championStandName');
  const championArtistName    = $('#championArtistName');
  const championHp            = $('#championHp');
  const championBattles       = $('#championBattles');
  const championDamage        = $('#championDamage');
  const btnResetFromChampion  = $('#btnResetFromChampion');
  const btnBackToRosterFromChampion = $('#btnBackToRosterFromChampion');

      /* =========================================================
     MÓDULO 4 — MODO DE JUEGO
     ========================================================= */
  function loadMode() {
    const stored = localStorage.getItem(MODE_KEY);
    currentMode = (stored === 'free' || stored === 'royale') ? stored : 'royale';
    tournamentRound = Number(localStorage.getItem(ROUND_KEY)) || 1;
  }

  function saveMode() {
    localStorage.setItem(MODE_KEY, currentMode);
    localStorage.setItem(ROUND_KEY, String(tournamentRound));
  }

  function setMode(mode) {
    if (mode !== 'royale' && mode !== 'free') return;

    const previousMode = currentMode;
    currentMode = mode;
    saveMode();

    // Al entrar a Modo Libre, limpiamos el estado del torneo en curso
    if (mode === 'free' && previousMode !== 'free') {
      roster = roster.map((s) => ({
        ...s,
        tournamentDamage: 0,
        lastHp: null,
        tournamentBattles: 0
      }));
      tournamentRound = 1;
      saveRoster();
      saveMode();
    }

    // Al volver a Royale desde Free, empezamos torneo limpio
    if (mode === 'royale' && previousMode === 'free') {
      roster = roster.map((s) => ({
        ...s,
        isDefeated: false,
        defeatedAt: null,
        lastHp: null,
        tournamentBattles: 0,
        tournamentDamage: 0
      }));
      tournamentRound = 1;
      saveRoster();
      saveMode();
    }

    applyModeUI();
    renderGallery();
    updateTournamentStatus();
  }

  function applyModeUI() {
    const isRoyale = currentMode === 'royale';

    modeBtnRoyale.classList.toggle('is-active', isRoyale);
    modeBtnRoyale.setAttribute('aria-selected', String(isRoyale));
    modeBtnFree.classList.toggle('is-active', !isRoyale);
    modeBtnFree.setAttribute('aria-selected', String(!isRoyale));

    btnResetTournament.hidden = !isRoyale;
    tournamentStatus.hidden = !isRoyale;
  }

  function updateTournamentStatus() {
    if (currentMode !== 'royale') return;

    const alive = roster.filter((s) => !s.isDefeated).length;
    const defeated = roster.filter((s) => s.isDefeated).length;

    tournamentAliveCount.textContent = String(alive);
    tournamentDefeatedCount.textContent = String(defeated);
    tournamentRoundEl.textContent = toRoman(tournamentRound);
  }

  /* =========================================================
     MÓDULO 4 — ELEGIBLES PARA LA RULETA
     ========================================================= */
  function getEligibleStands() {
    if (currentMode === 'royale') {
      return roster.filter((s) => !s.isDefeated);
    }
    return roster.slice();
  }

  /* =========================================================
     MÓDULO 4 — MARCAR K.O. (BATTLE ROYALE)
     ========================================================= */
  function markDefeated(loserId) {
    if (currentMode !== 'royale') return;
    const idx = roster.findIndex((s) => s.id === loserId);
    if (idx < 0) return;
    roster[idx].isDefeated = true;
    roster[idx].defeatedAt = Date.now();
    saveRoster();
  }

  function checkTournamentEnd() {
    if (currentMode !== 'royale') return false;
    const survivors = roster.filter((s) => !s.isDefeated);
    return survivors.length <= 1;
  }

  function resetTournament() {
    roster = roster.map((s) => {
      const { isDefeated, defeatedAt, ...rest } = s;
      return {
        ...rest,
        isDefeated: false,
        defeatedAt: null,
        lastHp: null,
        tournamentDamage: 0,
        tournamentBattles: 0
      };
    });
    tournamentRound = 1;
    saveRoster();
    saveMode();
    renderGallery();
    updateTournamentStatus();
    toast('Torneo reiniciado. Todos los Stands vuelven a estar disponibles.', 'success');
  }

  /* =========================================================
     MÓDULO 4 — MODAL DE CAMPEÓN
     ========================================================= */
     function showChampionModal() {
      const survivor = roster.find((s) => !s.isDefeated);
      if (!survivor) return;
  
      championStandName.textContent = survivor.standName;
      championArtistName.textContent = `Artista: ${survivor.artistName}`;
  
      if (survivor.image) {
        championPortrait.src = survivor.image;
        championPortrait.alt = survivor.standName;
        championPortrait.style.display = 'block';
        championPortraitFallback.style.display = 'none';
      } else {
        championPortrait.removeAttribute('src');
        championPortrait.style.display = 'none';
        championPortraitFallback.style.display = 'grid';
      }
  
      // HP real con el que sobrevivió
      const maxHp = computeHP(survivor.stats.durability, survivor.level || DEFAULT_LEVEL);
      const finalHp = typeof survivor.lastHp === 'number' && survivor.lastHp >= 0
        ? survivor.lastHp
        : maxHp; // fallback si nunca combatió
      championHp.textContent = `${finalHp} / ${maxHp}`;
  
      // Daño total acumulado durante el torneo
      const totalDamage = Number(survivor.tournamentDamage) || 0;
      championDamage.textContent = totalDamage > 0 ? String(totalDamage) : '0';
  
      // Combates = rondas que duró el torneo
      const battlesCount = Number(survivor.tournamentBattles) || 0;
      championBattles.textContent = String(battlesCount);
  
      championBackdrop.hidden = false;
    }

  function closeChampionModal() {
    championBackdrop.hidden = true;
  }

  /* =========================================================
     MÓDULO 4 — EVENTOS
     ========================================================= */
  function bindModule4Events() {
    modeBtnRoyale.addEventListener('click', () => setMode('royale'));
    modeBtnFree.addEventListener('click', () => setMode('free'));

    btnResetTournament.addEventListener('click', () => {
      if (!confirm('¿Reiniciar el torneo? Todos los Stands eliminados volverán a estar disponibles.')) return;
      resetTournament();
    });

    btnResetFromChampion.addEventListener('click', () => {
      closeChampionModal();
      resetTournament();
      exitBattleToTournament();
    });

    btnBackToRosterFromChampion.addEventListener('click', () => {
      closeChampionModal();
      exitBattleToRoster();
    });

    championBackdrop.addEventListener('click', (e) => {
      if (e.target === championBackdrop) closeChampionModal();
    });
  }

  function initModule4() {
    loadMode();
    applyModeUI();
    updateTournamentStatus();
    bindModule4Events();
  }

    /* =========================================================
       ESTADO
       ========================================================= */
    let roster = [];
    let editingId = null;        // null = crear, string = editar
    let pendingImageBase64 = null;
    let pendingImageMime = null;
    
    /* =========================================================
     MÓDULO 2 — ESTADO
     ========================================================= */
    let stages = [];
    let battle = null;
    let pendingStageImageBase64 = null;
    let pendingStageImageMime   = null;
    let isSpinning              = false;
    let currentMatchup          = null; // { p1, p2, stage }

    /* =========================================================
       DOM REFS
       ========================================================= */
   

    const gallery          = $('#gallery');
    const emptyState       = $('#emptyState');
    const participantsEl   = $('#participantsCounter');

    const stageAffinityPenaltyInput = $('#stageAffinityPenaltyInput');

    const btnAddNew        = $('#btnAddNew');
    const btnExport        = $('#btnExport');
    const btnImportTrigger = $('#btnImportTrigger');
    const btnClearAll      = $('#btnClearAll');
    const btnReadyDraw     = $('#btnReadyDraw');
    const importFileInput  = $('#importFileInput');
  
    const modalBackdrop    = $('#modalBackdrop');
    const modalTitle       = $('#modalTitle');
    const btnCloseModal    = $('#btnCloseModal');
    const btnCancelForm    = $('#btnCancelForm');
    const btnSubmitForm    = $('#btnSubmitForm');
    const standForm        = $('#standForm');
  
    const artistNameInput  = $('#artistName');
    const standNameInput   = $('#standName');
    const affinitySelect   = $('#affinity');
    const battleCryInput   = $('#battleCry');
    const imageInput       = $('#imageInput');
  
    const previewImage     = $('#previewImage');
    const previewPlaceholder = $('#previewPlaceholder');
  
    const derivedHP        = $('#derivedHP');
    const derivedDmg       = $('#derivedDmg');
  
    const toastStack       = $('#toastStack');
  
    /* =========================================================
       PERSISTENCIA
       ========================================================= */
    function loadRoster() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) { roster = []; return; }
        const parsed = JSON.parse(raw);
        roster = Array.isArray(parsed) ? parsed : [];
      } catch (err) {
        console.error('[JoJo Roster] Error al cargar localStorage:', err);
        roster = [];
      }
    }
  
    function safeSetItem(key, value, label = 'datos') {
      const payload = typeof value === 'string' ? value : JSON.stringify(value);
      const SIZE_LIMIT = 4.5 * 1024 * 1024; // 4.5 MB margen sobre el límite ~5MB
  
      if (payload.length > SIZE_LIMIT) {
        toast(`⚠ ${label}: datos demasiado grandes (${(payload.length / 1024 / 1024).toFixed(2)} MB). Reduce imágenes.`, 'error');
        return false;
      }
  
      try {
        localStorage.setItem(key, payload);
        return true;
      } catch (err) {
        console.error('[JoJo Roster] localStorage error:', err);
        if (err && (err.name === 'QuotaExceededError' || err.code === 22 || err.code === 1014)) {
          toast(`⚠ Cuota de almacenamiento excedida al guardar ${label}. Elimina imágenes pesadas o limpiar roster.`, 'error');
        } else {
          toast(`No se pudo guardar ${label}.`, 'error');
        }
        return false;
      }
    }
  
    function saveRoster() {
      return safeSetItem(STORAGE_KEY, roster, 'roster');
    }
  
    function saveStages() {
      return safeSetItem(STAGES_KEY, stages, 'escenarios');
    }
  
    function loadReadyFlag() {
      return localStorage.getItem(READY_KEY) === 'true';
    }
  
    function saveReadyFlag(value) {
      localStorage.setItem(READY_KEY, value ? 'true' : 'false');
    }
  
    /* =========================================================
       UTILIDADES
       ========================================================= */
    function uid() {
      if (crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
      return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
    }
  
    function escapeHtml(str) {
      if (str == null) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
  
    function clampNumber(value, min, max, fallback) {
      const n = Number(value);
      if (!Number.isFinite(n)) return fallback;
      return Math.min(max, Math.max(min, Math.round(n)));
    }
  
    /* =========================================================
       CÁLCULOS DERIVADOS
       ========================================================= */
    function computeHP(durability, level = DEFAULT_LEVEL) {
      // Escala por letra: A=5, B=4, C=3, D=2, E=1
      const gradeScale = { A: 5, B: 4, C: 3, D: 2, E: 1 };
      const lv = clampNumber(level, 1, 99, DEFAULT_LEVEL);
      const factor = gradeScale[durability] || 3;
      // Base 80 + (Nivel × 15) — el nivel efectivo se ajusta por durabilidad para dar
      // variedad, pero se respeta la fórmula canónica sobre el nivel base.
      return HP_BASE + (lv * HP_PER_LV) + ((factor - 3) * 5);
    }
  
    function computeDamageBonus(power) {
      return DMG_BONUS[power] ?? 0;
    }
  
    /* =========================================================
       RENDERIZADO
       ========================================================= */
    function renderCounter() {
      participantsEl.textContent = `Participantes: ${roster.length} / ${MAX_PARTICIPANTS}`;
    }
  
    function renderGallery() {
      if (!gallery) return;
  
      if (roster.length === 0) {
        gallery.innerHTML = '';
        emptyState.hidden = false;
        return;
      }
      emptyState.hidden = true;
  
      const frag = document.createDocumentFragment();
  
      for (const stand of roster) {
        frag.appendChild(buildCard(stand));
      }
  
      gallery.innerHTML = '';
      gallery.appendChild(frag);
    }
  
    function buildCard(stand) {
      const card = document.createElement('article');
      card.className = 'stand-card';
      card.dataset.id = stand.id;
  
      const imgSrc = stand.image || '';
      const imgMarkup = imgSrc
        ? `<img class="stand-card__image" src="${escapeHtml(imgSrc)}" alt="${escapeHtml(stand.standName)}">`
        : `<div class="stand-card__image stand-card__image--empty">🂠</div>`;
  
        const radarMarkup = `
        <div class="radar-chart radar-chart--card" data-radar-for="${escapeHtml(stand.id)}"></div>
      `;
  
      const hp = computeHP(stand.stats.durability, stand.level || DEFAULT_LEVEL);
      const cry = stand.battleCry
        ? `<p class="stand-card__cry">“${escapeHtml(stand.battleCry)}”</p>`
        : '';
  
        const retiredBadge = stand.isDefeated
        ? '<span class="stand-card__retired">RETIRED</span>'
        : '';
  
      card.className = 'stand-card' + (stand.isDefeated ? ' is-defeated' : '');
      card.dataset.id = stand.id;
  
      card.innerHTML = `
        <div class="stand-card__frame">
          ${retiredBadge}
          <span class="stand-card__affinity">${escapeHtml(stand.affinity)}</span>
          <span class="stand-card__hp">${hp}</span>
          ${imgMarkup}
        </div>
        <div class="stand-card__body">
          <p class="stand-card__owner">${escapeHtml(stand.artistName)}</p>
          <h3 class="stand-card__name">${escapeHtml(stand.standName)}</h3>
          ${cry}
          ${radarMarkup}
          <div class="stand-card__actions">
            <button type="button" class="btn btn--ghost" data-action="edit">✎ Editar</button>
            <button type="button" class="btn btn--danger" data-action="delete">✕ Eliminar</button>
          </div>
        </div>
      `;

          // Inyectar el radar SVG (necesita estar en el DOM antes)
    const radarSlot = card.querySelector(`[data-radar-for="${stand.id}"]`);
    if (radarSlot) {
      renderRadarInto(radarSlot, stand.stats, { size: 100, compact: true });
    }
  
      card.querySelector('[data-action="edit"]').addEventListener('click', () => openModal(stand.id));
      card.querySelector('[data-action="delete"]').addEventListener('click', () => deleteStand(stand.id));
  
      return card;
    }


  
    /* =========================================================
       TOASTS
       ========================================================= */
    function toast(message, type = 'info') {
      if (!toastStack) return;
      const el = document.createElement('div');
      el.className = `toast toast--${type}`;
      el.textContent = message;
      toastStack.appendChild(el);
      setTimeout(() => {
        el.classList.add('is-leaving');
        setTimeout(() => el.remove(), 320);
      }, 3200);
    }
  
    /* =========================================================
       MODAL — APERTURA / CIERRE
       ========================================================= */
    function openModal(id = null) {
      if (roster.length >= MAX_PARTICIPANTS && id === null) {
        toast(`Límite alcanzado: máximo ${MAX_PARTICIPANTS} participantes.`, 'error');
        return;
      }
  
      editingId = id;
      resetForm();
  
      if (id) {
        const stand = roster.find((s) => s.id === id);
        if (!stand) { toast('Stand no encontrado.', 'error'); return; }
        modalTitle.textContent = `Editar Stand — ${stand.standName}`;
        fillForm(stand);
        pendingImageBase64 = stand.image || null;
        pendingImageMime = stand.imageMime || null;
        updatePreview();
      } else {
        modalTitle.textContent = 'Nuevo Stand';
      }
  
      updateDerived();
      modalBackdrop.hidden = false;
      document.body.style.overflow = 'hidden';
      setTimeout(() => artistNameInput.focus(), 60);
    }
  
    function closeModal() {
      modalBackdrop.hidden = true;
      document.body.style.overflow = '';
      editingId = null;
      pendingImageBase64 = null;
      pendingImageMime = null;
      resetForm();
    }
  
    /* =========================================================
       FORM — RESET / FILL / RECOLECCIÓN
       ========================================================= */
    function resetForm() {
      standForm.reset();
      pendingImageBase64 = null;
      pendingImageMime = null;
      updatePreview();
      updateDerived();
  
      // Reasignar valores por defecto de stats (reset() ya los pone a "B")
      $$('.field--stat select').forEach((sel) => { sel.value = 'B'; });
  
      // Reasignar valores por defecto de habilidades
      $$('.ability-block').forEach((block) => {
        const accEl = block.querySelector('.ability-accuracy');
        if (accEl) accEl.value = 100;
        const dmg = block.querySelector('.ability-damage');
        const cd  = block.querySelector('.ability-cooldown');
        if (dmg) dmg.value = 30;
        if (cd)  cd.value = 1;
            // Reset de las píldoras de tipo
            const typeRadios = block.querySelectorAll('.ability-type');
            typeRadios.forEach((r) => {
              r.checked = (r.value === 'damage');
              r.closest('.type-pill')?.classList.toggle('is-checked', r.checked);
            });
          });

          // Reset afinidad personalizada
        if (customAffinityField) customAffinityField.hidden = true;
        if (customAffinityInput) customAffinityInput.value = '';
    }
  
    function fillForm(stand) {
      artistNameInput.value = stand.artistName || '';
      standNameInput.value = stand.standName || '';
          // ¿Es una afinidad base o personalizada?
    if (BASE_AFFINITIES.includes(stand.affinity)) {
        affinitySelect.value = stand.affinity;
        if (customAffinityField) customAffinityField.hidden = true;
        if (customAffinityInput) customAffinityInput.value = '';
      } else if (stand.affinity) {
        // Personalizada: seleccionamos "+ Otra" y precargamos el input
        affinitySelect.value = '__custom__';
        if (customAffinityField) customAffinityField.hidden = false;
        if (customAffinityInput) customAffinityInput.value = stand.affinity;
      } else {
        affinitySelect.value = 'Físico';
        if (customAffinityField) customAffinityField.hidden = true;
      }
      battleCryInput.value = stand.battleCry || '';
  
      STAT_KEYS.forEach((k) => {
        const sel = $(`.field--stat select[data-stat="${k}"]`);
        if (sel) sel.value = stand.stats[k] || 'B';
      });
  
      const blocks = $$('.ability-block');
      for (let i = 0; i < 3; i++) {
        const block = blocks[i];
        if (!block) continue;
        const ab = (stand.abilities && stand.abilities[i]) || {};
        const nameEl = block.querySelector('.ability-name');
        const dmgEl  = block.querySelector('.ability-damage');
        const cdEl   = block.querySelector('.ability-cooldown');
        const descEl = block.querySelector('.ability-desc');
        if (nameEl) nameEl.value = ab.name || '';
        if (dmgEl)  dmgEl.value  = ab.damage ?? 30;
        if (cdEl)   cdEl.value   = ab.cooldown ?? 1;
        if (descEl) descEl.value = ab.description || '';
              // Restaurar el tipo de habilidad
        const accEl = block.querySelector('.ability-accuracy');
        if (accEl) accEl.value = ab.accuracy ?? 100;
      const blockTypeRadios = block.querySelectorAll('.ability-type');
      const savedType = ab.type || 'damage';
      blockTypeRadios.forEach((r) => {
        r.checked = (r.value === savedType);
        r.closest('.type-pill')?.classList.toggle('is-checked', r.checked);
      });
      }
    }
  
    function collectForm() {
      const stats = {};
      STAT_KEYS.forEach((k) => {
        const sel = $(`.field--stat select[data-stat="${k}"]`);
        stats[k] = sel ? sel.value : 'B';
      });
  
      const abilities = $$('.ability-block').map((block) => {
        const checkedType = block.querySelector('.ability-type:checked');
        return {
          name: (block.querySelector('.ability-name')?.value || '').trim(),
          damage: clampNumber(block.querySelector('.ability-damage')?.value, 15, 60, 30),
          cooldown: clampNumber(block.querySelector('.ability-cooldown')?.value, 0, 5, 1),
          accuracy: clampNumber(block.querySelector('.ability-accuracy')?.value, 10, 100, 100),
          description: (block.querySelector('.ability-desc')?.value || '').trim(),
          type: checkedType ? checkedType.value : 'damage'
        };
      });
  
      return {
        artistName: artistNameInput.value.trim(),
        standName: standNameInput.value.trim(),
        affinity: resolveAffinityFromForm(),
        battleCry: battleCryInput.value.trim(),
        stats,
        abilities
      };
    }
  
    /* =========================================================
       IMAGEN — CODIFICACIÓN BASE64
       ========================================================= */
    function readImageAsBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ dataUrl: reader.result, mime: file.type });
        reader.onerror = () => reject(reader.error || new Error('Error leyendo archivo'));
        reader.readAsDataURL(file);
      });
    }
  
    function updatePreview() {
      if (pendingImageBase64) {
        previewImage.src = pendingImageBase64;
        previewImage.hidden = false;
        previewPlaceholder.hidden = true;
      } else {
        previewImage.src = '';
        previewImage.hidden = true;
        previewPlaceholder.hidden = false;
      }
    }
  
    /* =========================================================
       STATS DERIVADAS EN VIVO
       ========================================================= */
    function updateDerived() {
      const durabilitySel = $('.field--stat select[data-stat="durability"]');
      const powerSel      = $('.field--stat select[data-stat="power"]');
      const durability = durabilitySel ? durabilitySel.value : 'B';
      const power      = powerSel ? powerSel.value : 'B';
  
      const hp = computeHP(durability, DEFAULT_LEVEL);
      const dmg = computeDamageBonus(power);
  
      derivedHP.textContent  = hp;
      derivedDmg.textContent = `+${dmg}%`;
    }
  
    /* =========================================================
       CRUD
       ========================================================= */
    function upsertStand(data) {
      const payload = {
        isDefeated: false,
        defeatedAt: null,
        lastHp: null,
        tournamentDamage: 0,
        tournamentBattles: 0,
        id: editingId || uid(),
        artistName: data.artistName,
        standName: data.standName,
        affinity: data.affinity,
        battleCry: data.battleCry,
        stats: data.stats,
        abilities: data.abilities,
        image: pendingImageBase64 || null,
        imageMime: pendingImageMime || null,
        level: DEFAULT_LEVEL,
        createdAt: editingId
          ? (roster.find((s) => s.id === editingId)?.createdAt || Date.now())
          : Date.now(),
        updatedAt: Date.now()
      };
  
      if (editingId) {
        const idx = roster.findIndex((s) => s.id === editingId);
        if (idx >= 0) {
          const existing = roster[idx];
          roster[idx] = {
            ...existing,
            ...payload,
            isDefeated: existing.isDefeated,
            defeatedAt: existing.defeatedAt,
            lastHp: existing.lastHp,
            tournamentDamage: existing.tournamentDamage,
            tournamentBattles: existing.tournamentBattles || 0
          };
        }
      } else {
        roster.push(payload);
      }
  
      saveRoster();
      renderCounter();
      renderGallery();
    }
  
    function deleteStand(id) {
      const stand = roster.find((s) => s.id === id);
      if (!stand) return;
      const ok = confirm(`¿Eliminar a "${stand.standName}" (${stand.artistName}) del roster?`);
      if (!ok) return;
      roster = roster.filter((s) => s.id !== id);
      saveRoster();
      renderCounter();
      renderGallery();
      toast(`Stand "${stand.standName}" eliminado.`, 'info');
    }
  
    /* =========================================================
       EXPORT / IMPORT
       ========================================================= */
    function exportRoster() {
      if (roster.length === 0) {
        toast('No hay nada que exportar todavía.', 'error');
        return;
      }
      const payload = {
        app: 'JoJo Artist Arena — Roster Manager',
        version: 1,
        exportedAt: new Date().toISOString(),
        readyForDraw: loadReadyFlag(),
        participants: roster
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      a.href = url;
      a.download = `jojo-roster-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast(`Roster exportado (${roster.length} participantes).`, 'success');
    }
  
    function importRosterFromFile(file) {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result);
          const incoming = Array.isArray(parsed)
            ? parsed
            : Array.isArray(parsed.participants)
              ? parsed.participants
              : null;
  
          if (!incoming) {
            toast('El JSON no contiene un roster válido.', 'error');
            return;
          }
  
          mergeRoster(incoming);
          if (parsed && typeof parsed.readyForDraw === 'boolean') {
            saveReadyFlag(parsed.readyForDraw);
            updateReadyButton();
          }
        } catch (err) {
          console.error(err);
          toast('Archivo JSON inválido.', 'error');
        }
      };
      reader.onerror = () => toast('Error leyendo el archivo.', 'error');
      reader.readAsText(file, 'utf-8');
    }
  
    function mergeRoster(incoming) {
      const existingIds = new Set(roster.map((s) => s.id));
      let added = 0;
      let updated = 0;
  
      for (const raw of incoming) {
        if (!raw || typeof raw !== 'object') continue;
  
        // Normalización mínima
        const normalized = normalizeStand(raw);
        if (!normalized) continue;
  
        if (existingIds.has(normalized.id)) {
          const idx = roster.findIndex((s) => s.id === normalized.id);
          roster[idx] = { ...roster[idx], ...normalized, updatedAt: Date.now() };
          updated++;
        } else {
          if (roster.length >= MAX_PARTICIPANTS) {
            toast(`Límite ${MAX_PARTICIPANTS} alcanzado. Algunos no se importaron.`, 'error');
            break;
          }
          roster.push(normalized);
          existingIds.add(normalized.id);
          added++;
        }
      }
  
      saveRoster();
      renderCounter();
      renderGallery();
      toast(`Importación completa: ${added} nuevos, ${updated} actualizados.`, 'success');
    }
  
    function normalizeStand(raw) {
        
      if (!raw || typeof raw !== 'object') return null;
      const stats = {};
      STAT_KEYS.forEach((k) => {
        const v = raw.stats && raw.stats[k];
        stats[k] = ['A', 'B', 'C', 'D', 'E'].includes(v) ? v : 'B';
      });
  
      const abilities = Array.isArray(raw.abilities)
      ? raw.abilities.slice(0, 3).map((ab) => ({
          accuracy: clampNumber(ab?.accuracy, 10, 100, 100),
          name: String(ab?.name || '').slice(0, 60),
          damage: clampNumber(ab?.damage, 15, 60, 30),
          cooldown: clampNumber(ab?.cooldown, 0, 5, 1),
          description: String(ab?.description || '').slice(0, 200),
          type: ['damage', 'heal', 'shield'].includes(ab?.type) ? ab.type : 'damage'
        }))
      : [];

    while (abilities.length < 3) {
      abilities.push({ name: '', damage: 30, cooldown: 1, description: '', type: 'damage', accuracy: 100 });
    }
  
      return {
        id: typeof raw.id === 'string' && raw.id ? raw.id : uid(),
        artistName: String(raw.artistName || 'Desconocido').slice(0, 60),
        standName: String(raw.standName || 'Stand sin nombre').slice(0, 60),
        affinity: String(raw.affinity || 'Físico').slice(0, 30),
        battleCry: String(raw.battleCry || '').slice(0, 40),
        stats,
        abilities,
        image: typeof raw.image === 'string' ? raw.image : null,
        imageMime: typeof raw.imageMime === 'string' ? raw.imageMime : null,
        level: clampNumber(raw.level, 1, 99, DEFAULT_LEVEL),
        createdAt: Number(raw.createdAt) || Date.now(),
        updatedAt: Date.now(),
        isDefeated: Boolean(raw.isDefeated),
        defeatedAt: Number(raw.defeatedAt) || null,
        lastHp: Number(raw.lastHp) || null,
        tournamentBattles: Number(raw.tournamentBattles) || 0,
        tournamentDamage: Number(raw.tournamentDamage) || 0,
      };
    }
  
    /* =========================================================
       READY FOR DRAW
       ========================================================= */
       function updateReadyButton() {
        const ready = loadReadyFlag();
        btnReadyDraw.classList.toggle('is-active', ready);
        btnReadyDraw.textContent = ready
          ? '✓ Arena Preparada'
          : '⚔ Entrar a la Arena';
      }
  
      function markReadyForDraw() {
        if (roster.length < 2) {
          toast('Se necesitan al menos 2 participantes para el emparejamiento.', 'error');
          return;
        }
    
        const wasReady = loadReadyFlag();
    
        // Si es la primera vez que entra (nuevo torneo), resetear estado de torneo previo
        if (!wasReady) {
          roster = roster.map((s) => ({
            ...s,
            isDefeated: false,
            defeatedAt: null,
            lastHp: null,
            tournamentDamage: 0,
            tournamentBattles: 0
          }));
          tournamentRound = 1;
          saveRoster();
          saveMode();
          renderGallery();
        }
    
        saveReadyFlag(true);
        updateReadyButton();
        toast(`¡Arena lista con ${roster.length} participantes!`, 'success');
        setTimeout(showTournamentView, 250);
      }
  
    /* =========================================================
       CLEAR ALL
       ========================================================= */
    function clearAll() {
      if (roster.length === 0) {
        toast('El roster ya está vacío.', 'info');
        return;
      }
      const ok = confirm(`¿Borrar TODOS los ${roster.length} participantes? Esta acción no se puede deshacer.`);
      if (!ok) return;
      roster = [];
      saveRoster();
      saveReadyFlag(false);
      updateReadyButton();
      renderCounter();
      renderGallery();
      toast('Roster limpiado por completo.', 'info');
    }
  
        /* =========================================================
     RADAR CHART HEXAGONAL
     - Sigla del eje (PWR, SPD, ...) arriba
     - Letra del rango (A/B/C/D/E) debajo, destacada en dorado
     - Círculo de fondo opcional (arena de combate)
     ========================================================= */
    function buildRadarSVG(stats, opts = {}) {
    const size = opts.size || 100;
    const compact = opts.compact !== false;
    const withBackground = opts.withBackground === true;

    const cx = size / 2;
    const cy = size / 2;
    const radius = size * 0.34;        // radio del polígono de datos
    const bgRadius = size * 0.46;      // radio del círculo de fondo

    // Radios diferenciados para sigla y rango (evita solapamiento)
    const siglaRadius = size * 0.44;   // la sigla (PWR) va un poco MÁS AFUERA
    const rangoRadius = size * 0.40;   // el rango (A) va un poco MÁS ADENTRO que la sigla

    const totalAxes = RADAR_AXES.length;
    const angleStep = (Math.PI * 2) / totalAxes;

    const values = RADAR_AXES.map((axis) => {
      const g = stats[axis];
      return RADAR_GRADES[g] ?? RADAR_NONE;
    });

    const polarToXY = (angle, r) => [
      cx + r * Math.cos(angle - Math.PI / 2),
      cy + r * Math.sin(angle - Math.PI / 2)
    ];

    // --- Círculo de fondo (arena) ---
    let bgSvg = '';
    if (withBackground) {
      bgSvg = `<circle class="radar-bg" cx="${cx}" cy="${cy}" r="${bgRadius}" />`;
    }

    // --- Anillos de la grilla ---
    let ringsSvg = '';
    for (let level = 1; level <= RADAR_MAX; level++) {
      const r = (radius * level) / RADAR_MAX;
      const pts = [];
      for (let i = 0; i < totalAxes; i++) {
        const [x, y] = polarToXY(i * angleStep, r);
        pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
      }
      ringsSvg += `<polygon class="radar-grid-ring" points="${pts.join(' ')}" />`;
    }

    // --- Ejes radiales ---
    let axesSvg = '';
    for (let i = 0; i < totalAxes; i++) {
      const [x, y] = polarToXY(i * angleStep, radius);
      axesSvg += `<line class="radar-grid-axis" x1="${cx}" y1="${cy}" x2="${x.toFixed(2)}" y2="${y.toFixed(2)}" />`;
    }

    // --- Polígono de datos ---
    const dataPts = [];
    const verticesSvg = [];
    values.forEach((v, i) => {
      const r = (radius * v) / RADAR_MAX;
      const [x, y] = polarToXY(i * angleStep, r);
      dataPts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
      verticesSvg.push(
        `<circle class="radar-vertex" cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="1.4" />`
      );
    });
    const polygonSvg = `<polygon class="radar-polygon" points="${dataPts.join(' ')}" />`;

        // --- Etiquetas: sigla ARRIBA y rango ABAJO en el mismo <text> con 2 <tspan> ---
    // Un solo <text> por eje, con dos <tspan> apilados verticalmente mediante
    // atributos `x`/`dy` para garantizar que NUNCA se solapen.
    let labelsSvg = '';
    if (compact) {
      // Radio donde se ancla la etiqueta completa (a medio camino entre
      // el polígono de datos y el borde exterior del viewBox).
      const labelAnchorRadius = size * 0.46;

      RADAR_AXES.forEach((axis, i) => {
        const angle = i * angleStep;
        const [lx, ly] = polarToXY(angle, labelAnchorRadius);

        const label = RADAR_LABELS[axis];
        const grade = stats[axis] || '-';

        // Las dos líneas se apilan verticalmente dentro del mismo <text>:
        //   - 1ª línea: sigla (PWR) en tamaño pequeño
        //   - 2ª línea: rango (A/B/C) en tamaño grande dorado
        // La separación real (12-14px) se controla con `dy` y `font-size`.
        labelsSvg += `
          <text x="${lx.toFixed(2)}" y="${ly.toFixed(2)}" text-anchor="middle">
            <tspan
              class="radar-axis-label"
              x="${lx.toFixed(2)}"
              dy="-1px"
            >${label}</tspan>
            <tspan
              class="radar-axis-grade"
              x="${lx.toFixed(2)}"
              dy="13px"
            >${grade}</tspan>
          </text>
        `;
      });
    }

    return `
      <svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        ${bgSvg}
        ${ringsSvg}
        ${axesSvg}
        ${polygonSvg}
        ${verticesSvg.join('')}
        ${labelsSvg}
      </svg>
    `;
  }

  /** Inyecta el radar dentro de un contenedor existente */
  function renderRadarInto(container, stats, opts = {}) {
    if (!container) return;
    container.innerHTML = buildRadarSVG(stats, opts);
  }

    /* =========================================================
     TOOLTIP NARRATIVO DE HABILIDADES
     ========================================================= */
     const ABILITY_KIND_LABELS = {
      damage: 'Ataque',
      heal:   'Soporte / Curación',
      shield: 'Escudo / Estado'
    };
  
    /**
     * Deduce el tipo de habilidad a partir de su nombre/descripción/damage.
     * Es heurístico pero suficiente para el stream.
     */
    function inferAbilityKind(ability) {
      // 1) Prioridad máxima: tipo explícito definido por el usuario
      if (ability && ['damage', 'heal', 'shield'].includes(ability.type)) {
        return ability.type;
      }
  
      // 2) Fallback heurístico (compatibilidad con Stands antiguos sin type)
      const text = `${ability?.name || ''} ${ability?.description || ''}`.toLowerCase();
  
      const healWords = ['cura', 'curar', 'heal', 'restaur', 'sanar', 'sanación', 'regenera', 'revive', 'revivir'];
      const shieldWords = ['escudo', 'barrera', 'guardia', 'protec', 'blindaje', 'defensa', 'shield', 'bloqueo'];
      const statusWords = ['paraliz', 'congel', 'stun', 'silencio', 'veneno', 'envenen', 'sangrado', 'quemar', 'ralentiz', 'acelerar', 'potenciar'];
      const attackWords = ['golpe', 'ataque', 'daño', 'impacto', 'ráfaga', 'rafaga', 'rush', 'disparo', 'onda', 'explosión', 'explosion', 'corte', 'puño', 'puñetazo', 'patada'];
  
      if (healWords.some((w) => text.includes(w))) return 'heal';
      if (shieldWords.some((w) => text.includes(w))) return 'shield';
      if (statusWords.some((w) => text.includes(w))) return 'shield'; // agrupamos status bajo shield visualmente
      if (attackWords.some((w) => text.includes(w))) return 'damage';
  
      const dmg = Number(ability?.damage) || 0;
      if (dmg >= 40) return 'damage';
      if (dmg <= 20) return 'heal';
      return 'shield';
    }
  
    function showSkillTooltip(targetEl, ability, index) {
      if (!skillTooltip || !ability) return;
  
      const roman = ['Ⅰ', 'Ⅱ', 'Ⅲ'][index] || '•';
      tooltipIcon.textContent = roman;
      tooltipName.textContent = ability.name || `Habilidad ${roman}`;
  
      const kind = inferAbilityKind(ability);
      tooltipType.textContent = ABILITY_KIND_LABELS[kind] || 'Habilidad';
      tooltipType.setAttribute('data-kind', kind);
  
      tooltipDesc.textContent = ability.description || '';
              // --- Footer contextual por tipo ---
    if (kind === 'heal') {
      const healPct = 0.22;
      const fighter = battle ? battle[battle.activeSide] : null;
      const estHeal = fighter ? Math.round(fighter.maxHp * healPct) : 100;
      tooltipDamage.innerHTML = `<span style="color:var(--ready-hi);">+${estHeal} HP · Curación</span>`;
      tooltipCd.textContent = `CD ${ability.cooldown || 0} turno${(ability.cooldown || 0) === 1 ? '' : 's'}`;
    } else if (kind === 'shield') {
      tooltipDamage.innerHTML = `<span style="color:var(--accent-cyan);">Defensa 50%</span>`;
      tooltipCd.textContent = `CD ${ability.cooldown || 0} turno${(ability.cooldown || 0) === 1 ? '' : 's'}`;
    } else {
      const acc = clampNumber(ability.accuracy, 10, 100, 100);
      const defender = battle ? battle[battle.activeSide === 'p1' ? 'p2' : 'p1'] : null;
      const attackerFighter = battle ? battle[battle.activeSide] : null;

      let projected = { damage: ability.damage || 30, pct: 0 };
      if (defender && attackerFighter) {
        projected = computeProjectedDamage(
          { ...attackerFighter.data, __fighterRef: attackerFighter },
          defender.data,
          ability,
          'damage'
        );
      }

      if (projected.pct > 0) {
        tooltipDamage.innerHTML = `${projected.damage} daño <span style="color:var(--ready-hi);font-weight:700;">(+${projected.pct}%)</span>`;
      } else if (projected.pct < 0) {
        tooltipDamage.innerHTML = `${projected.damage} daño <span style="color:#ff8a70;font-weight:700;">(${projected.pct}%)</span>`;
      } else {
        tooltipDamage.textContent = `${projected.damage} daño`;
      }

      tooltipCd.textContent = `${acc}% Precisión · CD ${ability.cooldown || 0}`;
    }
  
      // Posicionamiento
      skillTooltip.hidden = false;
      // Forzar reflow para medir tamaño
      void skillTooltip.offsetWidth;
  
      const rect = targetEl.getBoundingClientRect();
      const tipW = skillTooltip.offsetWidth;
      const tipH = skillTooltip.offsetHeight;
  
      // Intentar arriba; si no cabe, abajo
      const spaceAbove = rect.top;
      const placeBelow = spaceAbove < tipH + 20;
      const top = placeBelow ? rect.bottom + 12 : rect.top - tipH - 12;
  
      // Centrado horizontal con clamping a la ventana
      let left = rect.left + rect.width / 2 - tipW / 2;
      left = Math.max(12, Math.min(left, window.innerWidth - tipW - 12));
  
      skillTooltip.style.top = `${top}px`;
      skillTooltip.style.left = `${left}px`;
      skillTooltip.setAttribute('data-arrow', placeBelow ? 'top' : 'bottom');
      skillTooltip.style.setProperty('--arrow-x', `${rect.left + rect.width / 2 - left}px`);
  
      skillTooltip.classList.add('is-visible');
    }
  
    function hideSkillTooltip() {
      if (!skillTooltip) return;
      skillTooltip.classList.remove('is-visible');
      // Pequeño delay para permitir la transición
      setTimeout(() => {
        if (!skillTooltip.classList.contains('is-visible')) {
          skillTooltip.hidden = true;
        }
      }, 200);
    }

    /* =========================================================
       EVENTOS
       ========================================================= */
    function bindEvents() {
          // Sincronizar clases .is-checked en las píldoras de tipo
    document.addEventListener('change', (e) => {
      if (e.target && e.target.classList.contains('ability-type')) {
        const name = e.target.name;
        document.querySelectorAll(`input[name="${name}"]`).forEach((r) => {
          r.closest('.type-pill')?.classList.toggle('is-checked', r.checked);
        });
      }
    });

        // Afinidad personalizada (toggle)
        if (affinitySelect) {
        affinitySelect.addEventListener('change', toggleCustomAffinityInput);
        }

      // Barra superior
      btnAddNew.addEventListener('click', () => openModal(null));
      btnExport.addEventListener('click', exportRoster);
      btnImportTrigger.addEventListener('click', () => importFileInput.click());
      importFileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        importRosterFromFile(file);
        e.target.value = '';
      });
      btnClearAll.addEventListener('click', clearAll);
      btnReadyDraw.addEventListener('click', markReadyForDraw);
  
      // Modal
      btnCloseModal.addEventListener('click', closeModal);
      btnCancelForm.addEventListener('click', closeModal);
      modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) closeModal();
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modalBackdrop.hidden) closeModal();
      });
  
      // Imagen
      imageInput.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        if (!/^image\//.test(file.type)) {
          toast('El archivo debe ser una imagen.', 'error');
          e.target.value = '';
          return;
        }
        const MAX_MB = 4;
        if (file.size > MAX_MB * 1024 * 1024) {
          toast(`La imagen supera ${MAX_MB} MB.`, 'error');
          e.target.value = '';
          return;
        }
        try {
          const { dataUrl, mime } = await readImageAsBase64(file);
          pendingImageBase64 = dataUrl;
          pendingImageMime = mime;
          updatePreview();
        } catch (err) {
          console.error(err);
          toast('No se pudo procesar la imagen.', 'error');
        }
      });
  
      // Stats derivadas en vivo
      $$('.field--stat select').forEach((sel) => {
        sel.addEventListener('change', updateDerived);
      });
  
      // Submit
        standForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = collectForm();
  
        if (!data.artistName) {
          toast('El nombre del artista es obligatorio.', 'error');
          artistNameInput.focus();
          return;
        }
        if (!data.standName) {
          toast('El nombre del Stand es obligatorio.', 'error');
          standNameInput.focus();
          return;
        }
        if (!data.affinity) {
          toast('Escribe un nombre para la afinidad personalizada.', 'error');
          if (affinitySelect.value === '__custom__') customAffinityInput.focus();
          return;
        }
  
        upsertStand(data);
  
        // Refrescar el select de escenarios por si se creó una afinidad nueva
        populateStageAffinitySelect(stageAffinityInput?.value);
  
        toast(editingId ? 'Stand actualizado.' : 'Stand añadido al roster.', 'success');
        closeModal();
      });
    }
    
      /* =========================================================
     MÓDULO 2 — PERSISTENCIA DE ESCENARIOS
     ========================================================= */
     function loadStages() {
      try {
        const raw = localStorage.getItem(STAGES_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        stages = Array.isArray(parsed)
          ? parsed.map(normalizeStage).filter(Boolean)
          : [];
      } catch (err) {
        console.error('[JoJo Roster] Error cargando escenarios:', err);
        stages = [];
      }
    }

  function normalizeStage(raw) {
    if (!raw || typeof raw !== 'object') return null;
    return {
      id: typeof raw.id === 'string' && raw.id ? raw.id : uid(),
      name: String(raw.name || 'Escenario sin nombre').slice(0, 60),
      affinity: String(raw.affinity || 'Físico').slice(0, 30),
      penalizedAffinity: raw.penalizedAffinity ? String(raw.penalizedAffinity).slice(0, 30) : '',
      image: typeof raw.image === 'string' ? raw.image : null,
      imageMime: typeof raw.imageMime === 'string' ? raw.imageMime : null,
      createdAt: Number(raw.createdAt) || Date.now(),
      updatedAt: Number(raw.updatedAt) || null
    };
  }


  /* =========================================================
     MÓDULO 2 — RENDER DE ESCENARIOS
     ========================================================= */
  function renderStages() {
    if (!stageCarousel || !stageEmpty) return;

    if (stages.length === 0) {
      stageCarousel.hidden = true;
      stageEmpty.hidden = false;
      stageCarousel.innerHTML = '';
      return;
    }

    stageEmpty.hidden = true;
    stageCarousel.hidden = false;

    const frag = document.createDocumentFragment();
    for (const st of stages) frag.appendChild(buildStageCard(st));

    stageCarousel.innerHTML = '';
    stageCarousel.appendChild(frag);
  }

  function buildStageCard(stage) {
    const card = document.createElement('article');
    card.className = 'stage-card';
    card.dataset.id = stage.id;

    const imgMarkup = stage.image
      ? `<img class="stage-card__img" src="${escapeHtml(stage.image)}" alt="${escapeHtml(stage.name)}">`
      : `<div class="stage-card__img stage-card__img--empty">🏙</div>`;

    const favoredChip = stage.affinity
      ? `<span class="stage-card__mod stage-card__mod--favored" title="Afinidad favorecida +15%">+15% ${escapeHtml(stage.affinity)}</span>`
      : '';
    const penalizedChip = stage.penalizedAffinity
      ? `<span class="stage-card__mod stage-card__mod--penalized" title="Afinidad perjudicada −15%">−15% ${escapeHtml(stage.penalizedAffinity)}</span>`
      : '';

    card.innerHTML = `
      ${imgMarkup}
      <div class="stage-card__body">
        <h4 class="stage-card__name" title="${escapeHtml(stage.name)}">${escapeHtml(stage.name)}</h4>
        <div class="stage-card__mods">
          ${favoredChip}
          ${penalizedChip}
        </div>
        <div class="stage-card__actions">
          <button type="button" class="btn btn--ghost" data-action="edit">✎ Editar</button>
          <button type="button" class="btn btn--danger" data-action="delete">✕</button>
        </div>
      </div>
    `;

    card.querySelector('[data-action="edit"]')
      .addEventListener('click', () => openStageModal(stage.id));
    card.querySelector('[data-action="delete"]')
      .addEventListener('click', () => deleteStage(stage.id));

    return card;
  }

  function deleteStage(id) {
    const stage = stages.find((s) => s.id === id);
    if (!stage) return;
    if (!confirm(`¿Eliminar el escenario "${stage.name}"?`)) return;
    stages = stages.filter((s) => s.id !== id);
    saveStages();
    renderStages();
    toast(`Escenario "${stage.name}" eliminado.`, 'info');
  }


  /* =========================================================
     MÓDULO 2 — MODAL DE ESCENARIO
     ========================================================= */
     function openStageModal(editId = null) {
      resetStageForm();
      populateStageAffinitySelect();
      populateStagePenaltySelect();
  
      if (editId) {
        const stage = stages.find((s) => s.id === editId);
        if (stage) {
          stageModalTitle.textContent = `Editar Escenario — ${stage.name}`;
          stageNameInput.value = stage.name || '';
          stageAffinityInput.value = stage.affinity || '';
          if (stageAffinityPenaltyInput) {
            stageAffinityPenaltyInput.value = stage.penalizedAffinity || '';
          }
          // Precargar imagen existente
          pendingStageImageBase64 = stage.image || null;
          pendingStageImageMime = stage.imageMime || null;
          updateStagePreview();
          // Guardar id en el hidden
          const editInput = document.getElementById('stageEditId');
          if (editInput) editInput.value = editId;
        }
      } else {
        stageModalTitle.textContent = 'Nuevo Escenario';
      }
  
      stageModalBackdrop.hidden = false;
      document.body.style.overflow = 'hidden';
      setTimeout(() => stageNameInput.focus(), 60);
    }

  function closeStageModal() {
    stageModalBackdrop.hidden = true;
    document.body.style.overflow = '';
    resetStageForm();
  }

  function resetStageForm() {
    stageForm.reset();
    pendingStageImageBase64 = null;
    pendingStageImageMime = null;
    const editInput = document.getElementById('stageEditId');
    if (editInput) editInput.value = '';
    updateStagePreview();
  }

  function populateStagePenaltySelect(selectedValue = null) {
    if (!stageAffinityPenaltyInput) return;
    const all = getAllAffinities();
    stageAffinityPenaltyInput.innerHTML = '<option value="">— Ninguna —</option>';
    for (const aff of all) {
      const opt = document.createElement('option');
      opt.value = aff;
      opt.textContent = aff;
      stageAffinityPenaltyInput.appendChild(opt);
    }
    if (selectedValue && all.includes(selectedValue)) {
      stageAffinityPenaltyInput.value = selectedValue;
    }
  }

  function updateStagePreview() {
    if (pendingStageImageBase64) {
      stagePreviewImage.src = pendingStageImageBase64;
      stagePreviewImage.hidden = false;
      stagePreviewPlaceholder.hidden = true;
    } else {
      stagePreviewImage.src = '';
      stagePreviewImage.hidden = true;
      stagePreviewPlaceholder.hidden = false;
    }
  }

  function collectStageForm() {
    return {
      name: stageNameInput.value.trim(),
      affinity: stageAffinityInput.value,
      penalizedAffinity: stageAffinityPenaltyInput ? (stageAffinityPenaltyInput.value || '') : ''
    };
  }

  function upsertStage(data) {
    const editInput = document.getElementById('stageEditId');
    const editId = editInput && editInput.value ? editInput.value : null;

    if (editId) {
      const idx = stages.findIndex((s) => s.id === editId);
      if (idx >= 0) {
        stages[idx] = {
          ...stages[idx],
          name: data.name,
          affinity: data.affinity,
          penalizedAffinity: data.penalizedAffinity,
          image: pendingStageImageBase64 || stages[idx].image || null,
          imageMime: pendingStageImageMime || stages[idx].imageMime || null,
          updatedAt: Date.now()
        };
        saveStages();
        renderStages();
        toast(`Escenario "${data.name}" actualizado.`, 'success');
        return;
      }
    }

    const payload = {
      id: uid(),
      name: data.name,
      affinity: data.affinity,
      penalizedAffinity: data.penalizedAffinity,
      image: pendingStageImageBase64 || null,
      imageMime: pendingStageImageMime || null,
      createdAt: Date.now()
    };
    stages.push(payload);
    saveStages();
    renderStages();
    toast(`Escenario "${payload.name}" guardado.`, 'success');
  }

  /* =========================================================
     MÓDULO 2 — TRANSICIÓN DE VISTAS
     ========================================================= */
     function showTournamentView() {
        if (roster.length < 2) {
          toast('Se necesitan al menos 2 Stands para el sorteo.', 'error');
          return;
        }
        rosterView.hidden = true;
        tournamentView.hidden = false;
        versusScreen.hidden = true;
        battleView.hidden = true;
        document.body.classList.remove('is-battling');
    
        document.querySelector('.roulette-zone').hidden = false;
        document.querySelector('.roulette-stage').hidden = false;
        document.querySelector('.stage-manager').hidden = false;
    
        applyModeUI();
        updateTournamentStatus();
    
        window.scrollTo(0, 0);
      }

  function showRosterView() {
    tournamentView.hidden = true;
    rosterView.hidden = false;
    versusScreen.hidden = true;
    battleView.hidden = true;
    document.body.classList.remove('is-battling'); // ← NUEVO
    resetReels();
    battle = null;
    currentMatchup = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetReels() {
    [reelP1, reelP2, reelStage].forEach((reel) => {
      if (!reel) return;
      reel.classList.remove('is-spinning', 'is-locked');
      reel.innerHTML = '';
    });
    reelP1.innerHTML = '<span class="roulette-slot__glyph">?</span>';
    reelP2.innerHTML = '<span class="roulette-slot__glyph">?</span>';
    reelStage.innerHTML = '<span class="roulette-stage__glyph">?</span>';
  }

  /* =========================================================
     MÓDULO 2 — LÓGICA DE SORTEO
     ========================================================= */
  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function pickTwoDistinct(arr) {
    if (arr.length < 2) return null;
    const i1 = Math.floor(Math.random() * arr.length);
    let i2 = Math.floor(Math.random() * arr.length);
    while (i2 === i1) i2 = Math.floor(Math.random() * arr.length);
    return [arr[i1], arr[i2]];
  }

  function buildFighterImgHTML(stand, className) {
    if (stand.image) {
      return `<img class="${className}" src="${escapeHtml(stand.image)}" alt="${escapeHtml(stand.standName)}">`;
    }
    return `<span class="${className === 'roulette-slot__glyph-img' ? 'roulette-slot__glyph' : 'roulette-slot__glyph'}">🂠</span>`;
  }

  async function spinRoulette() {
    if (isSpinning) return;

    const eligible = getEligibleStands();

    // Battle Royale: si solo queda 1, anunciar campeón
    if (currentMode === 'royale' && eligible.length <= 1) {
      if (eligible.length === 1) {
        toast('¡Torneo finalizado! Queda un único superviviente.', 'success');
        showChampionModal();
      } else {
        toast('No hay Stands elegibles. Reinicia el torneo o cambia a Modo Libre.', 'error');
      }
      return;
    }

    if (eligible.length < 2) {
      toast('Se necesitan al menos 2 Stands elegibles para el sorteo.', 'error');
      return;
    }

    isSpinning = true;
    btnSpinRoulette.disabled = true;
    versusScreen.hidden = true;

    // Elegir resultados al azar desde los elegibles
    const [p1, p2] = pickTwoDistinct(eligible);
    const stage = stages.length > 0 ? pickRandom(stages) : null;

    preloadImage(p1.image);
    preloadImage(p2.image);
    if (stage) preloadImage(stage.image);

    rouletteOnoma.hidden = false;
    rouletteEmblem.style.opacity = '0.35';

    reelP1.classList.add('is-spinning');
    reelP2.classList.add('is-spinning');
    reelStage.classList.add('is-spinning');

    const spinDuration = 2200;
    const spinInterval = 90;
    const spinner = setInterval(() => {
      const pool = getEligibleStands();
      if (Math.random() < 0.7 && pool.length > 0) {
        const r = pickRandom(pool);
        reelP1.innerHTML = buildFighterImgHTML(r, 'roulette-slot__glyph-img');
      }
      if (Math.random() < 0.7 && pool.length > 0) {
        const r = pickRandom(pool);
        reelP2.innerHTML = buildFighterImgHTML(r, 'roulette-slot__glyph-img');
      }
      if (stages.length > 0 && Math.random() < 0.6) {
        const s = pickRandom(stages);
        reelStage.innerHTML = s.image
          ? `<img src="${escapeHtml(s.image)}" alt="">`
          : '<span class="roulette-stage__glyph">🏙</span>';
      }
    }, spinInterval);

    await wait(spinDuration);
    clearInterval(spinner);

    reelP1.classList.remove('is-spinning');
    reelP2.classList.remove('is-spinning');
    reelStage.classList.remove('is-spinning');

    reelP1.innerHTML = buildFighterImgHTML(p1, 'roulette-slot__glyph-img');
    reelP1.classList.add('is-locked');
    await wait(280);

    reelP2.innerHTML = buildFighterImgHTML(p2, 'roulette-slot__glyph-img');
    reelP2.classList.add('is-locked');
    await wait(280);

    reelStage.innerHTML = stage && stage.image
      ? `<img src="${escapeHtml(stage.image)}" alt="${escapeHtml(stage.name)}">`
      : '<span class="roulette-stage__glyph">🏙</span>';
    reelStage.classList.add('is-locked');
    await wait(380);

    rouletteOnoma.hidden = true;
    rouletteEmblem.style.opacity = '1';
    btnSpinRoulette.disabled = false;
    isSpinning = false;

    currentMatchup = { p1, p2, stage };

    await wait(220);
    showVersusScreen(currentMatchup);
  }

  function wait(ms) {
    return new Promise((res) => setTimeout(res, ms));
  }

  function preloadImage(src) {
    if (!src) return;
    const img = new Image();
    img.src = src;
  }

  /* =========================================================
     MÓDULO 2 — PANTALLA VERSUS
     ========================================================= */
  function showVersusScreen({ p1, p2, stage }) {
    // Ocultar zonas de ruleta y gestor de escenarios
    document.body.classList.remove('is-battling'); // ← NUEVO (por seguridad)
    document.querySelector('.roulette-stage').hidden = true;
    document.querySelector('.stage-manager').hidden = true;

    // Fondo del escenario
    if (stage && stage.image) {
      versusStageBg.style.backgroundImage = `url("${stage.image}")`;
    } else {
      versusStageBg.style.backgroundImage = '';
      versusStageBg.style.background =
        'radial-gradient(ellipse at center, #1a1524, #0a0810 70%)';
    }

    // Datos escenario
    versusStageName.textContent = stage ? stage.name : 'Terreno Neutro';
    versusStageMod.textContent = stage ? `+15% ${stage.affinity}` : 'Sin modificador';

    // P1
    fillFighterSide({
      imgEl: versusImgP1,
      nameEl: versusNameP1,
      ownerEl: versusOwnerP1,
      hpEl: versusHpP1,
      affEl: versusAffP1,
      bonusEl: versusBonusP1
    }, p1, stage);

    // P2
    fillFighterSide({
      imgEl: versusImgP2,
      nameEl: versusNameP2,
      ownerEl: versusOwnerP2,
      hpEl: versusHpP2,
      affEl: versusAffP2,
      bonusEl: versusBonusP2
    }, p2, stage);

    versusScreen.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function fillFighterSide(refs, stand, stage) {
    refs.imgEl.src = stand.image || '';
    refs.imgEl.alt = stand.standName;
    refs.imgEl.style.visibility = stand.image ? 'visible' : 'hidden';

    refs.nameEl.textContent = stand.standName;
    refs.ownerEl.textContent = stand.artistName;

    const hp = computeHP(stand.stats.durability, stand.level || DEFAULT_LEVEL);
    refs.hpEl.textContent = `♥ ${hp}`;
    refs.affEl.textContent = stand.affinity;

    // Bonus de terreno
    const hasBonus = stage && stage.affinity === stand.affinity;
    refs.bonusEl.hidden = !hasBonus;
  }

  /* =========================================================
     MÓDULO 2 — INICIAR COMBATE (puente al Módulo 3)
     ========================================================= */
     function startFight() {
        if (!currentMatchup || !currentMatchup.p1 || !currentMatchup.p2) {
          toast('No hay enfrentamiento activo.', 'error');
          return;
        }
        const battleData = {
          createdAt: Date.now(),
          p1: sanitizeForBattle(currentMatchup.p1),
          p2: sanitizeForBattle(currentMatchup.p2),
          stage: currentMatchup.stage ? {
            id: currentMatchup.stage.id,
            name: currentMatchup.stage.name,
            affinity: currentMatchup.stage.affinity,
            image: currentMatchup.stage.image
          } : null,
          bonusPercent: STAGE_BONUS_PERCENT
        };
    
        try {
          localStorage.setItem(CURRENT_BATTLE_KEY, JSON.stringify(battleData));
        } catch (err) {
          console.error(err);
          toast('No se pudo guardar el combate.', 'error');
          return;
        }
    
        window.dispatchEvent(new CustomEvent('jja:battle-ready', { detail: battleData }));
    
        // Transición al motor de combate
        startBattleEngine();
      }

  function sanitizeForBattle(stand) {
    return {
      id: stand.id,
      artistName: stand.artistName,
      standName: stand.standName,
      affinity: stand.affinity,
      battleCry: stand.battleCry || '',
      stats: { ...stand.stats },
      abilities: (stand.abilities || []).map((a) => ({
        ...a,
        type: ['damage', 'heal', 'shield'].includes(a.type) ? a.type : 'damage',
        accuracy: clampNumber(a.accuracy, 10, 100, 100)
      })),
      image: stand.image || null,
      level: stand.level || DEFAULT_LEVEL,
      hp: computeHP(stand.stats.durability, stand.level || DEFAULT_LEVEL),
      damageBonus: computeDamageBonus(stand.stats.power)
    };
  }

    /* =========================================================
     AFINIDADES DINÁMICAS (base + personalizadas)
     ========================================================= */
     function loadCustomAffinities() {
        try {
          const raw = localStorage.getItem(CUSTOM_AFFINITIES_KEY);
          const arr = raw ? JSON.parse(raw) : [];
          return Array.isArray(arr) ? arr.filter((s) => typeof s === 'string' && s.trim()) : [];
        } catch (err) {
          console.error('[JoJo Roster] Error cargando afinidades personalizadas:', err);
          return [];
        }
      }
    
      function saveCustomAffinities(list) {
        // Deduplica preservando orden, sin colisionar con las base
        const baseSet = new Set(BASE_AFFINITIES.map((s) => s.toLowerCase()));
        const seen = new Set();
        const clean = [];
        for (const item of list) {
          const name = String(item || '').trim();
          if (!name) continue;
          const key = name.toLowerCase();
          if (baseSet.has(key) || seen.has(key)) continue;
          seen.add(key);
          clean.push(name);
        }
        try {
          localStorage.setItem(CUSTOM_AFFINITIES_KEY, JSON.stringify(clean));
        } catch (err) {
          console.error(err);
          toast('No se pudieron guardar las afinidades personalizadas.', 'error');
        }
        return clean;
      }
    
      function getAllAffinities() {
        return [...BASE_AFFINITIES, ...loadCustomAffinities()];
      }
    
      function registerCustomAffinity(name) {
        const clean = String(name || '').trim();
        if (!clean) return null;
        if (clean.length > 24) return clean.slice(0, 24);
    
        const baseSet = new Set(BASE_AFFINITIES.map((s) => s.toLowerCase()));
        if (baseSet.has(clean.toLowerCase())) {
          // Ya existe como base: devolver la versión canónica
          return BASE_AFFINITIES.find((s) => s.toLowerCase() === clean.toLowerCase());
        }
    
        const current = loadCustomAffinities();
        const exists = current.find((s) => s.toLowerCase() === clean.toLowerCase());
        if (exists) return exists;
    
        current.push(clean);
        saveCustomAffinities(current);
        return clean;
      }
    
      /* =========================================================
         POBLAR SELECTS DE AFINIDAD
         ========================================================= */
      function populateStageAffinitySelect(selectedValue = null) {
        if (!stageAffinityInput) return;
        const all = getAllAffinities();
        stageAffinityInput.innerHTML = '';
        for (const aff of all) {
          const opt = document.createElement('option');
          opt.value = aff;
          opt.textContent = aff;
          stageAffinityInput.appendChild(opt);
        }
        if (selectedValue && all.includes(selectedValue)) {
          stageAffinityInput.value = selectedValue;
        }
      }
    
      function toggleCustomAffinityInput() {
        if (!affinitySelect || !customAffinityField) return;
        const isCustom = affinitySelect.value === '__custom__';
        customAffinityField.hidden = !isCustom;
        if (isCustom) {
          setTimeout(() => customAffinityInput.focus(), 60);
        } else {
          customAffinityInput.value = '';
        }
      }
    
      /* =========================================================
         RESOLVER AFINIDAD AL GUARDAR UN STAND
         ========================================================= */
      function resolveAffinityFromForm() {
        const raw = affinitySelect.value;
        if (raw !== '__custom__') return raw;
    
        const typed = (customAffinityInput.value || '').trim();
        if (!typed) return null;
    
        return registerCustomAffinity(typed);
      }

  /* =========================================================
     MÓDULO 2 — EVENTOS
     ========================================================= */
  function bindModule2Events() {
    // Volver al roster
    btnBackToRoster.addEventListener('click', showRosterView);

    // Abrir modal escenario
    btnAddStage.addEventListener('click',()=> openStageModal(null));

    // Cerrar modal escenario
    btnCloseStageModal.addEventListener('click', closeStageModal);
    btnCancelStage.addEventListener('click', closeStageModal);
    stageModalBackdrop.addEventListener('click', (e) => {
      if (e.target === stageModalBackdrop) closeStageModal();
    });

    // Imagen de escenario
    stageImageInput.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      if (!/^image\//.test(file.type)) {
        toast('El archivo debe ser una imagen.', 'error');
        e.target.value = '';
        return;
      }
      const MAX_MB = 6;
      if (file.size > MAX_MB * 1024 * 1024) {
        toast(`La imagen supera ${MAX_MB} MB.`, 'error');
        e.target.value = '';
        return;
      }
      try {
        const { dataUrl, mime } = await readImageAsBase64(file);
        pendingStageImageBase64 = dataUrl;
        pendingStageImageMime = mime;
        updateStagePreview();
      } catch (err) {
        console.error(err);
        toast('No se pudo procesar la imagen.', 'error');
      }
    });

    // Submit escenario
    stageForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = collectStageForm();
      if (!data.name) {
        toast('El nombre del escenario es obligatorio.', 'error');
        stageNameInput.focus();
        return;
      }
      upsertStage(data);
      closeStageModal();
    });

    // Girar ruleta
    btnSpinRoulette?.addEventListener('click', spinRoulette);

    // Volver a girar (desde versus)
    btnRespin.addEventListener('click', () => {
      versusScreen.hidden = true;
      document.querySelector('.roulette-zone').hidden = false;
      document.querySelector('.roulette-stage').hidden = false;
      document.querySelector('.stage-manager').hidden = false;
      resetReels();
      btnSpinRoulette.disabled = false;
      isSpinning = false;
      setTimeout(spinRoulette, 120);
    });

    // Iniciar combate
    btnStartFight.addEventListener('click', startFight);

    // ESC cierra el modal de escenario
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !stageModalBackdrop.hidden) closeStageModal();
    });
  }

    /* =========================================================
     MÓDULO 3 — INICIO DE BATALLA
     ========================================================= */
     function startBattleEngine() {
        if (!currentMatchup || !currentMatchup.p1 || !currentMatchup.p2) {
          toast('No hay enfrentamiento activo.', 'error');
          return;
        }
        
        
        const p1 = currentMatchup.p1;
        const p2 = currentMatchup.p2;
        const stage = currentMatchup.stage;
    
        const p1Hp = computeHP(p1.stats.durability, p1.level || DEFAULT_LEVEL);
        const p2Hp = computeHP(p2.stats.durability, p2.level || DEFAULT_LEVEL);
    
        battle = {
          p1: { data: p1, hp: p1Hp, maxHp: p1Hp, cooldowns: [0, 0, 0], totalDamage: 0, shield: false },
          p2: { data: p2, hp: p2Hp, maxHp: p2Hp, cooldowns: [0, 0, 0], totalDamage: 0, shield: false },
          stage: stage || null,
          activeSide: determineInitiative(p1, p2),
          turn: 1,
          round: 1,
          log: [],
          finished: false,
          busy: false,
          basicAttackLocked: 0,     // ← NUEVO: turnos restantes de bloqueo
          basicAttackLockedBy: null // ← NUEVO: nombre del evento (para el tooltip)
        };
        

        // === Transición de vistas ===
        versusScreen.hidden = true;
        tournamentView.hidden = true;                       // ← FIX: ocultar el contenedor padre
        battleView.hidden = false;
        document.body.classList.add('is-battling');         // ← FIX: activa el flag CSS
        window.scrollTo(0, 0);                              // ← FIX: scroll inmediato, sin smooth
    
        // Fondo del escenario
        if (stage && stage.image) {
          battleBg.style.backgroundImage = `url("${stage.image}")`;
          battleStageName.textContent = stage.name;
        } else {
          battleBg.style.backgroundImage = '';
          battleBg.style.background = 'radial-gradient(ellipse at center, #1a1524, #0a0810 70%)';
          battleStageName.textContent = 'Terreno Neutro';
        }
    
        // Render inicial
        renderBattleUI();
        updateHpBar('p1');
        updateHpBar('p2');
        
          // Notificar al módulo de eventos que empieza un combate
          if (window.JJA_EventsRoulette) {
            window.JJA_EventsRoulette.resetForBattle();
          }

        // Anunciar primer turno
        announceTurn();
            // Incrementar el contador individual de combates del torneo
          [p1, p2].forEach((fighter) => {
            const idx = roster.findIndex((s) => s.id === fighter.id);
            if (idx >= 0) {
              roster[idx].tournamentBattles = (roster[idx].tournamentBattles || 0) + 1;
            }
          });
          saveRoster();
        updateActionPanel();
      }
    
      function determineInitiative(p1, p2) {
        const s1 = SPD_INITIATIVE[p1.stats.speed] || 3;
        const s2 = SPD_INITIATIVE[p2.stats.speed] || 3;
        if (s1 > s2) return 'p1';
        if (s2 > s1) return 'p2';
        return Math.random() < 0.5 ? 'p1' : 'p2';
      }
    
      /* =========================================================
         MÓDULO 3 — RENDER UI
         ========================================================= */
         function renderBattleUI() {
            if (!battle) return;
        
            const { p1, p2, activeSide, finished } = battle;
        
            // P1
            battleNameP1.textContent = p1.data.standName;
            battleOwnerP1.textContent = p1.data.artistName;
            battleAffP1.textContent = p1.data.affinity;
            setSprite(battleSpriteP1, spriteFallbackP1, p1.data.image, p1.data.standName);
        
            // P2
            battleNameP2.textContent = p2.data.standName;
            battleOwnerP2.textContent = p2.data.artistName;
            battleAffP2.textContent = p2.data.affinity;
            setSprite(battleSpriteP2, spriteFallbackP2, p2.data.image, p2.data.standName);
              // Radar charts en la arena
              if (radarP1) renderRadarInto(radarP1, battle.p1.data.stats, { size: 140, compact: true, withBackground: true });
              if (radarP2) renderRadarInto(radarP2, battle.p2.data.stats, { size: 140, compact: true, withBackground: true });
            // Limpiar estados previos
            fighterP1.classList.remove('is-active', 'is-waiting', 'is-defeated');
            fighterP2.classList.remove('is-active', 'is-waiting', 'is-defeated');
            // Refrescar indicador de escudo
            fighterP1.classList.toggle('has-shield', !!battle.p1.shield);
            fighterP2.classList.toggle('has-shield', !!battle.p2.shield);
        
            // Marcar derrotado (si aplica)
            if (p1.hp <= 0) fighterP1.classList.add('is-defeated');
            if (p2.hp <= 0) fighterP2.classList.add('is-defeated');
        
            // Si no ha terminado, marcar activo / en espera
            if (!finished) {
              if (activeSide === 'p1') {
                if (p1.hp > 0) fighterP1.classList.add('is-active');
                if (p2.hp > 0) fighterP2.classList.add('is-waiting');
              } else {
                if (p2.hp > 0) fighterP2.classList.add('is-active');
                if (p1.hp > 0) fighterP1.classList.add('is-waiting');
              }
            }

                // --- Terrain tags (bonus/penalización) ---
    const updateTerrainTag = (fighterEl, fighter) => {
      // Limpiar tag previo
      const prev = fighterEl.querySelector('.battle-fighter__terrain-tag');
      if (prev) prev.remove();

      if (!battle.stage) return;

      const favored = (fighter.terrainBoost > 0) || (battle.stage.affinity === fighter.data.affinity);
      const penalized = battle.stage.penalizedAffinity && battle.stage.penalizedAffinity === fighter.data.affinity;

      if (favored) {
        const tag = document.createElement('span');
        tag.className = 'battle-fighter__terrain-tag battle-fighter__terrain-tag--bonus';
        tag.textContent = `▲ +${fighter.terrainBoost > 0 ? 30 : 15}% Terreno`;
        fighterEl.appendChild(tag);
      } else if (penalized) {
        const tag = document.createElement('span');
        tag.className = 'battle-fighter__terrain-tag battle-fighter__terrain-tag--penalty';
        tag.textContent = '▼ −15% Terreno';
        fighterEl.appendChild(tag);
      }
    };

    updateTerrainTag(fighterP1, battle.p1);
    updateTerrainTag(fighterP2, battle.p2);
        
            // Indicador de turno
            battleTurnIndicator.textContent = finished
              ? 'Combate Finalizado'
              : `Turno ${battle.turn} · ${activeSide === 'p1' ? 'P1' : 'P2'}`;
            battleRoundDisplay.textContent = `Ronda ${toRoman(battle.round)}`;
        
            // Status chips (bonus de terreno)
            updateStatusChips();
          }
    
      function setSprite(imgEl, fallbackEl, src, alt) {
        if (src) {
          imgEl.src = src;
          imgEl.alt = alt;
          imgEl.style.display = 'block';
          fallbackEl.style.display = 'none';
        } else {
          imgEl.removeAttribute('src');
          imgEl.style.display = 'none';
          fallbackEl.style.display = 'grid';
        }
      }
    
      function updateStatusChips() {
        if (!battle) return;
        const { p1, p2, stage } = battle;
    
        const buildChips = (fighter, side) => {
          const chips = [];
          const favored = (fighter.terrainBoost > 0) || (stage && stage.affinity === fighter.data.affinity);
          const penalized = stage && stage.penalizedAffinity && stage.penalizedAffinity === fighter.data.affinity;
          const pct = fighter.terrainBoost > 0 ? 30 : 15;
    
          if (favored) {
            chips.push(`<span class="status-chip status-chip--bonus">Bonus +${pct}%</span>`);
          }
          if (penalized) {
            chips.push(`<span class="status-chip status-chip--penalty">Penalización −15%</span>`);
          }
          return chips.join('');
        };
    
        statusP1.innerHTML = buildChips(p1, 'p1');
        statusP2.innerHTML = buildChips(p2, 'p2');
      }
    
      function updateHpBar(side) {
        if (!battle) return;
        const fighter = battle[side];
        const pct = Math.max(0, Math.min(1, fighter.hp / fighter.maxHp));
    
        const fill = side === 'p1' ? hpFillP1 : hpFillP2;
        const text = side === 'p1' ? hpTextP1 : hpTextP2;
    
        fill.style.width = `${pct * 100}%`;
    
        let state = 'high';
        if (pct <= HP_LOW_THRESHOLD) state = 'low';
        else if (pct <= HP_MID_THRESHOLD) state = 'mid';
    
        if (state === 'high') fill.removeAttribute('data-state');
        else fill.setAttribute('data-state', state);
    
        text.textContent = `${Math.max(0, fighter.hp)} / ${fighter.maxHp} HP`;
      }
    
      function toRoman(num) {
        const map = [
          [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
        ];
        let n = num, out = '';
        for (const [v, s] of map) { while (n >= v) { out += s; n -= v; } }
        return out || 'I';
      }
    
      /* =========================================================
         MÓDULO 3 — CÁLCULO DE DAÑO
         ========================================================= */
      function getDurReduction(durability) {
        return DUR_REDUCTION[durability] ?? 0;
      }
    
      function getCritChance(precision) {
        return CRIT_CHANCE[precision] ?? 0.10;
      }
    
        /* =========================================================
     CÁLCULO DEL BONUS DE TERRENO
     - Bonus base: +15% si afinidad del Stand == afinidad del stage
     - Bonus de evento (Terreno Reclamado): sobrescribe a +30% vía
       fighter.terrainBoost (0.30) mientras el combate siga activo.
     ========================================================= */
     function getTerrainMultiplier(stand, fighter) {
      if (!battle || !battle.stage) {
        // Si no hay stage, solo aplica el boost de evento si existe
        if (fighter && typeof fighter.terrainBoost === 'number' && fighter.terrainBoost > 0) {
          return 1 + fighter.terrainBoost;
        }
        return 1;
      }
  
      const favored = battle.stage.affinity === stand.affinity;
      const penalized = battle.stage.penalizedAffinity && battle.stage.penalizedAffinity === stand.affinity;
  
      // El boost de evento (Terreno Reclamado) sobrescribe el +15% base
      if (fighter && typeof fighter.terrainBoost === 'number' && fighter.terrainBoost > 0) {
        return 1 + fighter.terrainBoost;
      }
  
      if (favored) return 1.15;
      if (penalized) return 0.85;
      return 1;
    }

    function hasStageBonus(stand, fighter) {
      if (!battle || !battle.stage) {
        if (fighter && typeof fighter.terrainBoost === 'number' && fighter.terrainBoost > 0) return true;
        return false;
      }
      if (fighter && typeof fighter.terrainBoost === 'number' && fighter.terrainBoost > 0) return true;
      return battle.stage.affinity === stand.affinity;
    }
  
    function hasStagePenalty(stand) {
      if (!battle || !battle.stage) return false;
      if (!battle.stage.penalizedAffinity) return false;
      return battle.stage.penalizedAffinity === stand.affinity;
    }
    
  function computeBasicAttackDamage(attacker, defender, attackerFighter) {
    const pwrBonus = PWR_BASIC_BONUS[attacker.stats.power] || 0;
    let damage = BASIC_ATTACK_BASE + pwrBonus;

    // Bonus de terreno (15% base, o 30% si Terreno Reclamado)
    const terrainMult = getTerrainMultiplier(attacker, attackerFighter);
    damage *= terrainMult;

    // Crítico
    const crit = Math.random() < getCritChance(attacker.stats.precision);
    if (crit) damage *= CRIT_MULTIPLIER;

    // Reducción por durabilidad del defensor
    damage *= (1 - getDurReduction(defender.stats.durability));

    return {
      damage: Math.max(1, Math.round(damage)),
      crit,
      bonusApplied: terrainMult > 1,
      terrainMult
    };
  }
    
  function computeSkillDamage(attacker, defender, ability, attackerFighter) {
    let damage = Number(ability.damage) || 30;

    const pwrBonus = PWR_BASIC_BONUS[attacker.stats.power] || 0;
    damage += pwrBonus * 0.6;

    // Bonus de terreno (15% base, o 30% si Terreno Reclamado)
    const terrainMult = getTerrainMultiplier(attacker, attackerFighter);
    damage *= terrainMult;

    // Crítico
    const crit = Math.random() < getCritChance(attacker.stats.precision);
    if (crit) damage *= CRIT_MULTIPLIER;

    // Reducción por durabilidad
    damage *= (1 - getDurReduction(defender.stats.durability));

    return {
      damage: Math.max(1, Math.round(damage)),
      crit,
      bonusApplied: terrainMult > 1,
      terrainMult
    };
  }
    
      /* =========================================================
     DAÑO PROYECTADO (solo para previsualización en UI)
     Aplica PWR + terreno + penalización, SIN crítico ni aleatoriedad.
     ========================================================= */
  function computeProjectedDamage(attacker, defender, ability, kind) {
    if (!attacker || !defender || !ability) return { damage: 0, mult: 1, pct: 0 };

    // Heal / Shield no tienen daño proyectado
    if (kind === 'heal' || kind === 'shield') {
      return { damage: 0, mult: 1, pct: 0 };
    }

    let base = Number(ability.damage) || 30;
    const pwrBonus = PWR_BASIC_BONUS[attacker.stats.power] || 0;
    base += pwrBonus * 0.6;

    // Multiplicador de terreno (respeta boost de evento si existe)
    const mult = getTerrainMultiplier(attacker, attacker.__fighterRef || null);
    let projected = base * mult;

    // Reducción por durabilidad del defensor
    projected *= (1 - getDurReduction(defender.stats.durability));

    const pct = Math.round((mult - 1) * 100);
    return {
      damage: Math.max(1, Math.round(projected)),
      mult,
      pct
    };
  }

        /* =========================================================
     SELECCIÓN DE ACCIÓN AUTOMÁTICA (IA / auto-play)
     - Si el Ataque Básico está bloqueado, solo habilidades
     - Fallback: si no hay habilidades disponibles, espera (pasa turno)
     ========================================================= */
      function pickAutomaticAction(side) {
        if (!battle) return null;
        const fighter = battle[side];
        const isBasicLocked = (battle.basicAttackLocked || 0) > 0;

        // Habilidades disponibles
        const availableSkills = [];
        fighter.cooldowns.forEach((cd, i) => {
          if (cd === 0 && fighter.data.abilities[i]) availableSkills.push(i);
        });

        if (isBasicLocked) {
          if (availableSkills.length > 0) {
            const pick = availableSkills[Math.floor(Math.random() * availableSkills.length)];
            return { type: 'skill', index: pick };
          }
          return null; // sin opciones → habrá que pasar turno
        }

        // Con básico disponible: 65% básico / 35% habilidad si hay
        const useBasic = Math.random() < 0.65 || availableSkills.length === 0;
        if (useBasic) return { type: 'basic' };
        const pick = availableSkills[Math.floor(Math.random() * availableSkills.length)];
        return { type: 'skill', index: pick };
      }
  

      /* =========================================================
         MÓDULO 3 — TURNO Y ACCIONES
         ========================================================= */
      function performAction(side, actionType, skillIndex = -1) {
        if (!battle || battle.finished || battle.busy) return;
        if (battle.activeSide !== side) return;
    
        battle.busy = true;
    
        const attackerSide = side;
        const defenderSide = side === 'p1' ? 'p2' : 'p1';
        const attacker = battle[attackerSide];
        const defender = battle[defenderSide];
    
        let actionName = '';
        let result = null;
    
        if (actionType === 'basic') {
          // Verificar bloqueo por evento
          if ((battle.basicAttackLocked || 0) > 0) {
            toast('¡Ataque Básico bloqueado por Silencio de Hierro!', 'error');
            battle.busy = false;
            return;
          }
          actionName = 'Ataque Básico';
          result = computeBasicAttackDamage(attacker.data, defender.data, attacker);
        } else if (actionType === 'skill') {
          const ability = attacker.data.abilities[skillIndex];
          if (!ability || attacker.cooldowns[skillIndex] > 0) {
            battle.busy = false;
            return;
          }
          actionName = ability.name || `Habilidad ${skillIndex + 1}`;
          const kind = ability.type || 'damage';
    
          // ---------- SEGUROS ANTI-CHISPAS (bloqueo sin gasto de turno) ----------
          if (kind === 'heal' && attacker.hp >= attacker.maxHp) {
            pushLog({
              side: attackerSide,
              type: '',
              html: `<span style="color:var(--ink-2);">⚠ <strong>${escapeHtml(attacker.data.standName)}</strong> intenta usar <em>${escapeHtml(actionName)}</em> pero su HP ya está al máximo. <strong>Acción cancelada.</strong></span>`
            });
            battle.busy = false;
            return; // ← NO consume turno, NO aplica cooldown
          }
    
          if (kind === 'shield' && attacker.shield) {
            pushLog({
              side: attackerSide,
              type: '',
              html: `<span style="color:var(--ink-2);">⚠ <strong>${escapeHtml(attacker.data.standName)}</strong> ya tiene un escudo activo. <strong>Acción cancelada.</strong></span>`
            });
            battle.busy = false;
            return; // ← NO consume turno, NO aplica cooldown
          }
    
          // ---------- HEAL ----------
          if (kind === 'heal') {
            const healPct = 0.22;
            const rawHeal = Math.round(attacker.maxHp * healPct);
            const before = attacker.hp;
            attacker.hp = Math.min(attacker.maxHp, attacker.hp + rawHeal);
            const healed = attacker.hp - before;
    
            attacker.cooldowns[skillIndex] = (Number(ability.cooldown) || 0) + 1;
    
            const selfEl = attackerSide === 'p1' ? fighterP1 : fighterP2;
            selfEl.classList.add('is-healing');
            setTimeout(() => selfEl.classList.remove('is-healing'), 1000);
    
            const healFloat = document.createElement('div');
            healFloat.className = 'damage-float damage-float--heal';
            healFloat.textContent = `+${healed}`;
            selfEl.appendChild(healFloat);
            setTimeout(() => healFloat.remove(), 1200);
    
            updateHpBar(attackerSide);
    
            const cryText = attacker.data.battleCry
              ? `<span class="log-entry__cry">“${escapeHtml(attacker.data.battleCry)}”</span>`
              : '';
            pushLog({
              side: attackerSide,
              type: 'heal',
              html: `<strong>${escapeHtml(attacker.data.standName)}</strong> usa <em>${escapeHtml(actionName)}</em> ` +
                    `y recupera <span style="color:var(--ready-hi);font-weight:700;">+${healed}</span> HP.` +
                    cryText
            });
    
            battle.busy = false;
            passTurn();
            return;
          }
    
          // ---------- SHIELD ----------
          if (kind === 'shield') {
            attacker.shield = true;
            attacker.cooldowns[skillIndex] = (Number(ability.cooldown) || 0) + 1;
    
            const selfEl = attackerSide === 'p1' ? fighterP1 : fighterP2;
            selfEl.classList.add('is-shielding', 'has-shield');
            setTimeout(() => selfEl.classList.remove('is-shielding'), 1000);
    
            const cryText = attacker.data.battleCry
              ? `<span class="log-entry__cry">“${escapeHtml(attacker.data.battleCry)}”</span>`
              : '';
            pushLog({
              side: attackerSide,
              type: 'shield',
              html: `<strong>${escapeHtml(attacker.data.standName)}</strong> activa <em>${escapeHtml(actionName)}</em> ` +
                    `y entra en <span style="color:var(--accent-cyan);font-weight:700;">guarda defensiva</span>. ` +
                    `El próximo daño recibido se reducirá un 50%.` +
                    cryText
            });
    
            battle.busy = false;
            passTurn();
            return;
          }
    
          // ---------- DAMAGE (default) ----------
          // Chequeo de Precisión
          const acc = clampNumber(ability.accuracy, 10, 100, 100);
          const roll = Math.random() * 100;
    
          if (roll > acc) {
            // FALLO POR PRECISIÓN: consume turno, aplica cooldown, no aplica daño ni animación de impacto
            attacker.cooldowns[skillIndex] = (Number(ability.cooldown) || 0) + 1;
    
            const attackerEl = attackerSide === 'p1' ? fighterP1 : fighterP2;
            attackerEl.classList.add('is-attacking');
            setTimeout(() => attackerEl.classList.remove('is-attacking'), 500);
    
            const cryText = attacker.data.battleCry
              ? `<span class="log-entry__cry">“${escapeHtml(attacker.data.battleCry)}”</span>`
              : '';
            pushLog({
              side: attackerSide,
              type: 'miss',
              html: `<strong>${escapeHtml(attacker.data.standName)}</strong> intenta <em>${escapeHtml(actionName)}</em> ` +
                    `pero <span style="color:#b8b8b8;font-weight:700;">falla por precisión (${Math.round(acc)}% requerido).</span>` +
                    cryText
            });
    
            battle.busy = false;
            passTurn();
            return;
          }
    
          // Ataque exitoso
          result = computeSkillDamage(attacker.data, defender.data, ability, attacker);
          attacker.cooldowns[skillIndex] = (Number(ability.cooldown) || 0) + 1;
        }
    
        // Ejecutar visualmente
        const attackerEl = attackerSide === 'p1' ? fighterP1 : fighterP2;
        const defenderEl = defenderSide === 'p1' ? fighterP1 : fighterP2;
        const defenderSpriteWrap = defenderSide === 'p1' ? fighterP1 : fighterP2;
    
        attackerEl.classList.add('is-attacking');
        setTimeout(() => attackerEl.classList.remove('is-attacking'), 500);
    
        setTimeout(() => {
                // Aplicar daño — con posible reducción por escudo
      let finalDamage = result.damage;
      const defenderEl = defenderSide === 'p1' ? fighterP1 : fighterP2;

      if (defender.shield) {
        finalDamage = Math.round(finalDamage * 0.5);
        defender.shield = false; // se consume al primer golpe
        defenderEl.classList.remove('has-shield');
        pushLog({
          side: defenderSide,
          type: 'shield',
          html: `<span style="color:var(--accent-cyan);font-weight:700;">🛡 Guardia de ${escapeHtml(defender.data.standName)}</span> absorbe la mitad del impacto.`
        });
      }

      defender.hp = Math.max(0, defender.hp - finalDamage);
      attacker.totalDamage += finalDamage;

          // Persistir daño del torneo en el roster
          const attackerIdx = roster.findIndex((s) => s.id === attacker.data.id);
          if (attackerIdx >= 0) {
            roster[attackerIdx].tournamentDamage =
              (roster[attackerIdx].tournamentDamage || 0) + result.damage;
          }
    
          // Visual de impacto
          defenderEl.classList.add('is-hit');
          if (result.crit) defenderEl.classList.add('is-crit');
          setTimeout(() => {
            defenderEl.classList.remove('is-hit');
            defenderEl.classList.remove('is-crit');
          }, 650);
    
          // Número flotante de daño
            showDamageFloat(defenderEl, finalDamage, result.crit);
    
          // Actualizar UI
          updateHpBar(defenderSide);
    
          // Log
          const cryText = attacker.data.battleCry
            ? `<span class="log-entry__cry">“${escapeHtml(attacker.data.battleCry)}”</span>`
            : '';
          const bonusPct = result.terrainMult
            ? Math.round((result.terrainMult - 1) * 100)
            : 0;
          let bonusTag = '';
          if (bonusPct > 0) {
            bonusTag = ` <span style="color:var(--ready-hi);font-weight:700;">[+${bonusPct}% Terreno]</span>`;
          } else if (bonusPct < 0) {
            bonusTag = ` <span style="color:#ff8a70;font-weight:700;">[${bonusPct}% Terreno]</span>`;
          }
          const critTag = result.crit
            ? ' <span style="color:var(--danger-hi);font-weight:700;">¡CRÍTICO!</span>'
            : '';
    
            pushLog({
              side: attackerSide,
              type: result.crit ? 'crit' : (result.bonusApplied ? 'bonus' : ''),
              html: `<strong>${escapeHtml(attacker.data.standName)}</strong> usa <em>${escapeHtml(actionName)}</em> ` +
                    `causando <span class="log-entry__dmg${result.crit ? ' log-entry__dmg--crit' : ''}">${finalDamage}</span> de daño.` +
                    bonusTag + critTag + cryText
            });
    
          // ¿K.O.?
          if (defender.hp <= 0) {
            battle.finished = true;
            const winnerSide = attackerSide;
            const winner = battle[winnerSide];
    
            pushLog({
              side: winnerSide,
              type: 'ko',
              html: `¡K.O.! <strong>${escapeHtml(winner.data.standName)}</strong> se alza con la victoria.`
            });
    
            renderBattleUI();
            updateActionPanel();
            setTimeout(() => showVictoryModal(winnerSide), 900);
            battle.busy = false;
            return;
          }
    
          // Pasar turno
          passTurn();
    
          battle.busy = false;
        }, 320);
      }
    
      function showDamageFloat(wrapEl, value, crit) {
        const el = document.createElement('div');
        el.className = 'damage-float' + (crit ? ' damage-float--crit' : '');
        el.textContent = `-${value}`;
        wrapEl.appendChild(el);
        setTimeout(() => el.remove(), 1200);
      }
    
      function passTurn() {
        if (!battle || battle.finished) return;
    
        const previous = battle.activeSide;
        const next = previous === 'p1' ? 'p2' : 'p1';
    
        // Avanzar turno
        battle.activeSide = next;
        battle.turn += 1;
        if (battle.turn % 2 === 1) battle.round += 1;
    
        // =========================================================
         // DECREMENTO DE COOLDOWNS
         // Se aplica al jugador QUE VA A ACTUAR AHORA (no al que acaba de jugar).
         //
         // Semántica por valor de `cdCurrent` (ya guardado como CD+1 al usar):
         //   cdCurrent = 0 → disponible
         //   cdCurrent = 1 → bloqueada (este turno propio la consume)
         //   cdCurrent = N → bloqueada durante N turnos propios
         //
         // Ejemplo CD 5:
         //   T1 uso → cdCurrent = 6
         //   T2 inicio → 5 (bloq.) · T3 inicio → 4 · T4 inicio → 3
         //   T5 inicio → 2 · T6 inicio → 1 · T7 inicio → 0 (disponible)
         //   → Esperó exactamente 5 turnos propios. ✓
         // =========================================================
        const incoming = battle[next];
        incoming.cooldowns = incoming.cooldowns.map((cd) => {
          const n = Number(cd) || 0;
          return n > 0 ? n - 1 : 0;
        });
    
        // Consumir bloqueo de Ataque Básico (Silencio de Hierro)
        if ((battle.basicAttackLocked || 0) > 0) {
          battle.basicAttackLocked = Math.max(0, battle.basicAttackLocked - 1);
          if (battle.basicAttackLocked === 0) {
            battle.basicAttackLockedBy = null;
            pushLog({
              side: null,
              type: 'bonus',
              html: `<span style="color:var(--ready-hi);font-weight:700;">✓ Silencio de Hierro disipado.</span> Ataque Básico disponible de nuevo.`
            });
          }
        }
    
        // Refrescar
        renderBattleUI();
        updateActionPanel();
        announceTurn();
    
        // Evaluar evento tras el cambio de turno
        if (window.JJA_EventsRoulette && battle) {
          window.JJA_EventsRoulette.maybeTriggerEvent(battle);
        }
      }
      
      function announceTurn() {
        if (!battle || battle.finished) return;
        const active = battle.activeSide === 'p1' ? battle.p1 : battle.p2;
        turnBannerText.textContent = `TURNO DE ${active.data.standName.toUpperCase()}`;
        turnBanner.hidden = false;
    
        // Reiniciar animación (forzar reflow)
        turnBanner.style.animation = 'none';
        void turnBanner.offsetWidth;
        turnBanner.style.animation = '';
    
        // Ocultar tras la nueva duración (≈1.7s)
        if (announceTurn._t) clearTimeout(announceTurn._t);
        announceTurn._t = setTimeout(() => { turnBanner.hidden = true; }, 1700);
      }
    
      /* =========================================================
         MÓDULO 3 — PANEL DE ACCIONES
         ========================================================= */
      function updateActionPanel() {
        if (!battle) return;
    
        if (battle.finished) {
          turnLabel.textContent = 'Combate Finalizado';
          turnTimer.textContent = '';
          disableAllActions();
          return;
        }
    
        const active = battle.activeSide === 'p1' ? battle.p1 : battle.p2;
        turnLabel.textContent = `Turno de ${active.data.standName}`;
        turnTimer.textContent = `Ronda ${toRoman(battle.round)}`;
    
            // Ataque básico — sujeto a bloqueo por eventos
    const isBasicLocked = (battle.basicAttackLocked || 0) > 0;

    if (isBasicLocked) {
      btnBasicAttack.disabled = true;
      btnBasicAttack.classList.add('is-locked');
      btnBasicAttack.title = '¡Bloqueado por Silencio de Hierro! Solo puedes usar habilidades.';
      basicAttackMeta.innerHTML =
        `<span style="color:var(--danger-hi);font-weight:700;">⛓ Bloqueado (${battle.basicAttackLocked} turno${battle.basicAttackLocked > 1 ? 's' : ''})</span>`;
    } else {
      btnBasicAttack.disabled = false;
      btnBasicAttack.classList.remove('is-locked');
      btnBasicAttack.removeAttribute('title');

      const defender = battle[battle.activeSide === 'p1' ? 'p2' : 'p1'];

      // Daño proyectado del básico
      const basicProj = computeProjectedDamage(
        { ...active.data, __fighterRef: active },
        defender.data,
        { damage: BASIC_ATTACK_BASE + (PWR_BASIC_BONUS[active.data.stats.power] || 0) },
        'damage'
      );

      if (basicProj.pct > 0) {
        basicAttackMeta.innerHTML = `${basicProj.damage} daño <span style="color:var(--ready-hi);font-weight:700;">(+${basicProj.pct}%)</span>`;
      } else if (basicProj.pct < 0) {
        basicAttackMeta.innerHTML = `${basicProj.damage} daño <span style="color:#ff8a70;font-weight:700;">(${basicProj.pct}%)</span>`;
      } else {
        basicAttackMeta.textContent = `${basicProj.damage} daño`;
      }
    }
    
        // Habilidades
        const skillBtns = [skillBtn0, skillBtn1, skillBtn2];
        const skillNames = [skillName0, skillName1, skillName2];
        const skillMetas = [skillMeta0, skillMeta1, skillMeta2];
    
        active.data.abilities.forEach((ability, idx) => {
          if (idx > 2) return;
          const btn = skillBtns[idx];
          const nameEl = skillNames[idx];
          const metaEl = skillMetas[idx];
    
          nameEl.textContent = ability.name || `Habilidad ${idx + 1}`;
    
          const cd = active.cooldowns[idx] || 0;
          if (cd > 0) {
            btn.disabled = true;
            metaEl.innerHTML = `⏳ Recarga: ${cd} turno${cd > 1 ? 's' : ''}`;
            metaEl.classList.add('action-btn__meta--cd');
            metaEl.classList.remove('action-btn__meta--ready');
            // Badge
            let badge = btn.querySelector('.action-btn__cd-badge');
            if (!badge) {
              badge = document.createElement('span');
              badge.className = 'action-btn__cd-badge';
              btn.appendChild(badge);
            }
            badge.textContent = cd;
          } else {
            btn.disabled = false;
            const kind = ability.type || 'damage';
            const acc = clampNumber(ability.accuracy, 10, 100, 100);
    
            if (kind === 'heal') {
              const healPct = 0.22;
              const estHeal = Math.round(active.maxHp * healPct);
              metaEl.innerHTML = `<span style="color:var(--ready-hi);font-weight:700;">+${estHeal} HP · Curación</span>`;
            } else if (kind === 'shield') {
              metaEl.innerHTML = `<span style="color:var(--accent-cyan);font-weight:700;">Defensa 50%</span>`;
            } else {
              // Daño proyectado con terreno
              const defender = battle[battle.activeSide === 'p1' ? 'p2' : 'p1'];
              const proj = computeProjectedDamage(
                { ...active.data, __fighterRef: active },
                defender.data,
                ability,
                'damage'
              );
    
              if (proj.pct > 0) {
                metaEl.innerHTML = `${proj.damage} daño <span style="color:var(--ready-hi);font-weight:700;">(+${proj.pct}%)</span> · ${acc}% Prec.`;
              } else if (proj.pct < 0) {
                metaEl.innerHTML = `${proj.damage} daño <span style="color:#ff8a70;font-weight:700;">(${proj.pct}%)</span> · ${acc}% Prec.`;
              } else {
                metaEl.innerHTML = `${proj.damage} daño · ${acc}% Prec.`;
              }
            }
    
            metaEl.classList.remove('action-btn__meta--cd');
            metaEl.classList.add('action-btn__meta--ready');
            const badge = btn.querySelector('.action-btn__cd-badge');
            if (badge) badge.remove();
          }
    
          // Rebind del handler (para no acumular listeners)
          btn.onclick = () => performAction(battle.activeSide, 'skill', idx);

          // Rebinding de tooltips (con datos del Stand activo actual)
          btn.onmouseenter = () => showSkillTooltip(btn, ability, idx);
          btn.onmouseleave = () => hideSkillTooltip();
          btn.onfocus = () => showSkillTooltip(btn, ability, idx);
          btn.onblur = () => hideSkillTooltip();

          // Si la habilidad está en cooldown, no mostramos tooltip de datos falsos
          if (cd > 0) {
            btn.onmouseenter = null;
            btn.onmouseleave = null;
            btn.onfocus = null;
            btn.onblur = null;
          }
        });
    
        // Rebind ataque básico
        btnBasicAttack.onclick = () => performAction(battle.activeSide, 'basic');
      }
    
      function disableAllActions() {
        btnBasicAttack.disabled = true;
        [skillBtn0, skillBtn1, skillBtn2].forEach((b) => { b.disabled = true; });
      }
    
      /* =========================================================
         MÓDULO 3 — LOG
         ========================================================= */
      function pushLog({ side, type = '', html }) {
        const el = document.createElement('div');
        const cls = ['log-entry'];
        if (side) cls.push(`log-entry--${side}`);
        if (type) cls.push(`log-entry--${type}`);
        el.className = cls.join(' ');
        el.innerHTML = html;
        battleLogStream.appendChild(el);
        battleLogStream.scrollTop = battleLogStream.scrollHeight;
      }
    
      /* =========================================================
         MÓDULO 3 — MODAL DE VICTORIA
         ========================================================= */
         function showVictoryModal(winnerSide) {
            if (!battle) return;
            const winner = battle[winnerSide];
            const loserSide = winnerSide === 'p1' ? 'p2' : 'p1';
            const loser = battle[loserSide];
        
            // Marcar al perdedor como derrotado (solo Battle Royale)
            markDefeated(loser.data.id);

            // Persistir el HP con el que sobrevivió el ganador
              const winnerIdx = roster.findIndex((s) => s.id === winner.data.id);
              if (winnerIdx >= 0) {
                roster[winnerIdx].lastHp = winner.hp;
              }
              saveRoster();
        
            victoryKicker.textContent = `K.O. · ${loser.data.standName} derrotado`;
            victoryTitle.textContent = '¡VICTORIA!';
            victoryStandName.textContent = winner.data.standName;
            victoryArtistName.textContent = `Artista: ${winner.data.artistName}`;
        
            if (winner.data.image) {
              victoryPortrait.src = winner.data.image;
              victoryPortrait.alt = winner.data.standName;
              victoryPortrait.style.display = 'block';
              victoryPortraitFallback.style.display = 'none';
            } else {
              victoryPortrait.removeAttribute('src');
              victoryPortrait.style.display = 'none';
              victoryPortraitFallback.style.display = 'grid';
            }
        
            victoryHp.textContent = `${winner.hp} / ${winner.maxHp}`;
            victoryTurns.textContent = String(battle.turn);
            victoryDamage.textContent = String(winner.totalDamage);
        
            // Battle Royale: avanzar ronda y refrescar estado
            if (currentMode === 'royale') {
              tournamentRound++;
              saveMode();
              updateTournamentStatus();
              renderGallery();
            }
        
            victoryBackdrop.hidden = false;
          }
    
      function closeVictoryModal() {
        victoryBackdrop.hidden = true;
      }
    
      /* =========================================================
         MÓDULO 3 — SALIDA / REVANCHA
         ========================================================= */
         function exitBattleToTournament() {
          hideSkillTooltip();
          if (window.JJA_EventsRoulette) {
            window.JJA_EventsRoulette.closeModal();
          }
            closeVictoryModal();
            battleView.hidden = true;
            tournamentView.hidden = false;                      // ← FIX: reaparece la vista torneo
            document.body.classList.remove('is-battling');      // ← FIX
        
            // Restaurar zonas de la vista torneo
            document.querySelector('.roulette-zone').hidden = false;
            document.querySelector('.roulette-stage').hidden = false;
            document.querySelector('.stage-manager').hidden = false;
            versusScreen.hidden = true;
        
            resetReels();
            btnSpinRoulette.disabled = false;
            isSpinning = false;
        
            battle = null;
            currentMatchup = null;
        
            window.scrollTo(0, 0);                              // ← FIX: scroll inmediato al volver
          }
    
          function rematchFlow() {
            hideSkillTooltip();
            closeVictoryModal();
            battleView.hidden = true;
            tournamentView.hidden = false;                      // ← FIX: mostrar torneo para el re-sorteo
            document.body.classList.remove('is-battling');      // ← FIX
        
            document.querySelector('.roulette-zone').hidden = false;
            document.querySelector('.roulette-stage').hidden = false;
            document.querySelector('.stage-manager').hidden = false;
            versusScreen.hidden = true;
        
            resetReels();
            btnSpinRoulette.disabled = false;
            isSpinning = false;
        
            battle = null;
            currentMatchup = null;
        
            window.scrollTo(0, 0);                              // ← FIX
        
            setTimeout(spinRoulette, 320);
          }
    
          function exitBattleToRoster() {
            hideSkillTooltip();
            if (window.JJA_EventsRoulette) {
              window.JJA_EventsRoulette.closeModal();
            }
            closeVictoryModal();
            battleView.hidden = true;
            tournamentView.hidden = true;                       // ← FIX: también se oculta al ir al roster
            rosterView.hidden = false;
            document.body.classList.remove('is-battling');      // ← FIX
        
            battle = null;
            currentMatchup = null;
        
            window.scrollTo(0, 0);                              // ← FIX: scroll inmediato al volver
          }
    
      /* =========================================================
         MÓDULO 3 — EVENTOS
         ========================================================= */
      function bindModule3Events() {
        btnExitBattle.addEventListener('click', () => {
          if (!battle || battle.finished) {
            exitBattleToTournament();
            return;
          }
          if (confirm('¿Abandonar el combate actual? Se perderá el progreso.')) {
            exitBattleToTournament();
          }
        });
    
        btnRematch.addEventListener('click', rematchFlow);
        btnBackToRosterFromVictory.addEventListener('click', exitBattleToRoster);
      }
    
      /* =========================================================
         MÓDULO 3 — INIT
         ========================================================= */
      function initModule3() {
        bindModule3Events();
      }

        /* =========================================================
     RADAR CHART — CONSTANTES
     ========================================================= */
  const RADAR_GRADES = { A: 5, B: 4, C: 3, D: 2, E: 1 };
  const RADAR_NONE = 0;
  const RADAR_AXES = ['power', 'speed', 'range', 'durability', 'precision', 'potential'];
  const RADAR_LABELS = {
    power: 'PWR',
    speed: 'SPD',
    range: 'RNG',
    durability: 'DUR',
    precision: 'PRC',
    potential: 'POT'
  };
  const RADAR_MAX = 5;

  /* =========================================================
     TOOLTIP — REFS DOM
     ========================================================= */
  const skillTooltip      = $('#skillTooltip');
  const tooltipIcon       = $('#tooltipIcon');
  const tooltipName       = $('#tooltipName');
  const tooltipType       = $('#tooltipType');
  const tooltipDesc       = $('#tooltipDesc');
  const tooltipDamage     = $('#tooltipDamage');
  const tooltipCd         = $('#tooltipCd');

  /* Refs radar en arena */
  const radarP1 = document.getElementById('radarP1');
  const radarP2 = document.getElementById('radarP2');

  /* =========================================================
     MÓDULO 2 — INIT
     ========================================================= */
     function initModule2() {
        loadStages();
        renderStages();
        populateStageAffinitySelect(); // ← primera carga del select de escenarios
        bindModule2Events();
      }

        /* =========================================================
     MÓDULO DUAL — CREACIÓN DE 2 STANDS A LA VEZ
     ========================================================= */
  const dualState = {
    A: { imageBase64: null, imageMime: null },
    B: { imageBase64: null, imageMime: null }
  };

  // Refs
  const dualModalBackdrop = $('#dualModalBackdrop');
  const btnAddDual        = $('#btnAddDual');
  const btnCloseDualModal = $('#btnCloseDualModal');
  const btnCancelDual     = $('#btnCancelDual');
  const btnSaveDual       = $('#btnSaveDual');

  /* =========================================================
     ARQUETIPO RÁPIDO (defaults balanceados)
     ========================================================= */
  const ARCHETYPE_ABILITY_POOL = [
    { name: 'Golpe Veloz',      type: 'damage', damage: 32, cooldown: 1, accuracy: 100, description: 'Ráfaga de golpes a velocidad luz.' },
    { name: 'Contraataque',     type: 'damage', damage: 40, cooldown: 2, accuracy: 95,  description: 'Aprovecha el descuido del rival.' },
    { name: 'Segundo Aliento',  type: 'heal',   damage: 15, cooldown: 3, accuracy: 100, description: 'Recupera fuerzas en pleno combate.' },
    { name: 'Guardia de Hierro',type: 'shield', damage: 15, cooldown: 2, accuracy: 100, description: 'Endurece la defensa contra el próximo golpe.' },
    { name: 'Onda Cortante',    type: 'damage', damage: 45, cooldown: 3, accuracy: 90,  description: 'Corte de energía a distancia.' },
    { name: 'Pulso Sanador',    type: 'heal',   damage: 15, cooldown: 3, accuracy: 100, description: 'Una onda recorre el Stand y lo repara.' }
  ];

  function pickRandomAbilities() {
    const pool = [...ARCHETYPE_ABILITY_POOL];
    const picks = [];
    for (let i = 0; i < 3 && pool.length; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      picks.push(pool.splice(idx, 1)[0]);
    }
    return picks;
  }

  function applyArchetypeToColumn(side) {
    const col = document.querySelector(`.dual-col[data-dual="${side}"]`);
    if (!col) return;

    // Stats balanceados
    col.querySelectorAll('.dual-stat').forEach((sel) => {
      sel.value = 'B';
    });

    // Afinidad aleatoria
    const affinities = ['Físico', 'Fuego', 'Agua', 'Hielo', 'Electricidad', 'Magnetismo', 'Tiempo', 'Gravedad', 'Veneno'];
    const affSel = col.querySelector('.dual-affinity');
    if (affSel) affSel.value = affinities[Math.floor(Math.random() * affinities.length)];

    // Habilidades balanceadas
    const abilities = pickRandomAbilities();
    col.querySelectorAll('.dual-ability').forEach((row, i) => {
      const ab = abilities[i];
      if (!ab) return;
      row.querySelector('.dual-ab-name').value = ab.name;
      row.querySelector('.dual-ab-type').value = ab.type;
      row.querySelector('.dual-ab-damage').value = ab.damage;
      row.querySelector('.dual-ab-cd').value = ab.cooldown;
      row.querySelector('.dual-ab-acc').value = ab.accuracy;
    });

    // Nombres placeholder para que no queden vacíos
    const artistInput = col.querySelector('.dual-artist');
    const nameInput = col.querySelector('.dual-name');
    if (!artistInput.value) artistInput.value = `Artista ${side}`;
    if (!nameInput.value)   nameInput.value   = `Stand ${side}`;

    toast(`Arquetipo rápido aplicado a Stand ${side}.`, 'success');
  }

  /* =========================================================
     ABRIR / CERRAR
     ========================================================= */
  function resetDualForm() {
    const modal = dualModalBackdrop;
    if (!modal) return;

    // Reset inputs de cada columna
    ['A', 'B'].forEach((side) => {
      const col = modal.querySelector(`.dual-col[data-dual="${side}"]`);
      if (!col) return;

      col.querySelectorAll('input[type="text"]').forEach((i) => { i.value = ''; });
      col.querySelectorAll('input[type="number"]').forEach((i) => {
        if (i.classList.contains('dual-ab-damage')) i.value = 30;
        else if (i.classList.contains('dual-ab-cd')) i.value = 1;
        else if (i.classList.contains('dual-ab-acc')) i.value = 100;
      });
      col.querySelectorAll('.dual-stat').forEach((s) => { s.value = 'B'; });
      const affSel = col.querySelector('.dual-affinity');
      if (affSel) affSel.value = 'Físico';
      col.querySelectorAll('.dual-ability').forEach((row) => {
        row.querySelector('.dual-ab-type').value = 'damage';
      });

      // Reset preview
      const imgEl = col.querySelector('.dual-preview-img');
      const phEl  = col.querySelector('.tarot-preview__placeholder');
      if (imgEl) { imgEl.src = ''; imgEl.hidden = true; }
      if (phEl)  phEl.hidden = false;
    });

    dualState.A = { imageBase64: null, imageMime: null };
    dualState.B = { imageBase64: null, imageMime: null };
  }

  function openDualModal() {
    resetDualForm();
    dualModalBackdrop.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeDualModal() {
    dualModalBackdrop.hidden = true;
    document.body.style.overflow = '';
    resetDualForm();
  }

  /* =========================================================
     RECOLECCIÓN DE UNA COLUMNA
     ========================================================= */
  function collectDualColumn(side) {
    const col = document.querySelector(`.dual-col[data-dual="${side}"]`);
    if (!col) return null;

    const stats = {};
    col.querySelectorAll('.dual-stat').forEach((sel) => {
      stats[sel.dataset.stat] = sel.value;
    });

    const abilities = Array.from(col.querySelectorAll('.dual-ability')).map((row) => ({
      name: (row.querySelector('.dual-ab-name').value || '').trim(),
      type: row.querySelector('.dual-ab-type').value,
      damage: clampNumber(row.querySelector('.dual-ab-damage').value, 15, 60, 30),
      cooldown: clampNumber(row.querySelector('.dual-ab-cd').value, 0, 5, 1),
      accuracy: clampNumber(row.querySelector('.dual-ab-acc').value, 10, 100, 100),
      description: ''
    }));

    return {
      artistName: (col.querySelector('.dual-artist').value || '').trim(),
      standName: (col.querySelector('.dual-name').value || '').trim(),
      affinity: col.querySelector('.dual-affinity').value,
      battleCry: '',
      stats,
      abilities,
      image: dualState[side].imageBase64 || null,
      imageMime: dualState[side].imageMime || null
    };
  }

  /* =========================================================
     GUARDAR AMBOS
     ========================================================= */
  function saveDualStands() {
    const dataA = collectDualColumn('A');
    const dataB = collectDualColumn('B');

    // Validaciones
    const errors = [];
    if (!dataA.artistName) errors.push('Stand A: falta el nombre del artista.');
    if (!dataA.standName)  errors.push('Stand A: falta el nombre del Stand.');
    if (!dataB.artistName) errors.push('Stand B: falta el nombre del artista.');
    if (!dataB.standName)  errors.push('Stand B: falta el nombre del Stand.');

    if (errors.length) {
      toast(errors[0], 'error');
      return;
    }

    if (roster.length + 2 > MAX_PARTICIPANTS) {
      toast(`No caben 2 Stands más. Límite ${MAX_PARTICIPANTS}.`, 'error');
      return;
    }

    // Construir los dos payloads con los campos de torneo por defecto
    const buildPayload = (data) => ({
      id: uid(),
      artistName: data.artistName,
      standName: data.standName,
      affinity: data.affinity,
      battleCry: data.battleCry || '',
      stats: data.stats,
      abilities: data.abilities,
      image: data.image,
      imageMime: data.imageMime,
      level: DEFAULT_LEVEL,
      isDefeated: false,
      defeatedAt: null,
      lastHp: null,
      tournamentDamage: 0,
      tournamentBattles: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    roster.push(buildPayload(dataA));
    roster.push(buildPayload(dataB));

    // Asegurar que las afinidades personalizadas se registren si hicieran falta
    // (aquí solo manejamos las base; si el usuario añade custom lo hará vía edición individual)

    saveRoster();
    renderCounter();
    renderGallery();

    toast(`¡${dataA.standName} y ${dataB.standName} añadidos al roster!`, 'success');
    closeDualModal();
  }

  /* =========================================================
     EVENTOS DEL MODAL DUAL
     ========================================================= */
  function bindDualEvents() {
    if (!btnAddDual) return;

    btnAddDual.addEventListener('click', openDualModal);
    btnCloseDualModal.addEventListener('click', closeDualModal);
    btnCancelDual.addEventListener('click', closeDualModal);
    btnSaveDual.addEventListener('click', saveDualStands);

    dualModalBackdrop.addEventListener('click', (e) => {
      if (e.target === dualModalBackdrop) closeDualModal();
    });

    // Arquetipo rápido por columna
    dualModalBackdrop.querySelectorAll('[data-archetype]').forEach((btn) => {
      btn.addEventListener('click', () => applyArchetypeToColumn(btn.dataset.archetype));
    });

    // Imágenes
    ['A', 'B'].forEach((side) => {
      const input = document.getElementById(`dualImage${side}`);
      const imgEl = document.getElementById(`dualImg${side}`);
      const phEl  = document.getElementById(`dualPlaceholder${side}`);
      if (!input) return;

      input.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        if (!/^image\//.test(file.type)) {
          toast('El archivo debe ser una imagen.', 'error');
          e.target.value = '';
          return;
        }
        const MAX_MB = 4;
        if (file.size > MAX_MB * 1024 * 1024) {
          toast(`La imagen supera ${MAX_MB} MB.`, 'error');
          e.target.value = '';
          return;
        }
        try {
          const { dataUrl, mime } = await readImageAsBase64(file);
          dualState[side].imageBase64 = dataUrl;
          dualState[side].imageMime = mime;
          imgEl.src = dataUrl;
          imgEl.hidden = false;
          if (phEl) phEl.hidden = true;
        } catch (err) {
          console.error(err);
          toast('No se pudo procesar la imagen.', 'error');
        }
      });
    });

    // ESC cierra
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !dualModalBackdrop.hidden) closeDualModal();
    });
  }
    /* =========================================================
       INIT
       ========================================================= */
       function init() {
        loadRoster();
        renderCounter();
        renderGallery();
        updateReadyButton();
        bindEvents();
        initModule2();
        initModule3();
        initModule4();
        initEventsConfig();
        bindDualEvents(); // ← NUEVO
      }
    
      function initEventsConfig() {
        const radios = document.querySelectorAll('input[name="eventFreq"]');
        const numInput = document.getElementById('eventEveryRounds');
        if (!radios.length || !window.JJA_EventsRoulette) return;
    
        // Sincronizar UI con config persistida
        const cfg = window.JJA_EventsRoulette.getConfig();
        radios.forEach((r) => { r.checked = r.value === cfg.frequency; });
        if (numInput) numInput.value = cfg.dynamicEveryRounds;
    
        // Listeners
        radios.forEach((r) => {
          r.addEventListener('change', () => {
            if (r.checked) {
              window.JJA_EventsRoulette.setFrequency(r.value, Number(numInput?.value));
            }
          });
        });
        if (numInput) {
          numInput.addEventListener('change', () => {
            const active = document.querySelector('input[name="eventFreq"]:checked');
            window.JJA_EventsRoulette.setFrequency(
              active ? active.value : 'perBattle',
              Number(numInput.value)
            );
          });
        }
      }
  
        /* =========================================================
     APLICACIÓN DE EVENTO AL COMBATE ACTIVO
     Llamada por JJA_EventsRoulette.applySelected()
     ========================================================= */
  function applyEventToBattle(event) {
    if (!battle || battle.finished) {
      toast('No hay combate activo para aplicar el evento.', 'error');
      return;
    }
    if (!event || typeof event.apply !== 'function') {
      toast('Evento inválido.', 'error');
      return;
    }

    // Guardar snapshot para mostrar deltas visuales
    const before = {
      p1Hp: battle.p1.hp,
      p2Hp: battle.p2.hp
    };

    // Aplicar el efecto (muta battle)
    const result = event.apply(battle) || {};

    // Refrescar barras de HP
    updateHpBar('p1');
    updateHpBar('p2');

    // Refrescar panel de acciones (por si hubo cambios de cooldown)
    updateActionPanel();
    renderBattleUI();

    // Feedback visual: sacudida a los afectados por daño
    const side = result.side || 'both';
    if (side === 'p1' || side === 'both') {
      fighterP1.classList.add('is-hit');
      setTimeout(() => fighterP1.classList.remove('is-hit'), 600);
    }
    if (side === 'p2' || side === 'both') {
      fighterP2.classList.add('is-hit');
      setTimeout(() => fighterP2.classList.remove('is-hit'), 600);
    }

    // Números flotantes si hubo daño o cura
    const ex = result.extra || {};
    if (ex.type === 'damage-both') {
      showDamageFloat(fighterP1, ex.dmgP1, false);
      showDamageFloat(fighterP2, ex.dmgP2, false);
    } else if (ex.type === 'karma') {
      // El más fuerte recibe daño; el más débil recibe cura (mostrar como daño negativo)
      const p1PctBefore = before.p1Hp / battle.p1.maxHp;
      const p2PctBefore = before.p2Hp / battle.p2.maxHp;
      const strongerIsP1 = p1PctBefore >= p2PctBefore;
      showDamageFloat(strongerIsP1 ? fighterP1 : fighterP2, ex.dmg, false);
      const healEl = strongerIsP1 ? fighterP2 : fighterP1;
      const healFloat = document.createElement('div');
      healFloat.className = 'damage-float damage-float--heal';
      healFloat.textContent = `+${ex.healed}`;
      healEl.appendChild(healFloat);
      setTimeout(() => healFloat.remove(), 1200);
    }

    // Log en el battle log
    pushLog({
      side: side === 'p1' ? 'p1' : side === 'p2' ? 'p2' : null,
      type: 'bonus',
      html: `<span style="color:var(--accent-magenta);font-weight:700;">🌪 ${escapeHtml(event.name)}</span> — ${result.log || event.short}`
    });

    // Verificar si el evento causó un K.O.
    if (battle.p1.hp <= 0 || battle.p2.hp <= 0) {
      battle.finished = true;
      const winnerSide = battle.p1.hp <= 0 ? 'p2' : 'p1';
      const winner = battle[winnerSide];
      pushLog({
        side: winnerSide,
        type: 'ko',
        html: `¡K.O. por evento! <strong>${escapeHtml(winner.data.standName)}</strong> gana el combate.`
      });
      renderBattleUI();
      updateActionPanel();
      setTimeout(() => showVictoryModal(winnerSide), 900);
    }
  }

    document.addEventListener('DOMContentLoaded', init);
      /* =========================================================
     API PÚBLICA PARA MÓDULOS EXTERNOS (events-roulette.js)
     ========================================================= */
  window.JJA_App = {
    getBattle: () => battle,
    applyEventToBattle: applyEventToBattle
  };
  })();