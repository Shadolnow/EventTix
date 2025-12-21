// Safe Supabase client wrapper - handles missing env vars gracefully
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Lovable Cloud project configuration
const LOVABLE_CLOUD_CONFIG = {
  projectId: "aikfuhueuoiagyviyoou",
  url: "https://aikfuhueuoiagyviyoou.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpa2Z1aHVldW9pYWd5dml5b291Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxOTM0NTIsImV4cCI6MjA4MTc2OTQ1Mn0.FFeb2EFbd6zsZzx413pZSJ3V_bPl-3O9gdrKBTGw5PE",
};

type SupabaseEnv = {
  url?: string;
  key?: string;
  projectId?: string;
};

const readEnv = (): SupabaseEnv => {
  const env = import.meta.env as any;
  return {
    url: env.VITE_SUPABASE_URL,
    key: env.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.VITE_SUPABASE_ANON_KEY,
    projectId: env.VITE_SUPABASE_PROJECT_ID,
  };
};

const resolveConfig = () => {
  const env = readEnv();
  
  // Try environment variables first
  const envUrl = env.url || (env.projectId ? `https://${env.projectId}.supabase.co` : undefined);
  const envKey = env.key;
  
  if (envUrl && envKey) {
    return { url: envUrl, key: envKey };
  }
  
  // Fall back to Lovable Cloud config
  return {
    url: LOVABLE_CLOUD_CONFIG.url,
    key: LOVABLE_CLOUD_CONFIG.anonKey,
  };
};

const config = resolveConfig();

export const supabase: SupabaseClient<Database> = createClient<Database>(
  config.url,
  config.key,
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

export const getBackendConfigError = () => null;
