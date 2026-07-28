import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { DataAdapter } from './adapter.js';
import type {
  RecordBook, PracticeEntry, SupervisionEntry, CeuEntry,
} from '../../core/src/index.js';

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Reference local store for the Lite edition, backed by SQLite.
 * Uses Node's built-in node:sqlite for dev/test; the Tauri build swaps in the
 * Tauri SQL plugin behind the same DataAdapter interface.
 */
export class SqliteRecordStore implements DataAdapter {
  private db: DatabaseSync;

  constructor(path = ':memory:') {
    this.db = new DatabaseSync(path);
    this.db.exec(readFileSync(join(here, 'schema.sql'), 'utf8'));
  }

  addPractice(e: PracticeEntry): void {
    this.db.prepare(
      `INSERT INTO practice_entry (id,credential_id,date,total_hours,direct_contact_hours,relational_hours)
       VALUES (?,?,?,?,?,?)`
    ).run(e.id, null, e.date, e.totalHours, e.directContactHours ?? 0, e.relationalHours ?? 0);
  }

  addSupervision(e: SupervisionEntry): void {
    this.db.prepare(
      `INSERT INTO supervision_entry (id,credential_id,date,duration_hours,format,setting,supervisor_id,signed_off)
       VALUES (?,?,?,?,?,?,?,?)`
    ).run(e.id, null, e.date, e.durationHours, e.format, e.setting, e.supervisorId ?? null, e.signedOff ? 1 : 0);
  }

  addCeu(e: CeuEntry): void {
    this.db.prepare(
      `INSERT INTO ceu_entry (id,credential_id,date,hours,category,title,provider)
       VALUES (?,?,?,?,?,?,?)`
    ).run(e.id, null, e.date, e.hours, e.category, e.title ?? null, e.provider ?? null);
  }

  deleteEntry(kind: 'practice' | 'supervision' | 'ceu', id: string): void {
    const table = kind === 'practice' ? 'practice_entry' : kind === 'supervision' ? 'supervision_entry' : 'ceu_entry';
    this.db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
  }

  getRecordBook(): RecordBook {
    const practice = this.db.prepare(
      `SELECT id,date,total_hours,direct_contact_hours,relational_hours FROM practice_entry`
    ).all().map((r: any): PracticeEntry => ({
      id: r.id, date: r.date, totalHours: r.total_hours,
      directContactHours: r.direct_contact_hours, relationalHours: r.relational_hours,
    }));

    const supervision = this.db.prepare(
      `SELECT id,date,duration_hours,format,setting,supervisor_id,signed_off FROM supervision_entry`
    ).all().map((r: any): SupervisionEntry => ({
      id: r.id, date: r.date, durationHours: r.duration_hours,
      format: r.format, setting: r.setting,
      supervisorId: r.supervisor_id ?? undefined, signedOff: !!r.signed_off,
    }));

    const ceu = this.db.prepare(
      `SELECT id,date,hours,category,title,provider FROM ceu_entry`
    ).all().map((r: any): CeuEntry => ({
      id: r.id, date: r.date, hours: r.hours, category: r.category,
      title: r.title ?? undefined, provider: r.provider ?? undefined,
    }));

    return { practice, supervision, ceu };
  }

  loadRecordBook(book: RecordBook): void {
    this.db.exec('DELETE FROM practice_entry; DELETE FROM supervision_entry; DELETE FROM ceu_entry;');
    for (const e of book.practice) this.addPractice(e);
    for (const e of book.supervision) this.addSupervision(e);
    for (const e of book.ceu) this.addCeu(e);
  }

  close(): void { this.db.close(); }
}
