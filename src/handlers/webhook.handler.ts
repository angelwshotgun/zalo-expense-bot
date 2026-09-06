// ==============================================================================
// ZALO OA WEBHOOK HANDLER & TOKEN-SAVING ROUTER
// Project: Zalo OA Expense Management Chatbot
// ==============================================================================

import { FastifyRequest, FastifyReply } from 'fastify';
import { DatabaseService } from '../services/db.service.js';
import { ZaloService } from '../services/zalo.service.js';
import { LLMService } from '../services/llm.service.js';
import { ZaloWebhookPayload, Category } from '../types/index.js';

export class WebhookHandler {
  /**
   * Tiếp nhận và phân luồng Webhook Event từ Zalo OA
   */
  static async handleWebhook(
    request: FastifyRequest<{ Body: ZaloWebhookPayload }>,
    reply: FastifyReply
  ) {
    const signature = request.headers['x-zevent-signature'] as string | undefined;
    const rawBody = (request as unknown as { rawBody?: string }).rawBody || JSON.stringify(request.body);
    const body = request.body;

    // 1. Xác thực chữ ký Zalo
    const isValidSignature = ZaloService.verifySignature(signature, rawBody, body?.timestamp);
    if (!isValidSignature) {
      request.log.warn({ signature }, '❌ Webhook signature không hợp lệ!');
      return reply.status(401).send({ error: 'Invalid webhook signature' });
    }

    // Luôn phản hồi 200 OK ngay lập tức cho Zalo server để tránh webhook bị timeout/retry
    reply.status(200).send({ error: 0, message: 'Event received' });

    // Tiếp tục xử lý bất đồng bộ trong background
    try {
      await WebhookHandler.processEvent(body);
    } catch (error) {
      request.log.error(error, '❌ Lỗi xử lý Zalo webhook event');
    }
  }

  /**
   * Xử lý chi tiết sự kiện theo cơ chế Routing 3 tầng tiết kiệm Token
   */
  public static async processEvent(payload: ZaloWebhookPayload) {
    const eventName = payload.event_name;
    const senderId = payload.sender?.id;

    if (!senderId) {
      return;
    }

    console.log(`\n📨 [Zalo Event: ${eventName}] Từ User ID: ${senderId}`);

    // Lấy thông tin user trong Supabase
    const user = await DatabaseService.getOrCreateUser(senderId);

    // Trích xuất action payload nếu user click nút Button hoặc Quick Reply
    const actionPayload = payload.info?.payload || WebhookHandler.extractActionFromMessage(payload.message?.text);

    // =========================================================================
    // TẦNG 1: XỬ LÝ ACTION BUTTONS / QUICK REPLIES (0 TOKEN LLM)
    // =========================================================================
    if (actionPayload) {
      console.log(`⚡ [Tier 1: Fast Action Button] Payload: "${actionPayload}" (KHÔNG GỌI LLM)`);
      const handled = await WebhookHandler.handleActionButton(senderId, user.id, actionPayload);
      if (handled) return;
    }

    // Trích xuất tin nhắn Text hoặc Hình ảnh
    const userText = payload.message?.text?.trim();
    const imageAttachment = payload.message?.attachments?.find((att) => att.type === 'image');
    const imageUrl = imageAttachment?.payload?.url;

    // Lệnh tắt dạng text cố định và nhãn nút Quick Reply (ví dụ: #baocao, xem báo cáo hôm nay) -> 0 LLM
    if (userText) {
      const lowerText = userText.toLowerCase();
      if (lowerText === '#baocao' || lowerText === '#homnay' || lowerText.includes('báo cáo hôm nay')) {
        console.log(`⚡ [Tier 1: Command Shortcut] Lệnh: "${userText}" (KHÔNG GỌI LLM)`);
        await WebhookHandler.sendTodayReport(senderId, user.id);
        return;
      }
      if (lowerText === '#thangnay' || lowerText.includes('báo cáo tháng')) {
        console.log(`⚡ [Tier 1: Command Shortcut] Lệnh: "${userText}" (KHÔNG GỌI LLM)`);
        await WebhookHandler.sendMonthlyReport(senderId, user.id);
        return;
      }
      if (lowerText === '#trogiup' || lowerText === '#help' || lowerText === 'trợ giúp') {
        await WebhookHandler.sendHelpGuide(senderId);
        return;
      }
      if (lowerText === 'hủy bỏ' || lowerText === 'hủy thao tác') {
        await WebhookHandler.handleActionButton(senderId, user.id, 'ACTION_CANCEL_PENDING');
        return;
      }
    }

    // =========================================================================
    // TẦNG 2: KIỂM TRA PHIÊN CHỜ LÀM RÕ DỞ (PENDING CLARIFICATION)
    // =========================================================================
    const pendingSession = await DatabaseService.getPendingClarification(user.id);

    if (pendingSession && userText) {
      console.log(`🔄 [Tier 2: Clarification Loop] Phát hiện phiên chờ cho user: ${user.id} (Thiếu: ${pendingSession.missing_field})`);
      const resolved = await WebhookHandler.resolvePendingWithText(
        senderId,
        user.id,
        pendingSession,
        userText
      );
      if (resolved) {
        console.log(`✅ [Tier 2] Giải quyết thành công pending session mà KHÔNG tốn token LLM!`);
        return;
      }
    }

    // Nếu không có nội dung text và cũng không có ảnh
    if (!userText && !imageUrl) {
      return;
    }

    // =========================================================================
    // TẦNG 3: XỬ LÝ FREE TEXT / HÌNH ẢNH (MỚI KÍCH HOẠT MULTIMODAL LLM)
    // =========================================================================
    console.log(`🤖 [Tier 3: Multimodal LLM Triggered] Text: "${userText || ''}", HasImage: ${!!imageUrl}`);

    let imageBuffer: Buffer | undefined;
    let mimeType = 'image/jpeg';

    if (imageUrl) {
      try {
        const downloaded = await ZaloService.downloadImageAsBuffer(imageUrl);
        imageBuffer = downloaded.buffer;
        mimeType = downloaded.mimeType;
      } catch (err) {
        console.error('Lỗi tải ảnh từ Zalo CDN:', err);
        await ZaloService.sendTextMessageWithQuickReplies(
          senderId,
          '⚠️ Không thể tải hình ảnh từ Zalo. Bạn vui lòng thử gửi lại nhé!'
        );
        return;
      }
    }

    // Gọi Gemini 2.5 Flash
    const extraction = await LLMService.extractExpense(userText, imageBuffer, mimeType);
    console.log('🎯 [LLM Structured Output]:\n', JSON.stringify(extraction, null, 2));

    await WebhookHandler.handleLLMResult(senderId, user.id, userText, imageUrl, extraction as any);
  }

