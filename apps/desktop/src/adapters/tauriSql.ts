import Database from '@tauri-apps/plugin-sql';
import type { DataAdapter } from '@data-adapter';
import type { PracticeEntry, SupervisionEntry, CeuEntry, RecordBook } from '@core';

/**
 * Production Lite adapter: persists to an on-disk SQLite database via the Tauri
 * SQL plugin, so entries survive between launches. Implements the SAME
 * DataAdapter interface as the browser/in-memory adapter, so the UI is unchanged.
 *
 * Strategy: a write-through in-memory cache. Reads are synchronous (from the
 * cache) to keep the UI simple; writes update the cache immediately and persist
 * to SQLite in the background. init() loads existing data from disk on startup.
 */
export class TauriSqlAdapter implements DataAdapter {
  private db!: Database;
  private cache: RecordBook = { practice: [], supervision: [], ceu: [] };

  async init(): Promise<void> {
    this.db = await Database.load('sqlite:supervision.db');
    await this.reload();
  }

  private async reload(): Promise<void> {
    const practice = await this.db.select<any[]>(
      'SELECT id,date,total_hours,direct_contact_hours,relational_hours FROM practice_entry');
    const supervision = await this.db.select<any[]>(
      'SELECT id,date,duration_hours,format,setting,supervisor_id,signed_off FROM supervision_entry');
    const ceu = await this.db.select<any[]>(
      'SELECT id,date,hours,category,title,provider FROM ceu_entry');
    this.cache = {
      practice: practice.map(r => ({ id: r.id, date: r.date, totalHours: r.total_hours,
        directContactHours: r.direct_contact_hours, relationalHours: r.relational_hours })),
      supervision: supervision.map(r => ({ id: r.id, date: r.date, durationHours: r.duration_hours,
        format: r.format, setting: r.setting, supervisorId: r.supervisor_id ?? undefined, signedOff: !!r.signed_off })),
      ceu: ceu.map(r => ({ id: r.id, date: r.date, hours: r.hours, category: r.category,
        title: r.title ?? undefined, provider: r.provider ?? undefined })),
    };
  }

  addPractice(e: PracticeEntry): void {
    this.cache.practice.push(e);
    void this.db.execute(
      'INSERT INTO practice_entry (id,credential_id,date,total_hours,direct_contact_hours,relational_hours) VALUES ($1,$2,$3,$4,$5,$6)',
      [e.id, null, e.date, e.totalHours, e.directContactHours ?? 0, e.relationalHours ?? 0]);
  }

  addSupervision(e: SupervisionEntry): void {
    this.cache.supervision.push(e);
    void this.db.execute(
      'INSERT INTO supervision_entry (id,credential_id,date,duration_hours,format,setting,supervisor_id,signed_off) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      [e.id, null, e.date, e.durationHours, e.format, e.setting, e.supervisorId ?? null, e.signedOff ? 1 : 0]);
  }

  addCeu(e: CeuEntry): void {
    this.cache.ceu.push(e);
    void this.db.execute(
      'INSERT INTO ceu_entry (id,credential_id,date,hours,category,title,provider) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [e.id, null, e.date, e.hours, e.category, e.title ?? null, e.provider ?? null]);
  }

  deleteEntry(kind: 'practice' | 'supervision' | 'ceu', id: string): void {
    const table = kind === 'practice' ? 'practice_entry' : kind === 'supervision' ? 'supervision_entry' : 'ceu_entry';
    if (kind === 'practice') this.cache.practice = this.cache.practice.filter(x => x.id !== id);
    else if (kind === 'supervision') this.cache.supervision = this.cache.supervision.filter(x => x.id !== id);
    else this.cache.ceu = this.cache.ceu.filter(x => x.id !== id);
    void this.db.execute(`DELETE FROM ${table} WHERE id = $1`, [id]);
  }

  getRecordBook(): RecordBook {
    return {
      practice: [...this.cache.practice],
      supervision: [...this.cache.supervision],
      ceu: [...this.cache.ceu],
    };
  }

  loadRecordBook(book: RecordBook): void {
    this.cache = { practice: [...book.practice], supervision: [...book.supervision], ceu: [...book.ceu] };
    void (async () => {
      await this.db.execute('DELETE FROM practice_entry');
      await this.db.execute('DELETE FROM supervision_entry');
      await this.db.execute('DELETE FROM ceu_entry');
      for (const e of book.practice) this.addPractice(e);
      for (const e of book.supervision) this.addSupervision(e);
      for (const e of book.ceu) this.addCeu(e);
    })();
  }
}
