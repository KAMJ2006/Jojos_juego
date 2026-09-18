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
    currentMode = mode;
    saveMode();
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
      return rest;
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

    const hp = computeHP(survivor.stats.durability, survivor.level || DEFAULT_LEVEL);
    championHp.textContent = `${hp} / ${hp}`;
    championBattles.textContent = String(tournamentRound);
    championDamage.textContent = '—';

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
  
    function saveRoster() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(roster));
      } catch (err) {
        console.error('[JoJo Roster] Error al guardar localStorage:', err);
        toast('No se pudo guardar en localStorage. ¿Cuota excedida?', 'error');
      }
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
  
      const chipsMarkup = STAT_KEYS.map((k) => {
        const grade = stand.stats[k];
        return `
          <div class="stat-chip" data-grade="${escapeHtml(grade)}" title="${escapeHtml(STAT_LABEL[k])}: ${escapeHtml(grade)}">
            <span class="stat-chip__label">${STAT_SHORT[k]}</span>
            <span class="stat-chip__value">${escapeHtml(grade)}</span>
          </div>`;
      }).join('');
  
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
          <div class="stat-chips">${chipsMarkup}</div>
          <div class="stand-card__actions">
            <button type="button" class="btn btn--ghost" data-action="edit">✎ Editar</button>
            <button type="button" class="btn btn--danger" data-action="delete">✕ Eliminar</button>
          </div>
        </div>
      `;
  
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
        const dmg = block.querySelector('.ability-damage');
        const cd  = block.querySelector('.ability-cooldown');
        if (dmg) dmg.value = 30;
        if (cd)  cd.value = 1;
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
      }
    }
  
    function collectForm() {
      const stats = {};
      STAT_KEYS.forEach((k) => {
        const sel = $(`.field--stat select[data-stat="${k}"]`);
        stats[k] = sel ? sel.value : 'B';
      });
  
      const abilities = $$('.ability-block').map((block) => ({
        name: (block.querySelector('.ability-name')?.value || '').trim(),
        damage: clampNumber(block.querySelector('.ability-damage')?.value, 15, 60, 30),
        cooldown: clampNumber(block.querySelector('.ability-cooldown')?.value, 0, 3, 1),
        description: (block.querySelector('.ability-desc')?.value || '').trim()
      }));
  
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
        if (idx >= 0) roster[idx] = { ...roster[idx], ...payload };
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
            name: String(ab?.name || '').slice(0, 60),
            damage: clampNumber(ab?.damage, 15, 60, 30),
            cooldown: clampNumber(ab?.cooldown, 0, 3, 1),
            description: String(ab?.description || '').slice(0, 200)
          }))
        : [];
  
      while (abilities.length < 3) {
        abilities.push({ name: '', damage: 30, cooldown: 1, description: '' });
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
       EVENTOS
       ========================================================= */
    function bindEvents() {

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
      stages = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(stages)) stages = [];
    } catch (err) {
      console.error('[JoJo Roster] Error cargando escenarios:', err);
      stages = [];
    }
  }

  function saveStages() {
    try {
      localStorage.setItem(STAGES_KEY, JSON.stringify(stages));
    } catch (err) {
      console.error(err);
      toast('No se pudieron guardar los escenarios.', 'error');
    }
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

    card.innerHTML = `
      ${imgMarkup}
      <div class="stage-card__body">
        <h4 class="stage-card__name" title="${escapeHtml(stage.name)}">${escapeHtml(stage.name)}</h4>
        <span class="stage-card__mod">${escapeHtml(stage.affinity)}</span>
        <div class="stage-card__actions">
          <button type="button" class="btn btn--danger" data-action="delete">✕ Eliminar</button>
        </div>
      </div>
    `;

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
     function openStageModal() {
        resetStageForm();
        populateStageAffinitySelect(); // ← pobla base + personalizadas
        stageModalTitle.textContent = 'Nuevo Escenario';
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
    updateStagePreview();
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
      affinity: stageAffinityInput.value
    };
  }

  function upsertStage(data) {
    const payload = {
      id: uid(),
      name: data.name,
      affinity: data.affinity,
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
      abilities: (stand.abilities || []).map((a) => ({ ...a })),
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
    btnAddStage.addEventListener('click', openStageModal);

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
    btnSpinRoulette.addEventListener('click', spinRoulette);

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
          p1: { data: p1, hp: p1Hp, maxHp: p1Hp, cooldowns: [0, 0, 0], totalDamage: 0 },
          p2: { data: p2, hp: p2Hp, maxHp: p2Hp, cooldowns: [0, 0, 0], totalDamage: 0 },
          stage: stage || null,
          activeSide: determineInitiative(p1, p2),
          turn: 1,
          round: 1,
          log: [],
          finished: false,
          busy: false
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
    
        // Anunciar primer turno
        announceTurn();
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
        
            // Limpiar estados previos
            fighterP1.classList.remove('is-active', 'is-waiting', 'is-defeated');
            fighterP2.classList.remove('is-active', 'is-waiting', 'is-defeated');
        
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
    
        const p1Bonus = stage && stage.affinity === p1.data.affinity;
        const p2Bonus = stage && stage.affinity === p2.data.affinity;
    
        statusP1.innerHTML = p1Bonus
          ? '<span class="status-chip">Bonus +15%</span>'
          : '';
        statusP2.innerHTML = p2Bonus
          ? '<span class="status-chip">Bonus +15%</span>'
          : '';
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
    
      function hasStageBonus(stand) {
        if (!battle || !battle.stage) return false;
        return battle.stage.affinity === stand.affinity;
      }
    
      function computeBasicAttackDamage(attacker, defender) {
        const pwrBonus = PWR_BASIC_BONUS[attacker.stats.power] || 0;
        let damage = BASIC_ATTACK_BASE + pwrBonus;
    
        // Bonus de terreno
        if (hasStageBonus(attacker)) damage *= 1.15;
    
        // Crítico
        const crit = Math.random() < getCritChance(attacker.stats.precision);
        if (crit) damage *= CRIT_MULTIPLIER;
    
        // Reducción por durabilidad del defensor
        damage *= (1 - getDurReduction(defender.stats.durability));
    
        return {
          damage: Math.max(1, Math.round(damage)),
          crit,
          bonusApplied: hasStageBonus(attacker)
        };
      }
    
      function computeSkillDamage(attacker, defender, ability) {
        let damage = Number(ability.damage) || 30;
    
        // Añadir un pequeño modificador por PWR
        const pwrBonus = PWR_BASIC_BONUS[attacker.stats.power] || 0;
        damage += pwrBonus * 0.6;
    
        // Bonus de terreno
        if (hasStageBonus(attacker)) damage *= 1.15;
    
        // Crítico
        const crit = Math.random() < getCritChance(attacker.stats.precision);
        if (crit) damage *= CRIT_MULTIPLIER;
    
        // Reducción por durabilidad
        damage *= (1 - getDurReduction(defender.stats.durability));
    
        return {
          damage: Math.max(1, Math.round(damage)),
          crit,
          bonusApplied: hasStageBonus(attacker)
        };
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
          actionName = 'Ataque Básico';
          result = computeBasicAttackDamage(attacker.data, defender.data);
        } else if (actionType === 'skill') {
          const ability = attacker.data.abilities[skillIndex];
          if (!ability || attacker.cooldowns[skillIndex] > 0) {
            battle.busy = false;
            return;
          }
          actionName = ability.name || `Habilidad ${skillIndex + 1}`;
          result = computeSkillDamage(attacker.data, defender.data, ability);
          // Aplicar cooldown (guardamos CD + 1 para contar el turno actual como consumido)
          attacker.cooldowns[skillIndex] = (Number(ability.cooldown) || 0) + 1; // ← FIX
        } else {
          battle.busy = false;
          return;
        }
    
        // Ejecutar visualmente
        const attackerEl = attackerSide === 'p1' ? fighterP1 : fighterP2;
        const defenderEl = defenderSide === 'p1' ? fighterP1 : fighterP2;
        const defenderSpriteWrap = defenderSide === 'p1' ? fighterP1 : fighterP2;
    
        attackerEl.classList.add('is-attacking');
        setTimeout(() => attackerEl.classList.remove('is-attacking'), 500);
    
        setTimeout(() => {
          // Aplicar daño
          defender.hp = Math.max(0, defender.hp - result.damage);
          attacker.totalDamage += result.damage;
    
          // Visual de impacto
          defenderEl.classList.add('is-hit');
          if (result.crit) defenderEl.classList.add('is-crit');
          setTimeout(() => {
            defenderEl.classList.remove('is-hit');
            defenderEl.classList.remove('is-crit');
          }, 650);
    
          // Número flotante de daño
          showDamageFloat(defenderSpriteWrap, result.damage, result.crit);
    
          // Actualizar UI
          updateHpBar(defenderSide);
    
          // Log
          const cryText = attacker.data.battleCry
            ? `<span class="log-entry__cry">“${escapeHtml(attacker.data.battleCry)}”</span>`
            : '';
          const bonusTag = result.bonusApplied
            ? ' <span style="color:var(--ready-hi);font-weight:700;">[+15% Terreno]</span>'
            : '';
          const critTag = result.crit
            ? ' <span style="color:var(--danger-hi);font-weight:700;">¡CRÍTICO!</span>'
            : '';
    
          pushLog({
            side: attackerSide,
            type: result.crit ? 'crit' : (result.bonusApplied ? 'bonus' : ''),
            html: `<strong>${escapeHtml(attacker.data.standName)}</strong> usa <em>${escapeHtml(actionName)}</em> ` +
                  `causando <span class="log-entry__dmg${result.crit ? ' log-entry__dmg--crit' : ''}">${result.damage}</span> de daño.` +
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
    
        // Decrementar cooldowns del JUGADOR QUE VA A ACTUAR AHORA
        // (así el CD se cuenta en "sus propios turnos", no en los del rival)
        const incoming = battle[next];
        incoming.cooldowns = incoming.cooldowns.map((cd) => Math.max(0, cd - 1));
    
        // Refrescar
        renderBattleUI();
        updateActionPanel();
        announceTurn();
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
    
        // Ataque básico siempre disponible
        btnBasicAttack.disabled = false;
        const basicPwr = PWR_BASIC_BONUS[active.data.stats.power] || 0;
        const estDamage = Math.round((BASIC_ATTACK_BASE + basicPwr) * (hasStageBonus(active.data) ? 1.15 : 1));
        basicAttackMeta.textContent = `≈${estDamage} daño`;
    
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
            metaEl.innerHTML = `${ability.damage} daño · CD ${ability.cooldown}`;
            metaEl.classList.remove('action-btn__meta--cd');
            metaEl.classList.add('action-btn__meta--ready');
            const badge = btn.querySelector('.action-btn__cd-badge');
            if (badge) badge.remove();
          }
    
          // Rebind del handler (para no acumular listeners)
          btn.onclick = () => performAction(battle.activeSide, 'skill', idx);
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
     MÓDULO 2 — INIT
     ========================================================= */
     function initModule2() {
        loadStages();
        renderStages();
        populateStageAffinitySelect(); // ← primera carga del select de escenarios
        bindModule2Events();
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
        initModule4(); // ← NUEVO
      }
  
    document.addEventListener('DOMContentLoaded', init);
  })();