// ==============================================================================
// SERVER ENTRY POINT
// Project: Zalo OA Expense Management Chatbot
// ==============================================================================

import { buildApp } from './app.js';
import { env } from './config/env.js';

async function main() {
  const app = await buildApp();

  try {
    const address = await app.listen({
      port: env.PORT,
      host: '0.0.0.0', // Lắng nghe trên tất cả network interface để hỗ trợ Docker/ngrok
    });

    console.log(`\n=============================================================`);
    console.log(`🚀 Zalo OA Expense Chatbot Server đang chạy tại: ${address}`);
    console.log(`📡 Webhook URL tiếp nhận Zalo: ${address}/webhook/zalo`);
    console.log(`🩺 Health Check: ${address}/health`);
    console.log(`🤖 LLM Provider: ${env.LLM_PROVIDER.toUpperCase()}`);
    console.log(`🔑 Zalo OA Access Token: ${env.ZALO_OA_ACCESS_TOKEN ? 'ĐÃ CẤU HÌNH' : 'CHƯA CÓ'}`);
    console.log(`=============================================================\n`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
