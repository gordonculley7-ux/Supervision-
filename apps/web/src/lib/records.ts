import type { RecordBook } from '@supervision-tracker/core';

/** Map Prisma rows to the shared core RecordBook shape. */
export function toRecordBook(rows: {
  practice: any[]; supervision: any[]; ceu: any[];
}): RecordBook {
  const d = (x: Date) => x.toISOString().slice(0, 10);
  return {
    practice: rows.practice.map(p => ({
      id: p.id, date: d(p.date), totalHours: p.totalHours,
      directContactHours: p.directContactHours, relationalHours: p.relationalHours,
    })),
    supervision: rows.supervision.map(s => ({
      id: s.id, date: d(s.date), durationHours: s.durationHours,
      format: s.format, setting: s.setting,
      supervisorId: s.supervisorId ?? undefined, signedOff: s.signedOff,
    })),
    ceu: rows.ceu.map(c => ({
      id: c.id, date: d(c.date), hours: c.hours, category: c.category,
      title: c.title ?? undefined, provider: c.provider ?? undefined,
    })),
  };
}
