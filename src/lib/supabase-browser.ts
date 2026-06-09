import { createBrowserClient } from "@supabase/ssr";
import { supabaseUrl, supabaseAnonKey } from "./supabase";

export function createBrowserSupabase() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
