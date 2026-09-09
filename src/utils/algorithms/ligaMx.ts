/**
 * Datos y planificador de resultados para el demo "Liga MX · Apertura 2026".
 *
 * Replica la clasificación REAL del Apertura 2026 tras 6 jornadas disputadas
 * (18 clubes, todos con 6 partidos jugados). El módulo es PURO: no importa
 * react-native, recibe partidos y objetivos por equipo y devuelve marcadores
 * que satisfacen exactamente las agregaciones (W/D/L/GF/GC) de la tabla.
 *
 * Fuente: tabla general del Apertura 2026 (jornada 6) publicada por Sporting
 * News / El País. GF total = GC total (155 goles) tras ajustar la defensa de
 * tres equipos, para que el conjunto de resultados sea internamente coherente.
 */

export interface LigaMxTeamInfo {
  name: string;
  code: string;
}

export interface LigaMxTarget {
  code: string;
  /** Victorias. */
  w: number;
  /** Empates. */
  d: number;
  /** Derrotas. */
  l: number;
  /** Goles a favor. */
  gf: number;
  /** Goles en contra. */
  gc: number;
}

export interface ScoreMatch {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
}

export interface PlannedScore {
  id: string;
  homeScore: number;
  awayScore: number;
}

/** Los 18 clubes del Apertura 2026 en orden de inserción (sedes del fixture). */
export const LIGA_MX_TEAMS: LigaMxTeamInfo[] = [
  { name: 'América', code: 'AME' },
  { name: 'Toluca', code: 'TOL' },
  { name: 'Club Tijuana', code: 'TIJ' },
  { name: 'Atlas', code: 'ATL' },
  { name: 'Guadalajara', code: 'GDL' },
  { name: 'Querétaro', code: 'QUE' },
  { name: 'León', code: 'LEO' },
  { name: 'Puebla', code: 'PUE' },
  { name: 'Monterrey', code: 'MTY' },
  { name: 'Cruz Azul', code: 'CZA' },
  { name: 'UNAM', code: 'PUM' },
  { name: 'Necaxa', code: 'NEX' },
  { name: 'Atlético San Luis', code: 'ASL' },
  { name: 'Atlante', code: 'ATE' },
  { name: 'Pachuca', code: 'PAC' },
  { name: 'Tigres UANL', code: 'TIG' },
  { name: 'Santos Laguna', code: 'SLA' },
  { name: 'FC Juárez', code: 'JUA' },
];

/**
 * Plantilla de equipos FICTICIOS inspirados en la Liga MX (mismos 18
 * asientos), para un torneo nuevo "al estilo Liga MX" sin datos reales.
 */
export const LIGA_MX_STYLE_TEAMS: LigaMxTeamInfo[] = [
  { name: 'Águilas del Valle', code: 'AGV' },
  { name: 'Tiburones de Baja', code: 'TBA' },
  { name: 'Pumas de la Sierra', code: 'PMS' },
  { name: 'Diablos de Aguascalientes', code: 'DAG' },
  { name: 'Gallos del Bajío', code: 'GBJ' },
  { name: 'Jaguares de Quintana Roo', code: 'JQR' },
  { name: 'Zorros del Norte', code: 'ZDN' },
  { name: 'Coyotes de Sonora', code: 'CSO' },
  { name: 'Leones de Oaxaca', code: 'LOA' },
  { name: 'Rayos del Altiplano', code: 'RAL' },
  { name: 'Venados de Xalapa', code: 'VXA' },
  { name: 'Lobos de Zacatecas', code: 'LZA' },
  { name: 'Potros de Colima', code: 'PCO' },
  { name: 'Toros de Celaya', code: 'TCE' },
  { name: 'Halcones de Tuxtla', code: 'HTU' },
  { name: 'Piratas de Campeche', code: 'PCA' },
  { name: 'Vaqueros de La Laguna', code: 'VLL' },
  { name: 'Cañeros de Sinaloa', code: 'CSN' },
];

