import React, { useMemo, useRef, useState } from 'react';
import {
  computeProgress, findRequirementSets, ALL_REQUIREMENT_SETS,
  exportEncryptedBackup, importEncryptedBackup,
} from '@core';
import type {
  RequirementSet, ProgressReport, Metric, CeCategory,
  PracticeEntry, SupervisionEntry, CeuEntry, BackupPayload,
} from '@core';
import { InMemoryAdapter } from './adapters/inMemory.js';

const uid = () => (crypto?.randomUUID ? crypto.randomUUID() : 'id' + Math.random().toString(36).slice(2));
const uniq = <T,>(a: T[]) => [...new Set(a)];

type Tab = 'setup' | 'log' | 'progress' | 'backup';

export default function App() {
  const adapter = useRef(new InMemoryAdapter());
  const [, setVersion] = useState(0);
  const bump = () => setVersion(v => v + 1);

  const professions = uniq(ALL_REQUIREMENT_SETS.map(r => r.profession));
  const [profession, setProfession] = useState(professions[0]);
  const statesFor = uniq(ALL_REQUIREMENT_SETS.filter(r => r.profession === profession).map(r => r.state));
  const [state, setState] = useState(statesFor[0]);

  const initialSets = findRequirementSets({ profession, state, purpose: 'initial_licensure' });
  const [pathway, setPathway] = useState(initialSets[0]?.pathway ?? 'standard');

  const initialSet: RequirementSet | undefined =
    findRequirementSets({ profession, state, purpose: 'initial_licensure', pathway })[0] ?? initialSets[0];
  const renewalSet: RequirementSet | undefined =
    findRequirementSets({ profession, state, purpose: 'renewal' })[0];

  const [tab, setTab] = useState<Tab>('setup');

  const book = adapter.current.getRecordBook();
  const initialProgress = useMemo(
    () => (initialSet ? computeProgress(initialSet, book) : undefined),
    [initialSet, book.practice.length, book.supervision.length]
  );
  const renewalProgress = useMemo(
    () => (renewalSet ? computeProgress(renewalSet, book) : undefined),
    [renewalSet, book.ceu.length]
  );

  return (
    <div className="app">
      <header className="top">
        <h1>Supervision &amp; CEU Tracker</h1>
        <span className="badge">Lite</span>
        <span style={{ color: 'var(--muted)', fontSize: 13 }}>
          {profession} · {state} · {pathway.replace(/_/g, ' ')}
        </span>
      </header>

      <nav className="tabs">
        {(['setup', 'log', 'progress', 'backup'] as Tab[]).map(t => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
            {t === 'setup' ? 'Setup' : t === 'log' ? 'Log hours & CEUs' : t === 'progress' ? 'Progress' : 'Backup'}
          </button>
        ))}
      </nav>

      {tab === 'setup' && (
        <Setup
          professions={professions} profession={profession}
          onProfession={p => { setProfession(p);
            const s = uniq(ALL_REQUIREMENT_SETS.filter(r => r.profession === p).map(r => r.state));
            setState(s[0]);
            const pw = findRequirementSets({ profession: p, state: s[0], purpose: 'initial_licensure' })[0]?.pathway ?? 'standard';
            setPathway(pw);
          }}
          states={statesFor} state={state} onState={setState}
          pathways={initialSets.map(r => r.pathway)} pathway={pathway} onPathway={setPathway}
          initialSet={initialSet} renewalSet={renewalSet}
        />
      )}

      {tab === 'log' && (
        <LogTab adapter={adapter.current} book={book} onChange={bump} hasRenewal={!!renewalSet} />
      )}

      {tab === 'progress' && (
        <ProgressTab initialSet={initialSet} initialProgress={initialProgress}
          renewalSet={renewalSet} renewalProgress={renewalProgress} book={book} />
      )}

      {tab === 'backup' && (
        <BackupTab
          adapter={adapter.current}
          credential={{ profession, state, pathway }}
          onImported={(cred) => {
            if (cred) {
              setProfession(cred.profession as any);
              setState(cred.state);
              setPathway(cred.pathway);
            }
            bump();
          }}
        />
      )}

      <p className="disclaimer">
        This tool tracks and reports your hours and continuing education; it does not certify
        licensure. Requirement figures are current best-effort data and should be confirmed with
        your licensing board. Avoid entering identifiable client information in notes.
      </p>
    </div>
  );
}

