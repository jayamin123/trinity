import { config } from "dotenv";
config({ path: ".env" });

import { encrypt } from "../src/lib/crypto";
import { testConnection, listGateways, listCampaigns, listProducts } from "../src/lib/checkoutchamp";

async function main() {
  const account = {
    apiUrl: "https://api.checkoutchamp.com",
    loginId: encrypt("apolloreamaze"),
    password: encrypt("apolloreamaze"),
  };

  console.log("→ Testing connection (read-only /purchase/query/)…");
  const conn = await testConnection(account);
  console.log(`  ${conn.ok ? "✓" : "✗"} ${conn.message}`);
  if (!conn.ok) process.exit(1);

  console.log("\n→ Listing gateways…");
  try {
    const gws = await listGateways(account);
    console.log(`  Found ${gws.length} gateway(s) (${gws.filter(g => g.enabled).length} enabled)`);
    const maverick = gws.find(g => g.title?.toLowerCase().includes("maverick"));
    if (maverick) console.log(`  Maverick: billerId=${maverick.billerId}, title="${maverick.title}", enabled=${maverick.enabled}`);
  } catch (err) {
    console.log(`  ✗ ${err instanceof Error ? err.message : err}`);
  }

  console.log("\n→ Listing campaigns…");
  try {
    const camps = await listCampaigns(account);
    console.log(`  Found ${camps.length} campaign(s)`);
    const trinity = camps.find(c => c.name?.toLowerCase().includes("trinity") || c.id === "105");
    if (trinity) console.log(`  Trinity Test: id=${trinity.id}, name="${trinity.name}"`);
  } catch (err) {
    console.log(`  ✗ ${err instanceof Error ? err.message : err}`);
  }

  console.log("\n→ Listing products for campaign 105 (Trinity Test)…");
  try {
    const prods = await listProducts(account, "105");
    console.log(`  Found ${prods.length} product(s)`);
    prods.forEach(p => console.log(`    #${p.id} ${p.name} — $${p.price.toFixed(2)}`));
  } catch (err) {
    console.log(`  ✗ ${err instanceof Error ? err.message : err}`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
