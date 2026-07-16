import Papa from "papaparse";
import { encrypt } from "./crypto";
import { nowBkk } from "./bkk";

/** Composite dedup key. Same physical card uploaded twice resolves to the same row. */
function computeIdentityKey(c: {
  firstName: string; lastName: string;
  panLast4: string; expMonth: string; expYear: string;
}): string {
  return [
    c.firstName.trim().toLowerCase(),
    c.lastName.trim().toLowerCase(),
    c.panLast4,
    c.expMonth,
    c.expYear,
  ].join("|");
}

/** Shape returned for each parsed row — ready to upsert into `cards`. */
export type ParsedCard = {
  identityKey: string;
  panLast4: string;
  /** JSON-stringified blob matching the `cards.card_data` column shape. */
  cardData: string;
};

export type ParseResult = {
  cards: ParsedCard[];
  errors: string[];
  warnings: string[];
  stats: {
    total: number;
    valid: number;
    invalidPan: number;
    expired: number;
    duplicatesInFile: number;
    missingFields: number;
  };
};

function unwrapExcelText(value: string): string {
  const v = value.trim();
  if (v.length >= 3 && v.startsWith('="') && v.endsWith('"')) return v.slice(2, -1).trim();
  return v;
}

function pick(row: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== "") return unwrapExcelText(row[k]);
  }
  const rowKeys = Object.keys(row);
  for (const k of keys) {
    const found = rowKeys.find(rk => rk.toLowerCase() === k.toLowerCase());
    if (found && row[found] !== undefined && row[found] !== "") return unwrapExcelText(row[found]);
  }
  return "";
}

