import { decrypt } from "./crypto";

export type AccountCreds = {
  apiUrl: string;
  loginId: string;    // encrypted
  password: string;   // encrypted
};

export type ChargeResult = {
  success: boolean;
  orderId?: string;
  responseCode?: string;
  responseMessage?: string;
  rawResponse: string;
  /** MID that actually took the charge (items[0].merchantId from CC).
   *  Compare to the plan's cc_gateway_id to detect CoC's cascade-on-decline. */
  actualGatewayId?: string;
  /** message.amountPaid from CC — what CC says was actually charged. */
  amountPaid?: number;
};

function decryptCreds(account: AccountCreds): { loginId: string; password: string } {
  return { loginId: decrypt(account.loginId), password: decrypt(account.password) };
}

// ---------------------------------------------------------------------------
// Test connection — read-only
// ---------------------------------------------------------------------------
export async function testConnection(account: AccountCreds): Promise<{ ok: boolean; message: string }> {
  const { loginId, password } = decryptCreds(account);
  const body = new URLSearchParams({
    loginId, password,
    resultsPerPage: "1",
    startDate: "01/01/2024",
    endDate: "12/31/2030",
  });
  try {
    const res = await fetch(`${account.apiUrl}/purchase/query/`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: AbortSignal.timeout(45000),
    });
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      if (data.result === "SUCCESS") return { ok: true, message: "Connection OK" };
      return { ok: false, message: String(data.message ?? data.errorMessage ?? "Connection failed") };
    } catch {
      return { ok: false, message: `Non-JSON response: ${text.substring(0, 200)}` };
    }
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Network error" };
  }
}

// ---------------------------------------------------------------------------
// List gateways (MIDs)
// ---------------------------------------------------------------------------
export type Gateway = { id: string; title: string; enabled: boolean };

export async function listGateways(account: AccountCreds): Promise<Gateway[]> {
  const { loginId, password } = decryptCreds(account);
  const url = `${account.apiUrl}/merchant/query/?loginId=${encodeURIComponent(loginId)}&password=${encodeURIComponent(password)}&resultsPerPage=100`;
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  const data = await res.json() as Record<string, any>;
  if (data.result !== "SUCCESS") throw new Error(String(data.message ?? "listGateways failed"));
  const merchants = Array.isArray(data.message?.data) ? data.message.data : Object.values(data.message?.data ?? {});
  return (merchants as Array<Record<string, unknown>>).map(m => ({
    id: String(m.billerId),
    title: String(m.title ?? ""),
    enabled: m.enabled === 1,
  }));
}

// ---------------------------------------------------------------------------
// List campaigns
// ---------------------------------------------------------------------------
export type CCCampaign = { id: string; name: string };

export async function listCampaigns(account: AccountCreds): Promise<CCCampaign[]> {
  const { loginId, password } = decryptCreds(account);
  const url = `${account.apiUrl}/campaign/query/?loginId=${encodeURIComponent(loginId)}&password=${encodeURIComponent(password)}&resultsPerPage=200`;
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  const data = await res.json() as Record<string, any>;
  if (data.result !== "SUCCESS") throw new Error(String(data.message ?? "listCampaigns failed"));
  const items = Array.isArray(data.message?.data) ? data.message.data : Object.values(data.message?.data ?? {});
  return (items as Array<Record<string, unknown>>).map(c => ({
    id: String(c.campaignId ?? c.id ?? ""),
    name: String(c.campaignName ?? c.name ?? ""),
  }));
}

// ---------------------------------------------------------------------------
// List products for a campaign
// ---------------------------------------------------------------------------
export type CCProduct = { id: string; name: string; price: number };

