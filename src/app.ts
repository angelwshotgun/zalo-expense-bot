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
import { renderAdminHtml } from './views/admin.view.js';

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

  const ADMIN_PIN = process.env.ADMIN_PIN || '123456';

  // Helper xác thực quyền Admin qua PIN
  const verifyAdmin = (request: any, reply: any): boolean => {
    const pin = (request.headers['x-admin-pin'] as string) || (request.body as any)?.pin;
    if (pin !== ADMIN_PIN) {
      reply.status(401).send({ success: false, error: 'Mã PIN Admin không đúng hoặc đã hết hạn.' });
      return false;
    }
    return true;
  };

  // 3.1. Route trang chủ và Admin Dashboard (Hỗ trợ thẻ meta xác thực Zalo & Web Quản Trị)
  const serveAdminDashboard = async (_request: any, reply: any) => {
    const verificationCode = process.env.ZALO_VERIFICATION_CODE || 'QVdWARByTm8orje2nQPHBaIisIsesWDxDJ8u';
    const html = renderAdminHtml(verificationCode);
    return reply.type('text/html; charset=utf-8').send(html);
  };

  app.get('/', serveAdminDashboard);
  app.get('/admin', serveAdminDashboard);

  // 3.2. Route phục vụ file xác thực Zalo (File HTML zalo_verifier*.html)
  app.get<{ Params: { filename: string } }>('/:filename', async (request, reply) => {
    const filename = request.params.filename;
    if (filename.startsWith('zalo_verifier') && filename.endsWith('.html')) {
      const content = process.env.ZALO_VERIFIER_CONTENT || filename.replace('.html', '');
      return reply.type('text/html').send(content);
    }
    return reply.status(404).send({ error: 'Not found' });
  });

  // 4.1. Endpoint xác thực mã PIN Admin
  app.post('/api/admin/verify-pin', async (request, reply) => {
    const body = request.body as any;
    if (body?.pin === ADMIN_PIN) {
      return reply.send({ success: true, message: 'Xác thực mã PIN thành công' });
    }
    return reply.status(401).send({ success: false, error: 'Mã PIN quản trị không chính xác' });
  });

  // 4.2. Endpoint lấy danh sách toàn bộ danh mục (Public / Read-only)
  app.get('/api/categories', async (_request, reply) => {
    try {
      const categories = await DatabaseService.getCategories();
      return reply.send({ success: true, count: categories.length, data: categories });
    } catch (error) {
      return reply.status(500).send({ success: false, error: (error as Error).message });
    }
  });

  // 4.3. Endpoint thêm danh mục mới (Yêu cầu PIN Admin)
  app.post('/api/categories', async (request, reply) => {
    if (!verifyAdmin(request, reply)) return;
    try {
      const body = request.body as any;
      if (!body?.name || !body.name.trim()) {
        return reply.status(400).send({ success: false, error: 'Tên danh mục không được để trống.' });
      }
      const type = body.type === 'EXPENSE' ? 'EXPENSE' : 'INCOME';
      const newCat = await DatabaseService.addCategory({
        name: body.name.trim(),
        type,
        icon: body.icon?.trim(),
      });
      return reply.send({ success: true, data: newCat });
    } catch (error) {
      return reply.status(500).send({ success: false, error: (error as Error).message });
    }
  });

  // 4.4. Endpoint cập nhật danh mục (Yêu cầu PIN Admin)
  app.put<{ Params: { id: string } }>('/api/categories/:id', async (request, reply) => {
    if (!verifyAdmin(request, reply)) return;
    try {
      const id = parseInt(request.params.id, 10);
      const body = request.body as any;
      const updated = await DatabaseService.updateCategory(id, {
        name: body?.name,
        icon: body?.icon,
        type: body?.type,
      });
      if (!updated) {
        return reply.status(404).send({ success: false, error: 'Không tìm thấy danh mục để cập nhật.' });
      }
      return reply.send({ success: true, data: updated });
    } catch (error) {
      return reply.status(500).send({ success: false, error: (error as Error).message });
    }
  });

  // 4.5. Endpoint xóa danh mục an toàn (Yêu cầu PIN Admin, tự động chuyển giao dịch cũ sang Khác)
  app.delete<{ Params: { id: string } }>('/api/categories/:id', async (request, reply) => {
    if (!verifyAdmin(request, reply)) return;
    try {
      const id = parseInt(request.params.id, 10);
      const result = await DatabaseService.deleteCategory(id);
      const reassignNote = result.reassignedCount > 0 ? ` (${result.reassignedCount} giao dịch cũ đã được bảo toàn về danh mục "Khác")` : '';
      return reply.send({
        success: true,
        message: `Đã xóa danh mục "${result.deleted.name}".${reassignNote}`,
        data: result,
      });
    } catch (error: any) {
      return reply.status(400).send({ success: false, error: error.message });
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
