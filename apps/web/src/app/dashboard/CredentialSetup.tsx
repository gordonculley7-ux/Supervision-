'use client';
import { useState } from 'react';
import { ALL_REQUIREMENT_SETS, findRequirementSets } from '@supervision-tracker/core';
import { saveCredential } from './actions.js';

const uniq = <T,>(a: T[]) => [...new Set(a)];

export default function CredentialSetup() {
  const professions = uniq(ALL_REQUIREMENT_SETS.map(r => r.profession));
  const [profession, setProfession] = useState(professions[0]);
  const states = uniq(ALL_REQUIREMENT_SETS.filter(r => r.profession === profession).map(r => r.state));
  const [state, setState] = useState(states[0]);
  const pathways = uniq(findRequirementSets({ profession, state, purpose: 'initial_licensure' }).map(r => r.pathway));
  const [pathway, setPathway] = useState(pathways[0] ?? 'standard');

  return (
    <div className="card">
      <h2>Set up your credential</h2>
      <div className="sub">Pick your profession, state, and route. Requirements load automatically.</div>
      <form action={saveCredential}>
        <div className="row">
          <div className="field"><label>Profession</label>
            <select name="profession" value={profession} onChange={e => {
              const p = e.target.value as typeof profession; setProfession(p);
              const s = uniq(ALL_REQUIREMENT_SETS.filter(r => r.profession === p).map(r => r.state));
              setState(s[0]);
              setPathway(uniq(findRequirementSets({ profession: p as any, state: s[0], purpose: 'initial_licensure' }).map(r => r.pathway))[0] ?? 'standard');
            }}>
              {professions.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="field"><label>State</label>
            <select name="state" value={state} onChange={e => setState(e.target.value)}>
              {states.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="field"><label>Route / pathway</label>
            <select name="pathway" value={pathway} onChange={e => setPathway(e.target.value)}>
              {pathways.map(o => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
        </div>
        <button className="primary" type="submit">Save credential</button>
      </form>
    </div>
  );
}
