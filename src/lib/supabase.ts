import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface ProjectRow {
  id: string;
  name: string;
  industry: string | null;
  stage: string | null;
  status: string;
  founder_name: string | null;
  founder_contact: string | null;
  description: string | null;
  source: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface SourcingResultRow {
  id: string;
  project_id: string | null;
  platform: string;
  url: string | null;
  title: string | null;
  summary: string | null;
  raw_data: Json;
  sourced_at: string;
  created_at: string;
}

export interface MatchRow {
  id: string;
  project_id: string | null;
  match_type: string | null;
  confidence_score: number | null;
  rationale: string | null;
  matched_with: string | null;
  status: string;
  metadata: Json;
  created_at: string;
}

export interface PortfolioItemRow {
  id: string;
  project_id: string | null;
  status: string;
  next_followup_at: string | null;
  last_activity: string | null;
  notes: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

let supabaseClient: SupabaseClient | null = null;

export function hasSupabaseCredentials(): boolean {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
}

export function getSupabaseClient(): SupabaseClient {
  if (!hasSupabaseCredentials()) {
    throw new Error("Supabase environment variables are not configured.");
  }

  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    });
  }

  return supabaseClient;
}
