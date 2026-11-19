import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { App } from '../App';
import { PermissionMatrix } from '../components/PermissionMatrix';
import { AppContext } from '../store/AppContext';
import { createInitialState, type View } from '../store/reducer';
import { applyRally, createMatch } from '../domain/scoring';
import { toSavedMatch } from '../domain/scoring';
import { createTournament } from '../domain/tournaments';

const noop = () => {};
const doneMatch = (() => {
  let m = createMatch({ type: 's', mode: 'rally', fmt: 's', target: 11, winBy: 2 }, [['An'], ['Binh']], 0, 0);
  for (let i = 0; i < 11; i++) m = applyRally(m, 0, 60000);
  return m;
})();
const live = createMatch({ type: 'd', mode: 'trad', fmt: 'b3', target: 11, winBy: 2 }, [['A1', 'A2'], ['B1', 'B2']], 0, 0);

const views: [View, string][] = [
  ['home', 'Scorekeeper'], ['setup', 'Best of 3'], ['setupPlayers', 'Đội A'], ['live', 'Xướng điểm'],
  ['result', 'An'], ['history', 'Lịch sử'], ['detail', 'Lịch sử'], ['roster', 'Người chơi'],
  ['stats', 'Thống kê'], ['settings', 'Tiếng Việt'], ['tournaments', 'Giải đấu'],
  ['tournamentSetup', 'Tạo giải đấu'],
];

