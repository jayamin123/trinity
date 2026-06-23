import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

// All timestamps in this app are stored as "fake UTC that's really BKK time."
// A schedule for 14:30 BKK is stored as the Date 2026-06-07T14:30:00.000Z.
// We never call .tz() or .utcOffset() — the UTC view of every stored timestamp
// IS the BKK clock time. The only conversion in the whole app happens here,
// when capturing "now" from the runtime.

/** Current "BKK now" as a Date. Add 7h to real UTC so the resulting Date's UTC
 *  view matches the BKK wall clock. Use this anywhere you'd write `new Date()`. */
export function nowBkk(): Date {
  return new Date(Date.now() + 7 * 60 * 60 * 1000);
}

/** Format a stored BKK-frame timestamp for display. */
export function formatBkk(d: Date | string | null | undefined, fmt = "MMM D, h:mm A"): string {
  if (!d) return "—";
  return dayjs.utc(d).format(fmt) + " BKK";
}

/** Calendar date for a stored BKK-frame timestamp, e.g. "2026-06-07". */
export function calendarDateBkk(d: Date | string): string {
  return dayjs.utc(d).format("YYYY-MM-DD");
}

/** Start of today's BKK calendar day as a BKK-frame Date. */
export function startOfTodayBkk(): Date {
  return dayjs.utc(nowBkk()).startOf("day").toDate();
}