/* ------------------------------- Setup ------------------------------- */
function Setup(props: {
  professions: string[]; profession: string; onProfession: (p: any) => void;
  states: string[]; state: string; onState: (s: string) => void;
  pathways: string[]; pathway: string; onPathway: (p: string) => void;
  initialSet?: RequirementSet; renewalSet?: RequirementSet;
}) {
  return (
    <div className="card">
      <h2>Your credential</h2>
      <div className="sub">Pick your profession, state, and supervision route. Your requirements update automatically.</div>
      <div className="row">
        <Select label="Profession" value={props.profession} options={props.professions} onChange={props.onProfession} />
        <Select label="State" value={props.state} options={props.states} onChange={props.onState} />
        <Select label="Route / pathway" value={props.pathway}
          options={uniq(props.pathways)} labelMap={v => v.replace(/_/g, ' ')} onChange={props.onPathway} />
      </div>
      {props.initialSet && (
        <div className="pillrow">
          <SummaryLine set={props.initialSet} />
        </div>
      )}
      {props.renewalSet && (
        <div className="pillrow">
          <SummaryLine set={props.renewalSet} />
        </div>
      )}
    </div>
  );
}

function SummaryLine({ set }: { set: RequirementSet }) {
  const parts: string[] = [];
  if (set.supervised) parts.push(`${set.supervised.totalHours.toLocaleString()} supervised hrs`);
  if (set.supervised?.directContactHours) parts.push(`${set.supervised.directContactHours.toLocaleString()} direct`);
  if (set.supervision) parts.push(`${set.supervision.totalHours} supervision hrs`);
  if (set.ce) parts.push(`${set.ce.totalHours} CE / ${set.ce.cycleMonths}mo`);
  return <span style={{ fontSize: 13, color: 'var(--muted)' }}>
    <strong style={{ color: 'var(--ink)' }}>{set.purpose === 'renewal' ? 'Renewal' : 'Initial licensure'}:</strong> {parts.join(' · ')}
  </span>;
}

/* -------------------------------- Log -------------------------------- */
function LogTab({ adapter, book, onChange, hasRenewal }: {
  adapter: InMemoryAdapter; book: ReturnType<InMemoryAdapter['getRecordBook']>;
  onChange: () => void; hasRenewal: boolean;
}) {
  const [pDate, setPDate] = useState(today());
  const [pTotal, setPTotal] = useState('8');
  const [pDirect, setPDirect] = useState('4');
  const [pRel, setPRel] = useState('0');

  const [sDate, setSDate] = useState(today());
  const [sDur, setSDur] = useState('1');
  const [sFmt, setSFmt] = useState<'individual' | 'group'>('individual');
  const [sSet, setSSet] = useState<'in_person' | 'remote'>('in_person');

  const [cDate, setCDate] = useState(today());
  const [cHours, setCHours] = useState('3');
  const [cCat, setCCat] = useState<CeCategory>('general');
  const [cTitle, setCTitle] = useState('');

  return (
    <>
      <div className="card">
        <h2>Log practice hours</h2>
        <div className="sub">Supervised practice, including direct client contact.</div>
        <div className="row">
          <Field label="Date"><input type="date" value={pDate} onChange={e => setPDate(e.target.value)} /></Field>
          <Field label="Total hours"><input type="number" value={pTotal} onChange={e => setPTotal(e.target.value)} /></Field>
          <Field label="Direct contact"><input type="number" value={pDirect} onChange={e => setPDirect(e.target.value)} /></Field>
          <Field label="Relational (LMFT)"><input type="number" value={pRel} onChange={e => setPRel(e.target.value)} /></Field>
        </div>
        <button className="primary" onClick={() => {
          const e: PracticeEntry = { id: uid(), date: pDate, totalHours: +pTotal, directContactHours: +pDirect, relationalHours: +pRel };
          adapter.addPractice(e); onChange();
        }}>Add practice</button>
        <LogTable rows={book.practice.map(p => [p.date, `${p.totalHours}h total`, `${p.directContactHours ?? 0}h direct`])}
          onDelete={i => { adapter.deleteEntry('practice', book.practice[i].id); onChange(); }} />
      </div>

      <div className="card">
        <h2>Log supervision</h2>
        <div className="sub">Each supervision session — individual or group, in person or remote.</div>
        <div className="row">
          <Field label="Date"><input type="date" value={sDate} onChange={e => setSDate(e.target.value)} /></Field>
          <Field label="Hours"><input type="number" value={sDur} onChange={e => setSDur(e.target.value)} /></Field>
          <Field label="Format">
            <select value={sFmt} onChange={e => setSFmt(e.target.value as any)}>
              <option value="individual">Individual (1:1)</option>
              <option value="group">Group</option>
            </select>
          </Field>
          <Field label="Setting">
            <select value={sSet} onChange={e => setSSet(e.target.value as any)}>
              <option value="in_person">In person</option>
              <option value="remote">Remote</option>
            </select>
          </Field>
        </div>
        <button className="primary" onClick={() => {
          const e: SupervisionEntry = { id: uid(), date: sDate, durationHours: +sDur, format: sFmt, setting: sSet };
          adapter.addSupervision(e); onChange();
        }}>Add supervision</button>
        <LogTable rows={book.supervision.map(s => [s.date, `${s.durationHours}h`, `${s.format}, ${s.setting.replace('_', ' ')}`])}
          onDelete={i => { adapter.deleteEntry('supervision', book.supervision[i].id); onChange(); }} />
      </div>

      <div className="card">
        <h2>Log continuing education</h2>
        <div className="sub">{hasRenewal ? 'Counts toward your renewal cycle.' : 'CE for the current cycle.'}</div>
        <div className="row">
          <Field label="Date"><input type="date" value={cDate} onChange={e => setCDate(e.target.value)} /></Field>
          <Field label="Hours"><input type="number" value={cHours} onChange={e => setCHours(e.target.value)} /></Field>
          <Field label="Category">
            <select value={cCat} onChange={e => setCCat(e.target.value as CeCategory)}>
              <option value="general">General</option>
              <option value="ethics">Ethics</option>
              <option value="cultural_responsiveness">Cultural responsiveness</option>
              <option value="diversity">Diversity</option>
              <option value="supervision">Supervision</option>
            </select>
          </Field>
          <Field label="Title (optional)"><input value={cTitle} onChange={e => setCTitle(e.target.value)} /></Field>
        </div>
        <button className="primary" onClick={() => {
          const e: CeuEntry = { id: uid(), date: cDate, hours: +cHours, category: cCat, title: cTitle || undefined };
          adapter.addCeu(e); onChange();
        }}>Add CE activity</button>
        <LogTable rows={book.ceu.map(c => [c.date, `${c.hours}h`, c.category.replace(/_/g, ' ') + (c.title ? ` — ${c.title}` : '')])}
          onDelete={i => { adapter.deleteEntry('ceu', book.ceu[i].id); onChange(); }} />
      </div>
    </>
  );
}

