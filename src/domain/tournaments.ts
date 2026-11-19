import type {
  MatchConfig,
  Score,
  Tournament,
  TournamentEntry,
  TournamentFixture,
  TournamentFormat,
  TournamentResult,
} from './types';

export type TournamentSetupError =
  | 'nameRequired'
  | 'needParticipants'
  | 'invalidCourts'
  | 'invalidEntry'
  | 'duplicateEntry'
  | 'duplicatePlayer';

export interface TournamentSetup {
  name: string;
  format: TournamentFormat;
  config: MatchConfig;
  courts: number;
  entries: TournamentEntry[];
}

export interface Standing {
  entryId: string;
  played: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDifference: number;
  byes: number;
  rank: number;
}

export function validateTournamentSetup(setup: TournamentSetup): TournamentSetupError | null {
  if (!setup.name.trim()) return 'nameRequired';
  if (!Number.isInteger(setup.courts) || setup.courts < 1 || setup.courts > 4)
    return 'invalidCourts';
  if (setup.entries.length < 3) return 'needParticipants';
  if (setup.entries.some((entry) => entry.playerIds.length !== (setup.config.type === 'd' ? 2 : 1)))
    return 'invalidEntry';

  const entryIds = new Set(setup.entries.map((entry) => entry.id));
  if (entryIds.size !== setup.entries.length) return 'duplicateEntry';

  const playerIds = setup.entries.flatMap((entry) => entry.playerIds);
  if (playerIds.some((id) => !id) || new Set(playerIds).size !== playerIds.length)
    return 'duplicatePlayer';
  return null;
}

function assertParticipantIds(participantIds: string[], courts: number): void {
  if (participantIds.length < 3) throw new Error('A tournament needs at least three participants.');
  if (new Set(participantIds).size !== participantIds.length)
    throw new Error('Tournament participant IDs must be unique.');
  if (!Number.isInteger(courts) || courts < 1 || courts > 4)
    throw new Error('Court count must be between one and four.');
}

function fixture(
  round: number,
  position: number,
  participantIds: [string | null, string | null],
  court: number | null,
  bye: boolean,
  idFactory: () => string,
): TournamentFixture {
  return {
    id: idFactory(),
    round,
    position,
    participantIds,
    court,
    bye,
    status: bye ? 'bye' : 'scheduled',
  };
}

export function generateRoundRobinFixtures(
  participantIds: string[],
  courts: number,
  idFactory: () => string = () => crypto.randomUUID(),
): TournamentFixture[] {
  assertParticipantIds(participantIds, courts);
  const rotation: Array<string | null> = [...participantIds];
  if (rotation.length % 2) rotation.push(null);

  const result: TournamentFixture[] = [];
  let courtIndex = 0;
  for (let round = 0; round < rotation.length - 1; round += 1) {
    for (let position = 0; position < rotation.length / 2; position += 1) {
      const first = rotation[position];
      const second = rotation[rotation.length - 1 - position];
      const bye = first === null || second === null;
      result.push(
        fixture(
          round + 1,
          position,
          [first ?? second, bye ? null : second],
          bye ? null : (courtIndex++ % courts) + 1,
          bye,
          idFactory,
        ),
      );
    }
    rotation.splice(1, 0, rotation.pop() ?? null);
  }
  return result;
}

function seedOrder(size: number): number[] {
  let seeds = [1];
  while (seeds.length < size) {
    const nextSize = seeds.length * 2;
    seeds = seeds.flatMap((seed) => [seed, nextSize + 1 - seed]);
  }
  return seeds;
}

export function generateSingleEliminationFixtures(
  participantIds: string[],
  courts: number,
  idFactory: () => string = () => crypto.randomUUID(),
): TournamentFixture[] {
  assertParticipantIds(participantIds, courts);
  let bracketSize = 2;
  while (bracketSize < participantIds.length) bracketSize *= 2;
  const rounds = Math.log2(bracketSize);
  const seeds = seedOrder(bracketSize);
  const result: TournamentFixture[] = [];

  for (let round = 1; round <= rounds; round += 1) {
    const fixturesInRound = bracketSize / 2 ** round;
    for (let position = 0; position < fixturesInRound; position += 1) {
      const participants: [string | null, string | null] =
        round === 1
          ? [
              participantIds[seeds[position * 2] - 1] ?? null,
              participantIds[seeds[position * 2 + 1] - 1] ?? null,
            ]
          : [null, null];
      const item = fixture(
        round,
        position,
        participants,
        round === 1 && (participants[0] === null || participants[1] === null)
          ? null
          : (position % courts) + 1,
        false,
        idFactory,
      );
      result.push(item);
    }
  }
  for (const item of result.filter(
    (candidate) =>
      candidate.round === 1 &&
      (candidate.participantIds[0] === null || candidate.participantIds[1] === null),
  )) {
    item.bye = true;
    item.status = 'bye';
    const winner = item.participantIds[0] ?? item.participantIds[1];
    if (winner) advanceEntry(result, item, winner);
  }
  return result;
}

