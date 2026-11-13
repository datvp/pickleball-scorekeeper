import { describe, expect, it } from 'vitest';
import { createInitialState, reducer, type Action, type AppState } from './reducer';

const run = (s: AppState, ...actions: Action[]) => actions.reduce(reducer, s);

const singlesNames: [string[], string[]] = [['An'], ['Binh']];

function playSingles(extra: Partial<AppState['cfg']> = {}) {
  return run(
    createInitialState(),
    { type: 'QUICK_START' },
    { type: 'SET_CONFIG', patch: { type: 's', ...extra } },
    { type: 'START_MATCH', names: singlesNames, now: 0 },
  );
}

describe('app flow', () => {
  it('start -> play to the end -> result -> save -> history', () => {
    let s = playSingles();
    expect(s.view).toBe('live');
    for (let i = 0; i < 11; i++) s = reducer(s, { type: 'RALLY', team: 0, now: 60_000 });
    expect(s.view).toBe('result');
    expect(s.match?.winner).toBe(0);

    s = reducer(s, { type: 'SAVE_MATCH' });
    expect(s.view).toBe('history');
    expect(s.match).toBeNull();
    expect(s.history).toHaveLength(1);
    expect(s.history[0].names).toEqual(singlesNames);
  });

  it('does not save the same match twice', () => {
    let s = playSingles();
    for (let i = 0; i < 11; i++) s = reducer(s, { type: 'RALLY', team: 0 });
    const saved = reducer(s, { type: 'SAVE_MATCH' });
    const again = reducer({ ...saved, match: s.match }, { type: 'SAVE_MATCH' });
    expect(again.history).toHaveLength(1);
  });

  it('undo from the result screen returns to live', () => {
    let s = playSingles();
    for (let i = 0; i < 11; i++) s = reducer(s, { type: 'RALLY', team: 0 });
    s = reducer(s, { type: 'UNDO' });
    expect(s.view).toBe('live');
    expect(s.match?.status).toBe('active');
  });

  it('pause blocks scoring', () => {
    let s = reducer(playSingles(), { type: 'PAUSE' });
    s = reducer(s, { type: 'RALLY', team: 0 });
    expect(s.match?.sc).toEqual([0, 0]);
    s = run(s, { type: 'RESUME_PLAY' }, { type: 'RALLY', team: 0 });
    expect(s.match?.sc).toEqual([1, 0]);
  });

  it('end match discards progress and clear-all wipes history', () => {
    let s = playSingles();
    s = reducer(s, { type: 'END_MATCH' });
    expect(s.match).toBeNull();
    expect(s.view).toBe('home');

    s = { ...s, history: [{} as never] };
    s = reducer(s, { type: 'CLEAR_ALL' });
    expect(s.history).toEqual([]);
  });

  it('toggles and settings', () => {
    let s = createInitialState();
    s = run(s, { type: 'TOGGLE', key: 'haptics' }, { type: 'SET_LANG', lang: 'en' }, { type: 'SET_THEME', theme: 'outdoor' });
    expect(s.settings).toMatchObject({ haptics: false, lang: 'en', theme: 'outdoor' });
  });
});
