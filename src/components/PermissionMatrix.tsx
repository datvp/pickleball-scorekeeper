import { PERMISSION_MATRIX } from '../domain/permissions';
import type { TournamentRole } from '../domain/permissions';
import { useT } from '../store/AppContext';

const ROLES: TournamentRole[] = ['owner', 'co_organizer', 'scorekeeper', 'player'];

const ROLE_LABELS = {
  owner: 'roleOwner',
  co_organizer: 'roleCoOrganizer',
  scorekeeper: 'roleScorekeeper',
  player: 'rolePlayer',
} as const;

const PERMISSION_LABELS = {
  view: 'permissionView',
  viewMembers: 'permissionMembers',
  viewActivity: 'permissionActivity',
  setup: 'permissionSetup',
  assignScorekeepers: 'permissionAssign',
  recordResult: 'permissionRecord',
  correctResult: 'permissionCorrect',
  manageScorekeepers: 'permissionManageScorekeepers',
  manageCoOrganizers: 'permissionManageCoOrganizers',
  completeTournament: 'permissionComplete',
  editOwnProfile: 'permissionOwnProfile',
} as const;

const STATE_LABELS = {
  allowed: 'allowed',
  denied: 'denied',
  conditional: 'conditional',
} as const;

export function PermissionMatrix() {
  const { t } = useT();
  return (
    <div className="card permission-table">
      <b>{t('roleMatrix')}</b>
      <div className="permission-row permission-head">
        <span />
        {ROLES.map((role) => <span key={role}>{t(ROLE_LABELS[role])}</span>)}
      </div>
      {PERMISSION_MATRIX.map((row) => (
        <div className="permission-row" key={row.permission}>
          <span>{t(PERMISSION_LABELS[row.permission])}</span>
          {ROLES.map((role) => (
            <span className={`permission-${row[role]}`} key={role}>
              {t(STATE_LABELS[row[role]])}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
