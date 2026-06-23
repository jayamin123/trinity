import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { nowBkk } from "./bkk";
dayjs.extend(utc);

/**
 * CSV upload storage — Cloudflare R2 only.
 * Auto-names: YYYY-MM-DD-HHmm-{slug}.csv
 */

function sanitize(originalName: string): string {
  return (
    originalName
      .replace(/\.csv$/i, "")
      .replace(/[^a-zA-Z0-9-_]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "upload"
  );
}

function getUploadsBucket(): R2Bucket {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getCloudflareContext } = require("@opennextjs/cloudflare") as typeof import("@opennextjs/cloudflare");
  const { env } = getCloudflareContext();
  const bucket = (env as unknown as { UPLOADS?: R2Bucket }).UPLOADS;
  if (!bucket) throw new Error("R2 bucket binding 'UPLOADS' is not available");
  return bucket;
}

export async function saveUploadedCsv(originalName: string, contents: string): Promise<string> {
  const slug = sanitize(originalName);
  const filename = `${dayjs.utc(nowBkk()).format("YYYY-MM-DD-HHmm")}-${slug}.csv`;
  await getUploadsBucket().put(filename, contents);
  return filename;
}