/* ------------------------------ Progress ----------------------------- */
function ProgressTab({ initialSet, initialProgress, renewalSet, renewalProgress, book }: {
  initialSet?: RequirementSet; initialProgress?: ProgressReport;
  renewalSet?: RequirementSet; renewalProgress?: ProgressReport;
  book: ReturnType<InMemoryAdapter['getRecordBook']>;
}) {
  const totalPractice = book.practice.reduce((a, p) => a + p.totalHours, 0);
  const totalSup = book.supervision.reduce((a, s) => a + s.durationHours, 0);
  const totalCe = book.ceu.reduce((a, c) => a + c.hours, 0);
  return (
    <>
      <div className="card">
        <h2>At a glance</h2>
        <div className="summary">
          <div className="stat"><div className="n">{totalPractice.toLocaleString()}</div><div className="k">practice hours</div></div>
          <div className="stat"><div className="n">{totalSup}</div><div className="k">supervision hours</div></div>
          <div className="stat"><div className="n">{totalCe}</div><div className="k">CE hours</div></div>
        </div>
      </div>

      {initialSet && initialProgress && (
        <div className="card">
          <h2>Initial licensure {initialProgress.overallComplete && <span className="donetag">✓ complete</span>}</h2>
          <div className="sub">{initialSet.notes}</div>
          {initialProgress.metrics.map(m => <MetricBar key={m.key} m={m} />)}
        </div>
      )}

      {renewalSet && renewalProgress && (
        <div className="card">
          <h2>Renewal cycle {renewalProgress.overallComplete && <span className="donetag">✓ complete</span>}</h2>
          <div className="sub">{renewalSet.ce?.totalHours} hours every {renewalSet.ce?.cycleMonths} months.</div>
          {renewalProgress.metrics.map(m => <MetricBar key={m.key} m={m} />)}
        </div>
      )}
    </>
  );
}

