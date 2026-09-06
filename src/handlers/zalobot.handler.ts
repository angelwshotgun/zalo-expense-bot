// ==============================================================================
// ZALO BOT PLATFORM WEBHOOK HANDLER
// Project: Zalo Expense Management Chatbot
// ==============================================================================

import { FastifyRequest, FastifyReply } from 'fastify';
import { DatabaseService } from '../services/db.service.js';
import { ZaloBotService } from '../services/zalobot.service.js';
import { LLMService } from '../services/llm.service.js';

export interface ZaloBotWebhookBody {
  ok: boolean;
  result?: {
    event_name: 'message.text.received' | 'message.image.received' | string;
    message?: {
      from: {
        id: string;
        display_name: string;
        is_bot: boolean;
      };
      chat: {
        id: string;
        chat_type: 'PRIVATE' | 'GROUP';
      };
      text?: string;
      photo?: any;
      photo_url?: string;
      caption?: string;
      message_id: string;
      date: number;
    };
  };
}

// Bộ nhớ đệm theo dõi tin nhắn và trạng thái xử lý ảnh gần nhất để liên kết liền mạch
const userRecentTexts = new Map<string, { text: string; timestamp: number }>();
const inFlightImageTasks = new Map<string, { photoUrl: string; timestamp: number }>();

