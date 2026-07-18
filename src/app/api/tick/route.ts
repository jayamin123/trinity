import { NextResponse } from "next/server";

// SAFETY: firing is DISABLED on this deployment. flows2 has no cron trigger and
// FIRING_ENABLED is "0", so this endpoint never charges. It exists only so the
// route contract is complete; it is a hard no-op until firing is deliberately
// enabled in the ledger-v2 fire path (which does not exist here yet).
export const dynamic = "force-dynamic";

function response() {
  const enabled = process.env.FIRING_ENABLED === "1";
  return NextResponse.json({ disabled: !enabled, fired: 0, note: "firing disabled on flows2" });
}

export async function POST() { return response(); }
export async function GET() { return response(); }
