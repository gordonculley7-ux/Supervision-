import type {
  RecordBook, PracticeEntry, SupervisionEntry, CeuEntry,
} from '../../core/src/index.js';

/**
 * Storage-agnostic interface the UI talks to. Lite plugs in a SQLite
 * implementation; Web plugs in an HTTP/API implementation. Same UI, same core.
 */
export interface DataAdapter {
  addPractice(e: PracticeEntry): void;
  addSupervision(e: SupervisionEntry): void;
  addCeu(e: CeuEntry): void;
  deleteEntry(kind: 'practice' | 'supervision' | 'ceu', id: string): void;
  /** Full record book for a credential (or all if omitted). */
  getRecordBook(credentialId?: string): RecordBook;
  /** Replace all stored entries (used by backup restore). */
  loadRecordBook(book: RecordBook): void;
  close?(): void;
}