export async function listProducts(account: AccountCreds, ccCampaignId: string): Promise<CCProduct[]> {
  const { loginId, password } = decryptCreds(account);
  const url = `${account.apiUrl}/campaign/query/?loginId=${encodeURIComponent(loginId)}&password=${encodeURIComponent(password)}&campaignId=${encodeURIComponent(ccCampaignId)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  const data = await res.json() as Record<string, any>;
  if (data.result !== "SUCCESS") throw new Error(String(data.message ?? "listProducts failed"));
  const root = Array.isArray(data.message?.data) ? data.message.data[0] : Object.values(data.message?.data ?? {})[0];
  if (!root) return [];
  // Products live under "products" object on the campaign record
  const products = (root as Record<string, unknown>).products ?? {};
  const list = Array.isArray(products) ? products : Object.values(products as object);
  return (list as Array<Record<string, unknown>>).map(p => ({
    // CC's /order/import/ expects product1_id = campaignProductId (the
    // per-campaign link to a product), NOT the global productId. If we send
    // anything else, CC silently defaults to the first product on the account
    // (which may not even be in this campaign).
    id: String(p.campaignProductId ?? p.productId ?? p.id ?? ""),
    name: String(p.productName ?? p.name ?? ""),
    price: parseFloat(String(p.price ?? p.productPrice ?? "0")) || 0,
  }));
}

// ---------------------------------------------------------------------------
// Charge a single card  (the actual money-mover)
// ---------------------------------------------------------------------------
export type ChargeCardInput = {
  account: AccountCreds;
  /** What we're firing — taken from a schedule's `fire_plan` + its flow's flow_settings. */
  plan: {
    ccCampaignId: string;
    ccProductId: string;
    productPrice: number;
    ccGatewayId: string;
  };
  card: {
    panEncrypted: string;
    cvvEncrypted: string;
    expMonth: string;
    expYear: string;
    firstName: string;
    lastName: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    phone: string;
    email: string;
    ipAddress: string;
  };
};

export async function chargeCard(input: ChargeCardInput): Promise<ChargeResult> {
  const { account, plan, card } = input;
  const { loginId, password } = decryptCreds(account);

  const expYear = card.expYear.length === 2 ? `20${card.expYear}` : card.expYear;
  const body = new URLSearchParams({
    loginId, password,
    campaignId: plan.ccCampaignId,
    product1_id: plan.ccProductId,
    product1_qty: "1",
    product1_price: plan.productPrice.toFixed(2),
    product1_shipPrice: "0.00",
    forceMerchantId: plan.ccGatewayId,
    billShipSame: "1",
    firstName: card.firstName,
    lastName: card.lastName,
    address1: card.address,
    city: card.city,
    state: card.state,
    postalCode: card.zipCode,
    country: "US",
    emailAddress: card.email,
    phoneNumber: card.phone,
    ipAddress: card.ipAddress,
    cardNumber: decrypt(card.panEncrypted),
    cardMonth: card.expMonth.padStart(2, "0"),
    cardYear: expYear,
    cardSecurityCode: decrypt(card.cvvEncrypted),
    paySource: "CREDITCARD",
  });

  try {
    const res = await fetch(`${account.apiUrl}/order/import/`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: AbortSignal.timeout(45000),
    });
    const raw = await res.text();
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(raw);
    } catch {
      return { success: false, responseMessage: `Non-JSON response: ${raw.substring(0, 200)}`, rawResponse: raw };
    }

    const message = typeof data.message === "object" && data.message !== null
      ? data.message as Record<string, unknown>
      : {};

    if (data.result === "SUCCESS") {
      // items[0].merchantId is the MID CC actually routed the charge to.
      // If it differs from plan.ccGatewayId, CoC cascaded after a decline.
      const items = Array.isArray(message.items) ? message.items as Array<Record<string, unknown>> : [];
      const firstItem = items[0] ?? {};
      const actualGatewayId = firstItem.merchantId != null ? String(firstItem.merchantId) : undefined;
      const amountPaidRaw = message.amountPaid;
      const amountPaid = amountPaidRaw != null && amountPaidRaw !== ""
        ? Number(amountPaidRaw)
        : undefined;

      return {
        success: true,
        orderId: String(message.orderId ?? ""),
        responseCode: String(message.responseCode ?? ""),
        responseMessage: String(message.responseMessage ?? "Success"),
        rawResponse: raw,
        actualGatewayId,
        amountPaid: Number.isFinite(amountPaid) ? amountPaid : undefined,
      };
    }

    return {
      success: false,
      responseCode: String(data.responseCode ?? message.responseCode ?? ""),
      responseMessage: String(
        data.errorMessage ??
        (typeof data.message === "string" ? data.message : "") ??
        message.responseMessage ??
        "Unknown error"
      ),
      rawResponse: raw,
    };
  } catch (error) {
    return {
      success: false,
      responseMessage: error instanceof Error ? error.message : "Network error",
      rawResponse: String(error),
    };
  }
}