/**
 * Clasificación objetivo tras la jornada 6 del Apertura 2026.
 * Suma de victorias = 43 = suma de derrotas; suma de empates = 22 (11 partidos
 * empatados); GF total = GC total = 155.
 */
export const LIGA_MX_TARGETS: LigaMxTarget[] = [
  { code: 'AME', w: 5, d: 1, l: 0, gf: 12, gc: 2 },
  { code: 'TOL', w: 4, d: 1, l: 1, gf: 12, gc: 4 },
  { code: 'TIJ', w: 4, d: 1, l: 1, gf: 10, gc: 7 },
  { code: 'ATL', w: 4, d: 0, l: 2, gf: 9, gc: 8 },
  { code: 'GDL', w: 3, d: 2, l: 1, gf: 9, gc: 6 },
  { code: 'QUE', w: 3, d: 1, l: 2, gf: 9, gc: 7 },
  { code: 'LEO', w: 3, d: 1, l: 2, gf: 8, gc: 6 },
  { code: 'PUE', w: 3, d: 1, l: 2, gf: 9, gc: 9 },
  { code: 'MTY', w: 3, d: 0, l: 3, gf: 13, gc: 10 },
  { code: 'CZA', w: 3, d: 0, l: 3, gf: 11, gc: 11 },
  { code: 'PUM', w: 2, d: 2, l: 2, gf: 8, gc: 8 },
  { code: 'NEX', w: 2, d: 1, l: 3, gf: 8, gc: 11 },
  { code: 'ASL', w: 1, d: 3, l: 2, gf: 8, gc: 10 },
  { code: 'ATE', w: 1, d: 3, l: 2, gf: 6, gc: 8 },
  { code: 'PAC', w: 1, d: 2, l: 3, gf: 8, gc: 8 },
  { code: 'TIG', w: 1, d: 2, l: 3, gf: 8, gc: 11 },
  { code: 'SLA', w: 0, d: 1, l: 5, gf: 4, gc: 12 },
  { code: 'JUA', w: 0, d: 0, l: 6, gf: 3, gc: 17 },
];

/** PRNG determinista (mulberry32) para que el demo sea reproducible. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Stack {
  w: number;
  d: number;
  l: number;
  gf: number;
  gc: number;
}

interface Candidate {
  hg: number;
  ag: number;
}

type Outcome = 'H' | 'A' | 'D';

/**
 * Busca marcadores (por id de partido) que reproduzcan exactamente las
 * agregaciones objetivo de cada equipo.
 *
 * Solución en dos fases para acotar el espacio de búsqueda:
 *   Fase 1: asigna el desenlace W/D/L de cada partido (CSP con MRV +
 *           forward-checking). Branching ≤ 3, se resuelve en milisegundos.
 *   Fase 2: fijados los desenlaces, reparte los goles por partido hasta
 *           alcanzar GF/GC exactos (DFS con la misma poda).
 * Ante una tabla coherente (ΣW=ΣL, ΣGF=ΣGC) encuentra una solución exacta;
 * si una fase falla, se reintenta con otra semilla.
 */
export function planLigaMxScores(
  matchups: ScoreMatch[],
  targets: Readonly<Record<string, LigaMxTarget>>,
  seed = 20260826,
): PlannedScore[] {
  return planLigaMxScoresWithSeed(matchups, targets, seed);
}

