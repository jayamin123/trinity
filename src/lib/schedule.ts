import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { WINDOW_START_HOUR, WINDOW_END_HOUR } from "./window";

dayjs.extend(utc);

/**
 * Split `total` cards across `days` calendar days with random ± jitter.
 * Each day's count is between min and max where possible; total is preserved.
 * Defaults: min=0 (a day can have zero cards), max=Infinity (no upper bound).
 */
export function randomDailyCounts(total: number, days: number, min = 0, max = Infinity): number[] {
  if (days <= 0) throw new Error("days must be > 0");
  if (total < 0) throw new Error("total must be >= 0");
  if (days === 1) return [total];

  if (total < min * days) throw new Error(`Cannot distribute ${total} across ${days} days with min=${min}/day`);
  if (max !== Infinity && total > max * days) throw new Error(`Cannot distribute ${total} across ${days} days with max=${max}/day`);

  const avg = total / days;
  const counts = Array.from({ length: days }, () => {
    const jitter = 0.75 + Math.random() * 0.5;
    return Math.max(min, Math.min(max, Math.round(avg * jitter)));
  });

  let sum = counts.reduce((a, b) => a + b, 0);
  let diff = total - sum;
  let i = 0;
  let safety = days * 1000;
  while (diff !== 0 && safety-- > 0) {
    const step = diff > 0 ? 1 : -1;
    if ((step > 0 && counts[i] < max) || (step < 0 && counts[i] > min)) {
      counts[i] += step;
      diff -= step;
    }
    i = (i + 1) % days;
  }
  if (diff !== 0) throw new Error(`Could not balance distribution (remaining ${diff})`);

  for (let j = counts.length - 1; j > 0; j--) {
    const k = Math.floor(Math.random() * (j + 1));
    [counts[j], counts[k]] = [counts[k], counts[j]];
  }
  return counts;
}

export type DistributionShape = "even" | "increasing" | "decreasing" | "normal" | "inverse";

/**
 * Distribute `total` across `days` following a shape, with a little random
 * variance so it never looks mechanical. "even" is the default roll
 * (randomDailyCounts). The others weight the days by shape then hand out the
 * total proportionally; the result always sums to `total`.
 */
export function distributeShaped(total: number, days: number, shape: DistributionShape): number[] {
  if (days <= 0) throw new Error("days must be > 0");
  if (total < 0) throw new Error("total must be >= 0");
  if (days === 1) return [total];
  if (shape === "even") return randomDailyCounts(total, days);

  const weights = Array.from({ length: days }, (_, i) => {
    const t = i / (days - 1); // 0..1 across the window
    let w: number;
    switch (shape) {
      case "increasing": w = 0.15 + t; break;
      case "decreasing": w = 0.15 + (1 - t); break;
      case "normal":  { const x = t - 0.5; w = Math.exp(-(x * x) / (2 * 0.2 * 0.2)) + 0.05; break; }
      case "inverse": { const x = t - 0.5; w = 1 - Math.exp(-(x * x) / (2 * 0.2 * 0.2)) + 0.1; break; }
      default: w = 1;
    }
    return Math.max(0.02, w * (0.8 + Math.random() * 0.4)); // ± variance
  });

  const sumW = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map(w => (w / sumW) * total);
  const counts = raw.map(Math.floor);
  const remainder = total - counts.reduce((a, b) => a + b, 0);
  // Hand the leftover units to the days with the largest fractional parts.
  const order = raw.map((v, i) => ({ i, frac: v - Math.floor(v) })).sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < remainder; k++) counts[order[k % days].i]++;
  return counts;
}

/**
 * Place `count` random timestamps inside the BKK firing window of `date` —
 * WINDOW_START_HOUR to WINDOW_END_HOUR, same calendar day (never crosses midnight).
 * Stratified sampling — divide into `count` equal slots, pick a random moment in each.
 *
 * `notBefore`: clamp the window start so nothing schedules in the past when cards
 * are added mid-day. If clamping leaves no room, returns [].
 */
export function stratifiedTimesForDay(count: number, dateInBkk: Date, notBefore?: Date): Date[] {
  if (count <= 0) return [];

  const day = dayjs.utc(dateInBkk);
  let windowStartMs = day.hour(WINDOW_START_HOUR).minute(0).second(0).millisecond(0).valueOf();
  const windowEndMs = day.hour(WINDOW_END_HOUR).minute(0).second(0).millisecond(0).valueOf();
  if (notBefore) windowStartMs = Math.max(windowStartMs, notBefore.getTime());
  if (windowStartMs >= windowEndMs) return [];
  const slotMs = (windowEndMs - windowStartMs) / count;

  return Array.from({ length: count }, (_, i) => {
    const slotStart = windowStartMs + i * slotMs;
    const offset = Math.random() * slotMs;
    return new Date(slotStart + offset);
  });
}

