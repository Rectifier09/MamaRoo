/**
 * The first gestational week of each of the nine illustration stages.
 * Changing this array is the only way to change stage behaviour anywhere in the
 * product, which is why the illustration, the progress indicator and the timeline
 * all read it rather than each holding their own thresholds.
 */
export const STAGE_BOUNDARIES = [0, 8, 12, 16, 20, 24, 28, 32, 36] as const;

export const TOTAL_STAGES = STAGE_BOUNDARIES.length;

export function illustrationStage(week: number): number {
  const safeWeek = Number.isFinite(week) ? Math.max(0, week) : 0;
  let stage = 1;
  for (let i = 0; i < STAGE_BOUNDARIES.length; i += 1) {
    if (safeWeek >= STAGE_BOUNDARIES[i]!) stage = i + 1;
  }
  return stage;
}

export function stageRangeLabelKeys(): string[] {
  return STAGE_BOUNDARIES.map((_, i) => `stages.${i + 1}`);
}