/** Implementación por intentos (semillas distintas). */
function planLigaMxScoresWithSeed(
  matchups: ScoreMatch[],
  targets: Readonly<Record<string, LigaMxTarget>>,
  seed: number,
): PlannedScore[] {
  const teamIds = Object.keys(targets);
  const total: Record<string, number> = {};
  const played: Record<string, number> = {};
  for (const id of teamIds) {
    total[id] = 0;
    played[id] = 0;
  }
  for (const m of matchups) {
    total[m.homeTeamId] += 1;
    total[m.awayTeamId] += 1;
  }

  const matchesLeft = (id: string): number => total[id] - played[id];

  const makeStack = (t: LigaMxTarget): Stack => ({
    w: t.w, d: t.d, l: t.l, gf: t.gf, gc: t.gc,
  });

  for (let attempt = 0; attempt < 80; attempt++) {
    const rand = mulberry32(seed + attempt);
    const MAX_NODES = 200_000;

    const rem: Record<string, Stack> = {};
    for (const id of teamIds) rem[id] = makeStack(targets[id]);
    for (const id of teamIds) played[id] = 0;
    const outcomes: Outcome[] = new Array(matchups.length).fill(null as never);
    const plan: Array<PlannedScore | null> = new Array(matchups.length).fill(null);

    /* -------- Fase 1: desenlaces (branching ≤ 3) -------- */
    const open = new Array(matchups.length).fill(true);

    const outCandidate = (i: number): Outcome[] => {
      const m = matchups[i];
      const opts: Outcome[] = [];
      if (rem[m.homeTeamId].w > 0 && rem[m.awayTeamId].l > 0) opts.push('H');
      if (rem[m.homeTeamId].l > 0 && rem[m.awayTeamId].w > 0) opts.push('A');
      if (rem[m.homeTeamId].d > 0 && rem[m.awayTeamId].d > 0) opts.push('D');
      return opts;
    };

    const feasibleOutcome = (id: string): boolean => {
      const s = rem[id];
      const ml = matchesLeft(id);
      return s.w >= 0 && s.d >= 0 && s.l >= 0 && s.w <= ml && s.d <= ml && s.l <= ml;
    };

    const applyOutcome = (i: number, o: Outcome): void => {
      const m = matchups[i];
      const r = rem[m.homeTeamId];
      const s = rem[m.awayTeamId];
      if (o === 'H') { r.w -= 1; s.l -= 1; }
      else if (o === 'A') { r.l -= 1; s.w -= 1; }
      else { r.d -= 1; s.d -= 1; }
      played[m.homeTeamId] += 1;
      played[m.awayTeamId] += 1;
    };

    const undoOutcome = (i: number, o: Outcome): void => {
      const m = matchups[i];
      const r = rem[m.homeTeamId];
      const s = rem[m.awayTeamId];
      if (o === 'H') { r.w += 1; s.l += 1; }
      else if (o === 'A') { r.l += 1; s.w += 1; }
      else { r.d += 1; s.d += 1; }
      played[m.homeTeamId] -= 1;
      played[m.awayTeamId] -= 1;
    };

    const pickOutcome = (): { i: number; opts: Outcome[] } | null => {
      let bi = -1;
      let bopts: Outcome[] | null = null;
      let blen = Infinity;
      for (let i = 0; i < open.length; i++) {
        if (!open[i]) continue;
        const opts = outCandidate(i);
        if (opts.length === 0) return null;
        if (opts.length < blen) {
          blen = opts.length;
          bi = i;
          bopts = opts;
          if (blen === 1) break;
        }
      }
      return bi >= 0 ? { i: bi, opts: bopts as Outcome[] } : null;
    };

    const dfsOutcomes = (): boolean => {
      const pick = pickOutcome();
      if (!pick) return false;
      const m = matchups[pick.i];
      open[pick.i] = false;
      const opts = pick.opts;
      const start = Math.floor(rand() * opts.length);
      for (let k = 0; k < opts.length; k++) {
        const o = opts[(start + k) % opts.length];
        applyOutcome(pick.i, o);
        if (feasibleOutcome(m.homeTeamId) && feasibleOutcome(m.awayTeamId)) {
          outcomes[pick.i] = o;
          if (open.every((x) => !x)) {
            return allCountsZero();
          }
          if (dfsOutcomes()) return true;
        }
        undoOutcome(pick.i, o);
      }
      open[pick.i] = true;
      return false;
    };

    const allCountsZero = (): boolean => {
      for (const id of teamIds) {
        const s = rem[id];
        if (s.w !== 0 || s.d !== 0 || s.l !== 0) return false;
      }
      return true;
    };

    if (!dfsOutcomes()) continue; // fase 1 falló en este intento

    /* -------- Fase 2: goles fijados los desenlaces -------- */
    const windOk = (id: string, rg: Record<string, Stack>, open: boolean[]): boolean => {
      const s = rg[id];
      if (s.gf < 0 || s.gc < 0) return false;
      let oppGf = 0;
      let oppGc = 0;
      for (let i = 0; i < open.length; i++) {
        if (!open[i]) continue;
        const m = matchups[i];
        if (m.homeTeamId === id) {
          oppGf += rg[m.awayTeamId].gf;
          oppGc += rg[m.awayTeamId].gc;
        } else if (m.awayTeamId === id) {
          oppGf += rg[m.homeTeamId].gf;
          oppGc += rg[m.homeTeamId].gc;
        }
      }
      return s.gf <= oppGc && s.gc <= oppGf;
    };

    const solveGoals = (banded: boolean): Array<PlannedScore | null> | null => {
      const rg: Record<string, Stack> = {};
      for (const id of teamIds) rg[id] = makeStack(targets[id]);
      const pl = new Array<PlannedScore | null>(matchups.length).fill(null);
      const open = new Array(matchups.length).fill(true);
      const pld: Record<string, number> = {};
      for (const id of teamIds) pld[id] = 0;
      const ml = (id: string): number => total[id] - pld[id];

      const gFeasible = (id: string): boolean => {
        const s = rg[id];
        if (s.gf < 0 || s.gc < 0) return false;
        if (s.gf > ml(id) * 6 || s.gc > ml(id) * 6) return false;
        return true;
      };

      const goalCandidates = (i: number): Candidate[] => {
        const m = matchups[i];
        const h = m.homeTeamId;
        const a = m.awayTeamId;
        const capH = Math.min(rg[h].gf, rg[a].gc);
        const capA = Math.min(rg[a].gf, rg[h].gc);
        const avgH = Math.max(1, Math.round(rg[h].gf / Math.max(1, ml(h))));
        const avgA = Math.max(1, Math.round(rg[a].gf / Math.max(1, ml(a))));
        const loH = banded ? Math.max(1, Math.floor(0.55 * avgH)) : 1;
        const hiH = banded ? Math.ceil(2 * avgH) : 6;
        const loA = banded ? Math.max(1, Math.floor(0.55 * avgA)) : 0;
        const hiA = banded ? Math.ceil(2 * avgA) : 5;
        const cands: Candidate[] = [];
        const o = outcomes[i];

        if (o === 'D') {
          const hi = Math.min(capH, capA, 5, banded ? Math.max(hiH, hiA) : 5);
          for (let g = banded ? Math.min(loH, loA, hi) : 0; g <= hi; g++) {
            cands.push({ hg: g, ag: g });
          }
        } else if (o === 'H') {
          for (let hg = loH; hg <= Math.min(capH, hiH, 6); hg++) {
            for (let ag = 0; ag <= Math.min(capA, hiA, hg - 1); ag++) {
              cands.push({ hg, ag });
            }
          }
        } else {
          for (let ag = loA; ag <= Math.min(capA, hiA, 6); ag++) {
            for (let hg = 0; hg <= Math.min(capH, hiH, ag - 1); hg++) {
              cands.push({ hg, ag });
            }
          }
        }

        cands.sort(
          (p, q) =>
            Math.abs(p.hg - avgH) +
            Math.abs(p.ag - avgA) -
            (Math.abs(q.hg - avgH) + Math.abs(q.ag - avgA)),
        );
        return cands;
      };

      const applyGoals = (i: number, c: Candidate): void => {
        const m = matchups[i];
        rg[m.homeTeamId].gf -= c.hg;
        rg[m.awayTeamId].gc -= c.hg;
        rg[m.awayTeamId].gf -= c.ag;
        rg[m.homeTeamId].gc -= c.ag;
        pld[m.homeTeamId] += 1;
        pld[m.awayTeamId] += 1;
      };

      const undoGoals = (i: number, c: Candidate): void => {
        const m = matchups[i];
        rg[m.homeTeamId].gf += c.hg;
        rg[m.awayTeamId].gc += c.hg;
        rg[m.awayTeamId].gf += c.ag;
        rg[m.homeTeamId].gc += c.ag;
        pld[m.homeTeamId] -= 1;
        pld[m.awayTeamId] -= 1;
      };

      const pickGoal = (): { i: number; cands: Candidate[] } | null => {
        let bi = -1;
        let bc: Candidate[] | null = null;
        let blen = Infinity;
        for (let i = 0; i < open.length; i++) {
          if (!open[i]) continue;
          const cands = goalCandidates(i);
          if (cands.length === 0) return null;
          if (cands.length < blen) {
            blen = cands.length;
            bi = i;
            bc = cands;
            if (blen === 1) break;
          }
        }
        return bi >= 0 ? { i: bi, cands: bc as Candidate[] } : null;
      };

      let nodes = 0;
      const dfsGoals = (): boolean => {
        if (nodes++ > MAX_NODES) return false;
        const pick = pickGoal();
        if (!pick) return false;
        const m = matchups[pick.i];
        open[pick.i] = false;
        const cands = pick.cands;
        const start = Math.floor(rand() * cands.length);
        for (let k = 0; k < cands.length; k++) {
          const c = cands[(start + k) % cands.length];
          applyGoals(pick.i, c);
          if (
            gFeasible(m.homeTeamId) &&
            gFeasible(m.awayTeamId) &&
            windOk(m.homeTeamId, rg, open) &&
            windOk(m.awayTeamId, rg, open)
          ) {
            pl[pick.i] = { id: m.id, homeScore: c.hg, awayScore: c.ag };
            if (open.every((x) => !x)) {
              let done = true;
              for (const id of teamIds) {
                if (rg[id].gf !== 0 || rg[id].gc !== 0) { done = false; break; }
              }
              if (done) return true;
            }
            if (dfsGoals()) return true;
            pl[pick.i] = null;
          }
          undoGoals(pick.i, c);
        }
        open[pick.i] = true;
        return false;
      };

      if (dfsGoals()) return pl;
      return null;
    };

    const goals =
      solveGoals(true) ?? solveGoals(false);
    if (goals !== null) {
      for (let i = 0; i < goals.length; i++) {
        plan[i] = goals[i];
      }
      return plan as PlannedScore[];
    }
  }

  return [];
}

