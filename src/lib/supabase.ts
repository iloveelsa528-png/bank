import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// API 라우트용 싱글턴 클라이언트 (기존 1~5단계 호환)
export const supabase = createClient(url, anonKey);

export { url as supabaseUrl, anonKey as supabaseAnonKey };
