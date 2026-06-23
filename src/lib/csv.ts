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

    const firstName = pick(row, "First Name", "FirstName");
    const lastName = pick(row, "Last Name", "LastName");
    const panLast4 = pan.slice(-4);
    const identityKey = computeIdentityKey({ firstName, lastName, panLast4, expMonth, expYear });

    const cardData = {
      cardholder: { first_name: firstName, last_name: lastName },
      card: {
        pan_encrypted: encrypt(pan),
        cvv_encrypted: encrypt(cvv),
        exp_month: expMonth,
        exp_year: expYear,
      },
      billing_address: {
        street: pick(row, "Address", "AdrLine1", "Address1"),
        city: pick(row, "City"),
        state: pick(row, "State"),
        zip_code: pick(row, "Zip Code", "ZipCode", "Postal Code"),
      },
      contact: {
        phone: pick(row, "Phone Number", "PhoneNum", "Phone"),
        email: pick(row, "Email Address", "EmailAdr", "Email"),
        ip_address: pick(row, "IP Address", "IPAdr", "IP"),
      },
      source_file: sourceFile,
      created_at: nowBkk().toISOString(),
    };

    cards.push({ identityKey, panLast4, cardData: JSON.stringify(cardData) });
  });

  return {
    cards,
    errors,
    warnings,
    stats: { total: data.length, valid: cards.length, invalidPan, expired, duplicatesInFile, missingFields },
  };
}
