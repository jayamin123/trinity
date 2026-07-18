// Thin client the UI uses for every backend call. No logic beyond fetch+JSON,
// plus a small retry: Cloudflare Workers can 5xx on a cold start / D1 init, so
// a transient 5xx or network blip is retried a couple of times before failing.
async function call<T>(path: string, opts?: RequestInit, attempt = 0): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { ...opts, headers: { "content-type": "application/json", ...(opts?.headers || {}) } });
  } catch (netErr) {
    if (attempt < 2) { await sleep(350 * (attempt + 1)); return call<T>(path, opts, attempt + 1); }
    throw netErr;
  }
  if (res.status >= 500 && attempt < 2) { await sleep(350 * (attempt + 1)); return call<T>(path, opts, attempt + 1); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string })?.error || res.statusText);
  return data as T;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const get = <T>(path: string) => call<T>(path);
export const post = <T>(path: string, body?: unknown) =>
  call<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });
export const patch = <T>(path: string, body?: unknown) =>
  call<T>(path, { method: "PATCH", body: body === undefined ? undefined : JSON.stringify(body) });
export const put = <T>(path: string, body?: unknown) =>
  call<T>(path, { method: "PUT", body: body === undefined ? undefined : JSON.stringify(body) });
export const del = <T>(path: string) => call<T>(path, { method: "DELETE" });
