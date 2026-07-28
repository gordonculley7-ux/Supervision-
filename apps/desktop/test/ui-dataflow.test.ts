import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryAdapter } from '../src/adapters/inMemory.js';
import { computeProgress, findRequirementSets, ALL_REQUIREMENT_SETS } from '../../../packages/core/src/index.js';

const get = (rep: any, k: string) => rep.metrics.find((m: any) => m.key === k);
const uniq = <T,>(a: T[]) => [...new Set(a)];

test('every profession the Setup dropdown offers has a selectable initial set', () => {
  for (const prof of uniq(ALL_REQUIREMENT_SETS.map(r => r.profession))) {
    const states = uniq(ALL_REQUIREMENT_SETS.filter(r => r.profession === prof).map(r => r.state));
    for (const st of states) {
      const initial = findRequirementSets({ profession: prof, state: st, purpose: 'initial_licensure' });
      assert.ok(initial.length >= 1, `${prof}/${st} should have an initial set`);
    }
  }
});

test('UI data path: adapter + engine produce live progress (LPCC)', () => {
  const adapter = new InMemoryAdapter();          // exactly what App holds in a ref
  adapter.addPractice({ id: 'p1', date: '2026-01-01', totalHours: 1000, directContactHours: 400 });
  adapter.addPractice({ id: 'p2', date: '2026-02-01', totalHours: 240, directContactHours: 210 });
  adapter.addSupervision({ id: 's1', date: '2026-01-01', durationHours: 30, format: 'individual', setting: 'in_person' });
  adapter.addSupervision({ id: 's2', date: '2026-01-08', durationHours: 20, format: 'individual', setting: 'remote' });

  const set = findRequirementSets({ profession: 'LPCC', state: 'MN', purpose: 'initial_licensure' })[0];
  const rep = computeProgress(set, adapter.getRecordBook());
  assert.equal(get(rep, 'supervised_total').current, 1240);
  assert.equal(get(rep, 'direct_contact').current, 610);
  assert.equal(get(rep, 'supervision_individual').current, 50);
});

test('delete flows through the adapter the way the log table calls it', () => {
  const adapter = new InMemoryAdapter();
  adapter.addCeu({ id: 'c1', date: '2026-01-01', hours: 3, category: 'ethics' });
  adapter.addCeu({ id: 'c2', date: '2026-01-02', hours: 9, category: 'diversity' });
  adapter.deleteEntry('ceu', 'c1');
  assert.equal(adapter.getRecordBook().ceu.length, 1);
});