export class ZaloBotHandler {
  /**
   * Tiếp nhận Webhook từ Zalo Bot Platform (bot-api.zaloplatforms.com)
   */
  static async handleWebhook(
    request: FastifyRequest<{ Body: any }>,
    reply: FastifyReply
  ) {
    console.log('\n======================================================');
    console.log('📥 [Zalo Bot Webhook] Nhận request mới!');
    console.log('Headers:', JSON.stringify(request.headers, null, 2));
    console.log('Body:', JSON.stringify(request.body, null, 2));
    console.log('======================================================\n');

    // Luôn phản hồi 200 OK ngay lập tức
    reply.status(200).send({ message: 'Success' });

    let body = request.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        console.error('Không thể parse body JSON:', e);
      }
    }

    if (!body) {
      console.warn('⚠️ Webhook body rỗng!');
      return;
    }

    // Zalo Bot có thể gửi { result: { message: ... } } hoặc trực tiếp { message: ... } hoặc { event_name: ..., message: ... }
    const anyBody = body as any;
    const eventData = anyBody?.result || anyBody;
    const msg = eventData?.message || anyBody?.message;

    if (!msg) {
      console.warn('⚠️ Không tìm thấy trường message trong webhook body:', body);
      return;
    }

    // Xử lý bất đồng bộ
    try {
      await ZaloBotHandler.processMessage({
        event_name: eventData.event_name || 'message.text.received',
        message: msg,
      });
    } catch (err) {
      console.error('❌ Lỗi xử lý Zalo Bot message:', err);
    }
  }

  private static async processMessage(result: NonNullable<ZaloBotWebhookBody['result']>) {
    const msg = result.message;
    if (!msg || msg.from?.is_bot) return;

    const senderId = msg.from.id;
    const senderName = msg.from.display_name;
    const chatId = msg.chat.id;
    const userText = (msg.text || msg.caption || '').trim();

    // Trích xuất photo_url hỗ trợ mọi định dạng từ Zalo Bot Platform
    let photoUrl: string | undefined = undefined;
    const anyMsg = msg as any;
    if (typeof anyMsg.photo_url === 'string' && anyMsg.photo_url) {
      photoUrl = anyMsg.photo_url;
    } else if (typeof anyMsg.photo === 'string' && anyMsg.photo) {
      photoUrl = anyMsg.photo;
    } else if (Array.isArray(anyMsg.photo) && anyMsg.photo.length > 0) {
      photoUrl = anyMsg.photo[anyMsg.photo.length - 1]?.url || anyMsg.photo[anyMsg.photo.length - 1]?.file_url;
    } else if (anyMsg.photo && typeof anyMsg.photo === 'object' && anyMsg.photo.url) {
      photoUrl = anyMsg.photo.url;
    } else if (Array.isArray(anyMsg.attachments) && anyMsg.attachments.length > 0) {
      photoUrl = anyMsg.attachments[0]?.payload?.url || anyMsg.attachments[0]?.url;
    }

    console.log(`\n🤖 [Zalo Bot: ${result.event_name}] Từ: ${senderName} (${senderId}) - Chat: ${chatId}${photoUrl ? ' [KÈM ẢNH]' : ''}`);

    // Lấy hoặc tạo user trong Supabase
    const user = await DatabaseService.getOrCreateUser(senderId, senderName);

    if (userText && !photoUrl) {
      userRecentTexts.set(user.id, { text: userText, timestamp: Date.now() });
    }

    // =========================================================================
    // TẦNG 1: LỆNH TẮT CỐ ĐỊNH (0 TOKEN LLM)
    // =========================================================================
    const lowerText = userText.toLowerCase();

    if (lowerText === '#baocao' || lowerText === '#homnay' || lowerText === 'báo cáo' || lowerText.includes('báo cáo hôm nay')) {
      console.log(`⚡ [Zalo Bot - Tier 1] Báo cáo hôm nay cho user: ${user.id} (0 TOKEN)`);
      const report = await DatabaseService.getDailyExpenseReport(user.id);
      const reportText = ZaloBotService.buildReportText(report);
      await ZaloBotService.sendMessage(chatId, reportText);
      return;
    }

    if (lowerText === '#thangnay' || lowerText.includes('báo cáo tháng')) {
      console.log(`⚡ [Zalo Bot - Tier 1] Báo cáo tháng cho user: ${user.id} (0 TOKEN)`);
      const report = await DatabaseService.getMonthlyExpenseReport(user.id);
      const reportText = ZaloBotService.buildReportText(report);
      await ZaloBotService.sendMessage(chatId, reportText);
      return;
    }

    if (lowerText === '#help' || lowerText === '#trogiup' || lowerText === 'trợ giúp') {
      const helpText =
        `👋 **CHÀO BẠN! BOT QUẢN LÝ DOANH THU & CHI TIÊU**\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `💡 **Danh mục sản phẩm:**\n` +
        `🌸 Thư hoa | 🏅 Huy chương | 🪻 Tủ hoa\n` +
        `✉️ Thiệp lẻ | 🖼️ Khung ảnh | 🏆 Cúp hoa\n` +
        `🔑 Móc khóa | 📦 Khác\n\n` +
        `⚡ **Nhập nhanh (Phản hồi tức thì < 0.2s):**\n` +
        `• Bán hàng: "Thư hoa +115k", "Tủ hoa 299k", "Móc khóa 35k"\n` +
        `• Chi tiêu: "Chi 50k mua giấy", "-30k tiền ship"\n` +
        `• Gửi ảnh: Bill chuyển khoản, hóa đơn\n\n` +
        `📊 **Báo cáo thống kê:**\n` +
        `• **#baocao** : Xem tổng kết hôm nay\n` +
        `• **#thangnay** : Xem tổng kết tháng này`;
      await ZaloBotService.sendMessage(chatId, helpText);
      return;
    }

    if (lowerText === 'hủy' || lowerText === 'hủy bỏ' || lowerText === '#huy') {
      await DatabaseService.clearPendingClarification(user.id);
      await ZaloBotService.sendMessage(chatId, '👌 Đã hủy thao tác ghi nhận.');
      return;
    }

    // =========================================================================
    // TẦNG 0.5: XỬ LÝ XOÁ VÀ SỬA GIAO DỊCH GẦN NHẤT
    // =========================================================================
    const normalizedText = lowerText.replace(/[.,!?]/g, '').trim();

    const isDeleteCommand =
      normalizedText === 'xóa' ||
      normalizedText === 'xoá' ||
      normalizedText === 'xoa' ||
      normalizedText === '#xoa' ||
      normalizedText === '/xoa' ||
      normalizedText === 'xóa đi' ||
      normalizedText === 'xoá đi' ||
      normalizedText === 'xoa di' ||
      normalizedText.startsWith('xóa đơn') ||
      normalizedText.startsWith('xoá đơn') ||
      normalizedText.startsWith('xoa don') ||
      normalizedText.startsWith('hủy đơn') ||
      normalizedText.startsWith('huỷ đơn') ||
      normalizedText.startsWith('bỏ đơn') ||
      normalizedText.includes('xóa vừa rồi') ||
      normalizedText.includes('xoá vừa rồi') ||
      normalizedText.includes('xóa đơn vừa rồi') ||
      normalizedText.includes('xoá đơn vừa rồi') ||
      normalizedText.includes('hủy đơn vừa rồi') ||
      normalizedText.includes('huỷ đơn vừa rồi') ||
      normalizedText.includes('xóa giao dịch') ||
      normalizedText.includes('xoá giao dịch') ||
      normalizedText.includes('xóa cái này') ||
      normalizedText.includes('xoá cái này') ||
      normalizedText.includes('xóa hộ') ||
      normalizedText.includes('xoá giúp') ||
      normalizedText.includes('xóa giùm') ||
      normalizedText.includes('sai rồi xóa') ||
      normalizedText.includes('nhầm rồi xóa') ||
      normalizedText.includes('nhầm rồi xoá') ||
      normalizedText.includes('bị nhầm xóa');

    if (isDeleteCommand) {
      console.log(`🗑️ [Zalo Bot] Yêu cầu xóa giao dịch gần nhất của user: ${user.id}`);
      userRecentTexts.delete(user.id);
      inFlightImageTasks.delete(user.id);
      await DatabaseService.clearPendingClarification(user.id);
      const deleted = await DatabaseService.deleteLatestTransaction(user.id);
      if (deleted) {
        const catName = deleted.category?.name || 'Khác';
        const catIcon = deleted.category?.icon || '📦';
        const amountStr = ZaloBotService.formatCurrency(deleted.amount);
        const typeStr = deleted.transaction_type === 'INCOME' ? 'Thu nhập / Bán hàng' : 'Khoản chi';

        await ZaloBotService.sendMessage(
          chatId,
          `🗑️ **ĐÃ XÓA GIAO DỊCH GẦN NHẤT!**\n\n` +
          `• **Loại:** ${typeStr}\n` +
          `• **Mặt hàng:** ${catIcon} **${catName}**\n` +
          `• **Số tiền:** **${amountStr}**\n` +
          (deleted.description ? `• **Nội dung:** ${deleted.description}\n` : '') +
          `\n━━━━━━━━━━━━━━━━━━\n` +
          `💡 _Giao dịch đã được xóa hoàn toàn. Gõ **#baocao** để kiểm tra lại._`
        );
      } else {
        await ZaloBotService.sendMessage(chatId, '⚠️ Không tìm thấy giao dịch nào gần đây để xóa.');
      }
      return;
    }

    const isEditIntent =
      normalizedText.startsWith('sửa') ||
      normalizedText.startsWith('sua') ||
      normalizedText.startsWith('đổi') ||
      normalizedText.startsWith('doi') ||
      normalizedText.startsWith('chuyển') ||
      normalizedText.startsWith('chuyen') ||
      normalizedText.startsWith('thay') ||
      normalizedText.startsWith('chỉnh') ||
      normalizedText.includes('sửa thành') ||
      normalizedText.includes('sua thanh') ||
      normalizedText.includes('đổi thành') ||
      normalizedText.includes('doi thanh') ||
      normalizedText.includes('đổi sang') ||
      normalizedText.includes('chuyển sang') ||
      normalizedText.includes('không phải') ||
      normalizedText.includes('ko phải') ||
      normalizedText.includes('chứ không phải') ||
      normalizedText.includes('chứ ko phải') ||
      normalizedText.includes('mới đúng') ||
      normalizedText.includes('sửa lại') ||
      normalizedText.includes('đổi lại');

    if (isEditIntent) {
      const latest = await DatabaseService.getLatestTransaction(user.id);
      if (!latest) {
        await ZaloBotService.sendMessage(chatId, '⚠️ Bạn chưa có giao dịch nào gần đây để chỉnh sửa.');
        return;
      }

      let newAmount: number | null = null;
      let newCategoryName: string | null = null;
      let newType: 'INCOME' | 'EXPENSE' | undefined = undefined;

      if (lowerText.includes('chi') || lowerText.includes('tiêu') || lowerText.includes('khoản chi') || lowerText.includes('mua')) {
        newType = 'EXPENSE';
      } else if (lowerText.includes('thu') || lowerText.includes('bán') || lowerText.includes('thu nhập') || lowerText.includes('đơn hàng')) {
        newType = 'INCOME';
      }

      // Xử lý chuỗi mục tiêu sau "mà là", "thành", "sang", "mới đúng" nếu có câu đính chính
      let targetSlice = lowerText;
      const negationMatch = lowerText.match(/(?:mà là|thành|sang|thay bằng|mới đúng|thành ra)\s*(.+)/);
      if (negationMatch) {
        targetSlice = negationMatch[1];
      }

      // 1. Tìm số tiền mới
      const parseAmount = (str: string) => {
        const trComplexMatch = str.match(/(\d+)\s*(?:tr|triệu)\s*(\d+)/);
        const trSimpleMatch = str.match(/(\d+(?:[.,]\d+)?)\s*(?:tr|triệu)/);
        const kMatch = str.match(/(\d+(?:[.,]\d+)?)\s*(?:k|nghìn|ngàn)/);
        const rawNumMatch = str.replace(/[,.\s]/g, '').match(/\b(\d{4,9})\b/);

        if (trComplexMatch) {
          const main = parseInt(trComplexMatch[1], 10) * 1000000;
          const subDigits = trComplexMatch[2];
          const sub = parseInt(subDigits.padEnd(6, '0').slice(0, 6), 10);
          return main + sub;
        } else if (trSimpleMatch) {
          const val = parseFloat(trSimpleMatch[1].replace(',', '.'));
          return Math.round(val * 1000000);
        } else if (kMatch) {
          const val = parseFloat(kMatch[1].replace(',', '.'));
          return Math.round(val * 1000);
        } else if (rawNumMatch) {
          return parseInt(rawNumMatch[1], 10);
        }
        return null;
      };

      newAmount = parseAmount(targetSlice) || parseAmount(lowerText);

      // 2. Tìm danh mục mới
      const matchedCat = await DatabaseService.matchCategoryByName(targetSlice);
      if (matchedCat && matchedCat.name !== 'Khác') {
        newCategoryName = matchedCat.name;
      } else {
        const fallbackCat = await DatabaseService.matchCategoryByName(lowerText);
        if (fallbackCat && fallbackCat.name !== 'Khác') {
          newCategoryName = fallbackCat.name;
        }
      }

      if (newAmount || newCategoryName || newType) {
        const updates: any = {};
        if (newAmount) updates.amount = newAmount;
        if (newType) updates.transaction_type = newType;
        if (newCategoryName) {
          const cat = await DatabaseService.matchCategoryByName(newCategoryName);
          if (cat) updates.category_id = cat.id;
        }

        const updatedTx = await DatabaseService.updateLatestTransaction(user.id, updates);
        if (updatedTx) {
          await DatabaseService.clearPendingClarification(user.id);
          const catName = updatedTx.category?.name || 'Khác';
          const catIcon = updatedTx.category?.icon || '📦';
          const amountStr = ZaloBotService.formatCurrency(updatedTx.amount);
          const typeStr = updatedTx.transaction_type === 'INCOME' ? 'Thu nhập / Bán hàng' : 'Khoản chi';

          await ZaloBotService.sendMessage(
            chatId,
            `✏️ **ĐÃ SỬA THÀNH CÔNG!**\n\n` +
            `📌 **Loại:** ${typeStr}\n` +
            `💵 **Số tiền:** **${amountStr}**\n` +
            `🏷️ **Mặt hàng:** ${catIcon} **${catName}**\n` +
            (updatedTx.description ? `📝 **Nội dung:** ${updatedTx.description}\n` : '') +
            `\n━━━━━━━━━━━━━━━━━━\n` +
            `💡 _Gõ **#baocao** để xem lại tổng kết sau khi sửa._`
          );
          return;
        }
      } else {
        await ZaloBotService.sendMessage(
          chatId,
          `🤔 Bot chưa rõ bạn muốn sửa thông tin gì.\n` +
          `Bạn có thể nhắn ví dụ: "sửa thành Thư hoa" hoặc "đổi thành 200k" nhé!`
        );
        return;
      }
    }

    // =========================================================================
    // TẦNG 1.5: BỘ PHÂN TÍCH NHANH SIÊU TỐC (0 TOKEN LLM, PHẢN HỒI < 100MS)
    // =========================================================================
    if (!photoUrl && userText) {
      // Nếu user đang có một ảnh đang được tải/phân tích trong vòng 25s, tạm hoãn xử lý độc lập
      // để chờ ảnh đọc xong và tự động liên kết thành một giao dịch hoàn chỉnh
      const inFlight = inFlightImageTasks.get(user.id);
      if (inFlight && Date.now() - inFlight.timestamp < 25000) {
        console.log(`⏳ User ${user.id} vừa gửi ảnh và đang chat bổ sung: "${userText}". Sẽ tự động liên kết khi ảnh đọc xong!`);
        return;
      }

      const quickParsed = ZaloBotHandler.parseQuickInput(userText);
      if (quickParsed) {
        console.log(`⚡ [Zalo Bot - Tier 1.5: Fast Local Parser] Khớp nhanh: ${quickParsed.category_name} - ${quickParsed.amount}đ (${quickParsed.transaction_type})`);
        const matchedCategory = await DatabaseService.matchCategoryByName(quickParsed.category_name);
        const tx = await DatabaseService.createTransaction({
          user_id: user.id,
          amount: quickParsed.amount,
          category_id: matchedCategory?.id,
          transaction_type: quickParsed.transaction_type,
          description: quickParsed.description || matchedCategory?.name,
          raw_input: userText,
          transaction_date: new Date().toISOString(),
        });

        await DatabaseService.clearPendingClarification(user.id);
        const successMsg = ZaloBotService.buildSuccessText(tx, matchedCategory?.name);
        await ZaloBotService.sendMessage(chatId, successMsg);
        return;
      }
    }

    // =========================================================================
    // TẦNG 2: KIỂM TRA PHIÊN CHỜ LÀM RÕ DỞ (PENDING CLARIFICATION)
    // =========================================================================
    const pending = await DatabaseService.getPendingClarification(user.id);

    if (pending && userText) {
      console.log(`🔄 [Zalo Bot - Tier 2] Giải quyết pending session: thiếu ${pending.missing_field}`);

      // Trường hợp 1: Đang thiếu mặt hàng / category (Người dùng vừa gửi ảnh hoặc số tiền trước đó)
      if (pending.missing_field === 'category') {
        const matchedCat = await DatabaseService.matchCategoryByName(userText);
        if (matchedCat) {
          const tx = await DatabaseService.createTransaction({
            user_id: user.id,
            amount: pending.partial_transaction.amount || 0,
            category_id: matchedCat.id,
            transaction_type: pending.partial_transaction.transaction_type || 'INCOME',
            description: pending.partial_transaction.description || userText || matchedCat.name,
            raw_input: `${pending.partial_transaction.raw_input || ''} + ${userText}`,
            image_url: pending.partial_transaction.image_url,
            transaction_date: pending.partial_transaction.transaction_date || new Date().toISOString(),
          });

          await DatabaseService.clearPendingClarification(user.id);
          const successMsg = ZaloBotService.buildSuccessText(tx, matchedCat.name);
          await ZaloBotService.sendMessage(chatId, successMsg);
          return;
        }
      }

      // Trường hợp 2: Đang thiếu số tiền / amount (Người dùng nhắn tên mặt hàng trước đó)
      if (pending.missing_field === 'amount') {
        let amount: number | null = null;
        const trComplexMatch = lowerText.match(/(\d+)\s*(?:tr|triệu)\s*(\d+)/);
        const trSimpleMatch = lowerText.match(/(\d+(?:[.,]\d+)?)\s*(?:tr|triệu)/);
        const kMatch = lowerText.match(/(\d+(?:[.,]\d+)?)\s*(?:k|nghìn|ngàn)/);
        const rawMatch = lowerText.replace(/[,.\s]/g, '').match(/^\d+$/);

        if (trComplexMatch) {
          const main = parseInt(trComplexMatch[1], 10) * 1000000;
          const sub = parseInt(trComplexMatch[2].padEnd(6, '0').slice(0, 6), 10);
          amount = main + sub;
        } else if (trSimpleMatch) {
          amount = Math.round(parseFloat(trSimpleMatch[1].replace(',', '.')) * 1000000);
        } else if (kMatch) {
          amount = Math.round(parseFloat(kMatch[1].replace(',', '.')) * 1000);
        } else if (rawMatch) {
          amount = parseInt(rawMatch[0], 10);
        }

        if (amount && amount > 0) {
          const categories = await DatabaseService.getCategories();
          const cat = categories.find((c) => c.id === (pending.partial_transaction as any).category_id) || categories[0];

          const tx = await DatabaseService.createTransaction({
            user_id: user.id,
            amount,
            category_id: cat?.id,
            transaction_type: pending.partial_transaction.transaction_type || 'INCOME',
            description: pending.partial_transaction.description || userText,
            raw_input: `${pending.partial_transaction.raw_input || ''} + ${userText}`,
            image_url: pending.partial_transaction.image_url,
            transaction_date: pending.partial_transaction.transaction_date || new Date().toISOString(),
          });

          await DatabaseService.clearPendingClarification(user.id);
          const successMsg = ZaloBotService.buildSuccessText(tx, cat?.name);
          await ZaloBotService.sendMessage(chatId, successMsg);
          return;
        }
      }
    }

    // =========================================================================
    // TẦNG 2.5: LIÊN KẾT BỔ SUNG MẶT HÀNG CHO ẢNH GẦN NHẤT (NẾU KHÔNG CÓ PENDING)
    // =========================================================================
    if (!photoUrl && userText) {
      const matchedCat = await DatabaseService.matchCategoryByName(userText);
      if (matchedCat && matchedCat.name !== 'Khác') {
        const latest = await DatabaseService.getLatestTransaction(user.id);
        const isRecent =
          latest &&
          Date.now() - new Date(latest.created_at || latest.transaction_date).getTime() < 10 * 60 * 1000;

        // Nếu giao dịch gần nhất trong 10 phút là từ ảnh hoặc có category là Khác
        if (isRecent && (latest.image_url || latest.category?.name === 'Khác')) {
          const updated = await DatabaseService.updateLatestTransaction(user.id, {
            category_id: matchedCat.id,
            description: userText,
          });
          if (updated) {
            await DatabaseService.clearPendingClarification(user.id);
            await ZaloBotService.sendMessage(
              chatId,
              `✅ **ĐÃ LIÊN KẾT BỔ SUNG MẶT HÀNG!**\n\n` +
              `🏷️ **Mặt hàng:** ${matchedCat.icon} **${matchedCat.name}**\n` +
              `💵 **Số tiền:** **${ZaloBotService.formatCurrency(updated.amount)}**\n` +
              `📝 **Nội dung:** ${userText}\n\n` +
              `━━━━━━━━━━━━━━━━━━\n` +
              `💡 _Gõ **#baocao** để xem lại tổng kết._`
            );
            return;
          }
        } else {
          // Người dùng chỉ gõ tên sản phẩm mà chưa có số tiền và chưa có giao dịch ảnh trước đó
          await DatabaseService.savePendingClarification(
            user.id,
            {
              category_id: matchedCat.id,
              category_name: matchedCat.name,
              transaction_type: 'INCOME',
              description: userText,
              raw_input: userText,
            },
            'amount',
            15
          );

          await ZaloBotService.sendMessage(
            chatId,
            `${matchedCat.icon} Đã nhận mặt hàng: **${matchedCat.name}**!\n` +
            `👉 Bạn cho mình xin số tiền của đơn này nhé (ví dụ: **115k**, **299k**):`
          );
          return;
        }
      }
    }

    // =========================================================================
    // TẦNG 3: MULTIMODAL LLM (GEMINI FLASH) CHO ẢNH HOẶC TEXT PHỨC TẠP
    // =========================================================================
    if (!userText && !photoUrl) {
      return;
    }

    console.log(`🤖 [Zalo Bot - Tier 3: LLM Multimodal] Text: "${userText}", Photo: ${!!photoUrl}`);

    let imageBuffer: Buffer | undefined;
    let mimeType = 'image/jpeg';

    if (photoUrl) {
      inFlightImageTasks.set(user.id, { photoUrl, timestamp: Date.now() });
      await ZaloBotService.sendMessage(chatId, '🔍 Bot đã nhận được ảnh và đang đọc biên lai, bạn đợi giây lát nhé...');

      try {
        console.log(`🖼️ [Zalo Bot] Đang tải ảnh từ URL: ${photoUrl}`);
        const downloaded = await ZaloBotService.downloadPhotoAsBuffer(photoUrl);
        imageBuffer = downloaded.buffer;
        mimeType = downloaded.mimeType;
        console.log(`✅ [Zalo Bot] Đã tải ảnh (${imageBuffer.length} bytes, MIME: ${mimeType})`);
      } catch (err) {
        console.error('Lỗi tải ảnh Zalo Bot:', err);
        inFlightImageTasks.delete(user.id);
        await ZaloBotService.sendMessage(chatId, '⚠️ Không thể tải ảnh từ Zalo. Bạn thử gửi lại nhé!');
        return;
      }
    }

    try {
      const extraction = await LLMService.extractExpense(userText, imageBuffer, mimeType);
      console.log(`🤖 [Zalo Bot] Kết quả Gemini trích xuất (${extraction.status}):`, JSON.stringify(extraction));

      if (extraction.status === 'IRRELEVANT') {
        const guideText =
          `🤖 **Tôi chưa hiểu nội dung này.**\n` +
          `Bạn có thể gõ ví dụ: "Thư hoa +115k" hoặc gửi ảnh chụp hóa đơn/chuyển khoản để tôi ghi nhận nhé!\n\n` +
          `_Gõ **#baocao** để xem báo cáo hôm nay._`;
        await ZaloBotService.sendMessage(chatId, guideText);
        return;
      }

      // Kiểm tra xem người dùng có vừa chat bổ sung mặt hàng trong vòng 60 giây không
      const recent = userRecentTexts.get(user.id);
      const hasRecent = recent && (Date.now() - recent.timestamp < 60000);
      let effectiveCategory = extraction.transaction.category_name;
      let effectiveDesc = extraction.transaction.description || userText;

      if (hasRecent) {
        const matched = await DatabaseService.matchCategoryByName(recent.text);
        if (matched && matched.name !== 'Khác') {
          effectiveCategory = matched.name;
          effectiveDesc = recent.text;
          console.log(`🔗 [Zalo Bot] Đã tự động liên kết ảnh với văn bản gửi kèm: "${recent.text}" -> ${matched.name}`);
        }
      }

      const specificProducts = ['Thư hoa', 'Huy chương', 'Tủ hoa', 'Thiệp lẻ', 'Khung ảnh', 'Cúp hoa', 'Móc khóa'];
      const isSpecific = specificProducts.includes(effectiveCategory || '');

      // Nếu đã có số tiền và xác định được mặt hàng cụ thể (hoặc từ caption, hoặc từ tin nhắn chat kèm)
      if (extraction.transaction.amount && isSpecific) {
        const matchedCategory = await DatabaseService.matchCategoryByName(effectiveCategory!);
        const tx = await DatabaseService.createTransaction({
          user_id: user.id,
          amount: extraction.transaction.amount,
          category_id: matchedCategory?.id,
          transaction_type: extraction.transaction.type || 'INCOME',
          description: effectiveDesc || matchedCategory?.name,
          raw_input: `${userText || '[Ảnh biên lai]'} ${hasRecent ? `+ ${recent.text}` : ''}`.trim(),
          image_url: photoUrl,
          transaction_date: extraction.transaction.transaction_date || new Date().toISOString(),
        });

        await DatabaseService.clearPendingClarification(user.id);
        const successMsg = ZaloBotService.buildSuccessText(tx, matchedCategory?.name);
        await ZaloBotService.sendMessage(chatId, successMsg);
        return;
      }

      // Nếu là ảnh có số tiền nhưng chưa rõ mặt hàng -> Lưu pending và hỏi người dùng
      if (extraction.transaction.amount && photoUrl && !isSpecific) {
        await DatabaseService.savePendingClarification(
          user.id,
          {
            amount: extraction.transaction.amount,
            category_name: null,
            transaction_type: extraction.transaction.type || 'INCOME',
            description: extraction.transaction.description || 'Biên lai chuyển khoản',
            raw_input: '[Ảnh biên lai]',
            image_url: photoUrl,
            transaction_date: extraction.transaction.transaction_date,
          },
          'category',
          15
        );

        const categories = await DatabaseService.getCategories();
        const question = `Đã nhận biên lai chuyển khoản: **${ZaloBotService.formatCurrency(extraction.transaction.amount)}**!\nBạn cho mình xin tên mặt hàng của đơn này nhé:`;
        const clarText = ZaloBotService.buildClarificationText(question, 'category', categories);
        await ZaloBotService.sendMessage(chatId, clarText);
        return;
      }

      // Nếu là text cần làm rõ
      if (extraction.status === 'NEED_CLARIFICATION') {
        const missingField = extraction.clarification.missing_field || 'category';

        await DatabaseService.savePendingClarification(
          user.id,
          {
            amount: extraction.transaction.amount,
            category_name: extraction.transaction.category_name,
            transaction_type: extraction.transaction.type || 'INCOME',
            description: extraction.transaction.description || userText,
            raw_input: userText || '[Ảnh hóa đơn/chuyển khoản]',
            image_url: photoUrl,
            transaction_date: extraction.transaction.transaction_date,
          },
          missingField,
          15
        );

        const categories = await DatabaseService.getCategories();
        const question = extraction.clarification.question || 'Bạn vui lòng bổ sung thông tin:';
        const clarText = ZaloBotService.buildClarificationText(question, missingField, categories);
        await ZaloBotService.sendMessage(chatId, clarText);
        return;
      }

      if (extraction.status === 'SUCCESS' && extraction.transaction.amount) {
        const matchedCategory = await DatabaseService.matchCategoryByName(
          extraction.transaction.category_name || 'Khác'
        );

        const tx = await DatabaseService.createTransaction({
          user_id: user.id,
          amount: extraction.transaction.amount,
          category_id: matchedCategory?.id,
          transaction_type: extraction.transaction.type || 'EXPENSE',
          description: extraction.transaction.description || userText || matchedCategory?.name,
          raw_input: userText || '[Ảnh hóa đơn/chuyển khoản]',
          image_url: photoUrl,
          transaction_date: extraction.transaction.transaction_date || new Date().toISOString(),
        });

        console.log(`✅ [Zalo Bot] Đã lưu giao dịch ${tx.id} (${tx.amount}đ) và gửi phản hồi thành công!`);
        const successMsg = ZaloBotService.buildSuccessText(tx, matchedCategory?.name);
        await ZaloBotService.sendMessage(chatId, successMsg);
      }
    } finally {
      if (photoUrl) {
        inFlightImageTasks.delete(user.id);
      }
    }
  }

  /**
   * Bộ phân tích nhanh cục bộ (Tier 1.5) - Tốc độ siêu tốc < 10ms, 0 Token LLM
   */
  private static parseQuickInput(text: string): {
    amount: number;
    category_name: string;
    transaction_type: 'INCOME' | 'EXPENSE';
    description: string;
  } | null {
    if (!text) return null;
    const raw = text.trim();
    const lower = raw.toLowerCase();

    // 1. Phân loại Thu / Chi
    let type: 'INCOME' | 'EXPENSE' = 'INCOME';
    if (
      lower.startsWith('-') ||
      lower.includes('chi ') ||
      lower.includes('tiêu ') ||
      lower.includes('mua ') ||
      lower.includes('trả ') ||
      lower.includes('ship ')
    ) {
      type = 'EXPENSE';
    } else if (lower.startsWith('+')) {
      type = 'INCOME';
    }

    // 2. Trích xuất số tiền (hỗ trợ: 115k, 115 nghìn, 115 ngàn, 1.2tr, 1tr2, 299000, 299.000)
    let amount: number | null = null;
    const trComplexMatch = lower.match(/(\d+)\s*(?:tr|triệu)\s*(\d+)/);
    const trSimpleMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:tr|triệu)/);
    const kMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:k|nghìn|ngàn)/);
    const rawNumMatch = lower.replace(/[,.\s]/g, '').match(/\b(\d{4,9})\b/);

    if (trComplexMatch) {
      const main = parseInt(trComplexMatch[1], 10) * 1000000;
      const subDigits = trComplexMatch[2];
      const sub = parseInt(subDigits.padEnd(6, '0').slice(0, 6), 10);
      amount = main + sub;
    } else if (trSimpleMatch) {
      const val = parseFloat(trSimpleMatch[1].replace(',', '.'));
      amount = Math.round(val * 1000000);
    } else if (kMatch) {
      const val = parseFloat(kMatch[1].replace(',', '.'));
      amount = Math.round(val * 1000);
    } else if (rawNumMatch) {
      amount = parseInt(rawNumMatch[1], 10);
    }

    if (!amount || amount <= 0) return null;

    // 3. Khớp danh mục theo 8 danh mục người dùng yêu cầu
    const categoriesMap = [
      { name: 'Thư hoa', keywords: ['thư hoa', 'thu hoa'] },
      { name: 'Huy chương', keywords: ['huy chương', 'huy chuong', 'hc'] },
      { name: 'Tủ hoa', keywords: ['tủ hoa', 'tu hoa'] },
      { name: 'Thiệp lẻ', keywords: ['thiệp lẻ', 'thiep le', 'thiệp', 'thiep'] },
      { name: 'Khung ảnh', keywords: ['khung ảnh', 'khung anh', 'khung hình', 'khung hinh'] },
      { name: 'Cúp hoa', keywords: ['cúp hoa', 'cup hoa'] },
      { name: 'Móc khóa', keywords: ['móc khóa', 'moc khoa'] },
      { name: 'Khác', keywords: ['khác', 'khac'] },
    ];

    let matchedCategory: string | null = null;
    for (const cat of categoriesMap) {
      for (const kw of cat.keywords) {
        if (lower.includes(kw)) {
          matchedCategory = cat.name;
          break;
        }
      }
      if (matchedCategory) break;
    }

    // Nếu không có tên danh mục trong các mặt hàng, nhưng là khoản chi rõ ràng -> 'Khác'
    if (!matchedCategory && type === 'EXPENSE') {
      matchedCategory = 'Khác';
    }

    if (!matchedCategory) {
      return null;
    }

    return {
      amount,
      category_name: matchedCategory,
      transaction_type: type,
      description: raw.replace(/^[+-]\s*/, '').trim(),
    };
  }
}
