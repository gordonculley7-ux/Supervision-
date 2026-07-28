/**
 * Shared domain types for the Supervision & CEU Tracker core.
 * Platform-agnostic: no database, no UI, no network.
 */

export type Profession = 'LPCC' | 'LGSW' | 'LMFT' | 'LADC';
export type Purpose = 'initial_licensure' | 'renewal';
export type RuleStatus = 'verified' | 'community';
export type SupervisionFormat = 'individual' | 'group';
export type Setting = 'in_person' | 'remote';

export type CeCategory =
  | 'general'
  | 'ethics'
  | 'cultural_responsiveness'
  | 'diversity'
  | 'supervision';

/** A named minimum inside a larger hour total (e.g. "500 relational" inside direct contact). */
export interface SubRule { key: string; label: string; hours: number; }

export interface SupervisedRequirement {
  totalHours: number;
  totalHoursMax?: number;
  directContactHours?: number;
  directContactSubrules?: SubRule[];
  minDurationMonths?: number;
}

export interface SupervisionRequirement {
  totalHours: number;
  individualMinHours?: number;
  individualMinPercent?: number; // 0-1
  groupMaxPercent?: number;      // 0-1
  inPersonMinPercent?: number;   // 0-1
  ratioPer160?: { min: number; max: number };
}

export interface CeCategoryRequirement { category: CeCategory; label: string; minHours: number; }

export interface CeRequirement {
  cycleMonths: number;
  totalHours: number;
  categories: CeCategoryRequirement[];
  homeStudyAllowedPercent?: number; // 0-1
}

/** The rules-as-data record: one board requirement for a profession x state x pathway x purpose. */
export interface RequirementSet {
  id: string;
  profession: Profession;
  state: string;
  pathway: string;
  purpose: Purpose;
  status: RuleStatus;
  effectiveDate: string;
  sourceUrl?: string;
  supervised?: SupervisedRequirement;
  supervision?: SupervisionRequirement;
  ce?: CeRequirement;
  notes?: string;
}

/* ---- Record (what the user did) ---- */

export interface SupervisionEntry {
  id: string; date: string; durationHours: number;
  format: SupervisionFormat; setting: Setting; supervisorId?: string; signedOff?: boolean;
}
export interface PracticeEntry {
  id: string; date: string; totalHours: number; directContactHours?: number; relationalHours?: number;
}
export interface CeuEntry {
  id: string; date: string; hours: number; category: CeCategory; title?: string; provider?: string;
}
export interface RecordBook { supervision: SupervisionEntry[]; practice: PracticeEntry[]; ceu: CeuEntry[]; }

/* ---- Progress ---- */

export interface Metric {
  key: string; label: string; current: number; required: number;
  remaining: number; met: boolean; warning?: string;
}
export interface ProgressReport {
  requirementSetId: string; profession: Profession; pathway: string; purpose: Purpose;
  metrics: Metric[]; overallComplete: boolean;
}
