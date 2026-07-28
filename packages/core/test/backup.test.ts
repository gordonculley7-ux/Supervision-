import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exportEncryptedBackup, importEncryptedBackup } from '../src/index.js';
import type { BackupPayload } from '../src/index.js';

const payload: BackupPayload = {
  credentials: [{ profession: 'LPCC', state: 'MN', pathway: 'standard' }],
  recordBook: {
    practice: [{ id: 'p1', date: '2026-01-01', totalHours: 1000, directContactHours: 400 }],
    supervision: [{ id: 's1', date: '2026-01-01', durationHours: 30, format: 'individual', setting: 'in_person' }],
    ceu: [{ id: 'c1', date: '2026-01-01', hours: 3, category: 'ethics' }],
  },
};

test('round-trips an encrypted backup', async () => {
  const file = await exportEncryptedBackup(payload, 'correct horse battery');
  assert.match(file, /supervision-tracker-backup/);
  const restored = await importEncryptedBackup(file, 'correct horse battery');
  assert.deepEqual(restored, payload);
});

test('wrong passphrase is rejected', async () => {
  const file = await exportEncryptedBackup(payload, 'right-pass');
  await assert.rejects(() => importEncryptedBackup(file, 'wrong-pass'), /Incorrect passphrase/);
});

test('rejects a non-backup file', async () => {
  await assert.rejects(() => importEncryptedBackup('{"hello":true}', 'x'), /not a Supervision/);
});

test('rejects too-short passphrase on export', async () => {
  await assert.rejects(() => exportEncryptedBackup(payload, 'ab'), /at least 4/);
});
