import type {
  RequirementSet, RecordBook, Metric, ProgressReport,
  SupervisionEntry, PracticeEntry, CeuEntry,
} from './types.js';

const round1 = (n: number) => Math.round(n * 10) / 10;

function sum<T>(items: T[], pick: (t: T) => number): number {
  return round1(items.reduce((a, t) => a + (pick(t) || 0), 0));
}

function metric(key: string, label: string, current: number, required: number, warning?: string): Metric {
  const c = round1(current), r = round1(required);
  return { key, label, current: c, required: r, remaining: round1(Math.max(0, r - c)), met: c >= r, warning };
}

/**
 * Compute progress of a record book against a requirement set.
 * Handles both initial-licensure (supervised/supervision) and renewal (CE) sets.
 */
export function computeProgress(req: RequirementSet, book: RecordBook): ProgressReport {
  const metrics: Metric[] = [];
  const sup: SupervisionEntry[] = book.supervision || [];
  const prac: PracticeEntry[] = book.practice || [];
  const ceu: CeuEntry[] = book.ceu || [];

  // ---- Supervised practice ----
  if (req.supervised) {
    const totalPractice = sum(prac, p => p.totalHours);
    metrics.push(metric('supervised_total', 'Total supervised hours', totalPractice, req.supervised.totalHours));

    if (req.supervised.directContactHours !== undefined) {
      const direct = sum(prac, p => p.directContactHours ?? 0);
      metrics.push(metric('direct_contact', 'Direct client-contact hours', direct, req.supervised.directContactHours));
    }
    for (const sr of req.supervised.directContactSubrules ?? []) {
      if (sr.key === 'relational') {
        const rel = sum(prac, p => p.relationalHours ?? 0);
        metrics.push(metric('direct_' + sr.key, sr.label, rel, sr.hours));
      }
    }
  }

  // ---- Supervision hours ----
  if (req.supervision) {
    const sv = req.supervision;
    const totalSup = sum(sup, s => s.durationHours);
    const individual = sum(sup.filter(s => s.format === 'individual'), s => s.durationHours);
    const group = round1(totalSup - individual);
    const inPerson = sum(sup.filter(s => s.setting === 'in_person'), s => s.durationHours);

    metrics.push(metric('supervision_total', 'Supervision hours', totalSup, sv.totalHours));

    if (sv.individualMinHours !== undefined) {
      metrics.push(metric('supervision_individual', 'Individual (1:1) supervision', individual, sv.individualMinHours));
    }
    if (sv.individualMinPercent !== undefined) {
      const need = round1(sv.totalHours * sv.individualMinPercent);
      metrics.push(metric('supervision_individual', `Individual supervision (>=${sv.individualMinPercent * 100}%)`, individual, need));
    }
    if (sv.groupMaxPercent !== undefined) {
      const cap = round1(totalSup * sv.groupMaxPercent);
      const over = group > cap + 0.05;
      const m = metric('supervision_group_cap', `Group supervision (cap ${sv.groupMaxPercent * 100}% of logged)`, group, cap);
      // This is a ceiling, not a floor: "met" here means within cap.
      m.met = !over;
      m.remaining = 0;
      if (over) m.warning = `Group hours (${group}) exceed the ${sv.groupMaxPercent * 100}% cap (${cap}).`;
      metrics.push(m);
    }
    if (sv.inPersonMinPercent !== undefined) {
      const need = round1(sv.totalHours * sv.inPersonMinPercent);
      metrics.push(metric('supervision_in_person', `In-person supervision (>=${sv.inPersonMinPercent * 100}%)`, inPerson, need));
    }
    if (sv.ratioPer160) {
      // Informational check across accrued practice.
      const totalPractice = sum(prac, p => p.totalHours);
      const blocks = totalPractice / 160;
      const min = round1(blocks * sv.ratioPer160.min);
      const m = metric('supervision_ratio', `Supervision ratio (>=${sv.ratioPer160.min}/160 practice hrs)`, totalSup, min);
      metrics.push(m);
    }
  }

  // ---- Continuing education ----
  if (req.ce) {
    const totalCe = sum(ceu, e => e.hours);
    metrics.push(metric('ce_total', 'Total CE hours', totalCe, req.ce.totalHours));
    for (const cat of req.ce.categories) {
      const got = sum(ceu.filter(e => e.category === cat.category), e => e.hours);
      metrics.push(metric('ce_' + cat.category, cat.label + ' CE', got, cat.minHours));
    }
    if (req.ce.homeStudyAllowedPercent !== undefined && req.ce.homeStudyAllowedPercent < 1) {
      // reserved for future home-study tracking
    }
  }

  return {
    requirementSetId: req.id,
    profession: req.profession,
    pathway: req.pathway,
    purpose: req.purpose,
    metrics,
    overallComplete: metrics.length > 0 && metrics.every(m => m.met),
  };
}