function luhnOk(pan: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = pan.length - 1; i >= 0; i--) {
    let n = parseInt(pan[i], 10);
    if (isNaN(n)) return false;
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function isExpired(month: string, year: string): boolean {
  const m = parseInt(month, 10);
  let y = parseInt(year, 10);
  if (!m || !y) return false;
  if (y < 100) y += 2000;
  const now = nowBkk();
  return y < now.getUTCFullYear() || (y === now.getUTCFullYear() && m < now.getUTCMonth() + 1);
}

/** A card's topup balance: a dollar amount, "unlim" for cards that draw on a
 *  shared main account (e.g. Slash), or null when the upload didn't say. */
export type CardAmount = number | "unlim" | null;

/** Normalise a raw amount cell/field into a CardAmount. Blank/garbage → null so
 *  existing uploads (which have no amount column) are unaffected. */
function normalizeAmount(raw: string): CardAmount {
  const v = raw.trim();
  if (!v) return null;
  if (/^unlim/i.test(v) || /^unlimited$/i.test(v) || v === "∞") return "unlim";
  const n = parseFloat(v.replace(/[$,]/g, ""));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

/** Already-extracted, trimmed card fields — the shared shape both the CSV and
 *  JSON ingest paths normalise into before building the stored row. */
type CardFields = {
  pan: string; cvv: string; expMonth: string; expYear: string;
  firstName: string; lastName: string;
  address: string; city: string; state: string; zipCode: string;
  phone: string; email: string; ipAddress: string;
  amount: CardAmount;
};

/** Build the stored `cards` row (identity key + encrypted card_data blob) from
 *  validated fields. Callers must have already checked required-fields / Luhn /
 *  in-batch duplicates — this only assembles and encrypts. Keeping this in one
 *  place is what guarantees the API and the web upload produce identical rows. */
function assembleCard(f: CardFields, sourceFile: string): ParsedCard {
  const panLast4 = f.pan.slice(-4);
  const identityKey = computeIdentityKey({
    firstName: f.firstName, lastName: f.lastName, panLast4, expMonth: f.expMonth, expYear: f.expYear,
  });
  const cardData = {
    cardholder: { first_name: f.firstName, last_name: f.lastName },
    card: {
      pan_encrypted: encrypt(f.pan),
      cvv_encrypted: encrypt(f.cvv),
      exp_month: f.expMonth,
      exp_year: f.expYear,
    },
    billing_address: { street: f.address, city: f.city, state: f.state, zip_code: f.zipCode },
    contact: { phone: f.phone, email: f.email, ip_address: f.ipAddress },
    amount: f.amount,
    source_file: sourceFile,
    created_at: nowBkk().toISOString(),
  };
  return { identityKey, panLast4, cardData: JSON.stringify(cardData) };
}

export function parseCardsCsv(text: string, sourceFile: string): ParseResult {
  const { data } = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: h => h.trim(),
  });

  const cards: ParsedCard[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();
  let invalidPan = 0, expired = 0, duplicatesInFile = 0, missingFields = 0;

  data.forEach((row, idx) => {
    const lineNum = idx + 2;
    const pan = pick(row, "Card Number", "PAN", "CardNumber");
    const cvv = pick(row, "Security Code", "CVV", "CVV2", "CardSecurityCode");
    const expMonth = pick(row, "Exp Month", "EXP MONTH", "ExpMonth", "Card Month");
    const expYear = pick(row, "Exp Year", "EXP YEAR", "ExpYear", "Card Year");

    if (!pan || !cvv || !expMonth || !expYear) {
      errors.push(`Row ${lineNum}: missing required field (Card Number, Security Code, Exp Month, Exp Year)`);
      missingFields++;
      return;
    }
    if (!/^\d{13,19}$/.test(pan) || !luhnOk(pan)) {
      errors.push(`Row ${lineNum}: invalid PAN format / Luhn check failed`);
      invalidPan++;
      return;
    }
    if (seen.has(pan)) {
      warnings.push(`Row ${lineNum}: duplicate PAN ending ${pan.slice(-4)} (skipped)`);
      duplicatesInFile++;
      return;
    }
    seen.add(pan);

    if (isExpired(expMonth, expYear)) {
      warnings.push(`Row ${lineNum}: card ending ${pan.slice(-4)} expired ${expMonth}/${expYear}`);
      expired++;
    }

    cards.push(assembleCard({
      pan,
      cvv,
      expMonth,
      expYear,
      firstName: pick(row, "First Name", "FirstName"),
      lastName: pick(row, "Last Name", "LastName"),
      address: pick(row, "Address", "AdrLine1", "Address1"),
      city: pick(row, "City"),
      state: pick(row, "State"),
      zipCode: pick(row, "Zip Code", "ZipCode", "Postal Code"),
      phone: pick(row, "Phone Number", "PhoneNum", "Phone"),
      email: pick(row, "Email Address", "EmailAdr", "Email"),
      ipAddress: pick(row, "IP Address", "IPAdr", "IP"),
      // The Amount column IS the card's balance: a dollar number, or "UNLIM".
      amount: normalizeAmount(pick(row, "Amount", "Topup Amount", "Card Amount", "Balance")),
    }, sourceFile));
  });

  return {
    cards,
    errors,
    warnings,
    stats: { total: data.length, valid: cards.length, invalidPan, expired, duplicatesInFile, missingFields },
  };
}

/** One card as accepted by the JSON ingest endpoint. Keys are flexible
 *  (camelCase / snake_case / a couple of aliases) so callers don't have to
 *  match one exact spelling; required fields are cardNumber, securityCode,
 *  expMonth and expYear. Numbers are coerced to strings. */
export type JsonCardInput = {
  cardNumber?: string | number; pan?: string | number; card_number?: string | number;
  securityCode?: string | number; cvv?: string | number; security_code?: string | number;
  expMonth?: string | number; exp_month?: string | number;
  expYear?: string | number; exp_year?: string | number;
  firstName?: string; first_name?: string;
  lastName?: string; last_name?: string;
  address?: string; street?: string;
  city?: string; state?: string;
  zipCode?: string; zip?: string; zip_code?: string; postalCode?: string;
  phone?: string; phoneNumber?: string; phone_number?: string;
  email?: string; emailAddress?: string; email_address?: string;
  ipAddress?: string; ip?: string; ip_address?: string;
  amount?: string | number; topup?: string | number; balance?: string | number;
};

/** Coerce any JSON scalar to a trimmed string ("" for null/undefined). */
function asStr(v: unknown): string {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

/**
 * JSON sibling of {@link parseCardsCsv}. Same validation, same dedup semantics,
 * same stored row shape — it only differs in how each row's fields are read.
 * Rows are validated in order: required-fields → PAN/Luhn → in-batch duplicate
 * PAN → expiry (warning only), exactly as the CSV path.
 */
export function parseCardsJson(rows: unknown[], sourceFile: string): ParseResult {
  const cards: ParsedCard[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();
  let invalidPan = 0, expired = 0, duplicatesInFile = 0, missingFields = 0;

  rows.forEach((raw, idx) => {
    const n = idx + 1;
    const r = (raw ?? {}) as JsonCardInput;
    const pan = asStr(r.cardNumber ?? r.pan ?? r.card_number);
    const cvv = asStr(r.securityCode ?? r.cvv ?? r.security_code);
    const expMonth = asStr(r.expMonth ?? r.exp_month);
    const expYear = asStr(r.expYear ?? r.exp_year);

    if (!pan || !cvv || !expMonth || !expYear) {
      errors.push(`Card ${n}: missing required field (cardNumber, securityCode, expMonth, expYear)`);
      missingFields++;
      return;
    }
    if (!/^\d{13,19}$/.test(pan) || !luhnOk(pan)) {
      errors.push(`Card ${n}: invalid PAN format / Luhn check failed`);
      invalidPan++;
      return;
    }
    if (seen.has(pan)) {
      warnings.push(`Card ${n}: duplicate PAN ending ${pan.slice(-4)} (skipped)`);
      duplicatesInFile++;
      return;
    }
    seen.add(pan);

    if (isExpired(expMonth, expYear)) {
      warnings.push(`Card ${n}: card ending ${pan.slice(-4)} expired ${expMonth}/${expYear}`);
      expired++;
    }

    cards.push(assembleCard({
      pan,
      cvv,
      expMonth,
      expYear,
      firstName: asStr(r.firstName ?? r.first_name),
      lastName: asStr(r.lastName ?? r.last_name),
      address: asStr(r.address ?? r.street),
      city: asStr(r.city),
      state: asStr(r.state),
      zipCode: asStr(r.zipCode ?? r.zip ?? r.zip_code ?? r.postalCode),
      phone: asStr(r.phone ?? r.phoneNumber ?? r.phone_number),
      email: asStr(r.email ?? r.emailAddress ?? r.email_address),
      ipAddress: asStr(r.ipAddress ?? r.ip ?? r.ip_address),
      amount: normalizeAmount(asStr(r.amount ?? r.topup ?? r.balance)),
    }, sourceFile));
  });

  return {
    cards,
    errors,
    warnings,
    stats: { total: rows.length, valid: cards.length, invalidPan, expired, duplicatesInFile, missingFields },
  };
}
