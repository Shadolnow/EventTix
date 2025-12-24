// Safe Supabase client wrapper - handles missing env vars gracefully
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Lovable Cloud project configuration
const LOVABLE_CLOUD_CONFIG = {
  projectId: "kszyvgqhzguyiibpfpwo",
  url: "https://kszyvgqhzguyiibpfpwo.supabase.co",
  // Note: If you face auth issues, please replace this anonKey with the 'anon public' key from your Supabase Settings -> API
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtzenl2Z3Foemd1eWlpYnBmcHdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMDc0OTUsImV4cCI6MjA3ODY4MzQ5NX0.yZUIxyL3XSHCfljaJvO5PQ9-qhzQStSCG85aZKnqups",
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
