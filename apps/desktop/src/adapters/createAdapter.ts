import type { DataAdapter } from '@data-adapter';
import { InMemoryAdapter } from './inMemory.js';

/** True when running inside the Tauri desktop shell (vs. a plain browser dev tab). */
function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/**
 * Pick the right storage backend at runtime:
 *  - Desktop (Tauri)  -> on-disk SQLite, data persists between launches.
 *  - Browser dev      -> in-memory (resets on refresh).
 * Both implement the identical DataAdapter interface, so the UI never changes.
 */
export async function createAdapter(): Promise<DataAdapter> {
  if (isTauri()) {
    const { TauriSqlAdapter } = await import('./tauriSql.js');
    const a = new TauriSqlAdapter();
    await a.init();
    return a;
  }
  return new InMemoryAdapter();
}