/* ------------------------------------------------------------------ */
/* Plantillas de jugadores por club                                    */
/* ------------------------------------------------------------------ */

const FIRST_NAMES = [
  'Ángel', 'Diego', 'José', 'Luis', 'Carlos', 'Miguel', 'Javier',
  'Ricardo', 'Rodrigo', 'Andrés', 'Sergio', 'Alan', 'Kevin', 'Erick',
  'Oswaldo', 'Raúl', 'Néstor', 'Héctor', 'César', 'Jesús', 'Eduardo',
  'Marco', 'Antonio', 'Fernando', 'Adrián', 'Alexis', 'Cristian',
  'Sebastián', 'Iván', 'Víctor', 'Omar', 'Josué', 'Emmanuel', 'Leonardo',
  'Mateo', 'Rubén', 'Gael',
];

const LAST_NAMES = [
  'García', 'Rodríguez', 'Martínez', 'Hernández', 'López', 'González',
  'Pérez', 'Sánchez', 'Ramírez', 'Flores', 'Cruz', 'Morales', 'Vargas',
  'Rojas', 'Castillo', 'Torres', 'Guzmán', 'Medina', 'Reyes', 'Gutiérrez',
  'Jiménez', 'Domínguez', 'Vázquez', 'Álvarez', 'Castro', 'Romero',
  'Delgado', 'Aguilar', 'Mendoza', 'Ortega', 'Salazar', 'Núñez', 'Paredes',
  'Campos', 'Ibarra', 'Escobar', 'Silva',
];

