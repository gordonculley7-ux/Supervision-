import type { RequirementSet } from '../types.js';

/**
 * Minnesota requirement sets. Figures pulled from current (2026) MN board sources;
 * see /rules-data/SOURCES.md. Marked "verified" only after board re-check.
 * Every route per license is modeled (the "pathway" dimension).
 */
export const MINNESOTA: RequirementSet[] = [
  // ---------------- LPCC (Board of Behavioral Health & Therapy) ----------------
  {
    id: 'mn-lpcc-initial', profession: 'LPCC', state: 'MN', pathway: 'standard',
    purpose: 'initial_licensure', status: 'community', effectiveDate: '2026-01-01',
    sourceUrl: 'https://mn.gov/boards/behavioral-health/applicants/apply/apply-for-lpcc.jsp',
    supervised: { totalHours: 4000, directContactHours: 1800 },
    supervision: { totalHours: 100, individualMinHours: 50 },
    notes: 'Post-master supervised practice per MN Stat. 148B.5301.',
  },
  {
    id: 'mn-lpcc-renewal', profession: 'LPCC', state: 'MN', pathway: 'standard',
    purpose: 'renewal', status: 'community', effectiveDate: '2026-01-01',
    sourceUrl: 'https://www.revisor.mn.gov/statutes/cite/148F.075',
    ce: { cycleMonths: 24, totalHours: 40, homeStudyAllowedPercent: 1, categories: [
      { category: 'ethics', label: 'Professional ethics', minHours: 3 },
      { category: 'cultural_responsiveness', label: 'Cultural responsiveness', minHours: 4 },
    ]},
  },

  // ---------------- LMFT (Board of Marriage & Family Therapy) ----------------
  {
    id: 'mn-lmft-initial', profession: 'LMFT', state: 'MN', pathway: 'standard',
    purpose: 'initial_licensure', status: 'community', effectiveDate: '2026-01-01',
    sourceUrl: 'https://mn.gov/boards/marriage-and-family/new-applicants/',
    supervised: { totalHours: 4000, directContactHours: 1000, minDurationMonths: 24,
      directContactSubrules: [{ key: 'relational', label: 'Relational (couples/families)', hours: 500 }] },
    supervision: { totalHours: 200, individualMinPercent: 0.5, groupMaxPercent: 0.5 },
    notes: '4000 hours over not less than 24 months post-degree.',
  },
  {
    id: 'mn-lmft-renewal', profession: 'LMFT', state: 'MN', pathway: 'standard',
    purpose: 'renewal', status: 'community', effectiveDate: '2026-01-01',
    ce: { cycleMonths: 24, totalHours: 40, homeStudyAllowedPercent: 1, categories: [
      { category: 'ethics', label: 'Ethics', minHours: 3 },
      { category: 'cultural_responsiveness', label: 'Cultural competency', minHours: 4 },
    ]},
    notes: 'Board-approved supervisors additionally need 4 hours in supervision each renewal.',
  },

  // ---------------- LGSW (Board of Social Work) ----------------
  {
    id: 'mn-lgsw-clinical', profession: 'LGSW', state: 'MN', pathway: 'clinical',
    purpose: 'initial_licensure', status: 'community', effectiveDate: '2026-01-01',
    sourceUrl: 'https://mn.gov/boards/social-work/licensees/supervisedpractice/',
    supervised: { totalHours: 4000, totalHoursMax: 8000, directContactHours: 1800 },
    supervision: { totalHours: 200, individualMinHours: 100, ratioPer160: { min: 4, max: 8 } },
    notes: 'Clinical path toward LICSW; 4/160 min to 8/160 max supervision ratio.',
  },
  {
    id: 'mn-lgsw-nonclinical', profession: 'LGSW', state: 'MN', pathway: 'nonclinical',
    purpose: 'initial_licensure', status: 'community', effectiveDate: '2026-01-01',
    sourceUrl: 'https://mn.gov/boards/social-work/licensees/supervisedpractice/',
    supervised: { totalHours: 4000 },
    supervision: { totalHours: 100, ratioPer160: { min: 4, max: 8 } },
    notes: 'Licensing supervision required for at least the first 4000 hours of practice.',
  },
  {
    id: 'mn-socialwork-renewal', profession: 'LGSW', state: 'MN', pathway: 'standard',
    purpose: 'renewal', status: 'community', effectiveDate: '2026-01-01',
    ce: { cycleMonths: 24, totalHours: 40, homeStudyAllowedPercent: 1, categories: [
      { category: 'ethics', label: 'Ethics', minHours: 2 },
      { category: 'cultural_responsiveness', label: 'Cultural responsiveness', minHours: 4 },
    ]},
  },

  // ---------------- LADC (Board of Behavioral Health & Therapy) ----------------
  {
    id: 'mn-ladc-method1', profession: 'LADC', state: 'MN', pathway: 'method_1_supervision',
    purpose: 'initial_licensure', status: 'community', effectiveDate: '2026-01-01',
    sourceUrl: 'https://mn.gov/boards/behavioral-health/applicants/apply/apply-for-ladc.jsp',
    supervised: { totalHours: 2000 },
    supervision: { totalHours: 50, inPersonMinPercent: 0.75, individualMinPercent: 0.5 },
    notes: 'Method I supervision alternative: >=75% in person, >=50% individual.',
  },
  {
    id: 'mn-ladc-practicum', profession: 'LADC', state: 'MN', pathway: 'academic_practicum',
    purpose: 'initial_licensure', status: 'community', effectiveDate: '2026-01-01',
    supervised: { totalHours: 880 },
    supervision: { totalHours: 50 },
    notes: 'Academic route: 880-hour supervised practicum + coursework.',
  },
  {
    id: 'mn-ladc-renewal', profession: 'LADC', state: 'MN', pathway: 'standard',
    purpose: 'renewal', status: 'community', effectiveDate: '2026-01-01',
    ce: { cycleMonths: 24, totalHours: 40, homeStudyAllowedPercent: 1, categories: [
      { category: 'ethics', label: 'Professional ethics', minHours: 3 },
      { category: 'diversity', label: 'Diversity', minHours: 9 },
    ]},
  },
];
