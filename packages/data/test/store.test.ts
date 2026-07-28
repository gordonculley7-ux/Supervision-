import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SqliteRecordStore } from '../src/index.js';
import { computeProgress, getRequirementSet } from '../../core/src/index.js';

const get = (rep: any, key: string) => rep.metrics.find((m: any) => m.key === key);

test('persists entries and computes progress end-to-end (LPCC)', () => {
  const store = new SqliteRecordStore(':memory:');
  store.addPractice({ id: 'p1', date: '2026-01-01', totalHours: 1000, directContactHours: 400 });
  store.addPractice({ id: 'p2', date: '2026-02-01', totalHours: 240, directContactHours: 210 });
  store.addSupervision({ id: 's1', date: '2026-01-01', durationHours: 30, format: 'individual', setting: 'in_person' });
  store.addSupervision({ id: 's2', date: '2026-01-08', durationHours: 40, format: 'group', setting: 'in_person' });
  store.addSupervision({ id: 's3', date: '2026-01-15', durationHours: 20, format: 'individual', setting: 'remote' });

  const book = store.getRecordBook();
  assert.equal(book.practice.length, 2);
  assert.equal(book.supervision.length, 3);

  const rep = computeProgress(getRequirementSet('mn-lpcc-initial')!, book);
  assert.equal(get(rep, 'supervised_total').current, 1240);
  assert.equal(get(rep, 'direct_contact').current, 610);
  assert.equal(get(rep, 'supervision_individual').current, 50);
  store.close();
});

test('delete removes an entry from the record book', () => {
  const store = new SqliteRecordStore(':memory:');
  store.addCeu({ id: 'c1', date: '2026-01-01', hours: 10, category: 'ethics' });
  store.addCeu({ id: 'c2', date: '2026-01-02', hours: 5, category: 'diversity' });
  assert.equal(store.getRecordBook().ceu.length, 2);
  store.deleteEntry('ceu', 'c1');
  const book = store.getRecordBook();
  assert.equal(book.ceu.length, 1);
  assert.equal(book.ceu[0].id, 'c2');
  store.close();
});

test('round-trips CEU categories for a renewal computation (LADC)', () => {
  const store = new SqliteRecordStore(':memory:');
  store.addCeu({ id: 'c1', date: '2026-01-01', hours: 28, category: 'general' });
  store.addCeu({ id: 'c2', date: '2026-01-02', hours: 3, category: 'ethics' });
  store.addCeu({ id: 'c3', date: '2026-01-03', hours: 9, category: 'diversity' });
  const rep = computeProgress(getRequirementSet('mn-ladc-renewal')!, store.getRecordBook());
  assert.equal(get(rep, 'ce_total').current, 40);
  assert.equal(rep.overallComplete, true);
  store.close();
});
