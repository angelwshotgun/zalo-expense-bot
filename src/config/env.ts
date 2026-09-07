// ==============================================================================
// ENVIRONMENT CONFIGURATION WITH ZOD VALIDATION
// Project: Zalo OA Expense Management Chatbot
// ==============================================================================

import dotenv from 'dotenv';
import { z } from 'zod';

// Tải biến môi trường từ .env
dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Zalo App & OA Configuration
  ZALO_APP_ID: z.string().default(''),
  ZALO_OA_SECRET_KEY: z.string().default(''),
  ZALO_OA_ACCESS_TOKEN: z.string().default(''),
  ZALO_BOT_TOKEN: z.string().default('4012836441347575506:noMyFZmAkVsFcOzGLLHfhZFJQIzJbIuxAYEUZkBqOmdyFggRhYYiYCGRtVlEgToH'),
  ZALO_BOT_SECRET_TOKEN: z.string().default('zalo_bot_secret_token_12345678'),

  // Supabase Configuration
  SUPABASE_URL: z.string().url({ message: 'SUPABASE_URL phải là một URL hợp lệ' }),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(10, { message: 'SUPABASE_SERVICE_ROLE_KEY bắt buộc phải có' }),

  // LLM Configuration
  LLM_PROVIDER: z.enum(['gemini', 'openai']).default('gemini'),
  GEMINI_API_KEY: z.string().default(''),
  OPENAI_API_KEY: z.string().optional().default(''),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Lỗi cấu hình biến môi trường:');
  for (const issue of parsed.error.issues) {
    console.error(` - [${issue.path.join('.')}] ${issue.message}`);
  }
  // Cho phép chạy trong test/simulation nếu chưa có env thực tế
  if (process.env.NODE_ENV !== 'test') {
    console.warn('⚠️ Vui lòng kiểm tra lại file .env. Hệ thống đang sử dụng fallback mặc định.');
  }
}

export const env = parsed.success
  ? parsed.data
  : {
      PORT: Number(process.env.PORT) || 3000,
      NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
      ZALO_APP_ID: process.env.ZALO_APP_ID || '',
      ZALO_OA_SECRET_KEY: process.env.ZALO_OA_SECRET_KEY || '',
      ZALO_OA_ACCESS_TOKEN: process.env.ZALO_OA_ACCESS_TOKEN || '',
      SUPABASE_URL: process.env.SUPABASE_URL || 'https://placeholder.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder_service_role_key',
      LLM_PROVIDER: (process.env.LLM_PROVIDER as 'gemini' | 'openai') || 'gemini',
      GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
    };
