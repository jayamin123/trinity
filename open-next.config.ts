import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  // Default in-memory caching. R2/KV-backed caches can be added later if needed.
});
