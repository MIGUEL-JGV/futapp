/**
 * Programación de partidos en fechas/horas (RF-04).
 *
 * Asigna a cada partido una fecha-hora de arranque (kickoff) real según los
 * días de juego que ELIGIÓ el usuario al crear el torneo (`matchDays`).
 * La fecha base es el lunes 31 de agosto de 2026.
 *
 * Reglas del calendario:
 *  1. Una jornada por semana: cada equipo juega una sola vez por semana
 *     (la jornada completa ocupa una misma semana).
 *  2. Ningún horario se repite: no hay dos partidos con la misma
 *     fecha-hora (la "cancha" es global, comparte `occupied`).
 *  3. Los partidos se reparten en TODOS los días de juego del torneo
 *     (mínimo un partido por día), de 17:00 a 22:00 h.
 *  4. Cada jornada se ubica en la PRIMERA semana con huecos suficientes;
 *     tras asignarla, la siguiente jornada va a la semana siguiente.
 */

export interface KickoffOptions {
  /** Fecha base, ej.: `'2026-08-31'` (un lunes). */
  startDateIso: string;
  /** Días de la semana permitidos (0=domingo ... 6=sábado). */
  allowedWeekdays: readonly number[];
  /** Hora del primer horario (17 = 5 de la tarde). */
  startHour: number;
  /** Última hora con arranque posible (22 = 10 de la noche). */
  lastKickoffHour: number;
  /** Claves de horario ya ocupados (`${yyyy}-${MM}-${dd}T${HH}:00`). */
  occupied: ReadonlySet<string>;
}

/** Una jornada del calendario: sus partidos (sin descansos). */
export interface RoundToSchedule {
  round: number;
  matchIds: readonly string[];
}

const WEEKDAYS_ES = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const WEEKDAYS_LONG_ES = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
];
const MONTHS_ES = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

