import { describe, expect, it } from 'vitest';
import { hasTournamentPermission } from './permissions';

describe('tournament permission matrix', () => {
  it('limits conditional setup, result, correction, and scorekeeper actions', () => {
    expect(hasTournamentPermission('co_organizer', 'setup')).toBe(true);
    expect(hasTournamentPermission('co_organizer', 'setup', { setupGrant: false })).toBe(false);
    expect(hasTournamentPermission('scorekeeper', 'recordResult')).toBe(false);
    expect(hasTournamentPermission('scorekeeper', 'recordResult', { assignedMatch: true })).toBe(true);
    expect(hasTournamentPermission('co_organizer', 'correctResult')).toBe(false);
    expect(hasTournamentPermission('co_organizer', 'correctResult', { correctionsGrant: true })).toBe(true);
  });

  it('keeps Players read-only while allowing access to their own profile', () => {
    expect(hasTournamentPermission('player', 'view')).toBe(true);
    expect(hasTournamentPermission('player', 'editOwnProfile')).toBe(true);
    expect(hasTournamentPermission('player', 'setup')).toBe(false);
    expect(hasTournamentPermission('player', 'recordResult', { assignedMatch: true })).toBe(false);
    expect(hasTournamentPermission('player', 'completeTournament')).toBe(false);
  });

  it('only lets Owners manage Co-organizers and complete tournaments', () => {
    expect(hasTournamentPermission('co_organizer', 'manageScorekeepers')).toBe(true);
    expect(hasTournamentPermission('co_organizer', 'manageCoOrganizers')).toBe(false);
    expect(hasTournamentPermission('owner', 'manageCoOrganizers')).toBe(true);
    expect(hasTournamentPermission('co_organizer', 'completeTournament')).toBe(false);
    expect(hasTournamentPermission('owner', 'completeTournament')).toBe(true);
  });
});
