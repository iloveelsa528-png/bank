import { createBrowserClient } from "@supabase/ssr";
import { supabaseUrl, supabaseAnonKey } from "./supabase";

type BrowserClient = ReturnType<typeof createBrowserClient>;

declare global {
  // eslint-disable-next-line no-var
  var __supabaseBrowserClient: BrowserClient | undefined;
}

export function createBrowserSupabase(): BrowserClient {
  if (!globalThis.__supabaseBrowserClient) {
    globalThis.__supabaseBrowserClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }
  return globalThis.__supabaseBrowserClient;
}
