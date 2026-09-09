/**
 * Algoritmo Round-Robin (Método del Círculo, tablas de Berger) (RF-04).
 *
 * Genera un calendario de todos-contra-todos cumpliendo:
 *  1. Cada equipo juega contra todos los demás exactamente una vez por vuelta.
 *  2. Se crean `n - 1` jornadas para `n` equipos.
 *  3. Con un número impar de equipos se añade un "descanso" (bye): el equipo
 *     pareado contra el descanso queda libre esa jornada.
 *  4. Opcionalmente (doble vuelta) se genera la segunda ronda invirtiendo
 *     local/visitante de la primera.
 *
 * El algoritmo es una función PURA: recibe un arreglo de IDs y devuelve el
 * fixture. No tiene efectos colaterales ni dependencias de UI/BD.
 */

import type { Fixture, FixtureMatch, FixtureRound } from '../../types';

/** ID sintético que representa la posición "descanso" dentro del algoritmo. */
const BYE = -1;

/** Grupos de parejas generados cada jornada: [local, visita] o con `BYE`. */
type RoundPair = [number, number];

/**
 * Construye las jornadas usando el método del círculo.
 *
 * Sea `n` par. Fijamos el primer elemento y rotamos el resto una posición
 * por jornada;
 *   Jornada 1: (0 vs n-1), (1 vs n-2), ...
 *   Jornada 2: el arreglo rotó, se repite el emparejamiento simétrico.
 * Esto produce `n - 1` jornadas con `n / 2` encuentros cada una.
 */
function buildRounds(teamCount: number): RoundPair[][] {
  const order = Array.from({ length: teamCount }, (_, i) => i);
  const rounds: RoundPair[][] = [];

  for (let r = 0; r < teamCount - 1; r++) {
    const pairs: RoundPair[] = [];
    for (let i = 0; i < teamCount / 2; i++) {
      pairs.push([order[i], order[teamCount - 1 - i]]);
    }
    rounds.push(pairs);

    // Rotación: mantiene fijo `order[0]`, mueve el último al frente del resto.
    const fixed = order[0];
    const rotating = order.slice(1);
    rotating.unshift(rotating.pop() as number);
    order.splice(0, order.length, fixed, ...rotating);
  }

  return rounds;
}

/**
 * Traduce un índice lógico al ID real de equipo, respetando el `BYE`.
 */
function indexToTeamId(teams: string[], index: number): string | null {
  return index === BYE ? null : teams[index];
}

/**
 * Separa cada pareja en local/visitante alternando la cancha por jornada.
 *
 * Si uno de los lados es `BYE`, el partido resultante solo indica qué equipo
 * descansa esa jornada (ver `matches` de tipo `FixtureMatch`).
 */
function pairToFixtureMatch(
  pair: RoundPair,
  teams: string[],
  roundIndex: number,
): FixtureMatch {
  const [a, b] = pair;
  // Alterna local/visitante para balancear juegos en casa.
  const swap = roundIndex % 2 === 1;
  const first = swap ? b : a;
  const second = swap ? a : b;
  return {
    homeTeamId: indexToTeamId(teams, first),
    awayTeamId: indexToTeamId(teams, second),
  };
}

/**
 * Genera el calendario completo. Lanza error si hay menos de 2 equipos.
 *
 * @param teamIds      IDs de los equipos participantes.
 * @param options.doubleRound True para ida y vuelta (liga a doble vuelta).
 *
 * @returns Fixture tipado con las jornadas y sus partidos.
 *
 * @example
 * generateRoundRobinFixture(['t1', 't2', 't3', 't4'], { doubleRound: true });
 */
export function generateRoundRobinFixture(
  teamIds: string[],
  options: { doubleRound?: boolean } = {},
): Fixture {
  const { doubleRound = false } = options;

  if (teamIds.length < 2) {
    throw new Error(
      `Se necesitan al menos 2 equipos para generar un fixture (recibidos: ${teamIds.length}).`,
    );
  }

  // Duplicados romperían las garantías del algoritmo: validar temprano.
  const unique = new Set(teamIds);
  if (unique.size !== teamIds.length) {
    throw new Error('El arreglo de equipos contiene IDs repetidos.');
  }

  const isOdd = teamIds.length % 2 === 1;
  // Método del círculo exige un número par de "asientos"; si es impar
  // agregamos un asiento ficticio (BYE = descanso).
  const seatCount = isOdd ? teamIds.length + 1 : teamIds.length;
  const teams = isOdd ? [...teamIds] : [...teamIds];

  const firstLeg = buildRounds(seatCount);
  const rounds: FixtureRound[] = [];

  firstLeg.forEach((pairs, roundIndex) => {
    rounds.push({
      round: roundIndex + 1,
      matches: pairs.map((pair) => pairToFixtureMatch(pair, teams, roundIndex)),
    });
  });

  if (doubleRound) {
    const offset = rounds.length;
    firstLeg.forEach((pairs, roundIndex) => {
      const awayRound: FixtureMatch[] = pairs.map((pair) => {
        // Vuelta: se invierte la localía de la ida.
        const first = pairToFixtureMatch(pair, teams, roundIndex);
        return { homeTeamId: first.awayTeamId, awayTeamId: first.homeTeamId };
      });
      rounds.push({ round: offset + roundIndex + 1, matches: awayRound });
    });
  }

  return { tournamentId: '', doubleRound, rounds };
}

/**
 * Devuelve los IDs de los equipos que descansan en cada jornada.
 * Útil para información al administrador (RF-04: cálculo de descansos).
 *
 * @returns Arreglo indexado por jornada (índice i = jornada i+1) con los
 *          equipo(s) que descansan (0 o 1 en round-robin simple).
 */
export function getByesPerRound(fixture: Fixture): string[][] {
  return fixture.rounds.map((round) => {
    const byes = new Set<string>();
    for (const match of round.matches) {
      if (match.homeTeamId === null && match.awayTeamId !== null) {
        byes.add(match.awayTeamId);
      } else if (match.awayTeamId === null && match.homeTeamId !== null) {
        byes.add(match.homeTeamId);
      }
    }
    return [...byes];
  });
}

/** Inserta el `tournamentId` en un fixture generado previamente. */
export function withTournamentId(fixture: Fixture, tournamentId: string): Fixture {
  return { ...fixture, tournamentId };
}