  /**
   * Xử lý các Action Button của Tầng 1
   */
  private static async handleActionButton(
    senderId: string,
    userId: string,
    actionPayload: string
  ): Promise<boolean> {
    // 1. Xem báo cáo hôm nay
    if (actionPayload === 'ACTION_REPORT_TODAY') {
      await WebhookHandler.sendTodayReport(senderId, userId);
      return true;
    }

    // 2. Xem báo cáo tháng này
    if (actionPayload === 'ACTION_REPORT_MONTH') {
      await WebhookHandler.sendMonthlyReport(senderId, userId);
      return true;
    }

    // 3. User chọn danh mục từ Quick Reply để giải quyết pending session
    if (actionPayload.startsWith('ACTION_SET_CAT:')) {
      const categoryIdStr = actionPayload.split(':')[1];
      const categoryId = parseInt(categoryIdStr, 10);

      const pending = await DatabaseService.getPendingClarification(userId);
      if (!pending) {
        await ZaloService.sendTextMessageWithQuickReplies(
          senderId,
          'ℹ️ Phiên giao dịch trước đó đã hoàn tất hoặc đã hết hạn. Hãy nhập khoản chi mới nhé!'
        );
        return true;
      }

      const categories = await DatabaseService.getCategories();
      const selectedCategory = categories.find((c) => c.id === categoryId);

      // Tạo giao dịch hoàn chỉnh từ partial data
      const partial = pending.partial_transaction;
      const tx = await DatabaseService.createTransaction({
        user_id: userId,
        amount: partial.amount || 0,
        category_id: categoryId,
        transaction_type: partial.transaction_type || 'EXPENSE',
        description: partial.description || selectedCategory?.name || 'Chi tiêu',
        raw_input: partial.raw_input,
        image_url: partial.image_url,
        transaction_date: partial.transaction_date || new Date().toISOString(),
      });

      // Xóa pending session
      await DatabaseService.clearPendingClarification(userId);

      // Gửi Card thành công
      await ZaloService.sendTransactionSuccessCard(senderId, tx, selectedCategory?.name);
      return true;
    }

    // 4. Hủy giao dịch vừa ghi nhận
    if (actionPayload.startsWith('ACTION_CANCEL_TX:')) {
      const txId = actionPayload.split(':')[1];
      const deleted = await DatabaseService.deleteTransaction(txId, userId);

      if (deleted) {
        await ZaloService.sendTextMessageWithQuickReplies(
          senderId,
          '🗑️ Đã hủy thành công giao dịch chi tiêu vừa tạo!',
          [
            {
              type: 'oa.query.show',
              title: '📊 Xem lại báo cáo',
              payload: 'ACTION_REPORT_TODAY',
            },
          ]
        );
      } else {
        await ZaloService.sendTextMessageWithQuickReplies(
          senderId,
          '⚠️ Không tìm thấy giao dịch hoặc giao dịch đã bị hủy trước đó.'
        );
      }
      return true;
    }

    // 5. Hủy phiên làm rõ (Pending Clarification)
    if (actionPayload === 'ACTION_CANCEL_PENDING') {
      await DatabaseService.clearPendingClarification(userId);
      await ZaloService.sendTextMessageWithQuickReplies(
        senderId,
        '👌 Đã hủy thao tác ghi nhận chi tiêu.'
      );
      return true;
    }

    return false;
  }