function advanceEntry(
  fixtures: TournamentFixture[],
  completed: TournamentFixture,
  entryId: string,
): void {
  const next = fixtures.find(
    (item) => item.round === completed.round + 1 && item.position === Math.floor(completed.position / 2),
  );
  if (!next) return;
  const slot = completed.position % 2;
  const participantIds: [string | null, string | null] = [
    next.participantIds[0],
    next.participantIds[1],
  ];
  participantIds[slot] = entryId;
  next.participantIds = participantIds;
}

export function createTournament(
  setup: TournamentSetup,
  now = Date.now(),
  idFactory: () => string = () => crypto.randomUUID(),
): Tournament {
  const error = validateTournamentSetup(setup);
  if (error) throw new Error(`Invalid tournament setup: ${error}`);
  const entries = setup.entries.map((entry) => ({
    ...entry,
    id: idFactory(),
    playerIds: [...entry.playerIds],
    names: [...entry.names],
  }));
  const participantIds = entries.map((entry) => entry.id);
  const fixtures =
    setup.format === 'rr'
      ? generateRoundRobinFixtures(participantIds, setup.courts, idFactory)
      : generateSingleEliminationFixtures(participantIds, setup.courts, idFactory);
  return {
    id: idFactory(),
    name: setup.name.trim(),
    format: setup.format,
    config: { ...setup.config },
    courts: setup.courts,
    entries,
    fixtures,
    status: 'ready',
    createdAt: now,
    updatedAt: now,
  };
}

export function startTournamentFixture(
  tournament: Tournament,
  fixtureId: string,
  now = Date.now(),
): Tournament {
  const current = tournament.fixtures.find((item) => item.id === fixtureId);
  if (!current || current.bye || current.status === 'completed')
    throw new Error('This tournament fixture cannot be started.');
  if (current.participantIds.some((id) => !id))
    throw new Error('Both tournament participants must be determined before starting.');

  return {
    ...tournament,
    status: 'inProgress',
    updatedAt: now,
    fixtures: tournament.fixtures.map((item) =>
      item.id === fixtureId ? { ...item, status: 'inProgress' } : item,
    ),
  };
}

export function saveTournamentResult(
  tournament: Tournament,
  fixtureId: string,
  result: TournamentResult,
  now = Date.now(),
): Tournament {
  const current = tournament.fixtures.find((item) => item.id === fixtureId);
  if (!current) throw new Error('Tournament fixture was not found.');
  if (current.status === 'completed') {
    if (current.result?.savedMatchId === result.savedMatchId) return tournament;
    throw new Error('A completed tournament result cannot be replaced in this workflow.');
  }
  if (current.bye || current.participantIds.some((id) => !id))
    throw new Error('This tournament fixture cannot accept a result.');

  const fixtures = tournament.fixtures.map((item) =>
    item.id === fixtureId
      ? {
          ...item,
          status: 'completed' as const,
          result: { ...result, games: result.games.map((game) => [...game] as Score) },
        }
      : item,
  );
  const winner = current.participantIds[result.winner];
  if (!winner) throw new Error('The winning tournament entry was not found.');
  if (tournament.format === 'se') advanceEntry(fixtures, current, winner);

  const nonBye = fixtures.filter((item) => !item.bye);
  const complete =
    tournament.format === 'rr'
      ? nonBye.every((item) => item.status === 'completed')
      : fixtures
          .filter((item) => item.round === Math.max(...fixtures.map((candidate) => candidate.round)))
          .every((item) => item.status === 'completed');
  return {
    ...tournament,
    status: complete ? 'completed' : 'inProgress',
    fixtures,
    updatedAt: now,
  };
}

function entryName(entries: TournamentEntry[], entryId: string): string {
  return entries.find((entry) => entry.id === entryId)?.names.join(' / ') ?? '';
}

