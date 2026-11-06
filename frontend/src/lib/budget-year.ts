/** Current Thai Buddhist budget year — older years are treated as closed. */
export const OPEN_LIFECYCLE_MIN_BUDGET_YEAR = "2570";

/** Stages that only apply to the current budget year onward. */
export const OPEN_LIFECYCLE_STAGES = ["open", "closing", "draft"] as const;

export function isOpenLifecycleBudgetYear(year: string) {
  return String(year) >= OPEN_LIFECYCLE_MIN_BUDGET_YEAR;
}

export function hasOpenLifecycleStages(stages: string[]) {
  return stages.some((stage) =>
    (OPEN_LIFECYCLE_STAGES as readonly string[]).includes(stage),
  );
}

export function retainOpenLifecycleBudgetYears(years: string[]) {
  return years.filter(isOpenLifecycleBudgetYear);
}

export function dropOpenLifecycleStages<T extends string>(stages: T[]) {
  return stages.filter(
    (stage) => !(OPEN_LIFECYCLE_STAGES as readonly string[]).includes(stage),
  );
}
