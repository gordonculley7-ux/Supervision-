import type { DataAdapter } from '@data-adapter';
import type { PracticeEntry, SupervisionEntry, CeuEntry, RecordBook } from '@core';

/**
 * Browser-safe adapter for development and the Tauri UI before wiring native SQL.
 * Implements the SAME DataAdapter interface as the SQLite store, so the UI is
 * identical regardless of where data actually lives.
 */
export class InMemoryAdapter implements DataAdapter {
  private practice: PracticeEntry[] = [];
  private supervision: SupervisionEntry[] = [];
  private ceu: CeuEntry[] = [];

  addPractice(e: PracticeEntry) { this.practice.push(e); }
  addSupervision(e: SupervisionEntry) { this.supervision.push(e); }
  addCeu(e: CeuEntry) { this.ceu.push(e); }

  deleteEntry(kind: 'practice' | 'supervision' | 'ceu', id: string) {
    if (kind === 'practice') this.practice = this.practice.filter(x => x.id !== id);
    else if (kind === 'supervision') this.supervision = this.supervision.filter(x => x.id !== id);
    else this.ceu = this.ceu.filter(x => x.id !== id);
  }

  loadRecordBook(book: RecordBook) {
    this.practice = [...book.practice];
    this.supervision = [...book.supervision];
    this.ceu = [...book.ceu];
  }

  getRecordBook(): RecordBook {
    return {
      practice: [...this.practice],
      supervision: [...this.supervision],
      ceu: [...this.ceu],
    };
  }
}
