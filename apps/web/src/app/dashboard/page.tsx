import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { toRecordBook } from '@/lib/records';
import {
  computeProgress, getRequirementSet, findRequirementSets,
} from '@supervision-tracker/core';
import type { Metric } from '@supervision-tracker/core';
import CredentialSetup from './CredentialSetup';
import { addPractice, addSupervision, addCeu, deleteEntry, signOutAction } from './actions';

export const dynamic = 'force-dynamic';

function today() { return new Date().toISOString().slice(0, 10); }

function Bar({ m }: { m: Metric }) {
  const pct = m.required > 0 ? Math.min(100, (m.current / m.required) * 100) : (m.met ? 100 : 0);
  const cls = m.warning ? 'metric warn' : m.met ? 'metric met' : 'metric';
  return (
    <div className={cls}>
      <div className="lab">
        <span>{m.label}{m.met && !m.warning ? ' ✓' : ''}</span>
        <span className="val">{m.current} / {m.required}{m.remaining > 0 ? ` · ${m.remaining} to go` : ''}</span>
      </div>
      <div className="bar"><span style={{ width: pct + '%' }} /></div>
      {m.warning && <div className="warnmsg">⚠ {m.warning}</div>}
    </div>
  );
}

export default async function Dashboard() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const userId = (session.user as any).id as string;

  const credential = await prisma.credential.findFirst({ where: { userId } });

  return (
    <div className="app">
      <div className="topbar">
        <div><strong style={{ color: 'var(--blue)' }}>Supervision &amp; CEU Tracker</strong> <span className="badge">Web</span></div>
        <div className="who">
          {session.user.email}
          <form action={signOutAction} style={{ display: 'inline', marginLeft: 12 }}>
            <button className="ghost" type="submit">Sign out</button>
          </form>
        </div>
      </div>

      {!credential ? (
        <CredentialSetup />
      ) : (
        <DashboardBody userId={userId} credential={credential} />
      )}

      <p className="disclaimer">
        This tool tracks and reports your hours and continuing education; it does not certify
        licensure. Confirm all requirements with your board. Do not enter identifiable client
        information.
      </p>
    </div>
  );
}

