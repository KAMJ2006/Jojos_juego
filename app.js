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
    const DAMAGE_BY_POWER = {
      A: 20,
      B: 17.5,
      C: 15,
      D: 12.5,
      E: 10
    };
      // Mantenemos el alias por compatibilidad con otros módulos que aún lo usen
    const PWR_BASIC_BONUS = DAMAGE_BY_POWER;
    const BASE_DAMAGE_DEFAULT = 15;
    const HP_LOW_THRESHOLD = 0.30;
    const HP_MID_THRESHOLD = 0.60;

    const skillBtn3 = document.getElementById('skillBtn3');
    const skillBtn4 = document.getElementById('skillBtn4');
    const skillName3 = document.getElementById('skillName3');
    const skillName4 = document.getElementById('skillName4');
    const skillMeta3 = document.getElementById('skillMeta3');
    const skillMeta4 = document.getElementById('skillMeta4');
  
    const MAX_ABILITIES = 5;
    const MIN_ABILITIES = 1;
      /* =========================================================
     EFECTOS CANÓNICOS — MAPA POR ROL
     ========================================================= */
  const EFFECT_OPTIONS = {
    damage: [
      { value: 'direct', label: 'Impacto Directo',       desc: 'Daño regular sin efectos adicionales.' },
      { value: 'poison', label: 'Toxina / Veneno',       desc: 'Daño + estado veneno por 2 turnos.' },
      { value: 'stun',   label: 'Aturdimiento / Parálisis', desc: 'Daño ligero + probabilidad de aturdir.' }
    ],
    shield: [
      { value: 'shield_flat', label: 'Barrera / Armadura',    desc: 'Absorbe daño directo.' },
      { value: 'reflect',     label: 'Coraza Reflejante',     desc: 'Escudo que devuelve 30% del daño recibido.' }
    ],
    heal: [
      { value: 'heal',    label: 'Regeneración Vital',       desc: 'Restaura HP.' },
      { value: 'cleanse', label: 'Purificación de Miel',     desc: 'Elimina estados negativos y cura leve.' },
      { value: 'buff',    label: 'Crecimiento Progresivo',   desc: 'Aumenta permanentemente el daño +10%.' }
    ]
  };

  const DEFAULT_EFFECT_BY_ROLE = {
    damage: 'direct',
    shield: 'shield_flat',
    heal:   'heal'
  };

  const POISON_DURATION = 2;
  const POISON_RATIO    = 0.4;
  const CLEANSE_HEAL_PCT = 0.15;
  const BUFF_STEP       = 0.10;
  const REFLECT_RATIO   = 0.30;

    /* =========================================================
     MÓDULO 4 — CONSTANTES Y ESTADO
     ========================================================= */
    const MODE_KEY = 'jja_game_mode_v1';
    const ROUND_KEY = 'jja_tournament_round_v1';

    let currentMode = 'royale'; // 'royale' | 'free'
    let tournamentRound = 1;

      /* =========================================================
     MÓDULO 4 — ESTADOS DEL TORNEO
     ========================================================= */
  const STAND_STATE = {
    WAITING: 'waiting',
    WINNER:  'winner',
    RETIRED: 'retired'
  };

  const PHASE = {
    WAITING:   'waiting',   // Fase 1: emparejar entre WAITING
    WINNERS:   'winners',   // Fase 2: emparejar entre WINNER
    CHAMPION:  'champion'   // Fase 3: campeón coronado
  };

  let tournamentPhase = PHASE.WAITING;

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

  const btnResetTournamentHeader = $('#btnResetTournamentHeader');
  const btnWinnersRound          = $('#btnWinnersRound');
  const tournamentWinnerCount    = $('#tournamentWinnerCount');
  const tournamentPhaseEl        = $('#tournamentPhase');

      /* =========================================================
     MÓDULO 4 — MODO DE JUEGO
     ========================================================= */
  function loadMode() {
    const storedPhase = localStorage.getItem('jja_tournament_phase_v1');
    tournamentPhase = ['waiting', 'winners', 'champion'].includes(storedPhase)
      ? storedPhase
      : PHASE.WAITING;
    const stored = localStorage.getItem(MODE_KEY);
    currentMode = (stored === 'free' || stored === 'royale') ? stored : 'royale';
    tournamentRound = Number(localStorage.getItem(ROUND_KEY)) || 1;
  }

  function saveMode() {
    localStorage.setItem('jja_tournament_phase_v1', tournamentPhase);
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
      tournamentPhase = PHASE.WAITING;
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
      tournamentPhase = PHASE.WAITING;
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

    
    if (tournamentStatus) tournamentStatus.hidden = !isRoyale;
  }

  function updateTournamentStatus() {
    if (currentMode !== 'royale') {
      if (tournamentPhaseEl) tournamentPhaseEl.hidden = true;
      return;
    }
  // Función para descartar evoluciones Requiem y contar solo a los Stands base reales
  const isValidContender = (s) => {
    // Si tiene la propiedad isRequiem o el nombre dice Requiem, no cuenta como participante independiente
    if (s.isRequiem) return false;
    if (s.tier && s.tier.toLowerCase() === 'requiem') return false;
    // Si es una evolución vinculada
    if (s.parentStandId || s.isEvolution) return false;
    return true;
  };

  // Filtramos la lista para quedarnos ÚNICAMENTE con los luchadores principales
  const contenders = roster.filter(isValidContender);

  const waiting = contenders.filter(s => (s.tournamentState || STAND_STATE.WAITING) === STAND_STATE.WAITING).length;
  const winners = contenders.filter(s => s.tournamentState === STAND_STATE.WINNER).length;
  const retired = contenders.filter(s => (s.tournamentState || (s.isDefeated ? STAND_STATE.RETIRED : STAND_STATE.WAITING)) === STAND_STATE.RETIRED).length;

    tournamentAliveCount.textContent = String(waiting + winners); // "en pie"
    tournamentDefeatedCount.textContent = String(retired);
    if (tournamentWinnerCount) tournamentWinnerCount.textContent = String(winners);

    if (tournamentPhaseEl) {
      tournamentPhaseEl.hidden = false;
      let label = 'Fase: Emparejamiento abierto';
      let phaseKey = 'waiting';

      if (tournamentPhase === PHASE.WAITING) {
        label = `Fase: Emparejamiento abierto — ${waiting} en espera`;
        phaseKey = 'waiting';
      } else if (tournamentPhase === PHASE.WINNERS) {
        label = `Fase: Ronda de Ganadores — ${winners} en liza`;
        phaseKey = 'winners';
      } else if (tournamentPhase === PHASE.CHAMPION) {
        label = '¡Campeón coronado!';
        phaseKey = 'champion';
      }

      tournamentPhaseEl.textContent = label;
      tournamentPhaseEl.setAttribute('data-phase', phaseKey);
    }

    // Actualizar visibilidad del botón "Iniciar Ronda de Ganadores"
    if (btnWinnersRound) {
      const shouldShow = currentMode === 'royale' && tournamentPhase === PHASE.WAITING && (waiting <= 1) && (winners >= 1) && (winners + waiting) >= 2;
      btnWinnersRound.hidden = !shouldShow;
    }
  }

  /* =========================================================
     MÓDULO 4 — ELEGIBLES PARA LA RULETA
     ========================================================= */
     function getEligibleStands() {
      // Requiem NUNCA elegible para la ruleta
      const basePool = roster.filter((s) => !s.isRequiem);
  
      if (currentMode !== 'royale') {
        return basePool.slice();
      }
  
      if (tournamentPhase === PHASE.WAITING) {
        return basePool.filter((s) => {
          const state = s.tournamentState || (s.isDefeated ? STAND_STATE.RETIRED : STAND_STATE.WAITING);
          return state === STAND_STATE.WAITING;
        });
      }
  
      if (tournamentPhase === PHASE.WINNERS) {
        return basePool.filter((s) => s.tournamentState === STAND_STATE.WINNER);
      }
  
      return [];
    }

  /* =========================================================
     MÓDULO 4 — MARCAR K.O. (BATTLE ROYALE)
     ========================================================= */
     function markDefeated(loserId) {
      if (currentMode !== 'royale') return;
      const idx = roster.findIndex((s) => s.id === loserId);
      if (idx < 0) return;
      roster[idx].tournamentState = STAND_STATE.RETIRED;
      roster[idx].isDefeated = true;
      roster[idx].defeatedAt = Date.now();
      saveRoster();
    }
  
    function markWinner(winnerId) {
      if (currentMode !== 'royale') return;
      const idx = roster.findIndex((s) => s.id === winnerId);
      if (idx < 0) return;
      roster[idx].tournamentState = STAND_STATE.WINNER;
      saveRoster();
    }

    function checkTournamentEnd() {
      if (currentMode !== 'royale') return false;
  
      const waiting = roster.filter((s) => (s.tournamentState || STAND_STATE.WAITING) === STAND_STATE.WAITING).length;
      const winners = roster.filter((s) => s.tournamentState === STAND_STATE.WINNER).length;
      const retired = roster.filter((s) => s.tournamentState === STAND_STATE.RETIRED).length;
  
      // Fase 1 → Fase 2: ya no hay WAITING, hay 2+ WINNER
      if (tournamentPhase === PHASE.WAITING && waiting < 2 && winners >= 2) {
        tournamentPhase = PHASE.WINNERS;
        saveMode();
        pushTournamentNotice(`¡Fase de Ganadores! Quedan ${winners} aspirantes al título.`);
        return true;
      }
  
      // Fase 2 → Fase 3: solo queda 1 WINNER
      if (tournamentPhase === PHASE.WINNERS && winners <= 1) {
        tournamentPhase = PHASE.CHAMPION;
        saveMode();
        return true;
      }
  
      // Fase 1 → Fase 3 directa (por si acaso sólo hay 1 WAITING y 0 WINNER)
      if (tournamentPhase === PHASE.WAITING && waiting === 1 && winners === 0) {
        tournamentPhase = PHASE.CHAMPION;
        saveMode();
        return true;
      }
  
      return false;
    }
  
    function pushTournamentNotice(text) {
      // Reutilizamos el banner de turno si estamos en combate, o un toast si no
      if (typeof turnBannerText !== 'undefined' && turnBannerText && battleView && !battleView.hidden) {
        turnBannerText.textContent = text.toUpperCase();
        turnBanner.hidden = false;
        turnBanner.style.animation = 'none';
        void turnBanner.offsetWidth;
        turnBanner.style.animation = '';
        setTimeout(() => { turnBanner.hidden = true; }, 1700);
      } else {
        toast(text, 'success');
      }
    }

    function resetTournament() {
      roster = roster.map((s) => ({
        ...s,
        isDefeated: false,
        defeatedAt: null,
        tournamentState: STAND_STATE.WAITING,
        lastHp: null,
        tournamentDamage: 0,
        tournamentBattles: 0
      }));
      tournamentRound = 1;
      tournamentPhase = PHASE.WAITING;
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

  function startWinnersRound() {
    if (currentMode !== 'royale') return;
  
    // Filtrar solo los Stands reales (no evoluciones Requiem sueltas)
    const activeRoster = roster.filter(s => !s.isRequiem && !s.isEvolution);
  
    // Promover con pase directo (bye) al Stand impar en espera
    activeRoster.forEach(s => {
      if (s.tournamentState === STAND_STATE.WAITING) {
        s.tournamentState = STAND_STATE.WINNER;
      }
    });
  
    const contenders = activeRoster.filter(s => s.tournamentState === STAND_STATE.WINNER);
  
    // Si solo queda 1 participante real, es el CAMPEÓN DEFINITIVO
    if (contenders.length === 1) {
      if (typeof openChampionModal === 'function') {
        openChampionModal(contenders[0]);
      } else {
        championBackdrop.hidden = false;
      }
      toast(`¡${contenders[0].standName} ES EL ÚLTIMO EN PIE!`, 'success');
      return;
    }
  
    if (contenders.length < 2) {
      toast('No hay suficientes participantes para una nueva ronda.', 'error');
      return;
    }
  
    tournamentPhase = PHASE.WINNERS;
    saveMode();
    updateTournamentStatus();
    renderGallery();
  
    toast(`¡Ronda de Ganadores! ${contenders.length} aspirantes al título.`, 'success');
    if (btnWinnersRound) btnWinnersRound.hidden = true;
  }

  /* =========================================================
     MÓDULO 4 — EVENTOS
     ========================================================= */
  function bindModule4Events() {
    modeBtnRoyale.addEventListener('click', () => setMode('royale'));
    modeBtnFree.addEventListener('click', () => setMode('free'));

    if (btnResetTournamentHeader) {
      btnResetTournamentHeader.addEventListener('click', () => {
        if (!confirm('¿Reiniciar el torneo? Todos los estados volverán a WAITING.')) return;
        resetTournament();
      });
    }
    // Iniciar ronda de ganadores
    if (btnWinnersRound) {
      btnWinnersRound.addEventListener('click', startWinnersRound);
    }

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
     ADMIN — REVIVIR / REINCORPORAR UN STAND AL TORNEO
     ------------------------------------------------------------
     - Acepta: id del Stand | nombre del Stand | nombre del artista.
     - Restaura: tournamentState = WAITING, isDefeated = false,
       defeatedAt = null, HP al máximo, y opcionalmente reinicia
       los contadores de daño/combates si se solicita.
     - Persiste en localStorage. NO reinicia el torneo global.
     ========================================================= */
     function reviveStand(standIdOrName) {
      if (!standIdOrName) {
        toast('Indica un id, nombre de Stand o nombre de artista.', 'error');
        return null;
      }
  
      const needle = String(standIdOrName).trim();
      const lc = needle.toLowerCase();
  
      // Buscar por id, nombre de Stand o nombre de artista (case-insensitive)
      let idx = roster.findIndex((s) => s.id === needle);
      if (idx < 0) {
        idx = roster.findIndex((s) =>
          (s.standName || '').trim().toLowerCase() === lc ||
          (s.artistName || '').trim().toLowerCase() === lc
        );
      }
      // Fallback: coincidencia parcial por nombre de Stand
      if (idx < 0) {
        idx = roster.findIndex((s) =>
          (s.standName || '').toLowerCase().includes(lc)
        );
      }
  
      if (idx < 0) {
        toast(`No se encontró ningún Stand que coincida con "${needle}".`, 'error');
        return null;
      }
  
      const stand = roster[idx];
  
      // Restaurar estado de torneo
      stand.tournamentState = STAND_STATE.WAITING;
      stand.isDefeated = false;
      stand.defeatedAt = null;
  
      // Restaurar HP al máximo
      const maxHp = computeHP(stand.stats.durability, stand.level || DEFAULT_LEVEL);
      stand.lastHp = maxHp;
  
      // Refrescar updatedAt
      stand.updatedAt = Date.now();
  
      // Persistir sin reiniciar el torneo
      saveRoster();
      saveMode();
  
      // Refrescar UI
      renderGallery();
      updateTournamentStatus();
      updateReadyButton();
  
      toast(`🔄 ${stand.standName} (${stand.artistName}) reincorporado al torneo.`, 'success');
      console.log(`[ADMIN] Stand revivido: ${stand.standName} — estado WAITING, HP ${maxHp}/${maxHp}`);
      return stand;
    }
  
    /* Variante extendida: opcionalmente limpia daño/combates acumulados */
    function reviveStandClean(standIdOrName) {
      const stand = reviveStand(standIdOrName);
      if (!stand) return null;
      const idx = roster.findIndex((s) => s.id === stand.id);
      if (idx >= 0) {
        roster[idx].tournamentDamage = 0;
        roster[idx].tournamentBattles = 0;
        saveRoster();
        renderGallery();
        updateTournamentStatus();
      }
      return stand;
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

    const favorableChipsContainer = document.getElementById('favorableAffinityChips');
    const unfavorableChipsContainer = document.getElementById('unfavorableAffinityChips');

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

      /* =========================================================
     RENDER DE CHIPS DE AFINIDAD EN EL MODAL
     - Renderiza todas las afinidades disponibles (base + custom)
     - Marca las seleccionadas según los arreglos guardados
     ========================================================= */
  function populateStageAffinityChips(selectedFavorable, selectedUnfavorable) {
    const all = getAllAffinities();
    const favSet = new Set((selectedFavorable || []).map((s) => String(s).toLowerCase()));
    const unfavSet = new Set((selectedUnfavorable || []).map((s) => String(s).toLowerCase()));

    const renderInto = (container, set) => {
      if (!container) return;
      container.innerHTML = '';
      for (const aff of all) {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'affinity-chip' + (set.has(aff.toLowerCase()) ? ' is-selected' : '');
        chip.dataset.affinity = aff;
        chip.textContent = aff;
        chip.setAttribute('aria-pressed', String(set.has(aff.toLowerCase())));
        chip.addEventListener('click', () => {
          const isSel = chip.classList.toggle('is-selected');
          chip.setAttribute('aria-pressed', String(isSel));
        });
        container.appendChild(chip);
      }
    };

    renderInto(favorableChipsContainer, favSet);
    renderInto(unfavorableChipsContainer, unfavSet);
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
      try {
        const payload = JSON.stringify(stages);
        localStorage.setItem(STAGES_KEY, payload);
        return true;
      } catch (err) {
        console.error('[JoJo Roster] Error al guardar escenarios:', err);
        if (err && (err.name === 'QuotaExceededError' || err.code === 22 || err.code === 1014)) {
          toast('⚠ Cuota de almacenamiento excedida al guardar escenarios. Reduce el tamaño de las imágenes.', 'error');
        } else {
          toast('No se pudieron guardar los escenarios.', 'error');
        }
        return false;
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
     CÁLCULO DE HP — TABLA FIJA POR RANGO DE DURABILIDAD
     A: 200 · B: 165 · C: 135 · D: 110 · E: 95
     ========================================================= */
  const HP_BY_DURABILITY = {
    A: 200,
    B: 195,
    C: 190,
    D: 185,
    E: 180
  }

  const HP_DEFAULT = 190; // fallback si la DUR no es válida
  

  function computeHP(durability, level = DEFAULT_LEVEL) {
    const grade = String(durability || '').trim().toUpperCase();
    const base = HP_BY_DURABILITY[grade] ?? HP_DEFAULT;

    // El nivel añade un pequeño margen escalable sobre la base
    // (por defecto DEFAULT_LEVEL=1 → +0, para no alterar la tabla solicitada)
    const lv = clampNumber(level, 1, 99, DEFAULT_LEVEL);
    const levelBonus = (lv - 1) * 5;

    return base + levelBonus;
  }
  
    function computeDamageBonus(power) {
      return DMG_BONUS[power] ?? 0;
    }
  
    /* =========================================================
       RENDERIZADO
       ========================================================= */
       function renderCounter() {
        const baseCount = roster.filter((s) => !s.isRequiem).length;
        participantsEl.textContent = `Participantes: ${baseCount} / ${MAX_PARTICIPANTS}`;
      }
  
    function renderGallery() {
      if (!gallery) return;
  
      const baseStands = roster.filter((s) => !s.isRequiem);
      const requiemStands = roster.filter((s) => s.isRequiem);
  
      // --- Galería principal ---
      if (baseStands.length === 0) {
        gallery.innerHTML = '';
        emptyState.hidden = false;
      } else {
        emptyState.hidden = true;
        const frag = document.createDocumentFragment();
        for (const stand of baseStands) frag.appendChild(buildCard(stand));
        gallery.innerHTML = '';
        gallery.appendChild(frag);
      }
  
      // --- Galería Requiem ---
      const requiemSection = document.getElementById('requiemSection');
      const requiemGallery = document.getElementById('requiemGallery');
  
      if (requiemSection && requiemGallery) {
        if (requiemStands.length === 0) {
          requiemSection.hidden = true;
          requiemGallery.innerHTML = '';
        } else {
          requiemSection.hidden = false;
          const frag = document.createDocumentFragment();
          for (const stand of requiemStands) frag.appendChild(buildCard(stand));
          requiemGallery.innerHTML = '';
          requiemGallery.appendChild(frag);
        }
      }
  
      // Refrescar el contador (solo base)
      renderCounter();
    }
  
    function buildCard(stand) {
      const card = document.createElement('article');
      const state = stand.tournamentState || (stand.isDefeated ? STAND_STATE.RETIRED : STAND_STATE.WAITING);
  
      let stateBadge = '';
      let extraClass = '';
      if (stand.isRequiem) extraClass += ' is-requiem';
  
      if (currentMode === 'royale' && !stand.isRequiem) {
        if (state === STAND_STATE.RETIRED) {
          stateBadge = '<span class="stand-card__retired">RETIRED</span>';
          extraClass += ' is-defeated';
        } else if (state === STAND_STATE.WINNER) {
          stateBadge = '<span class="stand-card__winner">WINNER</span>';
          extraClass += ' is-winner';
        } else {
          stateBadge = '<span class="stand-card__waiting">WAITING</span>';
        }
      }
  
      // Badge Requiem si el stand base tiene una forma vinculada
      let requiemBadge = '';
      if (!stand.isRequiem && stand.requiemStandId) {
        const target = roster.find((r) => r.id === stand.requiemStandId);
        if (target && target.isRequiem) {
          requiemBadge = '<span class="stand-card__requiem-badge">✧ REQUIEM</span>';
        }
      }
  
      card.className = 'stand-card' + extraClass;
      card.dataset.id = stand.id;
  
      const imgSrc = stand.image || '';
      const imgMarkup = imgSrc
        ? `<img class="stand-card__image" src="${escapeHtml(imgSrc)}" alt="${escapeHtml(stand.standName)}">`
        : `<div class="stand-card__image stand-card__image--empty">🂠</div>`;
  
      const hp = computeHP(stand.stats.durability, stand.level || DEFAULT_LEVEL);
      const cry = stand.battleCry
        ? `<p class="stand-card__cry">“${escapeHtml(stand.battleCry)}”</p>`
        : '';
  
        card.innerHTML = `
        <div class="stand-card__frame">
          <!-- ESQUINA SUPERIOR IZQUIERDA: afinidad + HP apilados -->
          <div class="stand-card__top-left">
            <span class="stand-card__affinity">${escapeHtml(stand.affinity)}</span>
            <span class="stand-card__hp">❤️ ${hp}</span>
          </div>
  
          <!-- ESQUINA SUPERIOR DERECHA: estado de torneo -->
          ${stateBadge ? `<div class="stand-card__top-right">${stateBadge}</div>` : ''}
  
          <!-- SPRITE -->
          ${imgMarkup}
  
          <!-- PARTE INFERIOR: badge Requiem flotante -->
          ${requiemBadge ? `<div class="stand-card__bottom">${requiemBadge}</div>` : ''}
        </div>
        <div class="stand-card__body">
          <p class="stand-card__owner">${escapeHtml(stand.artistName)}</p>
          <h3 class="stand-card__name">${escapeHtml(stand.standName)}</h3>
          ${cry}
          <div class="radar-chart radar-chart--card" data-radar-for="${escapeHtml(stand.id)}"></div>
          <div class="stand-card__actions">
          <button type="button" class="btn btn--ghost" data-action="edit">✎ Editar</button>
          ${(state === STAND_STATE.RETIRED || stand.isDefeated) ? `
            <button type="button" class="btn btn--revive" data-action="revive" title="Reincorporar al torneo">🔄 Revivir</button>
          ` : ''}
          <button type="button" class="btn btn--danger" data-action="delete">✕ Eliminar</button>
        </div>
        </div>
      `;
  
      // Radar SVG
      const radarSlot = card.querySelector(`[data-radar-for="${stand.id}"]`);
      if (radarSlot) {
        renderRadarInto(radarSlot, stand.stats, { size: 100, compact: true });
      }
  
      card.querySelector('[data-action="edit"]').addEventListener('click', () => openModal(stand.id));
      card.querySelector('[data-action="delete"]').addEventListener('click', () => deleteStand(stand.id));
      card.querySelector('[data-action="edit"]').addEventListener('click', () => openModal(stand.id));
      card.querySelector('[data-action="delete"]').addEventListener('click', () => deleteStand(stand.id));
  
      // Bind del botón Revivir (solo si existe)
      const reviveBtn = card.querySelector('[data-action="revive"]');
      if (reviveBtn) {
        reviveBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          reviveStand(stand.id);
        });
      }
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
    
        $$('.field--stat select').forEach((sel) => { sel.value = 'B'; });
    
        if (customAffinityField) customAffinityField.hidden = true;
        if (customAffinityInput) customAffinityInput.value = '';
    
        $$('.ability-block').forEach((block, i) => {
          const nameEl = block.querySelector('.ability-name');
          const dmgEl  = block.querySelector('.ability-damage');
          const cdEl   = block.querySelector('.ability-cooldown');
          const descEl = block.querySelector('.ability-desc');
          const accEl  = block.querySelector('.ability-accuracy');
    
          if (nameEl) nameEl.value = '';
          if (dmgEl)  dmgEl.value  = 30;
          if (cdEl)   cdEl.value   = 1;
          if (descEl) descEl.value = '';
          if (accEl)  accEl.value  = 100;
    
          const typeRadios = block.querySelectorAll('.ability-type');
          typeRadios.forEach((r) => {
            r.checked = (r.value === 'damage');
            r.closest('.type-pill')?.classList.toggle('is-checked', r.checked);
          });
    
          // Reconstruir el select de efecto con las opciones de 'damage'
          rebuildEffectOptions(block, 'damage', 'direct');
    
          if (i >= 3) block.classList.add('is-empty');
        });
    
        const isRequiemEl = document.getElementById('standIsRequiem');
        const requiemField = document.getElementById('standRequiemTargetField');
        if (isRequiemEl) isRequiemEl.checked = false;
        populateRequiemTargetSelect('');
        if (requiemField) requiemField.hidden = false;
      }
        /* =========================================================
     RECONSTRUIR SELECTOR DE EFECTO SEGÚN EL ROL
     - role: 'damage' | 'heal' | 'shield'
     - selectedEffect: opcional, valor a preseleccionar
     ========================================================= */
  function rebuildEffectOptions(block, role, selectedEffect) {
    const sel = block.querySelector('.ability-effect-select');
    if (!sel) return;

    const options = EFFECT_OPTIONS[role] || EFFECT_OPTIONS.damage;
    sel.innerHTML = '';
    sel.setAttribute('data-role', role);

    for (const opt of options) {
      const el = document.createElement('option');
      el.value = opt.value;
      el.textContent = opt.label;
      el.title = opt.desc || '';
      sel.appendChild(el);
    }

    // Preseleccionar
    const validValues = options.map((o) => o.value);
    if (selectedEffect && validValues.includes(selectedEffect)) {
      sel.value = selectedEffect;
    } else {
      sel.value = DEFAULT_EFFECT_BY_ROLE[role] || options[0].value;
    }
  }
        /* =========================================================
     POBLAR SELECTOR DE VÍNCULO REQUIEM
     Lista solo stands base (no requiem) del roster, excluyendo
     el stand que se está editando actualmente.
     ========================================================= */
  function populateRequiemTargetSelect(selectedId = '') {
    const sel = document.getElementById('standRequiemTarget');
    if (!sel) return;

    const currentEditId = editingId;
    const candidates = roster.filter((s) => s.isRequiem && s.id !== currentEditId);

    sel.innerHTML = '<option value="">— Ninguna —</option>';
    for (const s of candidates) {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${s.standName} (${s.artistName})`;
      sel.appendChild(opt);
    }

    if (selectedId && candidates.some((c) => c.id === selectedId)) {
      sel.value = selectedId;
    }
  }
  
  function fillForm(stand) {
    artistNameInput.value = stand.artistName || '';
    standNameInput.value = stand.standName || '';
    battleCryInput.value = stand.battleCry || '';

    if (BASE_AFFINITIES.includes(stand.affinity)) {
      affinitySelect.value = stand.affinity;
      if (customAffinityField) customAffinityField.hidden = true;
      if (customAffinityInput) customAffinityInput.value = '';
    } else if (stand.affinity) {
      affinitySelect.value = '__custom__';
      if (customAffinityField) customAffinityField.hidden = false;
      if (customAffinityInput) customAffinityInput.value = stand.affinity;
    } else {
      affinitySelect.value = 'Físico';
      if (customAffinityField) customAffinityField.hidden = true;
    }

    STAT_KEYS.forEach((k) => {
      const sel = $(`.field--stat select[data-stat="${k}"]`);
      if (sel) sel.value = stand.stats[k] || 'B';
    });

    const blocks = $$('.ability-block');
    for (let i = 0; i < MAX_ABILITIES; i++) {
      const block = blocks[i];
      if (!block) continue;
      const ab = (stand.abilities && stand.abilities[i]) || {};

      const nameEl = block.querySelector('.ability-name');
      const dmgEl  = block.querySelector('.ability-damage');
      const cdEl   = block.querySelector('.ability-cooldown');
      const descEl = block.querySelector('.ability-desc');
      const accEl  = block.querySelector('.ability-accuracy');

      if (nameEl) nameEl.value = ab.name || '';
      if (dmgEl)  dmgEl.value  = ab.damage ?? 30;
      if (cdEl)   cdEl.value   = ab.cooldown ?? 1;
      if (descEl) descEl.value = ab.description || '';
      if (accEl)  accEl.value  = ab.accuracy ?? 100;

      const savedType = ab.type || 'damage';
      const typeRadios = block.querySelectorAll('.ability-type');
      typeRadios.forEach((r) => {
        r.checked = (r.value === savedType);
        r.closest('.type-pill')?.classList.toggle('is-checked', r.checked);
      });

      // Repoblar el select de efecto según el rol y seleccionar el guardado
      rebuildEffectOptions(block, savedType, ab.effect);

      if (i >= 3) block.classList.toggle('is-empty', !ab.name);
    }

    // Requiem
    const isRequiemEl = document.getElementById('standIsRequiem');
    const requiemField = document.getElementById('standRequiemTargetField');
    if (isRequiemEl) isRequiemEl.checked = !!stand.isRequiem;
    populateRequiemTargetSelect(stand.requiemStandId || '');
    if (requiemField) requiemField.hidden = !!stand.isRequiem;
  }
  
      function collectForm() {
        const stats = {};
        STAT_KEYS.forEach((k) => {
          const sel = $(`.field--stat select[data-stat="${k}"]`);
          stats[k] = sel ? sel.value : 'B';
        });
    
        const abilities = $$('.ability-block').map((block) => {
          const checkedType = block.querySelector('.ability-type:checked');
          const type = checkedType ? checkedType.value : 'damage';
          const effectSel = block.querySelector('.ability-effect-select');
    
          return {
            name: (block.querySelector('.ability-name')?.value || '').trim(),
            damage: clampNumber(block.querySelector('.ability-damage')?.value, 15, 60, 30),
            cooldown: clampNumber(block.querySelector('.ability-cooldown')?.value, 0, 5, 1),
            accuracy: clampNumber(block.querySelector('.ability-accuracy')?.value, 10, 100, 100),
            description: (block.querySelector('.ability-desc')?.value || '').trim(),
            type,
            effect: effectSel && effectSel.value
              ? effectSel.value
              : DEFAULT_EFFECT_BY_ROLE[type]
          };
        });
    
        const activeAbilities = abilities.filter((ab) => ab.name.length > 0);
    
        const isRequiemEl = document.getElementById('standIsRequiem');
        const requiemTargetEl = document.getElementById('standRequiemTarget');
    
        const isRequiem = isRequiemEl ? isRequiemEl.checked : false;
        const requiemStandId = (!isRequiem && requiemTargetEl && requiemTargetEl.value)
          ? requiemTargetEl.value
          : null;
    
        return {
          artistName: artistNameInput.value.trim(),
          standName: standNameInput.value.trim(),
          affinity: resolveAffinityFromForm(),
          battleCry: battleCryInput.value.trim(),
          stats,
          abilities: activeAbilities,
          isRequiem,
          requiemStandId
        };
      }
  
    /* =========================================================
       IMAGEN — CODIFICACIÓN BASE64
       ========================================================= */
      /* =========================================================
     COMPRESIÓN AUTOMÁTICA DE IMÁGENES
     ------------------------------------------------------------
     - Redimensiona a un máximo de 450px (lado mayor)
     - Exporta a WebP 0.82 si el navegador lo soporta (mantiene
       transparencia). Fallback a JPEG 0.82 si WebP falla.
     - Devuelve { dataUrl, mime } listo para guardar en el Stand.
     ========================================================= */
  const IMAGE_MAX_DIMENSION = 450;
  const IMAGE_QUALITY = 0.82;

  function compressImageFile(file) {
    return new Promise((resolve, reject) => {
      if (!file || !/^image\//.test(file.type)) {
        reject(new Error('El archivo no es una imagen válida.'));
        return;
      }

      const reader = new FileReader();

      reader.onerror = () => reject(reader.error || new Error('Error leyendo el archivo.'));

      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('No se pudo decodificar la imagen.'));
        img.onload = () => {
          try {
            // 1) Calcular dimensiones proporcionales
            let { width, height } = img;
            const maxSide = Math.max(width, height);

            if (maxSide > IMAGE_MAX_DIMENSION) {
              const scale = IMAGE_MAX_DIMENSION / maxSide;
              width = Math.round(width * scale);
              height = Math.round(height * scale);
            }

            // 2) Dibujar en canvas off-screen
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);

            // 3) Intentar WebP primero (preserva transparencia)
            let dataUrl = canvas.toDataURL('image/webp', IMAGE_QUALITY);
            let mime = 'image/webp';

            // Detección de fallback: si el navegador no soporta WebP,
            // toDataURL devuelve 'data:image/png;base64,...' como fallback silencioso.
            if (!dataUrl.startsWith('data:image/webp')) {
              dataUrl = canvas.toDataURL('image/jpeg', IMAGE_QUALITY);
              mime = 'image/jpeg';
            }

            // 4) Seguridad extra: si el resultado aún es enorme (>600 KB), recomprimir más agresivo
            const approxBytes = Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75);
            if (approxBytes > 600 * 1024) {
              dataUrl = canvas.toDataURL('image/webp', 0.65);
              mime = 'image/webp';
              if (!dataUrl.startsWith('data:image/webp')) {
                dataUrl = canvas.toDataURL('image/jpeg', 0.65);
                mime = 'image/jpeg';
              }
            }

            resolve({ dataUrl, mime, width, height, bytes: approxBytes });
          } catch (err) {
            reject(err);
          }
        };
        img.src = reader.result;
      };

      reader.readAsDataURL(file);
    });
  }

  /* =========================================================
     WRAPPER LEGACY: mantiene la firma original usada por el
     modal individual y el modal dual ({ dataUrl, mime }).
     ========================================================= */
  async function readImageAsBase64(file) {
    const result = await compressImageFile(file);
    return { dataUrl: result.dataUrl, mime: result.mime };
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
          isDefeated: false,
          defeatedAt: null,
          lastHp: null,
          tournamentDamage: 0,
          tournamentBattles: 0,
          tournamentState: STAND_STATE.WAITING,
          isRequiem: !!data.isRequiem,
          requiemStandId: data.isRequiem ? null : (data.requiemStandId || null),
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
              tournamentBattles: existing.tournamentBattles || 0,
              tournamentState: existing.tournamentState || STAND_STATE.WAITING
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
      ? raw.abilities.slice(0, MAX_ABILITIES).map((ab) => {
          const type = ['damage', 'heal', 'shield'].includes(ab?.type) ? ab.type : 'damage';
          const validEffects = (EFFECT_OPTIONS[type] || []).map((o) => o.value);
          const effect = validEffects.includes(ab?.effect)
            ? ab.effect
            : DEFAULT_EFFECT_BY_ROLE[type];

          return {
            name: String(ab?.name || '').slice(0, 60),
            damage: clampNumber(ab?.damage, 15, 60, 30),
            cooldown: clampNumber(ab?.cooldown, 0, 5, 1),
            accuracy: clampNumber(ab?.accuracy, 10, 100, 100),
            description: String(ab?.description || '').slice(0, 200),
            type,
            effect
          };
        })
      : [];

    const activeAbilities = abilities.filter((a) => a.name.length > 0);
    while (activeAbilities.length < MIN_ABILITIES) {
      activeAbilities.push({
        name: 'Ataque Básico', damage: 30, cooldown: 0, accuracy: 100,
        description: '', type: 'damage', effect: 'direct'
      });
    }
  
      return {
        id: typeof raw.id === 'string' && raw.id ? raw.id : uid(),
        artistName: String(raw.artistName || 'Desconocido').slice(0, 60),
        standName: String(raw.standName || 'Stand sin nombre').slice(0, 60),
        affinity: String(raw.affinity || 'Físico').slice(0, 30),
        battleCry: String(raw.battleCry || '').slice(0, 40),
        stats,
        abilities: activeAbilities,
        image: typeof raw.image === 'string' ? raw.image : null,
        imageMime: typeof raw.imageMime === 'string' ? raw.imageMime : null,
        level: clampNumber(raw.level, 1, 99, DEFAULT_LEVEL),
        isDefeated: Boolean(raw.isDefeated),
        defeatedAt: Number(raw.defeatedAt) || null,
        lastHp: Number(raw.lastHp) || null,
        tournamentDamage: Number(raw.tournamentDamage) || 0,
        tournamentBattles: Number(raw.tournamentBattles) || 0,
        tournamentState: ['waiting', 'winner', 'retired'].includes(raw.tournamentState)
          ? raw.tournamentState
          : (raw.isDefeated ? STAND_STATE.RETIRED : STAND_STATE.WAITING),
        isRequiem: Boolean(raw.isRequiem),
        requiemStandId: (!raw.isRequiem && typeof raw.requiemStandId === 'string')
          ? raw.requiemStandId
          : null,
        createdAt: Number(raw.createdAt) || Date.now(),
        updatedAt: Date.now()
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
            tournamentState: STAND_STATE.WAITING,
            lastHp: null,
            tournamentDamage: 0,
            tournamentBattles: 0
          }));
          tournamentRound = 1;
          tournamentPhase = PHASE.WAITING;
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
      
          // Efecto canónico
    const role = ability.type || 'damage';
    const effectValue = ability.effect || DEFAULT_EFFECT_BY_ROLE[role];
    const effectMeta = (EFFECT_OPTIONS[role] || []).find((o) => o.value === effectValue);
    if (effectMeta) {
      tooltipDesc.textContent = `${ability.description || ''}\n— ${effectMeta.label}: ${effectMeta.desc}`.trim();
    } else {
      tooltipDesc.textContent = ability.description || '';
    }

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
          // Reconstruir efectos cuando cambie el rol de una habilidad
    document.addEventListener('change', (e) => {
      if (e.target && e.target.classList && e.target.classList.contains('ability-type')) {
        const block = e.target.closest('.ability-block');
        if (!block) return;
        const role = e.target.value;
        // Conservar el efecto si sigue siendo válido para el nuevo rol
        const currentEffect = block.querySelector('.ability-effect-select')?.value;
        rebuildEffectOptions(block, role, currentEffect);
      }
    });
          // Toggle Requiem
    const isRequiemEl = document.getElementById('standIsRequiem');
    const requiemField = document.getElementById('standRequiemTargetField');
    if (isRequiemEl && requiemField) {
      isRequiemEl.addEventListener('change', () => {
        requiemField.hidden = isRequiemEl.checked;
        if (isRequiemEl.checked) {
          const sel = document.getElementById('standRequiemTarget');
          if (sel) sel.value = '';
        }
      });
    }
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
       /* =========================================================
     CARGA DE ESCENARIOS DESDE LOCALSTORAGE
     - Si no hay nada guardado, usa la lista por defecto (si existe).
     - Preserva favorableAffinities / unfavorableAffinities intactos.
     - Aplica normalización superficial SOLO para retrocompatibilidad,
       sin sobreescribir los arreglos existentes.
     ========================================================= */
  function loadStages() {
    try {
      const raw = localStorage.getItem(STAGES_KEY);

      // 1) Sin datos guardados → usar lista por defecto (si la app la define)
      if (!raw) {
        const DEFAULT_STAGES = (typeof window !== 'undefined' && window.JJA_DEFAULT_STAGES)
          ? window.JJA_DEFAULT_STAGES
          : [];
        stages = Array.isArray(DEFAULT_STAGES)
          ? DEFAULT_STAGES.map(normalizeStage).filter(Boolean)
          : [];
        // Persistir la lista por defecto en el primer arranque
        if (stages.length > 0) saveStages();
        return;
      }

      // 2) Datos guardados → parsear y normalizar sin perder arreglos
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        stages = [];
        return;
      }

      stages = parsed
        .map(normalizeStage)
        .filter(Boolean);
    } catch (err) {
      console.error('[JoJo Roster] Error al cargar escenarios desde localStorage:', err);
      stages = [];
    }
  }

    /* =========================================================
     NORMALIZACIÓN DE UN ESCENARIO
     - Conserva favorableAffinities / unfavorableAffinities tal cual.
     - Retrocompatibilidad: si solo vienen los campos antiguos
       (affinity / penalizedAffinity), se convierten a arreglos.
     ========================================================= */
     function normalizeStage(raw) {
      if (!raw || typeof raw !== 'object') return null;
  
      const DEFAULT_PCT = 15;
  
      // --- Listas favorecidas ---
      let favorableAffinities = [];
      if (Array.isArray(raw.favorableAffinities) && raw.favorableAffinities.length > 0) {
        favorableAffinities = raw.favorableAffinities
          .map((item) => {
            if (typeof item === 'string') {
              return { affinity: item.trim(), boostPct: DEFAULT_PCT };
            }
            if (item && typeof item === 'object' && item.affinity) {
              const pct = Number(item.boostPct);
              return {
                affinity: String(item.affinity).trim(),
                boostPct: Number.isFinite(pct) ? pct : DEFAULT_PCT
              };
            }
            return null;
          })
          .filter((x) => x && x.affinity);
      } else if (raw.affinity) {
        // Retrocompatibilidad: campo singular antiguo
        favorableAffinities = [{ affinity: String(raw.affinity).trim(), boostPct: DEFAULT_PCT }];
      }
  
      // --- Listas desfavorables ---
      let unfavorableAffinities = [];
      if (Array.isArray(raw.unfavorableAffinities) && raw.unfavorableAffinities.length > 0) {
        unfavorableAffinities = raw.unfavorableAffinities
          .map((item) => {
            if (typeof item === 'string') {
              return { affinity: item.trim(), penaltyPct: DEFAULT_PCT };
            }
            if (item && typeof item === 'object' && item.affinity) {
              const pct = Number(item.penaltyPct);
              return {
                affinity: String(item.affinity).trim(),
                penaltyPct: Number.isFinite(pct) ? pct : DEFAULT_PCT
              };
            }
            return null;
          })
          .filter((x) => x && x.affinity);
      } else if (raw.penalizedAffinity) {
        unfavorableAffinities = [{ affinity: String(raw.penalizedAffinity).trim(), penaltyPct: DEFAULT_PCT }];
      }
  
      // Deduplicar por afinidad (case-insensitive)
      const dedupe = (list) => {
        const seen = new Set();
        return list.filter((it) => {
          const k = it.affinity.toLowerCase();
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
      };
  
      favorableAffinities = dedupe(favorableAffinities);
      unfavorableAffinities = dedupe(unfavorableAffinities);
  
      return {
        id: typeof raw.id === 'string' && raw.id ? raw.id : uid(),
        name: String(raw.name || 'Escenario sin nombre').slice(0, 60),
        // --- Preservar arreglos intactos ---
        favorableAffinities,
        unfavorableAffinities,
        // --- Espejo de retrocompatibilidad (primer elemento) ---
        affinity: favorableAffinities[0]?.affinity || '',
        penalizedAffinity: unfavorableAffinities[0]?.affinity || '',
        // --- Imagen y metadatos ---
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

    // Normalizar para extraer listas
    const normalizeFn = window.JJA_EventsData && window.JJA_EventsData.normalizeArena;
    const normalized = typeof normalizeFn === 'function' ? normalizeFn(stage) : stage;

    const favList = normalized.favorableAffinities || [];
    const unfavList = normalized.unfavorableAffinities || [];

    const favChips = favList.map((f) =>
      `<span class="stage-card__mod stage-card__mod--favored" title="Afinidad favorecida +${f.boostPct}%">+${f.boostPct}% ${escapeHtml(f.affinity)}</span>`
    ).join('');

    const unfavChips = unfavList.map((f) =>
      `<span class="stage-card__mod stage-card__mod--penalized" title="Afinidad perjudicada −${f.penaltyPct}%">−${f.penaltyPct}% ${escapeHtml(f.affinity)}</span>`
    ).join('');

    const noMods = favList.length === 0 && unfavList.length === 0
      ? '<span class="stage-card__mod" style="color:var(--ink-3);background:transparent;border:1px dashed var(--line);">Sin modificadores</span>'
      : '';

    card.innerHTML = `
      ${imgMarkup}
      <div class="stage-card__body">
        <h4 class="stage-card__name" title="${escapeHtml(stage.name)}">${escapeHtml(stage.name)}</h4>
        <div class="stage-card__mods">
          ${favChips}
          ${unfavChips}
          ${noMods}
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
  
      if (editId) {
        const stage = stages.find((s) => s.id === editId);
        if (stage) {
          stageModalTitle.textContent = `Editar Escenario — ${stage.name}`;
          stageNameInput.value = stage.name || '';
  
          // Normalizar el escenario para extraer listas
          const normalizeFn = window.JJA_EventsData && window.JJA_EventsData.normalizeArena;
          const normalized = typeof normalizeFn === 'function' ? normalizeFn(stage) : stage;
  
          const favList = (normalized.favorableAffinities || []).map((f) => f.affinity);
          const unfavList = (normalized.unfavorableAffinities || []).map((f) => f.affinity);
  
          populateStageAffinityChips(favList, unfavList);
  
          // Precargar imagen existente
          pendingStageImageBase64 = stage.image || null;
          pendingStageImageMime = stage.imageMime || null;
          updateStagePreview();
  
          const editInput = document.getElementById('stageEditId');
          if (editInput) editInput.value = editId;
        }
      } else {
        stageModalTitle.textContent = 'Nuevo Escenario';
        populateStageAffinityChips([], []);
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

    // Reset chips
    populateStageAffinityChips([], []);

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
    const readChips = (container) => {
      if (!container) return [];
      return Array.from(container.querySelectorAll('.affinity-chip.is-selected'))
        .map((c) => c.dataset.affinity);
    };

    const favorable = readChips(favorableChipsContainer);
    const unfavorable = readChips(unfavorableChipsContainer);

    return {
      name: stageNameInput.value.trim(),
      // Guardamos como arreglos de objetos (formato canónico)
      favorableAffinities: favorable.map((aff) => ({ affinity: aff, boostPct: 15 })),
      unfavorableAffinities: unfavorable.map((aff) => ({ affinity: aff, penaltyPct: 15 })),
      // Retrocompatibilidad: campos singulares derivados del primero
      affinity: favorable[0] || '',
      penalizedAffinity: unfavorable[0] || ''
    };
  }

    /* =========================================================
     GUARDAR / ACTUALIZAR UN ESCENARIO
     - Persiste SIEMPRE la lista completa en localStorage.
     - Conserva los arreglos multiafinidad elegidos en el modal.
     ========================================================= */
     function upsertStage(data) {
      const editInput = document.getElementById('stageEditId');
      const editId = editInput && editInput.value ? editInput.value : null;
  
      // Sanitizar listas recibidas del modal (chips)
      const sanitizeList = (list, pctKey) => {
        if (!Array.isArray(list)) return [];
        const seen = new Set();
        const out = [];
        for (const item of list) {
          if (!item || !item.affinity) continue;
          const key = String(item.affinity).trim().toLowerCase();
          if (!key || seen.has(key)) continue;
          seen.add(key);
          const pct = Number(item[pctKey]);
          out.push({
            affinity: String(item.affinity).trim(),
            [pctKey]: Number.isFinite(pct) ? pct : 15
          });
        }
        return out;
      };
  
      const favorable = sanitizeList(data.favorableAffinities, 'boostPct');
      const unfavorable = sanitizeList(data.unfavorableAffinities, 'penaltyPct');
  
      if (editId) {
        // --- ACTUALIZAR EXISTENTE ---
        const idx = stages.findIndex((s) => s.id === editId);
        if (idx < 0) {
          toast('Escenario no encontrado para editar.', 'error');
          return;
        }
  
        stages[idx] = {
          ...stages[idx],
          name: String(data.name || '').slice(0, 60),
          favorableAffinities: favorable,
          unfavorableAffinities: unfavorable,
          // Espejos de retrocompatibilidad
          affinity: favorable[0]?.affinity || '',
          penalizedAffinity: unfavorable[0]?.affinity || '',
          // Imagen: solo se actualiza si el usuario subió una nueva
          image: pendingStageImageBase64 || stages[idx].image || null,
          imageMime: pendingStageImageMime || stages[idx].imageMime || null,
          updatedAt: Date.now()
        };
  
        const ok = saveStages();
        if (ok) toast(`Escenario "${stages[idx].name}" actualizado.`, 'success');
        renderStages();
        return;
      }
  
      // --- CREAR NUEVO ---
      const payload = {
        id: uid(),
        name: String(data.name || '').slice(0, 60),
        favorableAffinities: favorable,
        unfavorableAffinities: unfavorable,
        affinity: favorable[0]?.affinity || '',
        penalizedAffinity: unfavorable[0]?.affinity || '',
        image: pendingStageImageBase64 || null,
        imageMime: pendingStageImageMime || null,
        createdAt: Date.now(),
        updatedAt: null
      };
  
      stages.push(payload);
  
      const ok = saveStages();
      if (ok) toast(`Escenario "${payload.name}" guardado.`, 'success');
      renderStages();
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
        renderGallery();
    
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

    // Fase 3: campeón coronado
    if (currentMode === 'royale' && tournamentPhase === PHASE.CHAMPION) {
      const champion = roster.find((s) => s.tournamentState === STAND_STATE.WINNER);
      if (champion) {
        toast('¡Torneo finalizado! Ya hay campeón.', 'success');
        showChampionModal();
      } else {
        toast('No hay campeón que coronar. Reinicia el torneo.', 'error');
      }
      return;
    }

    // Fase 1 con <2 WAITING pero ≥2 WINNER: sugerir ronda de ganadores
    if (currentMode === 'royale' && tournamentPhase === PHASE.WAITING && eligible.length < 2) {
      const winners = roster.filter((s) => s.tournamentState === STAND_STATE.WINNER).length;
      if (winners >= 2) {
        toast('Ya no quedan aspirantes en espera. Pulsa "Iniciar Ronda de Ganadores".', 'info');
        if (btnWinnersRound) btnWinnersRound.hidden = false;
        return;
      }
      // Si solo hay 1 en total, coronar
      checkTournamentEnd();
      if (tournamentPhase === PHASE.CHAMPION) {
        showChampionModal();
        return;
      }
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
      // --- SFX tick de ruleta ---
      if (window.JJA_Sound && typeof window.JJA_Sound.playTick === 'function') {
        window.JJA_Sound.playTick();
      }

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
  
      // =========================================================
       // PAYLOAD MINIMALISTA: sin imágenes Base64 para no saturar localStorage
       // Solo guardamos referencias + estado del combate.
       // Las imágenes se resuelven en runtime desde el roster en memoria.
       // =========================================================
      const buildBattleRef = (fighter) => ({
        id: fighter.id,
        artistName: fighter.artistName,
        standName: fighter.standName,
        affinity: fighter.affinity,
        battleCry: fighter.battleCry || '',
        stats: { ...fighter.stats },
        abilities: (fighter.abilities || []).map((a) => ({
          name: a.name || '',
          type: a.type || 'damage',
          damage: Number(a.damage) || 30,
          cooldown: Number(a.cooldown) || 0,
          accuracy: Number(a.accuracy) || 100,
          description: a.description || ''
        })),
        level: fighter.level || DEFAULT_LEVEL,
        hp: computeHP(fighter.stats.durability, fighter.level || DEFAULT_LEVEL),
        damageBonus: computeDamageBonus(fighter.stats.power)
        // ⚠ Sin image / imageMime — se leen del roster en runtime
      });
  
      const battleData = {
        createdAt: Date.now(),
        p1: buildBattleRef(currentMatchup.p1),
        p2: buildBattleRef(currentMatchup.p2),
        stage: currentMatchup.stage ? {
          id: currentMatchup.stage.id,
          name: currentMatchup.stage.name,
          affinity: currentMatchup.stage.affinity,
          penalizedAffinity: currentMatchup.stage.penalizedAffinity || '',
          // ⚠ Sin image — se resuelve desde stages en runtime
        } : null,
        bonusPercent: STAGE_BONUS_PERCENT
      };
  
      const saved = safeSetItem(CURRENT_BATTLE_KEY, battleData, 'estado de combate');
      if (!saved) {
        // No bloqueamos el combate si falla la persistencia; solo avisamos.
        console.warn('[JoJo Roster] Combate no persistido por cuota. Continuando en memoria.');
      }
  
      window.dispatchEvent(new CustomEvent('jja:battle-ready', { detail: battleData }));
  
      // Transición al motor de combate (en memoria, con imágenes reales)
      startBattleEngine();
    }

      /* =========================================================
     RESOLUCIÓN DE IMÁGENES EN RUNTIME
     Lee la imagen del roster (o del stage) por id, evitando
     persistir Base64 en localStorage.
     ========================================================= */
  function resolveFighterImage(standId) {
    const s = roster.find((r) => r.id === standId);
    return s && s.image ? s.image : null;
  }

  function resolveStageImage(stageId) {
    if (!stageId) return null;
    const st = stages.find((s) => s.id === stageId);
    return st && st.image ? st.image : null;
  }

    function sanitizeForBattle(stand) {
      
      return {
        abilities: (stand.abilities || []).map((a) => {
          const type = ['damage', 'heal', 'shield'].includes(a.type) ? a.type : 'damage';
          const validEffects = (EFFECT_OPTIONS[type] || []).map((o) => o.value);
          const effect = validEffects.includes(a.effect) ? a.effect : DEFAULT_EFFECT_BY_ROLE[type];
          return {
            name: a.name || '',
            type,
            effect,
            damage: clampNumber(a.damage, 15, 60, 30),
            cooldown: clampNumber(a.cooldown, 0, 5, 1),
            accuracy: clampNumber(a.accuracy, 10, 100, 100),
            description: a.description || ''
          };
        }),
        id: stand.id,
        artistName: stand.artistName,
        standName: stand.standName,
        affinity: stand.affinity,
        battleCry: stand.battleCry || '',
        stats: { ...stand.stats },
        abilities: (stand.abilities || []).map((a) => ({
          name: a.name || '',
          type: ['damage', 'heal', 'shield'].includes(a.type) ? a.type : 'damage',
          damage: clampNumber(a.damage, 15, 60, 30),
          cooldown: clampNumber(a.cooldown, 0, 5, 1),
          accuracy: clampNumber(a.accuracy, 10, 100, 100),
          description: a.description || ''
        })),
        image: stand.image || null,
        level: stand.level || DEFAULT_LEVEL,
        hp: computeHP(stand.stats.durability, stand.level || DEFAULT_LEVEL),
        damageBonus: computeDamageBonus(stand.stats.power)
      };
    }
      /* =========================================================
     ACCIÓN DE UTILIDAD: SALTAR TURNO RIVAL (STUN)
     - El rival pierde su siguiente turno.
     - Se marca skipRivalPending = true; en passTurn() se consume
       automáticamente devolviendo el turno al jugador actual.
     ========================================================= */
  function performSkipRivalTurn(side) {
    if (!battle || battle.finished || battle.busy) return;
    if (battle.activeSide !== side) return;
    if (battle.skipRivalPending) return;

    battle.busy = true;

    const attacker = battle[side];
    const defenderSide = side === 'p1' ? 'p2' : 'p1';
    const defender = battle[defenderSide];

    // Marcar stun para el próximo turno del rival
    battle.skipRivalPending = true;

    // Log
    pushLog({
      side,
      type: 'bonus',
      html: `⏳ <strong>${escapeHtml(attacker.data.standName)}</strong> deja fuera de combate a ` +
            `<strong>${escapeHtml(defender.data.standName)}</strong>. <strong>¡Turno omitido!</strong>`
    });

    // Efecto visual
    const defenderEl = defenderSide === 'p1' ? fighterP1 : fighterP2;
    defenderEl.classList.add('is-hit');
    setTimeout(() => defenderEl.classList.remove('is-hit'), 600);

    battle.busy = false;

    // Pasar turno: el flag skipRivalPending se consumirá en passTurn()
    passTurn();
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
        // Botones "Limpiar" de cada grupo de afinidades
        document.querySelectorAll('.affinity-group__clear').forEach((btn) => {
          btn.addEventListener('click', () => {
            const group = btn.dataset.clear;
            const container = group === 'favorable' ? favorableChipsContainer : unfavorableChipsContainer;
            if (!container) return;
            container.querySelectorAll('.affinity-chip.is-selected').forEach((c) => {
              c.classList.remove('is-selected');
              c.setAttribute('aria-pressed', 'false');
            });
          });
        });
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
       /* =========================================================
     FÁBRICA DE ESTADO DE COMBATIENTE
     Garantiza que SIEMPRE existan los campos de estado nuevo.
     ========================================================= */
     function createFighterState(data, hp, maxHp) {
      const safeHp = Number.isFinite(hp) ? hp : 100;
      const safeMaxHp = Number.isFinite(maxHp) ? maxHp : safeHp;
  
      return {
        data,
        hp: safeHp,
        maxHp: safeMaxHp,
        cooldowns: [0, 0, 0, 0, 0],
        totalDamage: 0,
        shield: false,
        currentShield: 0,
        reflectActive: false,
        statusEffects: [],
        tempBuffs: { damageMult: 1.0 },
        __requiemTriggered: false,
        __isRequiemForm: false,
        // --- Tácticas ---
        dodgesRemaining: 2,
        isDodging: false
      };
    }
      /* =========================================================
     ACCIÓN TÁCTICA: PASAR TURNO
     Cede el turno al rival sin atacar (cicla cooldowns).
     ========================================================= */
  function passTurnAction() {
    if (!battle || battle.finished || battle.busy) return;
    if (battle.activeSide !== battle.activeSide) return; // sanity

    const side = battle.activeSide;
    const active = battle[side];
    if (!active) return;

    battle.busy = true;

    pushLog({
      side,
      type: 'tactical-pass',
      html: `⏳ <strong>${escapeHtml(active.data.standName)}</strong> decide pasar su turno y recuperar compostura.`
    });

    // Pequeña sacudida visual para comunicar la acción
    const activeEl = side === 'p1' ? fighterP1 : fighterP2;
    if (activeEl) {
      activeEl.classList.add('is-attacking');
      setTimeout(() => activeEl.classList.remove('is-attacking'), 400);
    }

    battle.busy = false;
    passTurn();
  }
    /* =========================================================
     ACCIÓN TÁCTICA: RENDIRSE
     El combatiente activo concede la victoria al rival.
     ========================================================= */
     function surrenderAction() {
      if (!battle || battle.finished || battle.busy) return;
  
      const side = battle.activeSide;
      const active = battle[side];
      const rivalSide = side === 'p1' ? 'p2' : 'p1';
      const rival = battle[rivalSide];
      if (!active || !rival) return;
  
      if (!confirm(`¿Rendir a ${active.data.standName}? La victoria será para ${rival.data.standName}.`)) {
        return;
      }
  
      battle.busy = true;
  
      // HP a 0
      active.hp = 0;
  
      // Marcadores visuales
      const activeEl = side === 'p1' ? fighterP1 : fighterP2;
      if (activeEl) {
        activeEl.classList.add('is-defeated', 'is-hit');
        setTimeout(() => activeEl.classList.remove('is-hit'), 700);
      }
  
      updateHpBar(side);
  
      // Log
      pushLog({
        side,
        type: 'tactical-surrender',
        html: `🏳 <strong>${escapeHtml(active.data.standName)}</strong> se ha rendido. ` +
              `¡La victoria es para <strong>${escapeHtml(rival.data.standName)}</strong>!`
      });
  
      pushLog({
        side: rivalSide,
        type: 'ko',
        html: `¡K.O. por rendición! <strong>${escapeHtml(rival.data.standName)}</strong> se alza con la victoria.`
      });
  
      // Cierre
      battle.finished = true;
      renderBattleUI();
      updateActionPanel();
      setTimeout(() => showVictoryModal(rivalSide), 800);
  
      battle.busy = false;
    }
      /* =========================================================
     ACCIÓN TÁCTICA: ESQUIVE TOTAL
     70% de probabilidad de anular el próximo daño recibido.
     Límite: 2 usos por combatiente por combate.
     ========================================================= */
  function dodgeAction() {
    if (!battle || battle.finished || battle.busy) return;

    const side = battle.activeSide;
    const active = battle[side];
    const rivalSide = side === 'p1' ? 'p2' : 'p1';
    const rival = battle[rivalSide];
    if (!active || !rival) return;

    if (active.dodgesRemaining <= 0) {
      toast('Sin esquives disponibles.', 'error');
      return;
    }

    battle.busy = true;

    // Consumir uso
    active.dodgesRemaining = Math.max(0, (Number(active.dodgesRemaining) || 0) - 1);

    const roll = Math.random();
    const success = roll < 0.70;

    const activeEl = side === 'p1' ? fighterP1 : fighterP2;

    if (success) {
      active.isDodging = true;

      if (activeEl) {
        activeEl.classList.add('is-dodging');
      }

      pushLog({
        side,
        type: 'tactical-dodge-success',
        html: `💨 <strong>${escapeHtml(active.data.standName)}</strong> prepara una <strong>postura de esquive total</strong>. ` +
              `El próximo ataque rival será anulado. (${active.dodgesRemaining} esquive${active.dodgesRemaining === 1 ? '' : 's'} restante${active.dodgesRemaining === 1 ? '' : 's'})`
      });
    } else {
      pushLog({
        side,
        type: 'tactical-dodge-fail',
        html: `💨 <strong>${escapeHtml(active.data.standName)}</strong> intentó esquivar pero <strong>tropezó y quedó expuesto</strong>. (${active.dodgesRemaining} esquive${active.dodgesRemaining === 1 ? '' : 's'} restante${active.dodgesRemaining === 1 ? '' : 's'})`
      });

      if (activeEl) {
        activeEl.classList.add('is-hit');
        setTimeout(() => activeEl.classList.remove('is-hit'), 600);
      }
    }

    battle.busy = false;
    passTurn();
  }

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
      p1: createFighterState(p1, p1Hp, p1Hp),
      p2: createFighterState(p2, p2Hp, p2Hp),
      stage: stage || null,
      activeSide: determineInitiative(p1, p2),
      turn: 1,
      round: 1,
      log: [],
      finished: false,
      busy: false,
      basicAttackLocked: 0,
      basicAttackLockedBy: null,
      skipRivalPending: false
    };

    // Incrementar contador individual de combates
    [p1, p2].forEach((fighter) => {
      const idx = roster.findIndex((s) => s.id === fighter.id);
      if (idx >= 0) {
        roster[idx].tournamentBattles = (roster[idx].tournamentBattles || 0) + 1;
      }
    });
    saveRoster();

    // Transición de vistas
    versusScreen.hidden = true;
    tournamentView.hidden = true;
    battleView.hidden = false;
    document.body.classList.add('is-battling');
    window.scrollTo(0, 0);

    // Fondo del escenario
    if (stage && stage.image) {
      battleBg.style.backgroundImage = `url("${stage.image}")`;
      battleStageName.textContent = stage.name;
    } else {
      battleBg.style.backgroundImage = '';
      battleBg.style.background = 'radial-gradient(ellipse at center, #1a1524, #0a0810 70%)';
      battleStageName.textContent = 'Terreno Neutro';
    }

    // Reset del módulo de eventos
    if (window.JJA_EventsRoulette) {
      window.JJA_EventsRoulette.resetForBattle();
    }

    renderBattleUI();
    updateHpBar('p1');
    updateHpBar('p2');
    announceTurn();
    updateActionPanel();
  }
      
    /* =========================================================
     RESOLUCIÓN DE ESTADOS AL INICIO DEL TURNO
     - Aplica daño de veneno
     - Consume turno si hay stun
     Devuelve true si el turno debe ser consumido (skip).
     ========================================================= */
     function resolveStatusEffectsAtTurnStart(side) {
      if (!battle || battle.finished) return false;
  
      const fighter = battle[side];
      if (!fighter) return false;
  
      // --- GUARD: garantizar estructura de estado ---
      if (!Array.isArray(fighter.statusEffects)) {
        fighter.statusEffects = [];
      }
      if (!fighter.tempBuffs || typeof fighter.tempBuffs !== 'object') {
        fighter.tempBuffs = { damageMult: 1.0 };
      }
      if (!Number.isFinite(fighter.tempBuffs.damageMult)) {
        fighter.tempBuffs.damageMult = 1.0;
      }
      if (!Number.isFinite(fighter.currentShield)) {
        fighter.currentShield = 0;
      }
      if (typeof fighter.reflectActive !== 'boolean') {
        fighter.reflectActive = false;
      }
  
      // --- Veneno ---
      const poisonIdx = fighter.statusEffects.findIndex((e) => e && e.type === 'poison');
      if (poisonIdx >= 0) {
        const poison = fighter.statusEffects[poisonIdx];
        const dmg = Math.max(1, Math.round(Number(poison.value) || 5));
        fighter.hp = Math.max(0, fighter.hp - dmg);
  
        updateHpBar(side);
  
        const fighterEl = side === 'p1' ? fighterP1 : fighterP2;
        if (fighterEl) {
          fighterEl.classList.add('is-hit');
          setTimeout(() => fighterEl.classList.remove('is-hit'), 600);
        }
  
        pushLog({
          side,
          type: 'poison',
          html: `☠ <strong>${escapeHtml(fighter.data.standName)}</strong> sufre <span class="log-entry__dmg">${dmg}</span> de daño por <strong>veneno</strong> (${poison.duration} turno${poison.duration > 1 ? 's' : ''} restante${poison.duration > 1 ? 's' : ''}).`
        });
  
        poison.duration = (Number(poison.duration) || 0) - 1;
        if (poison.duration <= 0) {
          fighter.statusEffects.splice(poisonIdx, 1);
          pushLog({
            side,
            type: 'poison',
            html: `✓ El veneno de <strong>${escapeHtml(fighter.data.standName)}</strong> se ha disipado.`
          });
        }
  
        // ¿K.O. por veneno?
        if (fighter.hp <= 0) {
          battle.finished = true;
          const winnerSide = side === 'p1' ? 'p2' : 'p1';
          const winner = battle[winnerSide];
          pushLog({
            side: winnerSide,
            type: 'ko',
            html: `¡K.O. por veneno! <strong>${escapeHtml(winner.data.standName)}</strong> gana el combate.`
          });
          renderBattleUI();
          updateActionPanel();
          setTimeout(() => showVictoryModal(winnerSide), 900);
          return true;
        }
      }
  
      // --- Stun ---
      const stunIdx = fighter.statusEffects.findIndex((e) => e && e.type === 'stun');
      if (stunIdx >= 0) {
        fighter.statusEffects.splice(stunIdx, 1);
  
        pushLog({
          side,
          type: 'stun',
          html: `⚡ <strong>${escapeHtml(fighter.data.standName)}</strong> está aturdido y <strong>no puede moverse</strong>. ¡Turno omitido!`
        });
  
        const fighterEl = side === 'p1' ? fighterP1 : fighterP2;
        if (fighterEl) {
          fighterEl.classList.add('is-hit');
          setTimeout(() => fighterEl.classList.remove('is-hit'), 700);
        }
  
        return true;
      }
  
      return false;
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
      
          battleNameP1.textContent = p1.data.standName;
          battleOwnerP1.textContent = p1.data.artistName;
          battleAffP1.textContent = p1.data.affinity;
          setSprite(battleSpriteP1, spriteFallbackP1, p1.data.image, p1.data.standName);
      
          battleNameP2.textContent = p2.data.standName;
          battleOwnerP2.textContent = p2.data.artistName;
          battleAffP2.textContent = p2.data.affinity;
          setSprite(battleSpriteP2, spriteFallbackP2, p2.data.image, p2.data.standName);
      
          fighterP1.classList.remove('is-active', 'is-waiting', 'is-defeated');
          fighterP2.classList.remove('is-active', 'is-waiting', 'is-defeated');
      
          if (p1.hp <= 0) fighterP1.classList.add('is-defeated');
          if (p2.hp <= 0) fighterP2.classList.add('is-defeated');
      
          if (!finished) {
            if (activeSide === 'p1') {
              if (p1.hp > 0) fighterP1.classList.add('is-active');
              if (p2.hp > 0) fighterP2.classList.add('is-waiting');
            } else {
              if (p2.hp > 0) fighterP2.classList.add('is-active');
              if (p1.hp > 0) fighterP1.classList.add('is-waiting');
            }
          }
      
          fighterP1.classList.toggle('has-shield', !!battle.p1.shield);
          renderStatusChips();
          fighterP2.classList.toggle('has-shield', !!battle.p2.shield);
            // Indicador visual de esquive preparado
          fighterP1.classList.toggle('is-dodging', !!battle.p1.isDodging);
          fighterP2.classList.toggle('is-dodging', !!battle.p2.isDodging);
            /* =========================================================
     RENDER DE CHIPS DE ESTADO
     ========================================================= */
     function renderStatusChips() {
      if (!battle) return;
  
      const buildChips = (fighter) => {
        if (!fighter) return '';
  
        // --- GUARDS ---
        if (!Array.isArray(fighter.statusEffects)) {
          fighter.statusEffects = [];
        }
        if (!fighter.tempBuffs || typeof fighter.tempBuffs !== 'object') {
          fighter.tempBuffs = { damageMult: 1.0 };
        }
        if (!Number.isFinite(fighter.tempBuffs.damageMult)) {
          fighter.tempBuffs.damageMult = 1.0;
        }
        if (!Number.isFinite(fighter.currentShield)) {
          fighter.currentShield = 0;
        }
  
        const chips = [];
  
        const poison = fighter.statusEffects.find((e) => e && e.type === 'poison');
        if (poison) {
          chips.push(`<span class="status-effect-chip status-effect-chip--poison">☠ Veneno (${poison.duration || 0})</span>`);
        }
  
        const stun = fighter.statusEffects.find((e) => e && e.type === 'stun');
        if (stun) {
          chips.push(`<span class="status-effect-chip status-effect-chip--stun">⚡ Aturdido</span>`);
        }
  
        const buffPct = Math.round(((fighter.tempBuffs.damageMult || 1.0) - 1) * 100);
        if (buffPct > 0) {
          chips.push(`<span class="status-effect-chip status-effect-chip--buff">▲ +${buffPct}% Daño</span>`);
        }
  
        if (fighter.currentShield > 0) {
          chips.push(`<span class="status-effect-chip status-effect-chip--shield">🛡 ${fighter.currentShield}</span>`);
        }
            // Esquive preparado
          if (fighter.isDodging) {
            chips.push(`<span class="status-effect-chip" style="color:#4fae6a;border-color:#4fae6a;background:rgba(79,174,106,0.18);">💨 Esquive</span>`);
          }
  
        return chips.join('');
      };
  
      const statusP1El = document.getElementById('statusP1');
      const statusP2El = document.getElementById('statusP2');
      if (statusP1El) statusP1El.innerHTML = buildChips(battle.p1);
      if (statusP2El) statusP2El.innerHTML = buildChips(battle.p2);
    }
      
          // Radar charts
          if (radarP1) renderRadarInto(radarP1, battle.p1.data.stats, { size: 140, compact: true, withBackground: true });
          if (radarP2) renderRadarInto(radarP2, battle.p2.data.stats, { size: 140, compact: true, withBackground: true });
      
          battleTurnIndicator.textContent = finished
            ? 'Combate Finalizado'
            : `Turno ${battle.turn} · ${activeSide === 'p1' ? 'P1' : 'P2'}`;
          battleRoundDisplay.textContent = `Ronda ${toRoman(battle.round)}`;
      
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
    
        const { p1, p2 } = battle;
    
        const buildChips = (fighter) => {
          const chips = [];
          if (!fighter || !battle.stage) {
            // Sin escenario: solo chips de estados (veneno/stun/buff/shield)
            return chips.join('');
          }
    
          // Normalizar stage
          let stage = battle.stage;
          const normalizeFn = window.JJA_EventsData && window.JJA_EventsData.normalizeArena;
          if (typeof normalizeFn === 'function') {
            stage = normalizeFn(stage) || stage;
          }
    
          const affinity = String(fighter.data.affinity || '').trim().toLowerCase();
          const favList = Array.isArray(stage.favorableAffinities) ? stage.favorableAffinities : [];
          const unfavList = Array.isArray(stage.unfavorableAffinities) ? stage.unfavorableAffinities : [];
    
          // --- Chips de afinidades favorables ---
          for (const item of favList) {
            if (item && String(item.affinity).trim().toLowerCase() === affinity) {
              chips.push(`<span class="status-chip status-chip--bonus">▲ +${item.boostPct}% ${escapeHtml(item.affinity)}</span>`);
            }
          }
          // --- Chips de afinidades desfavorables ---
          for (const item of unfavList) {
            if (item && String(item.affinity).trim().toLowerCase() === affinity) {
              chips.push(`<span class="status-chip status-chip--penalty">▼ −${item.penaltyPct}% ${escapeHtml(item.affinity)}</span>`);
            }
          }
    
          // --- Boost por evento Terreno Reclamado ---
          if (Number.isFinite(fighter.terrainBoost) && fighter.terrainBoost > 0) {
            const pct = Math.round(fighter.terrainBoost * 100);
            chips.push(`<span class="status-chip status-chip--bonus">▲ +${pct}% Reclamado</span>`);
          }
    
          return chips.join('');
        };
    
        statusP1.innerHTML = buildChips(p1);
        statusP2.innerHTML = buildChips(p2);
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
     MULTIPLICADOR DE TERRENO — MULTIAFINIDAD
     ------------------------------------------------------------
     - Si el Stand coincide con alguna favorable → +boostPct%
     - Si coincide con alguna desfavorable → -penaltyPct%
     - Si el evento "Terreno Reclamado" (terrainBoost) está activo,
       su valor tiene prioridad sobre el boost base.
     - Los porcentajes se acumulan aditivamente si hay varias coincidencias
       (ej. favorables: Fuego 15 + Agua 10 = +25% si el Stand es ambos).
     ========================================================= */
  function getTerrainMultiplier(stand, fighter) {
    if (!battle) {
      if (fighter && Number.isFinite(fighter.terrainBoost) && fighter.terrainBoost > 0) {
        return 1 + fighter.terrainBoost;
      }
      return 1;
    }

    // --- Boost por evento (Terreno Reclamado) ---
    if (fighter && Number.isFinite(fighter.terrainBoost) && fighter.terrainBoost > 0) {
      return 1 + fighter.terrainBoost;
    }

    // --- Sin escenario: neutro ---
    if (!battle.stage) return 1;

    // --- Normalización del escenario (retrocompatible) ---
    let stage = battle.stage;
    const normalizeFn = window.JJA_EventsData && window.JJA_EventsData.normalizeArena;
    if (typeof normalizeFn === 'function') {
      stage = normalizeFn(stage) || stage;
    }

    const affinity = String(stand.affinity || '').trim().toLowerCase();
    if (!affinity) return 1;

    const favList = Array.isArray(stage.favorableAffinities) ? stage.favorableAffinities : [];
    const unfavList = Array.isArray(stage.unfavorableAffinities) ? stage.unfavorableAffinities : [];

    let bonusPct = 0;
    let penaltyPct = 0;

    for (const item of favList) {
      if (item && String(item.affinity).trim().toLowerCase() === affinity) {
        bonusPct += Number(item.boostPct) || 0;
      }
    }
    for (const item of unfavList) {
      if (item && String(item.affinity).trim().toLowerCase() === affinity) {
        penaltyPct += Number(item.penaltyPct) || 0;
      }
    }

    const mult = 1 + (bonusPct - penaltyPct) / 100;
    return Math.max(0.1, mult); // suelo defensivo para no anular el daño
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
    
    /* =========================================================
     ATAQUE BÁSICO — DAÑO BASE POR RANGO DE PWR
     El daño base ya sale de DAMAGE_BY_POWER (A=20, B=18, C=15, D=12, E=10).
     Sobre esa base se aplican: terreno → crítico → mitigación por DUR.
     ========================================================= */
     function computeBasicAttackDamage(attacker, defender, attackerFighter) {
      const powerGrade = String(attacker.stats?.power || '').trim().toUpperCase();
      const baseDamage = DAMAGE_BY_POWER[powerGrade] ?? BASIC_ATTACK_DEFAULT;
  
      let damage = baseDamage;
  
      // Multiplicador de terreno (favorecida/desfavorecida o boost de evento)
      const terrainMult = getTerrainMultiplier(attacker, attackerFighter || null);
      damage *= terrainMult;
  
      // Crítico
      const crit = Math.random() < getCritChance(attacker.stats?.precision);
      if (crit) damage *= CRIT_MULTIPLIER;
  
      // Mitigación por durabilidad del defensor
      damage *= (1 - getDurReduction(defender.stats?.durability));
  
      return {
        damage: Math.max(1, Math.round(damage)),
        crit,
        bonusApplied: terrainMult > 1,
        terrainMult
      };
    }
    
    /* =========================================================
     DAÑO DE HABILIDAD — SIN BONUS AUTOMÁTICO DE PWR
     El daño sale tal cual del campo `ability.damage`.
     Sobre él: terreno → crítico → mitigación por DUR.
     ========================================================= */
     function computeSkillDamage(attacker, defender, ability, attackerFighter) {
      let damage = Number(ability.damage) || 30;
  
      const terrainMult = getTerrainMultiplier(attacker, attackerFighter || null);
      damage *= terrainMult;
  
      const crit = Math.random() < getCritChance(attacker.stats?.precision);
      if (crit) damage *= CRIT_MULTIPLIER;
  
      damage *= (1 - getDurReduction(defender.stats?.durability));
  
      return {
        damage: Math.max(1, Math.round(damage)),
        crit,
        bonusApplied: terrainMult > 1,
        terrainMult
      };
    }
    
      
    /* =========================================================
     DAÑO PROYECTADO (previsualización en UI)
     Sin aleatoriedad, sin crítico. Solo base + terreno + DUR.
     ========================================================= */
     function computeProjectedDamage(attacker, defender, ability, kind) {
      if (!attacker || !defender || !ability) return { damage: 0, mult: 1, pct: 0 };
  
      // Heal / Shield no proyectan daño
      if (kind === 'heal' || kind === 'shield') {
        return { damage: 0, mult: 1, pct: 0 };
      }
  
      // El daño base viene tal cual del caller (básico o habilidad)
      let projected = Number(ability.damage) || 0;
  
      // Multiplicador de terreno (favorecida/desfavorecida o boost de evento)
      const mult = getTerrainMultiplier(attacker, attacker.__fighterRef || null);
      projected *= mult;
  
      // Mitigación por durabilidad del defensor
      projected *= (1 - getDurReduction(defender.stats?.durability));
  
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
          if (!ability || (attacker.cooldowns && attacker.cooldowns[skillIndex] > 0)) {
            battle.busy = false;
            updateActionPanel();
            return;
          }
      
          const result = executeAbility(attackerSide, skillIndex);
      
          // Si executeAbility ya resolvió el turno o no requiere pase, controlamos el estado
          if (result && result.skipTurn === false) {
            battle.busy = false;
            passTurn();
          }
          return;
        }
    
        // Ejecutar visualmente
        const attackerEl = attackerSide === 'p1' ? fighterP1 : fighterP2;
        const defenderEl = defenderSide === 'p1' ? fighterP1 : fighterP2;
        const defenderSpriteWrap = defenderSide === 'p1' ? fighterP1 : fighterP2;
    
        attackerEl.classList.add('is-attacking');
        setTimeout(() => attackerEl.classList.remove('is-attacking'), 500);
    
        setTimeout(() => {
                // Aplicar daño — con posible reducción por escudo
            // --- INTERCEPCIÓN DE ESQUIVE TOTAL ---
            const defenderEl = defenderSide === 'p1' ? fighterP1 : fighterP2;

            if (defender.isDodging) {
              defender.isDodging = false;
      
              if (defenderEl) {
                defenderEl.classList.add('is-dodging');
                setTimeout(() => defenderEl.classList.remove('is-dodging'), 800);
              }
      
              pushLog({
                side: defenderSide,
                type: 'tactical-dodge-success',
                html: `💨 <strong>${escapeHtml(defender.data.standName)}</strong> esquivó por completo el ataque de ` +
                      `<strong>${escapeHtml(attacker.data.standName)}</strong> gracias a sus reflejos.`
              });
      
              // Terminar turno sin daño
              battle.busy = false;
              passTurn();
              return;
            }
      
            // Aplicar daño — con posible reducción por escudo
            let finalDamage = result.damage;

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
    
          // Etiqueta de afinidades involucradas
          let affinityDetail = '';
          if (battle.stage && Math.abs(bonusPct) > 0) {
            let stage = battle.stage;
            const normalizeFn = window.JJA_EventsData && window.JJA_EventsData.normalizeArena;
            if (typeof normalizeFn === 'function') stage = normalizeFn(stage) || stage;
    
            const affinity = String(attacker.data.affinity || '').trim();
            const matchedFav = (stage.favorableAffinities || []).find(
              (f) => String(f.affinity).trim() === affinity
            );
            const matchedUnfav = (stage.unfavorableAffinities || []).find(
              (f) => String(f.affinity).trim() === affinity
            );
    
            const names = [];
            if (matchedFav) names.push(matchedFav.affinity);
            if (matchedUnfav) names.push(matchedUnfav.affinity);
            if (names.length) affinityDetail = ` · ${names.join(' / ')}`;
          }
    
          let bonusTag = '';
          if (bonusPct > 0) {
            bonusTag = ` <span style="color:var(--ready-hi);font-weight:700;">[+${bonusPct}% Terreno${affinityDetail}]</span>`;
          } else if (bonusPct < 0) {
            bonusTag = ` <span style="color:#ff8a70;font-weight:700;">[${bonusPct}% Terreno${affinityDetail}]</span>`;
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
    
        // =========================================================
         // STUN de "skipRivalPending" (botón Saltar Turno Rival)
         // =========================================================
        if (battle.skipRivalPending && next !== previous) {
          battle.skipRivalPending = false;
    
          const skipped = battle[next];
          if (!skipped) return;
    
          pushLog({
            side: next,
            type: '',
            html: `⏳ <strong>${escapeHtml(skipped.data.standName)}</strong> pierde su turno por el impacto.`
          });
    
          const skippedEl = next === 'p1' ? fighterP1 : fighterP2;
          if (skippedEl) {
            skippedEl.classList.add('is-defeated');
            setTimeout(() => { if (skipped.hp > 0) skippedEl.classList.remove('is-defeated'); }, 700);
          }
    
          battle.turn += 1;
    
          // Decrementar cooldowns del jugador que repite
          const repeat = battle[previous];
          if (repeat && Array.isArray(repeat.cooldowns)) {
            repeat.cooldowns = repeat.cooldowns.map((cd) => (cd > 0 ? cd - 1 : 0));
          }
    
          renderBattleUI();
          updateActionPanel();
          announceTurn();
          if (window.JJA_EventsRoulette && battle) {
            window.JJA_EventsRoulette.maybeTriggerEvent(battle);
          }
          return;
        }
    
        // =========================================================
         // AVANCE DE TURNO NORMAL
         // =========================================================
        battle.activeSide = next;
        battle.turn += 1;
        if (battle.turn % 2 === 1) battle.round += 1;
    
        // Decrementar cooldowns del próximo jugador
        const incoming = battle[next];
        if (incoming) {
          if (!Array.isArray(incoming.cooldowns)) {
            incoming.cooldowns = [0, 0, 0, 0, 0];
          }
          incoming.cooldowns = incoming.cooldowns.map((cd) => {
            const n = Number(cd) || 0;
            return n > 0 ? n - 1 : 0;
          });
        }
    
        // Consumir Silencio de Hierro
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
    
        renderBattleUI();
    
        // =========================================================
         // RESOLVER ESTADOS DEL PRÓXIMO JUGADOR
         // =========================================================
        const turnConsumed = resolveStatusEffectsAtTurnStart(next);
    
        if (turnConsumed) {
          // El turno fue consumido (stun o K.O. por veneno).
          if (!battle.finished) {
            // Saltar directamente al otro jugador (previous)
            battle.activeSide = previous;
            battle.turn += 1;
    
            const back = battle[previous];
            if (back) {
              if (!Array.isArray(back.cooldowns)) {
                back.cooldowns = [0, 0, 0, 0, 0];
              }
              back.cooldowns = back.cooldowns.map((cd) => (cd > 0 ? cd - 1 : 0));
            }
    
            renderBattleUI();
    
            // Resolver también los estados del jugador que vuelve a actuar
            // (por si tuviera veneno/stun pendiente)
            const backConsumed = resolveStatusEffectsAtTurnStart(previous);
    
            if (backConsumed && !battle.finished) {
              // Ambos aturdidos: pasar el turno al original
              battle.activeSide = next;
              battle.turn += 1;
            }
    
            updateActionPanel();
            announceTurn();
            if (window.JJA_EventsRoulette && battle) {
              window.JJA_EventsRoulette.maybeTriggerEvent(battle);
            }
          }
          return;
        }
    
        updateActionPanel();
        announceTurn();
    
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
      
          
          const btnRequiem = document.getElementById('btnTriggerRequiem');
      
          if (battle.finished) {
            turnLabel.textContent = 'Combate Finalizado';
            turnTimer.textContent = '';
            disableAllActions();
            if (btnRequiem) btnRequiem.hidden = true;
            return;
        }
      
          const active = battle.activeSide === 'p1' ? battle.p1 : battle.p2;
          const defender = battle.activeSide === 'p1' ? battle.p2 : battle.p1;
          turnLabel.textContent = `Turno de ${active.data.standName}`;
          turnTimer.textContent = `Ronda ${toRoman(battle.round)}`;
      
              // ---------- ATAQUE BÁSICO ----------
    const isBasicLocked = (battle.basicAttackLocked || 0) > 0;

    if (isBasicLocked) {
      btnBasicAttack.disabled = true;
      btnBasicAttack.classList.add('is-locked');
      btnBasicAttack.title = '¡Bloqueado por Silencio de Hierro! Solo puedes usar habilidades.';
      basicAttackMeta.innerHTML =
        `<span style="color:var(--danger-hi);font-weight:700;">⛓ Bloqueado (${battle.basicAttackLocked})</span>`;
    } else {
      btnBasicAttack.disabled = false;
      btnBasicAttack.classList.remove('is-locked');
      btnBasicAttack.removeAttribute('title');

      // Daño base según rango de PWR (A=20, B=18, C=15, D=12, E=10)
      const powerGrade = String(active.data.stats?.power || '').trim().toUpperCase();
      const baseDmg = DAMAGE_BY_POWER[powerGrade] ?? BASIC_ATTACK_DEFAULT;

      // Aplicar multiplicador de terreno y mitigación del defensor para proyectar
      const proj = computeProjectedDamage(
        { ...active.data, __fighterRef: active },
        defender.data,
        { damage: baseDmg },
        'damage'
      );

      // Mostrar el daño proyectado con el tag de terreno si aplica
      if (proj.pct > 0) {
        basicAttackMeta.innerHTML = `${proj.damage} daño <span style="color:var(--ready-hi);font-weight:700;">(+${proj.pct}%)</span>`;
      } else if (proj.pct < 0) {
        basicAttackMeta.innerHTML = `${proj.damage} daño <span style="color:#ff8a70;font-weight:700;">(${proj.pct}%)</span>`;
      } else {
        basicAttackMeta.textContent = `${proj.damage} daño`;
      }
    }
      
          // --- Habilidades dinámicas ---
          const skillBtns  = [skillBtn0, skillBtn1, skillBtn2, skillBtn3, skillBtn4];
          const skillNames = [skillName0, skillName1, skillName2, skillName3, skillName4];
          const skillMetas = [skillMeta0, skillMeta1, skillMeta2, skillMeta3, skillMeta4];
          const abilities = active.data.abilities || [];
      
          skillBtns.forEach((btn, idx) => {
            if (!btn) return;
            const ability = abilities[idx];
            const nameEl = skillNames[idx];
            const metaEl = skillMetas[idx];
      
            if (!ability || !ability.name) {
              btn.hidden = true;
              btn.disabled = true;
              return;
            }
            btn.hidden = false;
            if (nameEl) nameEl.textContent = ability.name;
      
            const cd = active.cooldowns[idx] || 0;
            if (cd > 0) {
              btn.disabled = true;
              if (metaEl) {
                metaEl.innerHTML = `⏳ Recarga: ${cd} turno${cd > 1 ? 's' : ''}`;
                metaEl.classList.add('action-btn__meta--cd');
                metaEl.classList.remove('action-btn__meta--ready');
              }
              let badge = btn.querySelector('.action-btn__cd-badge');
              if (!badge) {
                badge = document.createElement('span');
                badge.className = 'action-btn__cd-badge';
                btn.appendChild(badge);
              }
              badge.textContent = cd;
              badge.dataset.cd = String(cd);
            } else {
              btn.disabled = false;
              const kind = ability.type || 'damage';
              const acc = clampNumber(ability.accuracy, 10, 100, 100);
      
              if (metaEl) {
                if (kind === 'heal') {
                  const estHeal = Math.round(active.maxHp * 0.22);
                  metaEl.innerHTML = `<span style="color:var(--ready-hi);font-weight:700;">+${estHeal} HP · Curación</span>`;
                } else if (kind === 'shield') {
                  metaEl.innerHTML = `<span style="color:var(--accent-cyan);font-weight:700;">Defensa 50%</span>`;
                } else {
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
              }
      
              const badge = btn.querySelector('.action-btn__cd-badge');
              if (badge) badge.remove();
            }
      
            btn.onclick = () => performAction(battle.activeSide, 'skill', idx);
            btn.onmouseenter = () => showSkillTooltip(btn, ability, idx);
            btn.onmouseleave = () => hideSkillTooltip();
            btn.onfocus = () => showSkillTooltip(btn, ability, idx);
            btn.onblur = () => hideSkillTooltip();
      
            if (cd > 0) {
              btn.onmouseenter = null;
              btn.onmouseleave = null;
              btn.onfocus = null;
              btn.onblur = null;
            }
          });
      
          btnBasicAttack.onclick = () => performAction(battle.activeSide, 'basic');
      
          
      
          // --- DESPERTAR REQUIEM ---
          if (btnRequiem) {
            const activeSide = battle.activeSide;
            const canAwaken =
              !active.data.__isRequiemForm &&
              !active.__requiemTriggered &&
              active.data.requiemStandId &&
              roster.some((s) => s.id === active.data.requiemStandId && s.isRequiem);
      
            btnRequiem.hidden = !canAwaken;
            btnRequiem.onclick = () => triggerRequiem(activeSide);
          }
              // --- BOTONERA TÁCTICA ---
    const btnPass = document.getElementById('btnPassTurn');
    const btnDodge = document.getElementById('btnDodgeAction');
    const btnSurrender = document.getElementById('btnSurrenderAction');
    const dodgeMeta = document.getElementById('dodgeMeta');

    if (btnPass && btnDodge && btnSurrender) {
      const isFinished = battle.finished;
      const active = battle.activeSide === 'p1' ? battle.p1 : battle.p2;
      const dodgesLeft = Number(active.dodgesRemaining) || 0;

      btnPass.disabled = isFinished;
      btnSurrender.disabled = isFinished;
      btnDodge.disabled = isFinished || dodgesLeft <= 0;

      // Meta de usos restantes
      if (dodgeMeta) {
        dodgeMeta.textContent = `70% · ${dodgesLeft}/2`;
      }

      // Estado visual activo si el combatiente ya está en guardia
      if (active.isDodging) {
        btnDodge.classList.add('is-active');
      } else {
        btnDodge.classList.remove('is-active');
      }

      // Rebind (una sola vez, sin acumular listeners)
      btnPass.onclick = () => passTurnAction();
      btnDodge.onclick = () => dodgeAction();
      btnSurrender.onclick = () => surrenderAction();
    }
        }
          /* =========================================================
     EJECUCIÓN MODULAR DE HABILIDADES
     Despacha por (type, effect). Muta el estado battle.
     Devuelve { skipTurn, outcome } donde skipTurn indica que
     el turno fue consumido y no debe pasarse de nuevo.
     ========================================================= */
     function executeAbility(attackerSide, skillIndex) {
      
      if (!battle || battle.finished) return { skipTurn: true };
  
      const attacker = battle[attackerSide];
      const defenderSide = attackerSide === 'p1' ? 'p2' : 'p1';
      const defender = battle[defenderSide];
  
      if (!attacker || !defender) return { skipTurn: true };
  
      // --- GUARDS de estructura de estado ---
      if (!Array.isArray(attacker.cooldowns)) attacker.cooldowns = [0, 0, 0, 0, 0];
      if (!Array.isArray(defender.cooldowns)) defender.cooldowns = [0, 0, 0, 0, 0];
  
      if (!attacker.tempBuffs || typeof attacker.tempBuffs !== 'object') {
        attacker.tempBuffs = { damageMult: 1.0 };
      }
      if (!Number.isFinite(attacker.tempBuffs.damageMult)) {
        attacker.tempBuffs.damageMult = 1.0;
      }
  
      if (!defender.tempBuffs || typeof defender.tempBuffs !== 'object') {
        defender.tempBuffs = { damageMult: 1.0 };
      }
      if (!Number.isFinite(defender.tempBuffs.damageMult)) {
        defender.tempBuffs.damageMult = 1.0;
      }
  
      if (!Array.isArray(attacker.statusEffects)) attacker.statusEffects = [];
      if (!Array.isArray(defender.statusEffects)) defender.statusEffects = [];
  
      if (!Number.isFinite(attacker.currentShield)) attacker.currentShield = 0;
      if (!Number.isFinite(defender.currentShield)) defender.currentShield = 0;
  
      if (typeof attacker.reflectActive !== 'boolean') attacker.reflectActive = false;
      if (typeof defender.reflectActive !== 'boolean') defender.reflectActive = false;
  
      const ability = attacker.data.abilities[skillIndex];
      if (!ability) {
        battle.busy = false;
        return { skipTurn: true };
      }
  
      const role = ability.type || 'damage';
      const effect = ability.effect || DEFAULT_EFFECT_BY_ROLE[role];
      const actionName = ability.name || `Habilidad ${skillIndex + 1}`;
  
      // Cooldown (guardamos CD+1 por el turno actual)
      attacker.cooldowns[skillIndex] = (Number(ability.cooldown) || 0) + 1;

        // --- SEGUROS ANTI-CHISPAS ---
        if (role === 'heal' && effect === 'heal' && attacker.hp >= attacker.maxHp) {
          pushLog({
            side: attackerSide,
            type: '',
            html: `⚠ <strong>${escapeHtml(attacker.data.standName)}</strong> intenta curar pero su HP ya está al máximo. <strong>Acción cancelada.</strong>`
          });
    
          // Devolver el cooldown consumido
          attacker.cooldowns[skillIndex] = Math.max(0, attacker.cooldowns[skillIndex] - 1);
    
          // Desbloquear la UI: el jugador sigue en su turno
          battle.busy = false;
          renderBattleUI();
          updateActionPanel();
          SoundManager.playHit && null; // (opcional, sin sonido)
    
          return { skipTurn: true, cancelled: true };
        }
    
        if (role === 'shield' && (attacker.currentShield > 0 || attacker.shield)) {
          pushLog({
            side: attackerSide,
            type: '',
            html: `⚠ <strong>${escapeHtml(attacker.data.standName)}</strong> ya tiene una defensa activa. <strong>Acción cancelada.</strong>`
          });
    
          // Devolver el cooldown consumido
          attacker.cooldowns[skillIndex] = Math.max(0, attacker.cooldowns[skillIndex] - 1);
    
          // Desbloquear la UI: el jugador sigue en su turno
          battle.busy = false;
          renderBattleUI();
          updateActionPanel();
    
          return { skipTurn: true, cancelled: true };
        }

    const attackerEl = attackerSide === 'p1' ? fighterP1 : fighterP2;
    const defenderEl = defenderSide === 'p1' ? fighterP1 : fighterP2;
    const cryText = attacker.data.battleCry
      ? `<span class="log-entry__cry">“${escapeHtml(attacker.data.battleCry)}”</span>`
      : '';

    /* ============================
       ROL: HEAL / SOPORTE
       ============================ */
    if (role === 'heal') {
      if (effect === 'heal') {
        // El campo `damage` funciona como % de curación (ej. 15 = 15% del maxHp)
        const customPct = Number(ability.damage) || Number(ability.power) || 20;
        const rawHeal = Math.round(attacker.maxHp * (customPct / 100));

        const before = attacker.hp;
        attacker.hp = Math.min(attacker.maxHp, attacker.hp + rawHeal);
        const healed = attacker.hp - before;

        attackerEl.classList.add('is-healing');
        SoundManager.playHeal(); // --- SFX curación ---
        setTimeout(() => attackerEl.classList.remove('is-healing'), 1000);

        if (healed > 0) {
          const healFloat = document.createElement('div');
          healFloat.className = 'damage-float damage-float--heal';
          healFloat.textContent = `+${healed}`;
          attackerEl.appendChild(healFloat);
          setTimeout(() => healFloat.remove(), 1200);
        }

        updateHpBar(attackerSide);

        pushLog({
          side: attackerSide,
          type: 'heal',
          html: `<strong>${escapeHtml(attacker.data.standName)}</strong> usa <em>${escapeHtml(actionName)}</em> ` +
                `y recupera <span style="color:var(--ready-hi);font-weight:700;">+${healed}</span> HP ` +
                `<span style="color:var(--ink-3);">(${customPct}% del máximo)</span>.${cryText}`
        });

        return { skipTurn: false };
      }

      if (effect === 'cleanse') {
        const hadEffects = attacker.statusEffects.length > 0;
        attacker.statusEffects = [];

        const healPct = CLEANSE_HEAL_PCT;
        const rawHeal = Math.round(attacker.maxHp * healPct);
        const before = attacker.hp;
        attacker.hp = Math.min(attacker.maxHp, attacker.hp + rawHeal);
        const healed = attacker.hp - before;

        attackerEl.classList.add('is-healing');
        SoundManager.playHeal(); // --- SFX purificación (reutiliza curación) ---
        setTimeout(() => attackerEl.classList.remove('is-healing'), 1000);

        if (healed > 0) {
          const healFloat = document.createElement('div');
          healFloat.className = 'damage-float damage-float--heal';
          healFloat.textContent = `+${healed}`;
          attackerEl.appendChild(healFloat);
          setTimeout(() => healFloat.remove(), 1200);
        }

        updateHpBar(attackerSide);
        pushLog({
          side: attackerSide,
          type: 'cleanse',
          html: `✧ <strong>${escapeHtml(attacker.data.standName)}</strong> usa <em>${escapeHtml(actionName)}</em>. ¡Se han purificado todas las toxinas y estados negativos! ${healed > 0 ? `Recupera <span style="color:var(--ready-hi);font-weight:700;">+${healed}</span> HP.` : ''}${hadEffects ? '' : ' (No había estados que limpiar.)'}${cryText}`
        });
        return { skipTurn: false };
      }

      if (effect === 'buff') {
        attacker.tempBuffs.damageMult = (attacker.tempBuffs.damageMult || 1.0) + BUFF_STEP;
        const pct = Math.round((attacker.tempBuffs.damageMult - 1) * 100);

        attackerEl.classList.add('is-healing');
        setTimeout(() => attackerEl.classList.remove('is-healing'), 1000);

        pushLog({
          side: attackerSide,
          type: 'buff',
          html: `▲ <strong>${escapeHtml(attacker.data.standName)}</strong> usa <em>${escapeHtml(actionName)}</em>. ¡Crecimiento Progresivo! Daño aumentado a <strong>+${pct}%</strong> este combate.${cryText}`
        });
        return { skipTurn: false };
      }
    }

    /* ============================
       ROL: SHIELD / ESCUDO
       ============================ */
    if (role === 'shield') {
      if (effect === 'shield_flat') {
        const shieldValue = Math.round(attacker.maxHp * 0.35);
        attacker.currentShield = (attacker.currentShield || 0) + shieldValue;
        attacker.shield = true;

        attackerEl.classList.add('is-shielding', 'has-shield');
        setTimeout(() => attackerEl.classList.remove('is-shielding'), 1000);

        pushLog({
          side: attackerSide,
          type: 'shield',
          html: `🛡 <strong>${escapeHtml(attacker.data.standName)}</strong> activa <em>${escapeHtml(actionName)}</em>. <strong>Barrera +${shieldValue}</strong> absorbe el próximo daño.${cryText}`
        });
        attacker.cooldowns[skillIndex] = (Number(ability.cooldown) || 0) + 1;
        battle.busy = false;
        if (typeof updateActionPanel === 'function') updateActionPanel();
        return { skipTurn: true };
      }

      if (effect === 'reflect') {
        const shieldValue = Math.round(attacker.maxHp * 0.25);
        attacker.currentShield = (attacker.currentShield || 0) + shieldValue;
        attacker.shield = true;
        attacker.reflectActive = true;

        attackerEl.classList.add('is-shielding', 'has-shield');
        setTimeout(() => attackerEl.classList.remove('is-shielding'), 1000);

        pushLog({
          side: attackerSide,
          type: 'reflect',
          html: `✧ <strong>${escapeHtml(attacker.data.standName)}</strong> activa <em>${escapeHtml(actionName)}</em>. <strong>Coraza Reflejante</strong> devolverá 30% del daño.${cryText}`
        });
        attacker.cooldowns[skillIndex] = (Number(ability.cooldown) || 0) + 1;
        battle.busy = false;
        if (typeof updateActionPanel === 'function') updateActionPanel();
        return { skipTurn: true };
      }
    }


    /* ============================
       ROL: DAMAGE / ATAQUE
       ============================ */
    if (role === 'damage') {
      // Chequeo de precisión
      const acc = clampNumber(ability.accuracy, 10, 100, 100);
      const roll = Math.random() * 100;

      if (roll > acc) {
        attackerEl.classList.add('is-attacking');
        setTimeout(() => attackerEl.classList.remove('is-attacking'), 500);

        pushLog({
          side: attackerSide,
          type: 'miss',
          html: `<strong>${escapeHtml(attacker.data.standName)}</strong> intenta <em>${escapeHtml(actionName)}</em> pero <span style="color:#b8b8b8;font-weight:700;">falla por precisión (${Math.round(acc)}%).</span>${cryText}`
        });
        return { skipTurn: false };
      }
      // Asegurar que siempre existan los objetos de combate
      attacker.tempBuffs = attacker.tempBuffs || { damageMult: 1.0 };
      defender.tempBuffs = defender.tempBuffs || { damageMult: 1.0 };
      attacker.statusEffects = attacker.statusEffects || [];
      defender.statusEffects = defender.statusEffects || [];
      defender.currentShield = defender.currentShield || 0;
      // --- INTERCEPCIÓN DE ESQUIVE TOTAL ---
      if (defender.isDodging) {
        defender.isDodging = false;

        if (defenderEl) {
          defenderEl.classList.remove('is-dodging');
          defenderEl.classList.add('is-dodging'); // re-disparar animación
          setTimeout(() => defenderEl.classList.remove('is-dodging'), 800);
        }

        // Animación de ataque del atacante (falla)
        attackerEl.classList.add('is-attacking');
        setTimeout(() => attackerEl.classList.remove('is-attacking'), 500);

        pushLog({
          side: defenderSide,
          type: 'tactical-dodge-success',
          html: `💨 <strong>${escapeHtml(defender.data.standName)}</strong> esquivó por completo el ataque de ` +
                `<strong>${escapeHtml(attacker.data.standName)}</strong> gracias a sus reflejos.`
        });

        // Terminar turno sin daño
        battle.busy = false;
        passTurn();
        return { skipTurn: true };
      }
      // Cálculo base con buff
      const buffMult = attacker.tempBuffs?.damageMult ?? 1.0;
      let baseDamage = Number(ability.damage) || 30;
      const pwrBonus = PWR_BASIC_BONUS[attacker.data.stats.power] || 0;
      baseDamage += pwrBonus * 0.6;
      baseDamage *= buffMult;

      // Terreno
      const terrainMult = getTerrainMultiplier(attacker.data, attacker);
      baseDamage *= terrainMult;

      // Crítico
      const crit = Math.random() < getCritChance(attacker.data.stats.precision);
      if (crit) baseDamage *= CRIT_MULTIPLIER;

      // Reducción por durabilidad del defensor
      baseDamage *= (1 - getDurReduction(defender.data.stats.durability));

      let finalDamage = Math.max(1, Math.round(baseDamage));

                  // --- APLICAR DAÑO con interacción de escudo reflejante ---
      // REGLA: el escudo absorbe hasta el 50% del daño entrante.
      // El otro 50% penetra directamente al HP del defensor.
      const wasReflecting = defender.reflectActive;
      let absorbed = 0;
      let damageToHp = finalDamage;

      if (defender.currentShield > 0) {
        const maxAbsorb = Math.round(finalDamage * 0.5);
        absorbed = Math.min(defender.currentShield, maxAbsorb);
        defender.currentShield = Math.max(0, defender.currentShield - absorbed);
        damageToHp = Math.max(0, finalDamage - absorbed);

        if (defender.currentShield <= 0) {
          defender.shield = false;
          defenderEl.classList.remove('has-shield');
        }
      }

      // Impacto visual
      attackerEl.classList.add('is-attacking');
      setTimeout(() => attackerEl.classList.remove('is-attacking'), 500);

      const impact = () => {
        // --- SFX ---
        if (crit) {
          SoundManager.playCrit();
        } else {
          SoundManager.playHit();
        }

        defender.hp = Math.max(0, defender.hp - damageToHp);
        attacker.totalDamage += damageToHp;

        defenderEl.classList.add('is-hit');
        if (crit) defenderEl.classList.add('is-crit');
        setTimeout(() => {
          defenderEl.classList.remove('is-hit');
          defenderEl.classList.remove('is-crit');
        }, 650);

                if (damageToHp > 0) showDamageFloat(defenderEl, damageToHp, crit);
        updateHpBar(defenderSide);

        // --- Efectos de estado ---
        let effectLog = '';

        if (effect === 'poison') {
          const poisonValue = Math.round((ability.damage || 30) * POISON_RATIO);
          defender.statusEffects.push({
            type: 'poison',
            duration: POISON_DURATION,
            value: poisonValue
          });
          effectLog = ` <span style="color:#a5e87a;font-weight:700;">☠ Envenenado (${POISON_DURATION} turnos)</span>`;
        } else if (effect === 'stun') {
          const stunChance = clampNumber(acc, 10, 100, 100) * 0.65;
          if (Math.random() * 100 <= stunChance) {
            defender.statusEffects.push({ type: 'stun', duration: 1, value: 0 });
            effectLog = ` <span style="color:#ffd166;font-weight:700;">⚡ Aturdido</span>`;
          } else {
            effectLog = ` <span style="color:var(--ink-3);">(aturdimiento falló)</span>`;
          }
        }

        const bonusPct = Math.round((terrainMult - 1) * 100);

        let affinityDetail = '';
        if (battle.stage && Math.abs(bonusPct) > 0) {
          let stage = battle.stage;
          const normalizeFn = window.JJA_EventsData && window.JJA_EventsData.normalizeArena;
          if (typeof normalizeFn === 'function') stage = normalizeFn(stage) || stage;

          const affinity = String(attacker.data.affinity || '').trim();
          const matchedFav = (stage.favorableAffinities || []).find(
            (f) => String(f.affinity).trim() === affinity
          );
          const matchedUnfav = (stage.unfavorableAffinities || []).find(
            (f) => String(f.affinity).trim() === affinity
          );
          const names = [];
          if (matchedFav) names.push(matchedFav.affinity);
          if (matchedUnfav) names.push(matchedUnfav.affinity);
          if (names.length) affinityDetail = ` · ${names.join(' / ')}`;
        }

        let bonusTag = '';
        if (bonusPct > 0) bonusTag = ` <span style="color:var(--ready-hi);font-weight:700;">[+${bonusPct}% Terreno${affinityDetail}]</span>`;
        else if (bonusPct < 0) bonusTag = ` <span style="color:#ff8a70;font-weight:700;">[${bonusPct}% Terreno${affinityDetail}]</span>`;

        const critTag = crit ? ' <span style="color:var(--danger-hi);font-weight:700;">¡CRÍTICO!</span>' : '';
        const shieldTag = absorbed > 0
        ? ` <span style="color:#9ec7e0;">(${absorbed} absorbido · ${damageToHp} al HP)</span>`
        : '';

        pushLog({
          side: attackerSide,
          type: crit ? 'crit' : (bonusPct > 0 ? 'bonus' : ''),
          html: `<strong>${escapeHtml(attacker.data.standName)}</strong> usa <em>${escapeHtml(actionName)}</em> causando <span class="log-entry__dmg${crit ? ' log-entry__dmg--crit' : ''}">${finalDamage}</span> de daño.${shieldTag}${bonusTag}${critTag}${effectLog}${cryText}`
        });

        // --- Reflejo ---
        if (wasReflecting && finalDamage > 0) {
          const reflected = Math.round(finalDamage * REFLECT_RATIO);
          attacker.hp = Math.max(0, attacker.hp - reflected);
          updateHpBar(attackerSide);
          attackerEl.classList.add('is-hit');
          setTimeout(() => attackerEl.classList.remove('is-hit'), 600);
          showDamageFloat(attackerEl, reflected, false);

          pushLog({
            side: defenderSide,
            type: 'reflect',
            html: `✧ <strong>${escapeHtml(defender.data.standName)}</strong> refleja <span class="log-entry__dmg">${reflected}</span> de daño a <strong>${escapeHtml(attacker.data.standName)}</strong>.`
          });

          if (attacker.hp <= 0) {
            battle.finished = true;
            pushLog({
              side: defenderSide,
              type: 'ko',
              html: `¡K.O. por reflejo! <strong>${escapeHtml(defender.data.standName)}</strong> gana el combate.`
            });
            renderBattleUI();
            updateActionPanel();
            setTimeout(() => showVictoryModal(defenderSide), 900);
            return;
          }
        }

        // Consumir reflect (una sola vez)
        if (wasReflecting) {
          defender.reflectActive = false;
        }

        // --- K.O. del defensor ---
        if (defender.hp <= 0) {
          battle.finished = true;
          pushLog({
            side: attackerSide,
            type: 'ko',
            html: `¡K.O.! <strong>${escapeHtml(attacker.data.standName)}</strong> se alza con la victoria.`
          });
          renderBattleUI();
          updateActionPanel();
          setTimeout(() => showVictoryModal(attackerSide), 900);
          return;
        }

        // Terminar el turno
        battle.busy = false;
        passTurn();
      };

      setTimeout(impact, 320);
      return { skipTurn: true }; // ya manejamos passTurn dentro del timeout
    }

    // Fallback: no debería llegar aquí
    return { skipTurn: false };
  }
          /* =========================================================
     DESPERTAR REQUIEM
     Transforma al combatiente activo en su Forma Requiem vinculada.
     - Reemplaza datos del fighter en battle (sin tocar roster base)
     - Restaura HP al del Requiem
     - Registra en el log
     - Se usa UNA sola vez por combate por bando
     ========================================================= */
  function triggerRequiem(side) {
    if (!battle || battle.finished || battle.busy) return;

    const fighter = battle[side];
    if (!fighter) return;
    if (fighter.__requiemTriggered) return;
    if (!fighter.data.requiemStandId) return;

    const requiemData = roster.find((s) => s.id === fighter.data.requiemStandId && s.isRequiem);
    if (!requiemData) {
      toast('La Forma Requiem vinculada no existe o fue eliminada.', 'error');
      return;
    }

    battle.busy = true;

    const oldName = fighter.data.standName;

    // --- Reemplazar datos ---
    fighter.data = {
      ...requiemData,
      // Conservamos afinidad, etc. tal cual del Requiem
      __requiemOf: fighter.data.id
    };

    // HP: recalcular desde el Requiem
    const newMaxHp = computeHP(requiemData.stats.durability, requiemData.level || DEFAULT_LEVEL);
    fighter.maxHp = newMaxHp;
    fighter.hp = newMaxHp;

    // Reset cooldowns para que pueda usar sus habilidades Requiem
    fighter.cooldowns = [0, 0, 0, 0, 0];

    // Marcar para no volver a usarlo
    fighter.__requiemTriggered = true;
    fighter.__isRequiemForm = true;

    // --- Efecto visual ---
    const fighterEl = side === 'p1' ? fighterP1 : fighterP2;
    fighterEl.classList.add('is-requiem-awakening');
    setTimeout(() => fighterEl.classList.remove('is-requiem-awakening'), 1700);

    // --- Log ---
    pushLog({
      side,
      type: 'requiem',
      html: `✧ <strong>${escapeHtml(oldName)}</strong> ha sido atravesado por la Flecha. ` +
            `¡Despierta <strong>${escapeHtml(requiemData.standName)}</strong>!`
    });

    // --- Refrescar UI ---
    renderBattleUI();
    updateHpBar(side);
    updateActionPanel();

    // Pequeño beat dramático antes de devolver el control
    setTimeout(() => {
      battle.busy = false;
    }, 900);
  }
    
  function disableAllActions() {
    const allBtns = [btnBasicAttack, skillBtn0, skillBtn1, skillBtn2, skillBtn3, skillBtn4];
    allBtns.forEach((b) => {
      if (b) b.disabled = true;
    });

    // Tácticas
    const btnPass = document.getElementById('btnPassTurn');
    const btnDodge = document.getElementById('btnDodgeAction');
    const btnSurrender = document.getElementById('btnSurrenderAction');
    if (btnPass) btnPass.disabled = true;
    if (btnDodge) btnDodge.disabled = true;
    if (btnSurrender) btnSurrender.disabled = true;
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
      
          // Marcar perdedor y ganador (solo Battle Royale)
          markDefeated(loser.data.id);
          markWinner(winner.data.id);
      
          // Persistir HP del ganador
          const winnerIdx = roster.findIndex((s) => s.id === winner.data.id);
          if (winnerIdx >= 0) {
            roster[winnerIdx].lastHp = winner.hp;
          }
          saveRoster();
      
          // Refrescar estado del torneo
          if (currentMode === 'royale') {
            tournamentRound++;
            saveMode();
            updateTournamentStatus();
            renderGallery();
            checkTournamentEnd();
            updateTournamentStatus();
            renderGallery();
          }
      
          // =========================================================
          // DETECCIÓN DE FIN DE TORNEO → MODAL DE CAMPEÓN
          // =========================================================
          if (currentMode === 'royale') {
            const aliveBase = roster.filter((s) => !s.isRequiem && s.tournamentState !== STAND_STATE.RETIRED);
            const allRetired = roster.every((s) => s.isRequiem || s.tournamentState === STAND_STATE.RETIRED);
            const oneSurvivor = aliveBase.length === 1;
      
            if (allRetired || oneSurvivor) {
              // Coronamos al ganador del último combate (o al único superviviente)
              const champion = oneSurvivor ? aliveBase[0] : winner.data;
      
              // Actualizar fase a CHAMPION
              tournamentPhase = PHASE.CHAMPION;
              saveMode();
      
              // Abrir modal de campeón
              closeVictoryModal();
              openChampionModal(champion);
              return;
            }
          }
      
          // Si no es fin de torneo, mostrar modal de victoria normal
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
      
          victoryBackdrop.hidden = false;
        }
              // Actualizar el estado del torneo (puede cambiar de fase)
            if (currentMode === 'royale') {
              tournamentRound++;
              saveMode();
              updateTournamentStatus();
              renderGallery();
              checkTournamentEnd();
              updateTournamentStatus();
              renderGallery();
            }
    
      function closeVictoryModal() {
        victoryBackdrop.hidden = true;
      }
      /* =========================================================
     APERTURA DEL MODAL DE CAMPEÓN
     Acepta un Stand (objeto roster) o su id.
     ========================================================= */
  function openChampionModal(standOrId) {
    let survivor = null;
    if (typeof standOrId === 'string') {
      survivor = roster.find((s) => s.id === standOrId) || null;
    } else if (standOrId && typeof standOrId === 'object') {
      // Si viene de battle (winner.data), re-buscamos en roster para datos frescos
      survivor = roster.find((s) => s.id === standOrId.id) || standOrId;
    }

    if (!survivor) {
      // Fallback: único no-retirado
      survivor = roster.find((s) => !s.isRequiem && s.tournamentState !== STAND_STATE.RETIRED) || null;
    }
    if (!survivor) return;

    // --- Rellenar campos del modal ---
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

    // HP final: el guardado en lastHp o el máximo calculado
    const maxHp = computeHP(survivor.stats.durability, survivor.level || DEFAULT_LEVEL);
    const finalHp = (typeof survivor.lastHp === 'number' && survivor.lastHp >= 0)
      ? survivor.lastHp
      : maxHp;
    championHp.textContent = `${finalHp} / ${maxHp}`;

    // Daño total acumulado en el torneo
    const totalDamage = Number(survivor.tournamentDamage) || 0;
    championDamage.textContent = totalDamage > 0 ? String(totalDamage) : '0';

    // Combates disputados
    const battlesCount = Number(survivor.tournamentBattles) || 0;
    championBattles.textContent = String(battlesCount);

    // --- Abrir modal ---
    championBackdrop.hidden = false;
    document.body.style.overflow = 'hidden';
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
     SOUND MANAGER — SFX sintetizados (Web Audio API)
     Sin dependencias externas. Volumen balanceado. Silencioso
     si el navegador bloquea el audio (catch silencioso).
     ========================================================= */
     const SoundManager = (function () {
      let ctx = null;
      let masterGain = null;
      let enabled = true;
  
      // Volumen global maestro (0..1)
      const MASTER_VOLUME = 0.35;
  
      function init() {
        if (ctx) return ctx;
        try {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) { enabled = false; return null; }
          ctx = new AC();
          masterGain = ctx.createGain();
          masterGain.gain.value = MASTER_VOLUME;
          masterGain.connect(ctx.destination);
        } catch (err) {
          enabled = false;
          ctx = null;
        }
        return ctx;
      }
  
      // Reanudar el contexto si el navegador lo suspendió (política de autoplay)
      function resume() {
        try {
          if (ctx && ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
          }
        } catch (_) { /* silencioso */ }
      }
  
      // Envolvente común: sube rápido y baja suave
      function envelope(gainNode, attack, decay, peak) {
        const now = ctx.currentTime;
        gainNode.gain.cancelScheduledValues(now);
        gainNode.gain.setValueAtTime(0.0001, now);
        gainNode.gain.exponentialRampToValueAtTime(peak, now + attack);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + attack + decay);
      }
  
      // Generador de ruido blanco corto (para impactos)
      function makeNoiseBuffer(durationSec) {
        const length = Math.floor(ctx.sampleRate * durationSec);
        const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i++) {
          data[i] = (Math.random() * 2 - 1) * (1 - i / length);
        }
        return buffer;
      }
  
      /* -------- SFX: GOLPE NORMAL -------- */
      function playHit() {
        if (!enabled) return;
        try {
          if (!init()) return;
          resume();
          const now = ctx.currentTime;
  
          // Capa 1: thump grave (seno descendente)
          const osc = ctx.createOscillator();
          const gOsc = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(180, now);
          osc.frequency.exponentialRampToValueAtTime(60, now + 0.18);
          envelope(gOsc, 0.005, 0.18, 0.9);
          osc.connect(gOsc).connect(masterGain);
          osc.start(now);
          osc.stop(now + 0.22);
  
          // Capa 2: ruido blanco filtrado (click de impacto)
          const noise = ctx.createBufferSource();
          noise.buffer = makeNoiseBuffer(0.12);
          const bp = ctx.createBiquadFilter();
          bp.type = 'bandpass';
          bp.frequency.value = 1200;
          bp.Q.value = 1.2;
          const gNoise = ctx.createGain();
          envelope(gNoise, 0.002, 0.10, 0.35);
          noise.connect(bp).connect(gNoise).connect(masterGain);
          noise.start(now);
          noise.stop(now + 0.14);
        } catch (_) { /* silencioso */ }
      }
  
      /* -------- SFX: CRÍTICO -------- */
      function playCrit() {
        if (!enabled) return;
        try {
          if (!init()) return;
          resume();
          const now = ctx.currentTime;
  
          // Base de golpe más potente
          const osc = ctx.createOscillator();
          const gOsc = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(260, now);
          osc.frequency.exponentialRampToValueAtTime(55, now + 0.28);
          envelope(gOsc, 0.003, 0.30, 1.0);
          osc.connect(gOsc).connect(masterGain);
          osc.start(now);
          osc.stop(now + 0.34);
  
          // Ruido agudo (shing)
          const noise = ctx.createBufferSource();
          noise.buffer = makeNoiseBuffer(0.2);
          const hp = ctx.createBiquadFilter();
          hp.type = 'highpass';
          hp.frequency.value = 2200;
          const gNoise = ctx.createGain();
          envelope(gNoise, 0.002, 0.16, 0.55);
          noise.connect(hp).connect(gNoise).connect(masterGain);
          noise.start(now);
          noise.stop(now + 0.24);
  
          // Barrido ascendente "flash" (para sensación de potencia)
          const flash = ctx.createOscillator();
          const gFlash = ctx.createGain();
          flash.type = 'triangle';
          flash.frequency.setValueAtTime(600, now);
          flash.frequency.exponentialRampToValueAtTime(1800, now + 0.15);
          envelope(gFlash, 0.005, 0.15, 0.28);
          flash.connect(gFlash).connect(masterGain);
          flash.start(now);
          flash.stop(now + 0.22);
        } catch (_) { /* silencioso */ }
      }
  
      /* -------- SFX: CURACIÓN / SOPORTE -------- */
      function playHeal() {
        if (!enabled) return;
        try {
          if (!init()) return;
          resume();
          const now = ctx.currentTime;
  
          // Dos notas ascendentes suaves (Do → Sol)
          [523.25, 783.99].forEach((freq, i) => {
            const t = now + i * 0.08;
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.value = freq;
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
            osc.connect(g).connect(masterGain);
            osc.start(t);
            osc.stop(t + 0.4);
          });
        } catch (_) { /* silencioso */ }
      }
  
      /* -------- SFX: TICK DE RULETA -------- */
      function playTick() {
        if (!enabled) return;
        try {
          if (!init()) return;
          resume();
          const now = ctx.currentTime;
  
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(1400, now);
          osc.frequency.exponentialRampToValueAtTime(900, now + 0.03);
          envelope(g, 0.001, 0.03, 0.18);
          osc.connect(g).connect(masterGain);
          osc.start(now);
          osc.stop(now + 0.04);
        } catch (_) { /* silencioso */ }
      }
  
      /* -------- SFX: DETENCIÓN DE RULETA / VICTORIA -------- */
      function playReveal() {
        if (!enabled) return;
        try {
          if (!init()) return;
          resume();
          const now = ctx.currentTime;
  
          // Acorde ascendente (Do - Mi - Sol)
          [523.25, 659.25, 783.99].forEach((freq, i) => {
            const t = now + i * 0.06;
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.value = freq;
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(0.4, t + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
            osc.connect(g).connect(masterGain);
            osc.start(t);
            osc.stop(t + 0.55);
          });
        } catch (_) { /* silencioso */ }
      }
  
      /* -------- CONTROLES PÚBLICOS -------- */
      function setVolume(v) {
        try {
          if (!init()) return;
          const clamped = Math.max(0, Math.min(1, Number(v) || 0));
          masterGain.gain.value = clamped;
        } catch (_) { /* silencioso */ }
      }
  
      function setEnabled(state) {
        enabled = !!state;
      }
  
      function isEnabled() {
        return enabled;
      }
  
      // Desbloquear el AudioContext en la primera interacción del usuario
      function unlock() {
        try {
          if (!init()) return;
          resume();
        } catch (_) { /* silencioso */ }
      }
  
      return {
        playHit,
        playCrit,
        playHeal,
        playTick,
        playReveal,
        setVolume,
        setEnabled,
        isEnabled,
        unlock
      };
    })();
  
    // Desbloqueo perezoso: la primera interacción real con el documento
    // habilita el AudioContext en navegadores con autoplay restringido.
    ['click', 'keydown', 'touchstart'].forEach((evt) => {
      document.addEventListener(evt, function once() {
        SoundManager.unlock();
        document.removeEventListener(evt, once);
      }, { once: true, passive: true });
    });

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
      { name: 'Golpe Veloz',       type: 'damage', damage: 32, cooldown: 1, accuracy: 100, description: 'Ráfaga de golpes a velocidad luz que desorienta al rival.' },
      { name: 'Contraataque',      type: 'damage', damage: 40, cooldown: 2, accuracy: 95,  description: 'Aprovecha el descuido del enemigo para devolverle el impacto.' },
      { name: 'Segundo Aliento',   type: 'heal',   damage: 15, cooldown: 3, accuracy: 100, description: 'Recupera fuerzas en pleno combate cerrando las heridas.' },
      { name: 'Guardia de Hierro', type: 'shield', damage: 15, cooldown: 2, accuracy: 100, description: 'Endurece la defensa absorbiendo el próximo golpe.' },
      { name: 'Onda Cortante',     type: 'damage', damage: 45, cooldown: 3, accuracy: 90,  description: 'Corte de energía concentrada que atraviesa la guardia.' },
      { name: 'Pulso Sanador',     type: 'heal',   damage: 15, cooldown: 3, accuracy: 100, description: 'Una onda recorre el Stand y recompone su estructura.' },
      { name: 'Rugido de Guerra',  type: 'shield', damage: 15, cooldown: 3, accuracy: 100, description: 'El grito del artista fortalece al Stand con una barrera sónica.' }
    ];
  
    const ARCHETYPE_CRIES = [
      '¡ORA ORA ORA!',
      '¡MUDA MUDA MUDA!',
      '¡DORARARA!',
      '¡WRYYYY!',
      '¡ARI ARI ARI!',
      '¡YO, DIO!'
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

    // Grito de batalla genérico
    const cryEl = col.querySelector('.dual-cry');
    if (cryEl && !cryEl.value) {
      cryEl.value = ARCHETYPE_CRIES[Math.floor(Math.random() * ARCHETYPE_CRIES.length)];
    }

    // Habilidades balanceadas
    const abilities = pickRandomAbilities();
    col.querySelectorAll('.dual-ability').forEach((row, i) => {
      const ab = abilities[i];
      if (!ab) return;
      row.querySelector('.dual-ab-name').value = ab.name;
      row.querySelector('.dual-ab-type').value = ab.type;
            // Repoblar el selector de efecto del dual según el tipo
            const effSel = row.querySelector('.dual-ab-effect');
            if (effSel) {
              const validEffects = EFFECT_OPTIONS[ab.type] || EFFECT_OPTIONS.damage;
              effSel.innerHTML = '';
              for (const opt of validEffects) {
                const el = document.createElement('option');
                el.value = opt.value;
                el.textContent = opt.label;
                effSel.appendChild(el);
              }
              effSel.value = DEFAULT_EFFECT_BY_ROLE[ab.type];
            }
      row.querySelector('.dual-ab-damage').value = ab.damage;
      row.querySelector('.dual-ab-cd').value = ab.cooldown;
      row.querySelector('.dual-ab-acc').value = ab.accuracy;
      const descEl = row.querySelector('.dual-ab-desc');
      if (descEl) descEl.value = ab.description || '';
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
  
      // Grito de batalla
      const cryEl = col.querySelector('.dual-cry');
      if (cryEl) cryEl.value = '';
  
      // Descripciones de habilidades
      col.querySelectorAll('.dual-ab-desc').forEach((d) => { d.value = ''; });
      

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
  
      const rawAbilities = Array.from(col.querySelectorAll('.dual-ability')).map((row) => {
        const type = row.querySelector('.dual-ab-type').value;
        const effectSel = row.querySelector('.dual-ab-effect');
        const validEffects = (EFFECT_OPTIONS[type] || []).map((o) => o.value);
        const effect = effectSel && validEffects.includes(effectSel.value)
          ? effectSel.value
          : DEFAULT_EFFECT_BY_ROLE[type];
  
        return {
          name: (row.querySelector('.dual-ab-name').value || '').trim(),
          type,
          effect,
          damage: clampNumber(row.querySelector('.dual-ab-damage').value, 15, 60, 30),
          cooldown: clampNumber(row.querySelector('.dual-ab-cd').value, 0, 5, 1),
          accuracy: clampNumber(row.querySelector('.dual-ab-acc').value, 10, 100, 100),
          description: (row.querySelector('.dual-ab-desc')?.value || '').trim()
        };
      });
  
      // Solo habilidades con nombre
      const abilities = rawAbilities.filter((a) => a.name.length > 0);
  
      return {
        artistName: (col.querySelector('.dual-artist').value || '').trim(),
        standName: (col.querySelector('.dual-name').value || '').trim(),
        affinity: col.querySelector('.dual-affinity').value,
        battleCry: (col.querySelector('.dual-cry')?.value || '').trim(),
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
  document.addEventListener('DOMContentLoaded', init);
      /* =========================================================
     API PÚBLICA PARA MÓDULOS EXTERNOS (events-roulette.js)
     ========================================================= */
  window.JJA_App = {
    getBattle: () => battle,
    applyEventToBattle: applyEventToBattle
  };
    /* =========================================================
     API DE ADMINISTRACIÓN (consola del navegador)
     Uso desde DevTools:
       window.reviveStand('Star Platinum')
       window.reviveStandClean('Jotaro')
       window.reviveStand('id-del-stand')
     ========================================================= */
     window.reviveStand = reviveStand;
     window.reviveStandClean = reviveStandClean;
     window.listTournamentStates = function () {
       console.table(roster.map((s) => ({
         id: s.id,
         stand: s.standName,
         artist: s.artistName,
         state: s.tournamentState,
         isDefeated: s.isDefeated
       })));
      }
  })();
  