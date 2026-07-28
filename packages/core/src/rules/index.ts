import type { RequirementSet, Profession, Purpose } from '../types.js';
import { MINNESOTA } from './minnesota.js';

/** All seeded requirement sets. States are added here as pure data. */
export const ALL_REQUIREMENT_SETS: RequirementSet[] = [...MINNESOTA];

export function findRequirementSets(query: {
  state?: string; profession?: Profession; purpose?: Purpose; pathway?: string;
}): RequirementSet[] {
  return ALL_REQUIREMENT_SETS.filter(r =>
    (query.state === undefined || r.state === query.state) &&
    (query.profession === undefined || r.profession === query.profession) &&
    (query.purpose === undefined || r.purpose === query.purpose) &&
    (query.pathway === undefined || r.pathway === query.pathway));
}

export function getRequirementSet(id: string): RequirementSet | undefined {
  return ALL_REQUIREMENT_SETS.find(r => r.id === id);
}