/** Prefija con cero los números menores a 10 (2 dígitos). */
function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Clave canónica de ocupación de un horario (una cancha global). */
export function slotKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:00`;
}

/** Días de la semana permitidos para el torneo (los que eligió el usuario). */
export function sortWeekdays(matchDays: readonly number[]): number[] {
  const normalized = new Set(matchDays.map((d) => ((d % 7) + 7) % 7));
  return [...normalized].sort((a, b) => a - b);
}

/** Lunes de la semana que contiene a `date`. */
function mondayOf(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  const day = result.getDay(); // 0=domingo
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  return result;
}

/** Suma N semanas a una fecha (misma hora local). */
function addWeeks(date: Date, weeks: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + weeks * 7);
  return result;
}

/**
 * Coloca `matchIds.length` partidos dentro de la semana que inicia en
 * `weekStart`, cubriendo TODOS los días permitidos del torneo:
 * primero un partido por día (si hay partidos suficientes) y después los
 * sobrantes en los primeros horarios libres.
 *
 * @returns `isoByMatch` (los que cupieron) y las claves que usaría.
 */
function tryFillWeek(
  weekStart: Date,
  matchIds: readonly string[],
  options: Pick<KickoffOptions, 'allowedWeekdays' | 'startHour' | 'lastKickoffHour'>,
  busy: ReadonlySet<string>,
): { isoByMatch: Map<string, string>; keys: string[] } {
  const { allowedWeekdays, startHour, lastKickoffHour } = options;
  const isoByMatch = new Map<string, string>();
  const keys: string[] = [];
  const taken = new Set<string>();

  // Días permitidos ordenados de lunes a domingo dentro de la semana.
  const days: Date[] = [];
  for (let offset = 0; offset < 7; offset++) {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + offset);
    if (allowedWeekdays.includes(day.getDay())) {
      days.push(day);
    }
  }

  const placeOne = (day: Date): boolean => {
    for (let hour = startHour; hour <= lastKickoffHour; hour++) {
      const kickoff = new Date(day);
      kickoff.setHours(hour, 0, 0, 0);
      const key = slotKey(kickoff);
      if (busy.has(key) || taken.has(key)) continue;
      taken.add(key);
      keys.push(key);
      const index = isoByMatch.size;
      isoByMatch.set(matchIds[index], kickoff.toISOString());
      return true;
    }
    return false;
  };

  // Pase 1: un partido por día permitido, para cubrir todos los días.
  for (const day of days) {
    if (isoByMatch.size >= matchIds.length) break;
    placeOne(day);
  }

  // Pase 2: reparte el resto por rondas de días (un partido por día cada
  // barrido) hasta colocar todo lo que quepa en la semana.
  while (isoByMatch.size < matchIds.length) {
    let any = false;
    for (const day of days) {
      if (isoByMatch.size >= matchIds.length) break;
      if (placeOne(day)) any = true;
    }
    if (!any) break;
  }

  return { isoByMatch, keys };
}

/**
 * Asigna cada jornada a una semana completa (una jornada por semana),
 * tomando primero los horarios libres 17-22h de los días permitidos.
 *
 * @returns Mapa `matchId -> ISO` (fecha-hora local) sin horarios repetidos.
 */
export function assignRoundKickoffs(
  rounds: readonly RoundToSchedule[],
  options: KickoffOptions,
): Map<string, string> {
  const { startDateIso } = options;
  const [startYear, startMonth, startDay] = startDateIso
    .split('-')
    .map((part) => Number(part));

  const busy = new Set(options.occupied);
  const result = new Map<string, string>();
  let weekStart = mondayOf(new Date(startYear, startMonth - 1, startDay));

  // Límite de seguridad: nunca debería alcanzarse en una configuración válida.
  const MAX_WEEKS = 20 * 52;

  for (const round of rounds) {
    const matchIds = round.matchIds.filter((id) => !result.has(id));
    if (matchIds.length === 0) continue;

    let fits = false;
    for (let weeks = 0; weeks < MAX_WEEKS && !fits; weeks++) {
      const attempt = tryFillWeek(weekStart, matchIds, options, busy);
      if (attempt.isoByMatch.size === matchIds.length) {
        for (const key of attempt.keys) busy.add(key);
        for (const [matchId, iso] of attempt.isoByMatch) {
          result.set(matchId, iso);
        }
        fits = true;
      } else {
        weekStart = addWeeks(weekStart, 1);
      }
    }

    if (!fits) {
      throw new Error(
        `No hay semana con huecos suficientes para la jornada ${round.round}.`,
      );
    }

    // Una jornada por semana: la siguiente empieza en la semana siguiente.
    weekStart = addWeeks(weekStart, 1);
  }

  return result;
}

/** Formatea un ISO de kickoff como: `sáb 5 sep · 17:00`. */
export function formatKickoff(iso: string | null | undefined): string {
  if (!iso) return 'Por definir';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Por definir';

  const weekday = WEEKDAYS_ES[date.getDay()];
  const day = date.getDate();
  const month = MONTHS_ES[date.getMonth()];
  return `${weekday} ${day} ${month} · ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/** Nombre largo del día, ej.: 'sábado 5 de septiembre'. */
export function formatKickoffLong(iso: string | null | undefined): string {
  if (!iso) return 'Por definir';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Por definir';

  const weekday = WEEKDAYS_LONG_ES[date.getDay()];
  return `${weekday} ${date.getDate()} de ${MONTHS_ES[date.getMonth()]} de ${date.getFullYear()} · ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/** Encabezado de un día: 'Lunes 31 de agosto' (o 'Sin fecha asignada'). */
export function formatDayLabel(iso: string | null | undefined): string {
  if (!iso) return 'Sin fecha asignada';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Sin fecha asignada';

  const weekday = WEEKDAYS_LONG_ES[date.getDay()];
  return `${weekday[0].toUpperCase()}${weekday.slice(1)} ${date.getDate()} de ${MONTHS_ES[date.getMonth()]}`;
}

/** Solo la hora: '17:00'. */
export function formatKickoffTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/** Clave de día local (AAAA-MM-DD) para agrupar partidos, o null sin fecha. */
export function kickoffDayKey(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}