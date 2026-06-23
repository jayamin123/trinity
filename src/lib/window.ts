// Daily firing window, in BKK wall-clock hours. A card assigned to a BKK day
// fires at a random time within these hours ON THAT SAME DAY — the window never
// crosses midnight, so a card scheduled for a day never slips to the next one.
//
// Change these two numbers to widen/narrow the window. Nothing else converts
// time here; "now" is the only place the UTC→BKK shift happens (see bkk.ts).
export const WINDOW_START_HOUR = 9;   // 09:00 BKK
export const WINDOW_END_HOUR = 23;    // 23:00 BKK
