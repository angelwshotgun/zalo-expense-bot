// ==============================================================================
// FASTIFY APPLICATION SETUP & ROUTE REGISTRATION
// Project: Zalo OA Expense Management Chatbot
// ==============================================================================

import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import rawBody from 'fastify-raw-body';
import { WebhookHandler } from './handlers/webhook.handler.js';
import { ZaloBotHandler, ZaloBotWebhookBody } from './handlers/zalobot.handler.js';
import { DatabaseService } from './services/db.service.js';
import { ZaloWebhookPayload } from './types/index.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      transport:
        process.env.NODE_ENV !== 'production'
          ? {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
    },
  });

  // 1. Cấu hình CORS
  await app.register(cors, {
    origin: '*',
  });

  // 2. Cấu hình Raw Body Plugin để bảo toàn chuỗi bytes phục vụ kiểm tra chữ ký HMAC-SHA256
  await app.register(rawBody, {
    field: 'rawBody',
    global: false,
    encoding: 'utf8',
    runFirst: true,
  });

  // 3. Health Check Endpoint
  app.get('/health', async () => {
    return {
      status: 'ok',
      service: 'zalo-expense-bot',
      timestamp: new Date().toISOString(),
    };
  });

  // 3.1. Route trang chủ hỗ trợ thẻ meta xác thực Zalo (Thẻ HTML Meta)
  app.get('/', async (_request, reply) => {
    const verificationCode = process.env.ZALO_VERIFICATION_CODE || 'QVdWARByTm8orje2nQPHBaIisIsesWDxDJ8u';
    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="zalo-platform-site-verification" content="${verificationCode}" />
    <title>Zalo OA Expense Bot</title>
</head>
<body>
    <h1>Zalo OA Expense Bot Service is Running</h1>
    <p>Webhook endpoint: /webhook/zalo</p>
    <p>Health check: /health</p>
</body>
</html>`;
    return reply.type('text/html; charset=utf-8').send(html);
  });

  // 3.2. Route phục vụ file xác thực Zalo (File HTML zalo_verifier*.html)
  app.get<{ Params: { filename: string } }>('/:filename', async (request, reply) => {
    const filename = request.params.filename;
    if (filename.startsWith('zalo_verifier') && filename.endsWith('.html')) {
      const content = process.env.ZALO_VERIFIER_CONTENT || filename.replace('.html', '');
      return reply.type('text/html').send(content);
    }
    return reply.status(404).send({ error: 'Not found' });
  });

  // 4. Endpoint kiểm tra danh mục chuẩn
  app.get('/api/categories', async (_request, reply) => {
    try {
      const categories = await DatabaseService.getCategories();
      return reply.send({ success: true, count: categories.length, data: categories });
    } catch (error) {
      return reply.status(500).send({ success: false, error: (error as Error).message });
    }
  });

  // 5. Zalo OA Webhook Receiver Endpoint
  app.post<{ Body: ZaloWebhookPayload }>(
    '/webhook/zalo',
    {
      config: {
        rawBody: true, // Kích hoạt raw body riêng cho webhook
      },
    },
    WebhookHandler.handleWebhook
  );

  // 6. Zalo Bot Platform Webhook Receiver Endpoint (New Zalo Bot API)
  app.post<{ Body: ZaloBotWebhookBody }>(
    '/webhook/zalobot',
    ZaloBotHandler.handleWebhook
  );

  return app;
}
