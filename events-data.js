/* ============================================================
   JoJo Artist Arena — Módulo de Eventos de Arena
   events-data.js
   ------------------------------------------------------------
   Contiene:
   - Definiciones de eventos (id, nombre, descripción, icono, tipo)
   - Pesos de rareza (para ruleta ponderada)
   - Modificadores que se aplican al combate actual
   ------------------------------------------------------------
   Contrato con events-roulette.js:
   - Cada evento expone apply(battle) que MUTA el objeto battle.
   - apply() devuelve { log: string, side?: 'p1'|'p2'|'both', extra?: {...} }
     para que events-roulette muestre feedback en el battle log.
   ============================================================ */

   (function (global) {
    'use strict';
      /* Ruta base para iconos locales. Se concatena solo si el icon NO
     empieza por 'http', '/', './' o '../' y termina en extensión de imagen. */
  const ICON_BASE_PATH = 'icons/';
    /* =========================================================
       RAREZAS (peso en ruleta)
       ========================================================= */
    const RARITY = {
      COMMON:    { key: 'common',    label: 'Común',    weight: 40, color: '#cfc6b1' },
      UNCOMMON:  { key: 'uncommon',  label: 'Poco común', weight: 25, color: '#9ec7e0' },
      RARE:      { key: 'rare',      label: 'Raro',      weight: 15, color: '#c9a13a' },
      LEGENDARY: { key: 'legendary', label: 'Legendario', weight: 5,  color: '#e6c66a' }
    };
  
    /* =========================================================
       HELPERS INTERNOS (se exponen también por si events-roulette los necesita)
       ========================================================= */
    function clamp(v, min, max) {
      return Math.min(max, Math.max(min, v));
    }
  
    function percentHp(fighter, pct) {
      const delta = Math.round(fighter.maxHp * pct);
      fighter.hp = clamp(fighter.hp + delta, 0, fighter.maxHp);
      return Math.abs(delta);
    }
  
    function healFighter(fighter, amount) {
      const before = fighter.hp;
      fighter.hp = clamp(fighter.hp + amount, 0, fighter.maxHp);
      return fighter.hp - before;
    }
  
    /* =========================================================
       DEFINICIÓN DE EVENTOS
       =========================================================
       Cada evento:
       {
         id: string único
         name: string visible
         icon: emoji
         description: string largo (para el botón "Ver descripción")
         short: string corto (tooltip/lista)
         rarity: RARITY.*
         tags: ['offense'|'defense'|'chaos'|'heal'|'debuff'|...]
         apply(battle) -> { log, side, extra }
       }
       ========================================================= */
    const EVENTS = [
  
      /* -------- 1. INTERFERENCIA DE STANDS -------- */
      {
        id: 'stand-interference',
        color: '#f0c95f',    // dorado intenso
        name: 'Interferencia de Stands',
        icon: '⚡',                        // ⚡ U+26A1
        short: 'Ambos reciben 15% de daño residual.',
        description:
          'Una onda de estática atraviesa la arena. Las conexiones entre artista y Stand se ' +
          'fragmentan momentáneamente: ambos combatientes reciben un 15% de daño porcentual ' +
          'inmediato sobre su HP máximo. Ideal para acelerar combates largos.',
        rarity: RARITY.COMMON,
        tags: ['chaos', 'damage'],
        apply(battle) {
          const dmgP1 = percentHp(battle.p1, -0.15);
          const dmgP2 = percentHp(battle.p2, -0.15);
          return {
            side: 'both',
            log: `Onda de estática golpea la arena. <strong>${battle.p1.data.standName}</strong> y ` +
                 `<strong>${battle.p2.data.standName}</strong> reciben daño residual ` +
                 `(<span class="log-entry__dmg">-${dmgP1}</span> / <span class="log-entry__dmg">-${dmgP2}</span>).`,
            extra: { type: 'damage-both', dmgP1, dmgP2 }
          };
        }
      },
  
      /* -------- 2. SANTUARIO DEL HERIDO -------- */
      {
        id: 'healing-sanctuary',
        color: '#6cd18a',    // verde sanación
        name: 'Santuario del Herido',
        icon: '✨',                        // ✨ U+2728
        short: 'El más débil recupera 25% de HP.',
        description:
          'Una luz dorada emana del suelo de la arena, respondiendo al sufrimiento. El combatiente ' +
          'con menor HP porcentual recupera un 25% de su vida máxima. En caso de empate, ambos ' +
          'reciben la mitad del efecto.',
        rarity: RARITY.RARE,
        tags: ['heal'],
        apply(battle) {
          const p1Pct = battle.p1.hp / battle.p1.maxHp;
          const p2Pct = battle.p2.hp / battle.p2.maxHp;
  
          if (Math.abs(p1Pct - p2Pct) < 0.01) {
            const h1 = healFighter(battle.p1, Math.round(battle.p1.maxHp * 0.125));
            const h2 = healFighter(battle.p2, Math.round(battle.p2.maxHp * 0.125));
            return {
              side: 'both',
              log: `Luz dorada equilibra la balanza: ambos recuperan ` +
                   `<span style="color:var(--ready-hi);font-weight:700;">+${h1}</span> / ` +
                   `<span style="color:var(--ready-hi);font-weight:700;">+${h2}</span> HP.`,
              extra: { type: 'heal-both', h1, h2 }
            };
          }
  
          const weakest = p1Pct < p2Pct ? battle.p1 : battle.p2;
          const healed = healFighter(weakest, Math.round(weakest.maxHp * 0.25));
          return {
            side: weakest === battle.p1 ? 'p1' : 'p2',
            log: `El Santuario responde al más herido: <strong>${weakest.data.standName}</strong> ` +
                 `recupera <span style="color:var(--ready-hi);font-weight:700;">+${healed}</span> HP.`,
            extra: { type: 'heal-one', healed }
          };
        }
      },
  
      /* -------- 3. ECO DE DIO -------- */
      {
        id: 'dio-echo',
        color: '#c9a13a',    // dorado tiempo
        name: 'Eco de DIO',
        icon: '⏳',                        // ⏳ U+23F3
        short: 'Todos los cooldowns se congelan 1 turno extra.',
        description:
          'Un eco de risa resonante cruza el tiempo. Las habilidades en recarga sufren un turno ' +
          'extra de enfriamiento. Los ataques básicos no se ven afectados. Perfecto para forzar ' +
          'combates tácticos donde la paciencia gana.',
        rarity: RARITY.UNCOMMON,
        tags: ['debuff', 'cooldown'],
        apply(battle) {
          let affected = 0;
          [battle.p1, battle.p2].forEach((fighter) => {
            fighter.cooldowns = fighter.cooldowns.map((cd) => {
              if (cd > 0) { affected++; return cd + 1; }
              return cd;
            });
          });
          return {
            side: 'both',
            log: `El <strong>Eco de DIO</strong> distorsiona el tiempo: ` +
                 `<strong>${affected}</strong> habilidad(es) en recarga se congelan un turno extra.`,
            extra: { type: 'cooldown-freeze', affected }
          };
        }
      },
  
      /* -------- 4. TERRENO RECLAMADO -------- */
      {
        id: 'claimed-ground',
        color: '#9ec7e0',    // azul terreno
        name: 'Terreno Reclamado',
        icon: '🛡️',                       // 🛡️ U+1F6E1 + U+FE0F
        short: 'Doble bonus (+30%) al Stand que coincide con la afinidad del escenario.',
        description:
          'El escenario reconoce a su legítimo dueño. Si algún combatiente comparte afinidad con ' +
          'el terreno actual, su bonus elemental se DUPLICA (+30% en total) durante todo el resto ' +
          'del combate. Si nadie coincide, no ocurre nada.',
        rarity: RARITY.RARE,
        tags: ['buff', 'terrain'],
        apply(battle) {
          if (!battle.stage || !battle.stage.affinity) {
            return {
              side: 'both',
              log: `El terreno no responde: nadie comparte su afinidad.`,
              extra: { type: 'terrain-noop' }
            };
          }
          const affected = [];
          [battle.p1, battle.p2].forEach((fighter) => {
            if (fighter.data.affinity === battle.stage.affinity) {
              affected.push(fighter.data.standName);
              fighter.terrainBoost = 0.30; // se leerá en app.js al calcular daño
            }
          });
  
          if (affected.length === 0) {
            return {
              side: 'both',
              log: `El terreno busca a su dueño… pero nadie responde.`,
              extra: { type: 'terrain-noop' }
            };
          }
  
          return {
            side: 'both',
            log: `¡El terreno reclama a <strong>${affected.join('</strong> y <strong>')}</strong>! ` +
                 `Bonus elemental <strong>duplicado a +30%</strong>.`,
            extra: { type: 'terrain-boost', targets: affected }
          };
        }
      },
  
      /* -------- 5. SILENCIO DE HIERRO -------- */
      {
        id: 'iron-silence',
        color: '#8d8574',    // gris hierro
        name: 'Silencio de Hierro',
        icon: '⛓️',                       // ⛓️ U+26D3 + U+FE0F
        short: 'Ataques básicos bloqueados por 1 turno a ambos.',
        description:
          'Una niebla metálica paraliza los puños. Durante el siguiente turno, NINGÚN combatiente ' +
          'puede usar Ataque Básico: solo habilidades. Útil para forzar decisiones creativas.',
        rarity: RARITY.UNCOMMON,
        tags: ['debuff', 'chaos'],
        apply(battle) {
          battle.basicAttackLocked = 1; // turnos restantes
          return {
            side: 'both',
            log: `¡<strong>Silencio de Hierro</strong>! Ataques básicos bloqueados por 1 turno. ` +
                 `Solo habilidades disponibles.`,
            extra: { type: 'basic-lock', turns: 1 }
          };
        }
      },
  
      /* -------- 6. RESONANCIA DE ALMAS -------- */
      {
        id: 'soul-resonance',
        color: '#d44fa0',    // magenta alma
        name: 'Resonancia de Almas',
        icon: '💫',                        // 💫 U+1F4AB
        short: 'El Stand con mayor HP recibe 20% daño; el menor es curado 20%.',
        description:
          'Las almas de los combatientes se enlazan. El que está ganando paga un precio, el que ' +
          'está perdiendo recibe alivio. Justicia kármica aplicada a la arena.',
        rarity: RARITY.COMMON,
        tags: ['chaos', 'balance'],
        apply(battle) {
          const p1Pct = battle.p1.hp / battle.p1.maxHp;
          const p2Pct = battle.p2.hp / battle.p2.maxHp;
          const stronger = p1Pct >= p2Pct ? battle.p1 : battle.p2;
          const weaker   = stronger === battle.p1 ? battle.p2 : battle.p1;
  
          const dmg = percentHp(stronger, -0.20);
          const healed = healFighter(weaker, Math.round(weaker.maxHp * 0.20));
  
          return {
            side: 'both',
            log: `Karma de la arena: <strong>${stronger.data.standName}</strong> paga ` +
                 `<span class="log-entry__dmg">-${dmg}</span> y <strong>${weaker.data.standName}</strong> ` +
                 `recibe <span style="color:var(--ready-hi);font-weight:700;">+${healed}</span> HP.`,
            extra: { type: 'karma', dmg, healed }
          };
        }
      },
  
      /* -------- 7. FRACTURA DIMENSIONAL -------- */
      {
        id: 'dimensional-fracture',
        color: '#5a4f8a',    // violeta dimensional
        name: 'Fractura Dimensional',
        icon: '🌌',                        // 🌌 U+1F30C
        short: 'Se intercambian las afinidades de ambos combatientes.',
        description:
          'Una grieta atraviesa el espacio-tiempo. Las afinidades de los dos Stands se intercambian ' +
          'por el resto del combate. Si el escenario otorgaba bonus a uno, ahora lo otorgará al otro.',
        rarity: RARITY.LEGENDARY,
        tags: ['chaos', 'terrain'],
        apply(battle) {
          const a1 = battle.p1.data.affinity;
          const a2 = battle.p2.data.affinity;
          battle.p1.data.affinity = a2;
          battle.p2.data.affinity = a1;
  
          return {
            side: 'both',
            log: `¡<strong>Fractura Dimensional</strong>! Las afinidades se invierten: ` +
                 `<strong>${battle.p1.data.standName}</strong> ahora es <em>${a2}</em> y ` +
                 `<strong>${battle.p2.data.standName}</strong> es <em>${a1}</em>.`,
            extra: { type: 'affinity-swap', a1, a2 }
          };
        }
      },
  
      /* -------- 8. RELOJ DE ARENA ROTO -------- */
      {
        id: 'broken-hourglass',
        color: '#e35c4f',    // rojo rotura
        name: 'Reloj de Arena Roto',
        icon: '⏳',
        short: 'Cooldowns reseteados a 0 para ambos.',
        description:
          'El tiempo se rompe en pedazos. Todas las habilidades en recarga de AMBOS combatientes ' +
          'quedan inmediatamente disponibles. Un momento de pura ofensiva.',
        rarity: RARITY.LEGENDARY,
        tags: ['buff', 'cooldown'],
        apply(battle) {
          battle.p1.cooldowns = [0, 0, 0];
          battle.p2.cooldowns = [0, 0, 0];
          return {
            side: 'both',
            log: `¡El <strong>Reloj de Arena</strong> se rompe! Todas las habilidades quedan ` +
                 `<strong>inmediatamente disponibles</strong>.`,
            extra: { type: 'cooldown-reset' }
          };
        }
      }
    ];
  
    /* =========================================================
       UTILIDADES EXPORTADAS
       ========================================================= */
    function getEventById(id) {
      return EVENTS.find((e) => e.id === id) || null;
    }
  
    function getWeightedEventPool() {
      // Expandimos por peso para sortear con Math.random() simple
      const pool = [];
      for (const ev of EVENTS) {
        const w = ev.rarity?.weight || 10;
        for (let i = 0; i < w; i++) pool.push(ev);
      }
      return pool;
    }
  
    function pickRandomEvent() {
      const pool = getWeightedEventPool();
      if (pool.length === 0) return null;
      return pool[Math.floor(Math.random() * pool.length)];
    }
  
      /* =========================================================
     DETECCIÓN DE FORMATO DE ICONO
     ========================================================= */
  function isImageIcon(icon) {
    if (typeof icon !== 'string') return false;
    return /\.(png|svg|webp|jpe?g|gif)(\?.*)?$/i.test(icon.trim());
  }

  function resolveIconPath(icon) {
    if (typeof icon !== 'string') return '';
    const s = icon.trim();
    if (isImageIcon(s)) {
      // Absoluta, root-relativa o relativa explícita → tal cual
      if (/^(https?:)?\/\//i.test(s) || s.startsWith('/') || s.startsWith('./') || s.startsWith('../')) {
        return s;
      }
      // Relativa simple → prefijar con ICON_BASE_PATH
      return ICON_BASE_PATH + s;
    }
    return s; // emoji/texto
  }

    /* =========================================================
       EXPORT
       ========================================================= */
       global.JJA_EventsData = {
        RARITY,
        EVENTS,
        ICON_BASE_PATH,
        getEventById,
        pickRandomEvent,
        getWeightedEventPool,
        isImageIcon,
        resolveIconPath
      };
  
  })(window);