/**
 * Nombres de los 11 jugadores de un club (guardameta + 10 campo).
 * Determinista: combina primero/apellido con pasos coprimos para evitar
 * duplicados dentro del mismo equipo.
 */
export function ligaMxSquadNames(teamIndex: number): string[] {
  const firstLen = FIRST_NAMES.length;
  const lastLen = LAST_NAMES.length;
  const names: string[] = [];
  for (let j = 0; j < 11; j++) {
    const first = FIRST_NAMES[(teamIndex + j * 2) % firstLen];
    const last = LAST_NAMES[(teamIndex * 3 + j * 5) % lastLen];
    names.push(`${first} ${last}`);
  }
  return names;
}

/* ------------------------------------------------------------------ */
/* Resultados precalculados (jornadas 1-6)                             */
/* ------------------------------------------------------------------ */

/**
 * Marcadores fijos de las jornadas 1-6 del estilo "Super Liga México 2026",
 * generados UNA sola vez con `planLigaMxScores` (determinista, validado) para
 * evitar correr el solver en el dispositivo durante el inicio de sesión.
 *
 * Clave: "JORNADA:SLOT_LOCAL:SLOT_VISITANTE" usando el índice de inserción
 * (0-17) del equipo en `LIGA_MX_STYLE_TEAMS`. Total GF=GC=155, 54 partidos.
 */
