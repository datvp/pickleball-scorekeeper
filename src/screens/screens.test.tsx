import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { App } from '../App';
import { AppContext } from '../store/AppContext';
import { createInitialState, type View } from '../store/reducer';
import { applyRally, createMatch } from '../domain/scoring';
import { toSavedMatch } from '../domain/scoring';

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
  ['stats', 'Thống kê'], ['settings', 'Tiếng Việt'],
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
  });
});
