import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { listGateways, listCampaigns, listProducts } from "@/lib/checkoutchamp";

// Live CheckoutChamp pickers for the New Flow builder. Needs ENCRYPTION_KEY to
// decrypt account creds — the routes return 503 cleanly when it's absent.

async function creds() {
  const a = await db.account.findFirst();
  if (!a) throw new Error("no CheckoutChamp account configured");
  return { apiUrl: a.apiUrl, loginId: decrypt(a.loginIdEncrypted), password: decrypt(a.passwordEncrypted) };
}

export const ccGateways = async () => listGateways(await creds());
export const ccCampaigns = async () => listCampaigns(await creds());
export const ccProducts = async (campaignId: string) => listProducts(await creds(), campaignId);