  /**
   * Xử lý giải quyết Pending Clarification khi user gõ Text ở Tầng 2
   */
  private static async resolvePendingWithText(
    senderId: string,
    userId: string,
    pending: { partial_transaction: { amount?: number | null; description?: string | null; transaction_type?: 'EXPENSE' | 'INCOME'; raw_input?: string | null; image_url?: string | null; transaction_date?: string | null }; missing_field: string },
    userText: string
  ): Promise<boolean> {
    const missingField = pending.missing_field;

    // Trường hợp 1: Đang thiếu số tiền và user nhập vào số tiền
    if (missingField === 'amount') {
      let amount: number | null = null;
      const clean = userText.toLowerCase().replace(/[,.\s]/g, '');

      const kMatch = userText.toLowerCase().match(/(\d+(?:\.\d+)?)\s*(?:k|nghìn|ngàn)/);
      const trMatch = userText.toLowerCase().match(/(\d+(?:\.\d+)?)\s*(?:tr|triệu)/);
      const rawMatch = clean.match(/^\d+$/);

      if (kMatch) {
        amount = Math.round(parseFloat(kMatch[1]) * 1000);
      } else if (trMatch) {
        amount = Math.round(parseFloat(trMatch[1]) * 1000000);
      } else if (rawMatch) {
        amount = parseInt(rawMatch[0], 10);
      }

      if (amount && amount > 0) {
        const categories = await DatabaseService.getCategories();
        const cat = categories.find((c) => c.id === (pending.partial_transaction as { category_id?: number }).category_id) ||
          categories.find((c) => c.name === 'Khác') || categories[0];

        const tx = await DatabaseService.createTransaction({
          user_id: userId,
          amount,
          category_id: cat?.id,
          transaction_type: pending.partial_transaction.transaction_type || 'EXPENSE',
          description: pending.partial_transaction.description || userText,
          raw_input: `${pending.partial_transaction.raw_input || ''} + ${userText}`,
          image_url: pending.partial_transaction.image_url,
          transaction_date: pending.partial_transaction.transaction_date || new Date().toISOString(),
        });

        await DatabaseService.clearPendingClarification(userId);
        await ZaloService.sendTransactionSuccessCard(senderId, tx, cat?.name);
        return true;
      }
    }

    // Trường hợp 2: Đang thiếu danh mục và user tự gõ tên danh mục/mục đích thay vì bấm nút
    if (missingField === 'category') {
      const matchedCat = await DatabaseService.matchCategoryByName(userText);
      if (matchedCat) {
        const tx = await DatabaseService.createTransaction({
          user_id: userId,
          amount: pending.partial_transaction.amount || 0,
          category_id: matchedCat.id,
          transaction_type: pending.partial_transaction.transaction_type || 'EXPENSE',
          description: pending.partial_transaction.description || userText,
          raw_input: `${pending.partial_transaction.raw_input || ''} + ${userText}`,
          image_url: pending.partial_transaction.image_url,
          transaction_date: pending.partial_transaction.transaction_date || new Date().toISOString(),
        });

        await DatabaseService.clearPendingClarification(userId);
        await ZaloService.sendTransactionSuccessCard(senderId, tx, matchedCat.name);
        return true;
      }
    }

    return false;
  }

