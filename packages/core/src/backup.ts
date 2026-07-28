import type { RecordBook, Profession } from './types.js';

/**
 * Portable, passphrase-encrypted backup for the Lite edition.
 * Uses Web Crypto (AES-GCM + PBKDF2) so the exact same code runs in the browser,
 * the Tauri webview, and Node. The resulting file also imports into the Web
 * edition, doubling as the Lite -> Web migration path.
 */

export const BACKUP_FORMAT = 'supervision-tracker-backup';
export const BACKUP_VERSION = 1;

export interface BackupCredential {
  profession: Profession;
  state: string;
  pathway: string;
  startDate?: string;
  renewalDate?: string;
}

export interface BackupPayload {
  credentials: BackupCredential[];
  recordBook: RecordBook;
}

interface EncryptedFile {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  kdf: { name: 'PBKDF2'; hash: 'SHA-256'; iterations: number };
  cipher: 'AES-GCM';
  salt: string; // base64
  iv: string;   // base64
  data: string; // base64 ciphertext
}

const PBKDF2_ITERATIONS = 200_000;
const subtle = () => {
  const c = (globalThis as any).crypto;
  if (!c?.subtle) throw new Error('Web Crypto not available in this environment.');
  return c.subtle as SubtleCrypto;
};
const getRandom = (len: number) => {
  const a = new Uint8Array(len);
  (globalThis as any).crypto.getRandomValues(a);
  return a;
};

function b64encode(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
function b64decode(str: string): Uint8Array {
  const s = atob(str);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const base = await subtle().importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return subtle().deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/** Encrypt a backup payload with a passphrase; returns the file contents (JSON string). */
export async function exportEncryptedBackup(payload: BackupPayload, passphrase: string): Promise<string> {
  if (!passphrase || passphrase.length < 4) throw new Error('Passphrase must be at least 4 characters.');
  const salt = getRandom(16);
  const iv = getRandom(12);
  const key = await deriveKey(passphrase, salt);
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const ct = new Uint8Array(await subtle().encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, plaintext));
  const file: EncryptedFile = {
    format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: new Date().toISOString(),
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: PBKDF2_ITERATIONS },
    cipher: 'AES-GCM', salt: b64encode(salt), iv: b64encode(iv), data: b64encode(ct),
  };
  return JSON.stringify(file, null, 2);
}

/** Decrypt a backup file with a passphrase. Throws on wrong passphrase or bad file. */
export async function importEncryptedBackup(fileText: string, passphrase: string): Promise<BackupPayload> {
  let file: EncryptedFile;
  try { file = JSON.parse(fileText); } catch { throw new Error('Not a valid backup file.'); }
  if (file.format !== BACKUP_FORMAT) throw new Error('This file is not a Supervision & CEU Tracker backup.');
  if (file.version > BACKUP_VERSION) throw new Error('This backup was made by a newer version of the app.');
  const key = await deriveKey(passphrase, b64decode(file.salt));
  let plaintext: ArrayBuffer;
  try {
    plaintext = await subtle().decrypt(
      { name: 'AES-GCM', iv: b64decode(file.iv) as BufferSource }, key, b64decode(file.data) as BufferSource);
  } catch {
    throw new Error('Incorrect passphrase or corrupted file.');
  }
  return JSON.parse(new TextDecoder().decode(plaintext)) as BackupPayload;
}