export const LIGA_MX_SCORES_6: Record<string, [number, number]> = {
  '1:0:17': [6, 0],
  '1:1:16': [2, 1],
  '1:2:15': [0, 0],
  '1:3:14': [1, 0],
  '1:4:13': [4, 4],
  '1:5:12': [4, 4],
  '1:6:11': [1, 0],
  '1:7:10': [3, 1],
  '1:8:9': [6, 0],
  '2:16:0': [1, 2],
  '2:15:17': [3, 1],
  '2:14:1': [0, 2],
  '2:13:2': [0, 3],
  '2:12:3': [0, 2],
  '2:11:4': [0, 2],
  '2:10:5': [2, 0],
  '2:9:6': [0, 2],
  '2:8:7': [5, 0],
  '3:0:15': [1, 0],
  '3:16:14': [1, 5],
  '3:17:13': [0, 2],
  '3:1:12': [1, 0],
  '3:2:11': [2, 0],
  '3:3:10': [4, 2],
  '3:4:9': [1, 0],
  '3:5:8': [2, 0],
  '3:6:7': [0, 3],
  '4:14:0': [0, 1],
  '4:13:15': [0, 0],
  '4:12:16': [1, 0],
  '4:11:17': [3, 2],
  '4:10:1': [2, 0],
  '4:9:2': [5, 1],
  '4:8:3': [0, 1],
  '4:7:4': [0, 0],
  '4:6:5': [0, 1],
  '5:0:13': [1, 0],
  '5:14:12': [2, 2],
  '5:15:11': [4, 5],
  '5:16:10': [0, 0],
  '5:17:9': [0, 2],
  '5:1:8': [6, 0],
  '5:2:7': [3, 2],
  '5:3:6': [1, 4],
  '5:4:5': [0, 2],
  '6:12:0': [1, 1],
  '6:11:13': [0, 0],
  '6:10:14': [1, 1],
  '6:9:15': [4, 1],
  '6:8:16': [2, 1],
  '6:7:17': [1, 0],
  '6:6:1': [1, 1],
  '6:5:2': [0, 1],
  '6:4:3': [2, 0],
};