describe('every screen renders', () => {
  it.each(views)('%s', (view, text) => {
    const saved = toSavedMatch(doneMatch)!;
    const state = {
      ...createInitialState({ history: [saved], match: view === 'result' ? doneMatch : live }),
      view,
      detailIndex: 0,
    };
    const html = renderToString(
      <AppContext.Provider value={{ state, dispatch: noop }}><App /></AppContext.Provider>,
    );
    expect(html).toContain(text);
    if (view === 'settings') {
      expect(html).toContain('Bạn đang dùng chế độ khách');
      expect(html).toContain('Chưa cấu hình Supabase. Bạn vẫn có thể dùng chế độ khách.');
      expect(html).toContain('Xanh sage nhạt');
      expect(html).toContain('Hồng phấn');
      expect(html).toContain('Vải linen');
      expect(html).toContain('Nâu taupe');
      expect(html).toContain('Xanh sage đậm');
    }
  });

  describe('Phase 2A screens', () => {
    it('renders the player directory and local account state', () => {
      const state = {
        ...createInitialState(),
        players: [{
          id: 'player-1',
          displayName: 'An',
          level: '3.5',
          visibility: 'private' as const,
          formerNames: [],
          createdAt: 0,
          updatedAt: 0,
        }],
        view: 'roster' as const,
      };
      const html = renderToString(
        <AppContext.Provider value={{ state, dispatch: noop }}><App /></AppContext.Provider>,
      );

      expect(html).toContain('Tìm người chơi');
      expect(html).toContain('Thêm người chơi');
      expect(html).toContain('An');
    });

    it('renders a profile with legacy match statistics and history', () => {
      const saved = toSavedMatch(doneMatch)!;
      const player = {
        id: 'player-1',
        displayName: 'An',
        level: '3.5',
        visibility: 'private' as const,
        formerNames: [],
        createdAt: 0,
        updatedAt: 0,
      };
      const tournament = createTournament(
        {
          name: 'Giải hồ sơ',
          format: 'rr',
          config: { type: 's', mode: 'trad', fmt: 's', target: 11, winBy: 2 },
          courts: 2,
          entries: [
            { id: 'team-a', playerIds: [player.id], names: [player.displayName] },
            { id: 'team-b', playerIds: ['player-2'], names: ['Binh'] },
            { id: 'team-c', playerIds: ['player-3'], names: ['Chi'] },
          ],
        },
        0,
      );
      const state = {
        ...createInitialState({ history: [saved], players: [player], tournaments: [tournament] }),
        view: 'player' as const,
        selectedPlayerId: player.id,
      };
      const html = renderToString(
        <AppContext.Provider value={{ state, dispatch: noop }}><App /></AppContext.Provider>,
      );

      expect(html).toContain('Hồ sơ người chơi');
      expect(html).toContain('Lịch sử trận đấu');
      expect(html).toContain('Quyền riêng tư hồ sơ');
      expect(html).toContain('Trình độ');
      expect(html).toContain('Riêng tư');
      expect(html).toContain('An');
      expect(html).toContain('Giải hồ sơ');
    });

    describe('tournament screens', () => {
      const players = ['An', 'Binh', 'Chi'].map((displayName, index) => ({
        id: `player-${index + 1}`,
        displayName,
        level: '3.0',
        visibility: 'private' as const,
        formerNames: [],
        createdAt: 0,
        updatedAt: 0,
      }));

      it('renders the local tournament dashboard and active team tab', () => {
        const tournament = createTournament(
          {
            name: 'Giải CLB',
            format: 'rr',
            config: { type: 's', mode: 'trad', fmt: 's', target: 11, winBy: 2 },
            courts: 2,
            entries: players.map((player) => ({
              id: `entry-${player.id}`,
              playerIds: [player.id],
              names: [player.displayName],
            })),
          },
          0,
        );
        const state = {
          ...createInitialState({ players, tournaments: [tournament] }),
          view: 'tournament' as const,
          selectedTournamentId: tournament.id,
        };
        const html = renderToString(
          <AppContext.Provider value={{ state, dispatch: noop }}>
            <App />
          </AppContext.Provider>,
        );

        expect(html).toContain('Giải CLB');
        expect(html).toContain('Trận đấu');
        expect(html).toContain('Xếp hạng');
        expect(html).toContain('Báo cáo');
        expect(html).toContain('Nhóm');
        expect(html).not.toMatch(/<button[^>]*disabled[^>]*>Nhóm<\/button>/);
        expect(html).toContain('Giải đấu');
        const nav = html.match(/<nav class="nav">([\s\S]*?)<\/nav>/)?.[1] ?? '';
        expect(nav.match(/<button/g)).toHaveLength(3);
      });

      it('renders the full bilingual permission matrix', () => {
        const state = createInitialState();
        const html = renderToString(
          <AppContext.Provider value={{ state, dispatch: noop }}>
            <PermissionMatrix />
          </AppContext.Provider>,
        );
        expect(html).toContain('Ma trận quyền');
        expect(html).toContain('Chủ giải');
        expect(html).toContain('Đồng tổ chức');
        expect(html).toContain('Người ghi điểm');
        expect(html).toContain('Người chơi');
        expect(html).toContain('Có điều kiện');
      });

      it('renders tournament setup with Singles, format, courts and existing player profiles', () => {
        const state = { ...createInitialState({ players }), view: 'tournamentSetup' as const };
        const html = renderToString(
          <AppContext.Provider value={{ state, dispatch: noop }}>
            <App />
          </AppContext.Provider>,
        );

        expect(html).toContain('Đơn');
        expect(html).toContain('Đôi');
        expect(html).toContain('Vòng tròn');
        expect(html).toContain('Loại trực tiếp');
        expect(html).toContain('An');
        expect(html).toContain('Tạo lịch thi đấu');
      });

      it('renders the tournament list in English', () => {
        const emptyState = createInitialState({ players: [], tournaments: [], history: [], match: null });
        const state = {
          ...emptyState,
          settings: { ...emptyState.settings, lang: 'en' as const },
          view: 'tournaments' as const,
        };
        const html = renderToString(
          <AppContext.Provider value={{ state, dispatch: noop }}>
            <App />
          </AppContext.Provider>,
        );

        expect(html).toContain('Tournaments');
        expect(html).toContain('New tournament');
        expect(html).toContain('Create your first to auto-generate fixtures.');
      });
    });
  });
});
