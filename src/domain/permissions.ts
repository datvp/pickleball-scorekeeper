export type TournamentRole = 'owner' | 'co_organizer' | 'scorekeeper' | 'player';
export type PermissionState = 'allowed' | 'denied' | 'conditional';
export type TournamentPermission =
  | 'view'
  | 'viewMembers'
  | 'viewActivity'
  | 'setup'
  | 'assignScorekeepers'
  | 'recordResult'
  | 'correctResult'
  | 'manageScorekeepers'
  | 'manageCoOrganizers'
  | 'completeTournament'
  | 'editOwnProfile';

export interface PermissionRow {
  permission: TournamentPermission;
  owner: PermissionState;
  co_organizer: PermissionState;
  scorekeeper: PermissionState;
  player: PermissionState;
}

export const PERMISSION_MATRIX: PermissionRow[] = [
  { permission: 'view', owner: 'allowed', co_organizer: 'allowed', scorekeeper: 'allowed', player: 'allowed' },
  { permission: 'viewMembers', owner: 'allowed', co_organizer: 'allowed', scorekeeper: 'allowed', player: 'allowed' },
  { permission: 'viewActivity', owner: 'allowed', co_organizer: 'allowed', scorekeeper: 'conditional', player: 'denied' },
  { permission: 'setup', owner: 'allowed', co_organizer: 'conditional', scorekeeper: 'denied', player: 'denied' },
  { permission: 'assignScorekeepers', owner: 'allowed', co_organizer: 'allowed', scorekeeper: 'denied', player: 'denied' },
  { permission: 'recordResult', owner: 'allowed', co_organizer: 'allowed', scorekeeper: 'conditional', player: 'denied' },
  { permission: 'correctResult', owner: 'allowed', co_organizer: 'conditional', scorekeeper: 'denied', player: 'denied' },
  { permission: 'manageScorekeepers', owner: 'allowed', co_organizer: 'allowed', scorekeeper: 'denied', player: 'denied' },
  { permission: 'manageCoOrganizers', owner: 'allowed', co_organizer: 'denied', scorekeeper: 'denied', player: 'denied' },
  { permission: 'completeTournament', owner: 'allowed', co_organizer: 'denied', scorekeeper: 'denied', player: 'denied' },
  { permission: 'editOwnProfile', owner: 'allowed', co_organizer: 'allowed', scorekeeper: 'allowed', player: 'allowed' },
];

export interface PermissionContext {
  setupGrant?: boolean;
  correctionsGrant?: boolean;
  assignedMatch?: boolean;
  matchResultActivity?: boolean;
}

export function hasTournamentPermission(
  role: TournamentRole,
  permission: TournamentPermission,
  context: PermissionContext = {},
): boolean {
  switch (permission) {
    case 'view':
    case 'viewMembers':
    case 'editOwnProfile':
      return true;
    case 'viewActivity':
      return role === 'owner' || role === 'co_organizer' ||
        (role === 'scorekeeper' && context.matchResultActivity === true);
    case 'setup':
      return role === 'owner' || (role === 'co_organizer' && context.setupGrant !== false);
    case 'assignScorekeepers':
      return role === 'owner' || role === 'co_organizer';
    case 'recordResult':
      return role === 'owner' || role === 'co_organizer' ||
        (role === 'scorekeeper' && context.assignedMatch === true);
    case 'correctResult':
      return role === 'owner' || (role === 'co_organizer' && context.correctionsGrant === true);
    case 'manageScorekeepers':
      return role === 'owner' || role === 'co_organizer';
    case 'manageCoOrganizers':
      return role === 'owner';
    case 'completeTournament':
      return role === 'owner';
  }
}
