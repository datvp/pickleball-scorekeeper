import { DEMO_PLAYER_NAMES } from '../domain/players';
import type { PlayerProfile, Tournament } from '../domain/types';
import { supabase } from './supabase';

function isDemoPlayer(player: PlayerProfile): boolean {
  return DEMO_PLAYER_NAMES.includes(player.displayName as (typeof DEMO_PLAYER_NAMES)[number]);
}

function isDemoTournament(tournament: Tournament): boolean {
  return tournament.name === 'Demo Club Championship';
}

export async function syncDemoDataToSupabase(
  userId: string | null | undefined,
  players: PlayerProfile[],
  tournaments: Tournament[],
): Promise<void> {
  if (!supabase || !userId) return;

  const demoPlayers = players.filter(isDemoPlayer);
  if (!demoPlayers.length) return;

  const { error: playersError } = await supabase.from('player_profiles').upsert(
    demoPlayers.map((player) => ({
      id: player.id,
      created_by: userId,
      linked_account_id: null,
      display_name: player.displayName,
      level: player.level,
      visibility: player.visibility,
      former_names: player.formerNames,
      created_at: new Date(player.createdAt).toISOString(),
      updated_at: new Date(player.updatedAt).toISOString(),
    })),
    { onConflict: 'id' },
  );

  if (playersError) return;

  const demoTournaments = tournaments.filter(isDemoTournament);
  for (const tournament of demoTournaments) {
    const { error: tournamentError } = await supabase.from('shared_tournaments').upsert(
      {
        id: tournament.id,
        name: tournament.name,
        created_by: userId,
        status:
          tournament.status === 'completed'
            ? 'completed'
            : tournament.status === 'inProgress'
              ? 'in_progress'
              : 'ready',
        config: {
          format: tournament.format,
          config: tournament.config,
          courts: tournament.courts,
          entries: tournament.entries,
          fixtures: tournament.fixtures,
        },
        created_at: new Date(tournament.createdAt).toISOString(),
        updated_at: new Date(tournament.updatedAt).toISOString(),
      },
      { onConflict: 'id' },
    );

    if (tournamentError) continue;

    const { error: entriesError } = await supabase.from('shared_tournament_entries').upsert(
      tournament.entries.flatMap((entry) =>
        entry.playerIds.map((playerId, index) => ({
          tournament_id: tournament.id,
          entry_id: entry.id,
          player_profile_id: playerId,
          display_name_snapshot: entry.names[index] ?? playerId ?? 'Player',
        })),
      ),
      { onConflict: 'tournament_id,entry_id,player_profile_id' },
    );

    if (entriesError) continue;

    const { error: fixturesError } = await supabase.from('shared_tournament_fixtures').upsert(
      tournament.fixtures.map((fixture) => ({
        tournament_id: tournament.id,
        fixture_id: fixture.id,
        round_number: fixture.round,
        fixture_data: {
          ...fixture,
          participantIds: fixture.participantIds,
          court: fixture.court,
          result: fixture.result ?? null,
        },
      })),
      { onConflict: 'tournament_id,fixture_id' },
    );

    if (fixturesError) continue;
  }
}