export function roundRobinStandings(tournament: Tournament): Standing[] {
  const stats = new Map<string, Omit<Standing, 'rank'>>();
  const headToHead = new Map<string, string>();
  const forEntry = (entryId: string) => {
    let value = stats.get(entryId);
    if (!value) {
      value = {
        entryId,
        played: 0,
        wins: 0,
        losses: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        pointDifference: 0,
        byes: 0,
      };
      stats.set(entryId, value);
    }
    return value;
  };
  tournament.entries.forEach((entry) => forEntry(entry.id));

  for (const item of tournament.fixtures) {
    if (item.bye && item.participantIds[0]) {
      forEntry(item.participantIds[0]).byes += 1;
      continue;
    }
    if (item.status !== 'completed' || !item.result) continue;
    const [firstId, secondId] = item.participantIds;
    if (!firstId || !secondId) continue;
    const first = forEntry(firstId);
    const second = forEntry(secondId);
    first.played += 1;
    second.played += 1;
    let firstPoints = 0;
    let secondPoints = 0;
    for (const [a, b] of item.result.games) {
      firstPoints += a;
      secondPoints += b;
    }
    first.pointsFor += firstPoints;
    first.pointsAgainst += secondPoints;
    second.pointsFor += secondPoints;
    second.pointsAgainst += firstPoints;
    const winnerId = item.result.winner === 0 ? firstId : secondId;
    const loserId = item.result.winner === 0 ? secondId : firstId;
    forEntry(winnerId).wins += 1;
    forEntry(loserId).losses += 1;
    headToHead.set(`${winnerId}:${loserId}`, winnerId);
  }

  const values = [...stats.values()].map((item) => ({
    ...item,
    pointDifference: item.pointsFor - item.pointsAgainst,
  }));
  values.sort((a, b) => {
    if (a.wins !== b.wins) return b.wins - a.wins;
    const tied = values.filter((item) => item.wins === a.wins);
    if (tied.length === 2) {
      const firstWon = headToHead.get(`${a.entryId}:${b.entryId}`) === a.entryId;
      const secondWon = headToHead.get(`${b.entryId}:${a.entryId}`) === b.entryId;
      if (firstWon !== secondWon) return firstWon ? -1 : 1;
    }
    return b.pointDifference - a.pointDifference || b.pointsFor - a.pointsFor;
  });

  let rank = 0;
  values.forEach((item, index) => {
    if (index === 0) {
      rank = 1;
    } else {
      const previous = values[index - 1];
      const sameResult =
        item.wins === previous.wins &&
        item.pointDifference === previous.pointDifference &&
        item.pointsFor === previous.pointsFor;
      const tied = values.filter((entry) => entry.wins === item.wins);
      const resolvedTwoWayTie =
        tied.length === 2 &&
        (headToHead.get(`${previous.entryId}:${item.entryId}`) === previous.entryId ||
          headToHead.get(`${item.entryId}:${previous.entryId}`) === item.entryId);
      if (!sameResult || resolvedTwoWayTie) rank = index + 1;
    }
    Object.assign(item, { rank });
  });
  return values as Standing[];
}

export function singleEliminationResults(tournament: Tournament): {
  champion: string | null;
  runnerUp: string | null;
  eliminated: Array<{ entryId: string; round: number }>;
} {
  const finalRound = Math.max(0, ...tournament.fixtures.map((item) => item.round));
  const final = tournament.fixtures.find((item) => item.round === finalRound);
  const champion =
    final?.result && final.participantIds[final.result.winner]
      ? final.participantIds[final.result.winner]
      : null;
  const runnerUp =
    final?.result && final.participantIds[1 - final.result.winner]
      ? final.participantIds[1 - final.result.winner]
      : null;
  const eliminated = tournament.fixtures.flatMap((item) => {
    if (!item.result || item.bye) return [];
    const loser = item.participantIds[1 - item.result.winner];
    return loser ? [{ entryId: loser, round: item.round }] : [];
  });
  return { champion, runnerUp, eliminated };
}

export function tournamentEntryName(tournament: Tournament, entryId: string | null): string {
  return entryId ? entryName(tournament.entries, entryId) : '—';
}

export function fixtureMatchNames(
  tournament: Tournament,
  item: TournamentFixture,
): [string[], string[]] | null {
  const [firstId, secondId] = item.participantIds;
  if (!firstId || !secondId) return null;
  const first = tournament.entries.find((entry) => entry.id === firstId);
  const second = tournament.entries.find((entry) => entry.id === secondId);
  if (!first || !second) return null;
  return [[...first.names], [...second.names]];
}
