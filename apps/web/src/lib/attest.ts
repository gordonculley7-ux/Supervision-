import { createHash } from 'node:crypto';

export const ATTESTATION_STATEMENT =
  'I attest that I provided the supervision recorded in this entry, and that the date, duration, and format are accurate.';

export interface AttestationInput {
  entryId: string;
  date: string;
  durationHours: number;
  format: string;
  setting: string;
  traineeId: string;
  supervisorId: string;
  signedName: string;
  statement: string;
  signedAt: string; // ISO
}

/**
 * Deterministic, tamper-evident hash of exactly what was attested. If any of the
 * covered fields later change, the recomputed hash won't match — flagging edits.
 */
export function attestationHash(input: AttestationInput): string {
  const canonical = [
    input.entryId, input.date, input.durationHours, input.format, input.setting,
    input.traineeId, input.supervisorId, input.signedName, input.statement, input.signedAt,
  ].join('|');
  return createHash('sha256').update(canonical).digest('hex');
}
