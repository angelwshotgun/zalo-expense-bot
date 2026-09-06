// ==============================================================================
// SUPABASE CLIENT INITIALIZATION
// Project: Zalo OA Expense Management Chatbot
// ==============================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { env } from '../config/env.js';

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error(
        'Supabase chưa được cấu hình. Vui lòng kiểm tra SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY trong file .env'
      );
    }

    supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      realtime: {
        transport: WebSocket as any,
      },
    });
  }

  return supabaseClient;
}

export const supabase = {
  get client() {
    return getSupabaseClient();
  },
};