  /**
   * Xử lý kết quả từ LLM trích xuất ở Tầng 3
   */
  private static async handleLLMResult(
    senderId: string,
    userId: string,
    rawText: string | undefined,
    imageUrl: string | undefined,
    extraction: { status: string; transaction: { amount: number | null; category_name: string | null; type: 'EXPENSE' | 'INCOME'; description: string | null; transaction_date: string | null }; clarification: { missing_field: 'amount' | 'category' | 'description' | null; question: string | null } }
  ) {
    // 1. Trạng thái IRRELEVANT (Tin nhắn chào hỏi hoặc không liên quan)
    if (extraction.status === 'IRRELEVANT') {
      await WebhookHandler.sendHelpGuide(senderId);
      return;
    }

    // 2. Trạng thái NEED_CLARIFICATION (Thiếu số tiền hoặc thiếu danh mục)
    if (extraction.status === 'NEED_CLARIFICATION') {
      const missingField = extraction.clarification.missing_field || 'category';

      // Lưu trạng thái tạm vào bảng pending_clarifications
      await DatabaseService.savePendingClarification(
        userId,
        {
          amount: extraction.transaction.amount,
          category_name: extraction.transaction.category_name,
          transaction_type: extraction.transaction.type || 'EXPENSE',
          description: extraction.transaction.description || rawText,
          raw_input: rawText,
          image_url: imageUrl,
          transaction_date: extraction.transaction.transaction_date,
        },
        missingField,
        15 // Hết hạn sau 15 phút
      );

      // Gửi giao diện hỏi lại kèm Quick Reply buttons danh mục
      const categories = await DatabaseService.getCategories();
      const question = extraction.clarification.question || 'Vui lòng bổ sung thêm thông tin cho khoản chi này:';
      await ZaloService.sendClarificationPrompt(senderId, question, missingField, categories);
      return;
    }

    // 3. Trạng thái SUCCESS (Có đầy đủ amount và thông tin chi tiêu)
    if (extraction.status === 'SUCCESS' && extraction.transaction.amount) {
      // Tìm category_id trong cơ sở dữ liệu
      const matchedCategory = await DatabaseService.matchCategoryByName(
        extraction.transaction.category_name || 'Khác'
      );

      const tx = await DatabaseService.createTransaction({
        user_id: userId,
        amount: extraction.transaction.amount,
        category_id: matchedCategory?.id,
        transaction_type: extraction.transaction.type || 'EXPENSE',
        description: extraction.transaction.description || rawText || matchedCategory?.name,
        raw_input: rawText,
        image_url: imageUrl,
        transaction_date: extraction.transaction.transaction_date || new Date().toISOString(),
      });

      // Gửi Card xác nhận thành công
      await ZaloService.sendTransactionSuccessCard(senderId, tx, matchedCategory?.name);
    }
  }

  // --- Helper Functions ---

  private static async sendTodayReport(senderId: string, userId: string) {
    const report = await DatabaseService.getDailyExpenseReport(userId);
    await ZaloService.sendExpenseReportCard(
      senderId,
      report.periodTitle,
      report.totalExpense,
      report.expenseCount,
      report.items
    );
  }

  private static async sendMonthlyReport(senderId: string, userId: string) {
    const report = await DatabaseService.getMonthlyExpenseReport(userId);
    await ZaloService.sendExpenseReportCard(
      senderId,
      report.periodTitle,
      report.totalExpense,
      report.expenseCount,
      report.items
    );
  }

  private static async sendHelpGuide(senderId: string) {
    const helpText =
      `🤖 CHÀO BẠN! TÔI LÀ TRỢ LÝ QUẢN LÝ CHI TIÊU THÔNG MINH\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `💡 Cách sử dụng cực kỳ nhanh chóng:\n` +
      `1️⃣ Gửi tin nhắn tự do:\n` +
      `   • "Ăn phở bò 45k"\n` +
      `   • "Đổ xăng 80 nghìn"\n` +
      `   • "Mua sách tiki 250k"\n\n` +
      `2️⃣ Gửi ảnh chụp màn hình:\n` +
      `   • Hóa đơn siêu thị, nhà hàng\n` +
      `   • Biên lai chuyển khoản ngân hàng\n\n` +
      `3️⃣ Tra cứu nhanh qua phím bấm bên dưới:`;

    const quickReplies = [
      {
        type: 'oa.query.show' as const,
        title: '📊 Báo cáo hôm nay',
        payload: 'ACTION_REPORT_TODAY',
      },
      {
        type: 'oa.query.show' as const,
        title: '📈 Báo cáo tháng này',
        payload: 'ACTION_REPORT_MONTH',
      },
    ];

    await ZaloService.sendTextMessageWithQuickReplies(senderId, helpText, quickReplies);
  }

  private static extractActionFromMessage(text?: string): string | null {
    if (!text) return null;
    if (text.startsWith('ACTION_')) return text.trim();
    return null;
  }
}