async function DashboardBody({ userId, credential }: { userId: string; credential: any }) {
  const [practice, supervision, ceu] = await Promise.all([
    prisma.practiceEntry.findMany({ where: { userId }, orderBy: { date: 'desc' } }),
    prisma.supervisionEntry.findMany({ where: { userId }, orderBy: { date: 'desc' } }),
    prisma.ceuEntry.findMany({ where: { userId }, orderBy: { date: 'desc' } }),
  ]);
  const book = toRecordBook({ practice, supervision, ceu });

  const initialSet = getRequirementSet(credential.requirementSetId)
    ?? findRequirementSets({ profession: credential.profession, state: credential.state, purpose: 'initial_licensure', pathway: credential.pathway })[0];
  const renewalSet = findRequirementSets({ profession: credential.profession, state: credential.state, purpose: 'renewal' })[0];
  const initialProgress = initialSet ? computeProgress(initialSet, book) : undefined;
  const renewalProgress = renewalSet ? computeProgress(renewalSet, book) : undefined;

  return (
    <>
      <div className="card">
        <h2>{credential.profession} · {credential.state} · {String(credential.pathway).replace(/_/g, ' ')}</h2>
        <div className="summary">
          <div className="stat"><div className="n">{sum(book.practice.map(p => p.totalHours))}</div><div className="k">practice hrs</div></div>
          <div className="stat"><div className="n">{sum(book.supervision.map(s => s.durationHours))}</div><div className="k">supervision hrs</div></div>
          <div className="stat"><div className="n">{sum(book.ceu.map(c => c.hours))}</div><div className="k">CE hrs</div></div>
        </div>
      </div>

      {initialProgress && (
        <div className="card">
          <h2>Initial licensure {initialProgress.overallComplete && <span className="donetag">✓ complete</span>}</h2>
          {initialProgress.metrics.map(m => <Bar key={m.key} m={m} />)}
        </div>
      )}
      {renewalProgress && (
        <div className="card">
          <h2>Renewal cycle {renewalProgress.overallComplete && <span className="donetag">✓ complete</span>}</h2>
          {renewalProgress.metrics.map(m => <Bar key={m.key} m={m} />)}
        </div>
      )}

      <div className="card">
        <h2>Log practice hours</h2>
        <form action={addPractice}>
          <div className="row">
            <div className="field"><label>Date</label><input name="date" type="date" defaultValue={today()} /></div>
            <div className="field"><label>Total hours</label><input name="totalHours" type="number" step="0.25" defaultValue="8" /></div>
            <div className="field"><label>Direct contact</label><input name="directContactHours" type="number" step="0.25" defaultValue="4" /></div>
            <div className="field"><label>Relational (LMFT)</label><input name="relationalHours" type="number" step="0.25" defaultValue="0" /></div>
          </div>
          <button className="primary" type="submit">Add practice</button>
        </form>
        <EntryTable kind="practice" rows={book.practice.map(p => [p.date, `${p.totalHours}h total`, `${p.directContactHours ?? 0}h direct`, p.id])} />
      </div>

      <div className="card">
        <h2>Log supervision</h2>
        <form action={addSupervision}>
          <div className="row">
            <div className="field"><label>Date</label><input name="date" type="date" defaultValue={today()} /></div>
            <div className="field"><label>Hours</label><input name="durationHours" type="number" step="0.25" defaultValue="1" /></div>
            <div className="field"><label>Format</label>
              <select name="format"><option value="individual">Individual (1:1)</option><option value="group">Group</option></select></div>
            <div className="field"><label>Setting</label>
              <select name="setting"><option value="in_person">In person</option><option value="remote">Remote</option></select></div>
          </div>
          <button className="primary" type="submit">Add supervision</button>
        </form>
        <EntryTable kind="supervision" rows={book.supervision.map(s => [s.date, `${s.durationHours}h`, `${s.format}, ${s.setting.replace('_', ' ')}`, s.id])} />
      </div>

      <div className="card">
        <h2>Log continuing education</h2>
        <form action={addCeu}>
          <div className="row">
            <div className="field"><label>Date</label><input name="date" type="date" defaultValue={today()} /></div>
            <div className="field"><label>Hours</label><input name="hours" type="number" step="0.25" defaultValue="3" /></div>
            <div className="field"><label>Category</label>
              <select name="category">
                <option value="general">General</option><option value="ethics">Ethics</option>
                <option value="cultural_responsiveness">Cultural responsiveness</option>
                <option value="diversity">Diversity</option><option value="supervision">Supervision</option>
              </select></div>
            <div className="field"><label>Title (optional)</label><input name="title" /></div>
          </div>
          <button className="primary" type="submit">Add CE activity</button>
        </form>
        <EntryTable kind="ceu" rows={book.ceu.map(c => [c.date, `${c.hours}h`, c.category.replace(/_/g, ' ') + (c.title ? ` — ${c.title}` : ''), c.id])} />
      </div>
    </>
  );
}

function EntryTable({ kind, rows }: { kind: string; rows: (string)[][] }) {
  if (rows.length === 0) return <div className="empty">No entries yet.</div>;
  return (
    <table className="log">
      <thead><tr><th>Date</th><th>Amount</th><th>Detail</th><th></th></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r[3]}>
            <td>{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td>
            <td style={{ textAlign: 'right' }}>
              <form action={deleteEntry} style={{ display: 'inline' }}>
                <input type="hidden" name="kind" value={kind} />
                <input type="hidden" name="id" value={r[3]} />
                <button className="ghost" type="submit">Delete</button>
              </form>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function sum(a: number[]) { return Math.round(a.reduce((x, y) => x + y, 0) * 10) / 10; }