function MetricBar({ m }: { m: Metric }) {
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

/* ----------------------------- primitives ---------------------------- */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="field"><label>{label}</label>{children}</div>;
}
function Select({ label, value, options, onChange, labelMap }: {
  label: string; value: string; options: string[]; onChange: (v: string) => void; labelMap?: (v: string) => string;
}) {
  return (
    <Field label={label}>
      <select value={value} onChange={e => onChange(e.target.value)}>
        {options.map(o => <option key={o} value={o}>{labelMap ? labelMap(o) : o}</option>)}
      </select>
    </Field>
  );
}
function LogTable({ rows, onDelete }: { rows: string[][]; onDelete: (i: number) => void }) {
  if (rows.length === 0) return <div className="empty">No entries yet.</div>;
  return (
    <table className="log">
      <thead><tr><th>Date</th><th>Amount</th><th>Detail</th><th></th></tr></thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((c, j) => <td key={j}>{c}</td>)}
            <td style={{ textAlign: 'right' }}><button className="ghost" onClick={() => onDelete(i)}>Delete</button></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function today() { return new Date().toISOString().slice(0, 10); }

/* ------------------------------- Backup ------------------------------ */
function BackupTab({ adapter, credential, onImported }: {
  adapter: InMemoryAdapter;
  credential: { profession: string; state: string; pathway: string };
  onImported: (cred?: { profession: string; state: string; pathway: string }) => void;
}) {
  const [expPass, setExpPass] = useState('');
  const [expMsg, setExpMsg] = useState('');
  const [impPass, setImpPass] = useState('');
  const [impFile, setImpFile] = useState<File | null>(null);
  const [impMsg, setImpMsg] = useState('');
  const [impErr, setImpErr] = useState('');

  async function doExport() {
    setExpMsg('');
    try {
      const payload: BackupPayload = {
        credentials: [{ profession: credential.profession as any, state: credential.state, pathway: credential.pathway }],
        recordBook: adapter.getRecordBook(),
      };
      const text = await exportEncryptedBackup(payload, expPass);
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `supervision-backup-${new Date().toISOString().slice(0, 10)}.stbackup`;
      a.click();
      URL.revokeObjectURL(url);
      setExpMsg('Backup file downloaded. Keep your passphrase safe — it cannot be recovered.');
      setExpPass('');
    } catch (e: any) {
      setExpMsg('⚠ ' + (e?.message ?? 'Export failed.'));
    }
  }

  async function doImport() {
    setImpMsg(''); setImpErr('');
    if (!impFile) { setImpErr('Choose a backup file first.'); return; }
    try {
      const text = await impFile.text();
      const payload = await importEncryptedBackup(text, impPass);
      adapter.loadRecordBook(payload.recordBook);
      onImported(payload.credentials?.[0]);
      setImpMsg('Backup restored. Your hours and CEUs are loaded.');
      setImpPass('');
    } catch (e: any) {
      setImpErr('⚠ ' + (e?.message ?? 'Import failed.'));
    }
  }

  return (
    <>
      <div className="card">
        <h2>Export a backup</h2>
        <div className="sub">
          Save all your data to a single encrypted file. Move it to another computer (USB, cloud,
          email) and restore it there — no internet needed. Also works to move into the Web edition later.
        </div>
        <div className="row">
          <Field label="Backup passphrase">
            <input type="password" value={expPass} placeholder="Choose a passphrase (min 4 chars)"
              onChange={e => setExpPass(e.target.value)} />
          </Field>
        </div>
        <button className="primary" onClick={doExport} disabled={expPass.length < 4}>Export backup file</button>
        {expMsg && <div className="warnmsg" style={{ color: expMsg.startsWith('⚠') ? 'var(--amber)' : 'var(--green)' }}>{expMsg}</div>}
      </div>

      <div className="card">
        <h2>Restore from a backup</h2>
        <div className="sub">On a new computer, install Lite, then load your backup file and enter its passphrase.</div>
        <div className="row">
          <Field label="Backup file">
            <input type="file" accept=".stbackup,application/json" onChange={e => setImpFile(e.target.files?.[0] ?? null)} />
          </Field>
          <Field label="Passphrase">
            <input type="password" value={impPass} onChange={e => setImpPass(e.target.value)} />
          </Field>
        </div>
        <button className="primary" onClick={doImport}>Restore backup</button>
        {impMsg && <div className="warnmsg" style={{ color: 'var(--green)' }}>{impMsg}</div>}
        {impErr && <div className="warnmsg">{impErr}</div>}
      </div>
    </>
  );
}
