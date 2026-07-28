import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeProgress, getRequirementSet, findRequirementSets, ALL_REQUIREMENT_SETS,
} from '../src/index.js';
import type { RecordBook, SupervisionEntry, PracticeEntry, CeuEntry } from '../src/index.js';

let n = 0;
const sv = (durationHours: number, format: 'individual'|'group'='individual', setting: 'in_person'|'remote'='in_person'): SupervisionEntry =>
  ({ id: 's'+(++n), date: '2026-01-01', durationHours, format, setting });
const pr = (totalHours: number, direct=0, relational=0): PracticeEntry =>
  ({ id: 'p'+(++n), date: '2026-01-01', totalHours, directContactHours: direct, relationalHours: relational });
const ce = (hours: number, category: any): CeuEntry =>
  ({ id: 'c'+(++n), date: '2026-01-01', hours, category });
const book = (o: Partial<RecordBook>): RecordBook =>
  ({ supervision: o.supervision ?? [], practice: o.practice ?? [], ceu: o.ceu ?? [] });

const get = (rep: any, key: string) => rep.metrics.find((m: any) => m.key === key);

test('seed data loads and exposes every MN pathway', () => {
  assert.ok(ALL_REQUIREMENT_SETS.length >= 10);
  const initial = findRequirementSets({ state: 'MN', purpose: 'initial_licensure' });
  const pathways = initial.map(r => `${r.profession}:${r.pathway}`).sort();
  assert.deepEqual(pathways, [
    'LADC:academic_practicum', 'LADC:method_1_supervision',
    'LGSW:clinical', 'LGSW:nonclinical',
    'LMFT:standard', 'LPCC:standard',
  ]);
});

test('LPCC initial: totals, direct contact, individual minimum', () => {
  const req = getRequirementSet('mn-lpcc-initial')!;
  const rep = computeProgress(req, book({
    practice: [pr(1000, 400), pr(240, 210)],
    supervision: [sv(30), sv(40,'group'), sv(20)],
  }));
  const total = get(rep, 'supervised_total');
  assert.equal(total.current, 1240);
  assert.equal(total.required, 4000);
  assert.equal(total.remaining, 2760);
  assert.equal(get(rep, 'direct_contact').current, 610);
  const ind = get(rep, 'supervision_individual');
  assert.equal(ind.current, 50);     // 30 + 20 individual
  assert.equal(ind.required, 50);
  assert.equal(ind.met, true);
  assert.equal(get(rep, 'supervision_total').current, 90);
  assert.equal(rep.overallComplete, false);
});

test('LPCC initial completes when all minimums met', () => {
  const req = getRequirementSet('mn-lpcc-initial')!;
  const rep = computeProgress(req, book({
    practice: [pr(4000, 1800)],
    supervision: [sv(60), sv(40)],
  }));
  assert.equal(rep.overallComplete, true);
});

test('LMFT: relational sub-rule and percent-based individual minimum', () => {
  const req = getRequirementSet('mn-lmft-initial')!;
  const rep = computeProgress(req, book({
    practice: [pr(2000, 600, 300)],
    supervision: [sv(80), sv(40,'group')],
  }));
  assert.equal(get(rep, 'direct_relational').current, 300);
  assert.equal(get(rep, 'direct_relational').required, 500);
  const ind = get(rep, 'supervision_individual');
  assert.equal(ind.required, 100); // 50% of 200
  assert.equal(ind.current, 80);
  assert.equal(ind.met, false);
});

test('LMFT: group supervision cap warns when exceeded', () => {
  const req = getRequirementSet('mn-lmft-initial')!;
  const rep = computeProgress(req, book({
    supervision: [sv(20), sv(80,'group')], // 100 total, 80 group, cap = 50
  }));
  const cap = get(rep, 'supervision_group_cap');
  assert.equal(cap.met, false);
  assert.match(cap.warning, /exceed/);
});

test('LADC Method I: in-person and individual percent minimums', () => {
  const req = getRequirementSet('mn-ladc-method1')!;
  const rep = computeProgress(req, book({
    supervision: [sv(30,'individual','in_person'), sv(20,'group','remote')],
  }));
  assert.equal(get(rep, 'supervision_total').required, 50);
  assert.equal(get(rep, 'supervision_in_person').required, 37.5); // 75% of 50
  assert.equal(get(rep, 'supervision_in_person').current, 30);
  assert.equal(get(rep, 'supervision_individual').required, 25);  // 50% of 50
});

test('LADC renewal: 9 diversity + 3 ethics + 40 total', () => {
  const req = getRequirementSet('mn-ladc-renewal')!;
  const rep = computeProgress(req, book({
    ceu: [ce(28,'general'), ce(3,'ethics'), ce(9,'diversity')],
  }));
  assert.equal(get(rep, 'ce_total').current, 40);
  assert.equal(get(rep, 'ce_diversity').required, 9);
  assert.equal(get(rep, 'ce_ethics').met, true);
  assert.equal(rep.overallComplete, true);
});

test('Social work renewal requires only 2 ethics hours', () => {
  const req = getRequirementSet('mn-socialwork-renewal')!;
  assert.equal(req.ce!.categories.find(c => c.category==='ethics')!.minHours, 2);
});

test('LGSW clinical: supervision ratio metric present', () => {
  const req = getRequirementSet('mn-lgsw-clinical')!;
  const rep = computeProgress(req, book({
    practice: [pr(1600)], supervision: [sv(50)],
  }));
  const ratio = get(rep, 'supervision_ratio');
  assert.equal(ratio.required, 40); // 1600/160 * 4
  assert.equal(ratio.current, 50);
  assert.equal(ratio.met, true);
});
