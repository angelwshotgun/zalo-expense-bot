// ==============================================================================
// ZALO BOT PLATFORM WEBHOOK HANDLER
// Project: Zalo Expense Management Chatbot
// ==============================================================================

import { FastifyRequest, FastifyReply } from 'fastify';
import { DatabaseService, removeVietnameseTones, hasWholePhrase } from '../services/db.service.js';
import { ZaloBotService } from '../services/zalobot.service.js';
import { LLMService } from '../services/llm.service.js';
import { ConversationService, PendingDraft, WaitingField } from '../services/conversation.service.js';
import { Category } from '../types/index.js';

export interface ExtractedAmountInfo {
  amount: number;
  startIndex: number;
  endIndex: number;
  matchedRaw: string;
}

export interface QuickParsedResult {
  amount: number;
  category_name: string;
  transaction_type: 'INCOME' | 'EXPENSE';
  item_name?: string;
  note?: string;
  description: string;
}

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
    const rawText = (msg.text || msg.caption || '').trim();

    // Tự động loại bỏ @mention tên Bot khi nhắn trong nhóm chat
    // Ví dụ: "@Bot Thu Chi Shop Hoa Xinh Tủ hoa 299k" -> "Tủ hoa 299k"
    // "@bot.YhvSQgmd #baocao" -> "#baocao"
    let userText = rawText
      .replace(/^@Bot\s*Thu\s*Chi\s*Shop\s*Hoa\s*Xinh\s*[:,-]?\s*/i, '')
      .replace(/^@bot\.YhvSQgmd\s*[:,-]?\s*/i, '')
      .replace(/^@Bot[^\s:]*(\s+[^\s:]+){0,5}?\s*[:,-]?\s*/i, '')
      .replace(/^@[^\s]+\s*[:,-]?\s*/i, '')
      .trim();

    // Nếu sau khi xóa tag mà rỗng (người dùng chỉ tag bot để chào hoặc test)
    if (!userText && rawText.startsWith('@')) {
      userText = '#help';
    }

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

    // Xác định chat riêng hay chat nhóm
    const anyChat = msg.chat as any;
    const isGroup = anyChat?.chat_type === '2' || anyChat?.chat_type === 2 || String(chatId) !== String(senderId);

    // Nếu là nhóm chat: sử dụng ID nhóm làm sổ thu chi chung (Group Shared Ledger) cho cả shop
    // Nếu là chat riêng 1-1: sử dụng ID cá nhân người gửi
    const targetZaloId = isGroup ? `group_${chatId}` : senderId;
    const targetName = isGroup ? (anyChat?.title || anyChat?.name || `Nhóm Shop (${chatId})`) : senderName;

    console.log(`\n🤖 [Zalo Bot: ${result.event_name}] Từ: ${senderName} (${senderId}) - Chat: ${chatId} (${isGroup ? 'NHÓM CHUNG' : 'CHAT RIÊNG'})${photoUrl ? ' [KÈM ẢNH]' : ''}`);

    // Lấy hoặc tạo tài khoản sổ trong Supabase
    const user = await DatabaseService.getOrCreateUser(targetZaloId, targetName);

    if (userText) {
      ConversationService.addTurn(user.id, 'user', userText);
    }

    if (userText && !photoUrl) {
      userRecentTexts.set(user.id, { text: userText, timestamp: Date.now() });
    }

    // =========================================================================
    // TẦNG 1: LỆNH TẮT CỐ ĐỊNH & BÁO CÁO THỐNG KÊ (0 TOKEN LLM, PHẢN HỒI TỨC THÌ)
    // =========================================================================
    const lowerText = userText.toLowerCase().trim();

    const isReportCommand =
      lowerText === '#baocao' ||
      lowerText === '/baocao' ||
      lowerText === '#baocaothu' ||
      lowerText === '/baocaothu' ||
      lowerText === '#baocaochi' ||
      lowerText === '/baocaochi' ||
      lowerText === '#baocao thangnay' ||
      lowerText === '/baocao thangnay' ||
      lowerText === '#baocaothu thangnay' ||
      lowerText === '/baocaothu thangnay' ||
      lowerText === '#baocaochi thangnay' ||
      lowerText === '/baocaochi thangnay' ||
      lowerText === '#homnay' ||
      lowerText === '/homnay' ||
      lowerText === '#thangnay' ||
      lowerText === '/thangnay' ||
      lowerText === 'báo cáo' ||
      lowerText === 'baocao' ||
      lowerText === 'báo cáo hôm nay' ||
      lowerText === 'báo cáo tháng này' ||
      lowerText === 'báo cáo thu' ||
      lowerText === 'báo cáo chi' ||
      lowerText === 'thống kê hôm nay' ||
      lowerText === 'thống kê tháng này' ||
      lowerText === 'thống kê' ||
      lowerText === 'tổng kết';

    if (isReportCommand) {
      console.log(`⚡ [Zalo Bot - Tier 1] Báo cáo: "${lowerText}" cho user: ${user.id}`);
      const isMonthly =
        lowerText.includes('thang') ||
        lowerText.includes('tháng') ||
        lowerText === '#thangnay' ||
        lowerText === '/thangnay';

      let filterType: 'ALL' | 'INCOME' | 'EXPENSE' = 'ALL';
      if (lowerText.includes('thu') || lowerText.includes('doanh thu') || lowerText.includes('bán')) {
        filterType = 'INCOME';
      } else if (lowerText.includes('chi') || lowerText.includes('chi phí') || lowerText.includes('phi')) {
        filterType = 'EXPENSE';
      }

      const report = isMonthly
        ? await DatabaseService.getMonthlyExpenseReport(user.id)
        : await DatabaseService.getDailyExpenseReport(user.id);

      const reportText = ZaloBotService.buildReportText(report, filterType);
      await ZaloBotService.sendMessage(chatId, reportText);
      return;
    }

    // Lệnh xem danh sách danh mục thu chi của shop
    const isCategoryCommand =
      lowerText === '#danhmuc' ||
      lowerText === '/danhmuc' ||
      lowerText === '#danhmucthu' ||
      lowerText === '/danhmucthu' ||
      lowerText === '#danhmucchi' ||
      lowerText === '/danhmucchi' ||
      lowerText === 'danh mục' ||
      lowerText === 'danh muc' ||
      lowerText === 'xem danh mục' ||
      lowerText === 'xem danh muc' ||
      lowerText === 'các mặt hàng' ||
      lowerText === 'cac mat hang';

    if (isCategoryCommand) {
      console.log(`📋 [Zalo Bot - Tier 1] Yêu cầu xem danh mục cho user: ${user.id}`);
      const categories = await DatabaseService.getCategories();
      const categoriesMsg = ZaloBotService.buildCategoriesListText(categories);
      await ZaloBotService.sendMessage(chatId, categoriesMsg);
      return;
    }

    if (
      lowerText === '#help' ||
      lowerText === '/help' ||
      lowerText === '#start' ||
      lowerText === '/start' ||
      lowerText === '#trogiup' ||
      lowerText === '/trogiup' ||
      lowerText === 'trợ giúp'
    ) {
      const categories = await DatabaseService.getCategories();
      const incomeList = categories.filter((c) => c.type === 'INCOME').map((c) => c.name).join(' | ');
      const expenseList = categories.filter((c) => c.type === 'EXPENSE').map((c) => c.name).join(' | ');

      const helpText =
        `👋 **CHÀO BẠN! BOT QUẢN LÝ THU & CHI SHOP**\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `🌸 **Mặt hàng bán (THU):**\n` +
        `${incomeList || 'Chưa có'}\n\n` +
        `💸 **Khoản chi phí (CHI):**\n` +
        `${expenseList || 'Chưa có'}\n\n` +
        `⚡ **Ghi chép nhanh (< 0.1s):**\n` +
        `• Bán hàng: "Tủ hoa 299k", "/móc khóa 50k", "+115k thư hoa"\n` +
        `• Chi phí: "Nguyên vật liệu 500k", "/ship bưu cục 30k", "-200k tiền điện"\n` +
        `• Ghi lùi ngày: "Hôm qua tủ hoa 299k", "Ngày 02/09 thư hoa 115k"\n` +
        `• Gửi ảnh: Chụp hoặc gửi ảnh biên lai/chuyển khoản\n\n` +
        `📊 **Lệnh tra cứu & Báo cáo (Dùng / hoặc #):**\n` +
        `• **/baocao** (hoặc **#baocao**): Xem tổng hợp hôm nay\n` +
        `• **/baocaothu** : Xem riêng doanh thu bán hàng\n` +
        `• **/baocaochi** : Xem riêng các khoản chi phí\n` +
        `• **/danhmuc** : Xem danh mục cài đặt của Shop\n` +
        `• **/xoa** : Xóa đơn hoặc khoản chi vừa ghi gần nhất\n` +
        `• Thêm **thangnay** để xem theo tháng (VD: **/baocao thangnay**)\n\n` +
        `🌐 **Quản lý danh mục (Thêm/Sửa/Xóa):** https://zalo-expense-bot.onrender.com/admin`;
      await ZaloBotService.sendMessage(chatId, helpText);
      return;
    }

    if (
      lowerText === 'hủy' ||
      lowerText === 'hủy bỏ' ||
      lowerText === '#huy' ||
      lowerText === '/huy' ||
      lowerText === '/cancel'
    ) {
      await DatabaseService.clearPendingClarification(user.id);
      await ZaloBotService.sendMessage(chatId, '👌 Đã hủy thao tác ghi nhận.');
      return;
    }

    // =========================================================================
    // TẦNG 0.5: XỬ LÝ XOÁ VÀ SỬA GIAO DỊCH (SMART DELETE & EDIT ENGINE)
    // =========================================================================
    const normalizedText = lowerText.replace(/[.,!?]/g, '').trim();

    // Nhận diện mọi ý định XÓA / HỦY (bao gồm cả xóa theo số tiền, theo mặt hàng, hoặc xóa gần nhất)
    const isDeleteIntent =
      normalizedText.startsWith('xóa') ||
      normalizedText.startsWith('xoá') ||
      normalizedText.startsWith('xoa') ||
      normalizedText.startsWith('hủy') ||
      normalizedText.startsWith('huỷ') ||
      normalizedText.startsWith('huy') ||
      normalizedText.startsWith('bỏ') ||
      normalizedText.startsWith('bo') ||
      normalizedText.startsWith('#xoa') ||
      normalizedText.startsWith('/xoa') ||
      normalizedText.startsWith('#huy') ||
      normalizedText.startsWith('/huy') ||
      normalizedText.startsWith('/delete') ||
      /\b(?:xóa|xoá|xoa|hủy|huỷ|huy)\s+(?:khoản|đơn|giao dịch|mục|tiền|chi|thu|\d+)/i.test(lowerText) ||
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

    if (isDeleteIntent) {
      console.log(`🗑️ [Zalo Bot - Smart Delete] Yêu cầu xóa từ user: ${user.id} - Text: "${userText}"`);
      userRecentTexts.delete(user.id);
      inFlightImageTasks.delete(user.id);
      await DatabaseService.clearPendingClarification(user.id);

      // 1. Trích xuất các tiêu chí xóa nếu có: số tiền, loại thu/chi, ngày, từ khóa
      const targetAmount = ZaloBotHandler.extractAmount(lowerText);
      const customDate = ZaloBotHandler.extractTransactionDate(userText);

      let targetType: 'INCOME' | 'EXPENSE' | null = null;
      if (
        lowerText.includes('khoản chi') ||
        lowerText.includes('khoan chi') ||
        lowerText.includes('chi') ||
        lowerText.includes('mua')
      ) {
        targetType = 'EXPENSE';
      } else if (
        lowerText.includes('khoản thu') ||
        lowerText.includes('khoan thu') ||
        lowerText.includes('thu') ||
        lowerText.includes('bán') ||
        lowerText.includes('ban') ||
        lowerText.includes('đơn') ||
        lowerText.includes('don')
      ) {
        targetType = 'INCOME';
      }

      // Trích xuất từ khóa tìm kiếm (loại trừ các từ chỉ lệnh xóa)
      let targetKeyword = lowerText
        .replace(/\b(?:xóa|xoá|xoa|hủy|huỷ|huy|bỏ|bo|đơn|don|khoản|khoan|giao dịch|giao dich|chi|thu|tiền|tien|đi|di|hộ|ho|giúp|giup|giùm|gium|vừa rồi|vua roi|gần nhất|gan nhat)\b/gi, '')
        .replace(/\b(?:\d+(?:[.,]\d+)?)\s*(?:tr|triệu|k|nghìn|ngàn|đ|vnd|dong)\b/gi, '')
        .replace(/\b\d{1,3}(?:[.,]\d{3})+\b/g, '')
        .replace(/\b\d{4,9}\b/g, '')
        .trim();

      let deleted: any = null;

      // Nếu có số tiền hoặc loại/từ khóa/ngày cụ thể -> Tìm và xóa theo tiêu chí
      if (targetAmount || customDate || (targetKeyword && targetKeyword.length >= 2)) {
        deleted = await DatabaseService.deleteTransactionByCriteria(user.id, {
          amount: targetAmount,
          type: targetType,
          keyword: targetKeyword && targetKeyword.length >= 2 ? targetKeyword : null,
          date: customDate ? customDate.dateIso : null,
        });

        if (!deleted && targetType) {
          // Thử lại không ép loại nếu chưa tìm thấy
          deleted = await DatabaseService.deleteTransactionByCriteria(user.id, {
            amount: targetAmount,
            type: null,
            keyword: targetKeyword && targetKeyword.length >= 2 ? targetKeyword : null,
            date: customDate ? customDate.dateIso : null,
          });
        }
      } else {
        // Mặc định: xóa giao dịch gần nhất
        deleted = await DatabaseService.deleteLatestTransaction(user.id);
      }

      if (deleted) {
        const catName = deleted.category?.name || 'Khác';
        const catIcon = deleted.category?.icon || '📦';
        const amountStr = ZaloBotService.formatCurrency(deleted.amount);
        const typeStr = deleted.transaction_type === 'INCOME' ? 'Thu nhập / Bán hàng' : 'Khoản chi';
        const txDateDisplay = new Date(deleted.transaction_date).toLocaleDateString('vi-VN');

        await ZaloBotService.sendMessage(
          chatId,
          `🗑️ **ĐÃ XÓA GIAO DỊCH THÀNH CÔNG!**\n\n` +
          `• **Loại:** ${typeStr}\n` +
          `• **Mặt hàng / Mục chi:** ${catIcon} **${catName}**\n` +
          `• **Số tiền:** **${amountStr}**\n` +
          (isGroup ? `• **Thao tác bởi:** ${senderName}\n` : '') +
          (deleted.description ? `• **Nội dung:** ${deleted.description}\n` : '') +
          `• **Ngày ghi nhận:** ${txDateDisplay}\n` +
          `\n━━━━━━━━━━━━━━━━━━\n` +
          `💡 _Giao dịch đã được xóa hoàn toàn khỏi hệ thống. Gõ **#baocao** để kiểm tra lại._`
        );
      } else {
        const amountHint = targetAmount ? ` có số tiền **${ZaloBotService.formatCurrency(targetAmount)}**` : '';
        const typeHint = targetType === 'EXPENSE' ? 'khoản chi' : (targetType === 'INCOME' ? 'khoản thu' : 'giao dịch');
        await ZaloBotService.sendMessage(
          chatId,
          `⚠️ Không tìm thấy ${typeHint} nào${amountHint} phù hợp để xóa.\n` +
          `👉 Bạn có thể gõ **xóa** để xóa giao dịch vừa ghi gần nhất, hoặc gõ **#baocao** để kiểm tra lại sổ thu chi nhé!`
        );
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
            (isGroup ? `👤 **Thao tác bởi:** ${senderName}\n` : '') +
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
    // TẦNG 1.4: XỬ LÝ HỘI THOẠI ĐA LƯỢT (MULTI-TURN CONVERSATION RESOLUTION)
    // Nếu có một phiên làm rõ / nháp giao dịch đang chờ bổ sung thông tin từ các lần chat trước
    // =========================================================================
    const pendingDraftInfo = ConversationService.getPendingDraft(user.id);
    if (pendingDraftInfo && userText && !photoUrl) {
      const { draft, waitingFor, attempts } = pendingDraftInfo;
      console.log(`🔄 [Multi-turn Context] User ${user.id} đang chờ: "${waitingFor}" (Lần ${attempts}) - Text: "${userText}"`);

      // 1. Kiểm tra lệnh hủy
      if (
        lowerText === 'hủy' ||
        lowerText === 'thôi' ||
        lowerText === 'bỏ qua' ||
        lowerText === 'cancel' ||
        lowerText === '#huy' ||
        lowerText === '/huy'
      ) {
        await ConversationService.clearPendingDraft(user.id);
        await ZaloBotService.sendMessage(chatId, '👌 Đã hủy thao tác ghi nhận.');
        return;
      }

      // 2. Kiểm tra nếu người dùng gửi một giao dịch hoàn chỉnh mới -> Hủy nháp cũ, ưu tiên cái mới
      const categories = await DatabaseService.getCategories();
      const freshQuick = ZaloBotHandler.parseQuickInput(userText, categories);
      if (freshQuick) {
        await ConversationService.clearPendingDraft(user.id);
        // Luồng tiếp tục chạy xuống Tier 1.5 bên dưới
      } else {
        // Đang giải quyết trường còn thiếu theo ngữ cảnh
        if (waitingFor === 'amount') {
          // Kiểm tra lỗi typo số tiền
          const typoCheck = ZaloBotHandler.detectTypo(userText);
          if (typoCheck) {
            await ZaloBotService.sendMessage(chatId, typoCheck.question);
            return;
          }

          const resolvedAmount = ZaloBotHandler.extractAmount(userText);
          if (resolvedAmount && resolvedAmount > 0) {
            const customDate = ZaloBotHandler.extractTransactionDate(userText);
            const finalTxDate = customDate?.dateIso || draft.transaction_date || new Date().toISOString();

            // Nếu người dùng nhắn thêm ghi chú kèm số tiền (ví dụ: "115k khách chuyển khoản")
            const amountRange = ZaloBotHandler.extractAmountWithRange(userText);
            let extraNote = '';
            if (amountRange) {
              const remainder = (userText.slice(0, amountRange.startIndex) + ' ' + userText.slice(amountRange.endIndex)).trim();
              extraNote = remainder.replace(/^[+\-\/#\s:,]+/, '').trim();
            }

            let finalDesc = draft.description || draft.note || draft.item_name || 'Ghi chép';
            if (extraNote) {
              finalDesc = finalDesc !== 'Ghi chép' ? `${finalDesc} - ${extraNote}` : extraNote;
            }

            let catId = draft.category_id;
            if (!catId && draft.category_name) {
              const matchedCat = await DatabaseService.matchCategoryByName(draft.category_name, draft.transaction_type);
              catId = matchedCat?.id;
            }

            const tx = await DatabaseService.createTransaction({
              user_id: user.id,
              amount: resolvedAmount,
              category_id: catId,
              transaction_type: draft.transaction_type || 'INCOME',
              description: finalDesc,
              raw_input: `${draft.raw_input || ''} -> ${userText}`,
              image_url: draft.image_url,
              transaction_date: finalTxDate,
            });

            await ConversationService.clearPendingDraft(user.id);
            const successMsg = ZaloBotService.buildSuccessText(tx, draft.category_name || undefined, isGroup ? senderName : undefined);
            await ZaloBotService.sendMessage(chatId, successMsg);
            return;
          } else {
            if (attempts < 3) {
              await ZaloBotService.sendMessage(
                chatId,
                `🤔 Bot vẫn chưa nhận diện được số tiền cho **${draft.category_name || draft.item_name || 'đơn này'}**.\n` +
                `👉 Bạn vui lòng nhắn lại số tiền (ví dụ: **115k**, **115.000**), hoặc gõ **"hủy"** để hủy bỏ nhé!`
              );
              return;
            } else {
              await ConversationService.clearPendingDraft(user.id);
              await ZaloBotService.sendMessage(chatId, `⚠️ Đã hủy phiên chờ do không nhận được số tiền. Bạn vui lòng nhắn lại từ đầu theo cú pháp: \`+ [mặt hàng] [số tiền]\` nhé!`);
              return;
            }
          }
        } else if (waitingFor === 'category_or_reason') {
          const matchedCat = await DatabaseService.matchCategoryByName(userText, draft.transaction_type);
          const finalCat = matchedCat || categories.find((c) => c.type === draft.transaction_type) || categories[0];

          let note = userText.trim();
          if (matchedCat && matchedCat.name !== 'Khác') {
            const strippedNote = note.replace(new RegExp(matchedCat.name, 'i'), '').trim();
            if (strippedNote) note = strippedNote;
          }

          const tx = await DatabaseService.createTransaction({
            user_id: user.id,
            amount: draft.amount!,
            category_id: finalCat?.id,
            transaction_type: draft.transaction_type || 'INCOME',
            description: note || finalCat?.name || 'Ghi chép',
            raw_input: `${draft.raw_input || ''} -> ${userText}`,
            image_url: draft.image_url,
            transaction_date: draft.transaction_date || new Date().toISOString(),
          });

          await ConversationService.clearPendingDraft(user.id);
          const successMsg = ZaloBotService.buildSuccessText(tx, finalCat?.name, isGroup ? senderName : undefined);
          await ZaloBotService.sendMessage(chatId, successMsg);
          return;
        } else if (waitingFor === 'type') {
          let resolvedType: 'INCOME' | 'EXPENSE' | null = null;
          if (lowerText.includes('+') || lowerText.includes('thu') || lowerText.includes('bán')) {
            resolvedType = 'INCOME';
          } else if (lowerText.includes('-') || lowerText.includes('chi') || lowerText.includes('mua') || lowerText.includes('tiêu')) {
            resolvedType = 'EXPENSE';
          }

          if (resolvedType) {
            const matchedCat = draft.category_name
              ? await DatabaseService.matchCategoryByName(draft.category_name, resolvedType)
              : categories.find((c) => c.type === resolvedType);

            const tx = await DatabaseService.createTransaction({
              user_id: user.id,
              amount: draft.amount!,
              category_id: matchedCat?.id,
              transaction_type: resolvedType,
              description: draft.description || draft.note || matchedCat?.name || 'Ghi chép',
              raw_input: `${draft.raw_input || ''} -> ${userText}`,
              image_url: draft.image_url,
              transaction_date: draft.transaction_date || new Date().toISOString(),
            });

            await ConversationService.clearPendingDraft(user.id);
            const successMsg = ZaloBotService.buildSuccessText(tx, matchedCat?.name, isGroup ? senderName : undefined);
            await ZaloBotService.sendMessage(chatId, successMsg);
            return;
          }
        }
      }
    }

    // Kiểm tra xem tin nhắn có phải rõ ràng là câu hỏi / yêu cầu báo cáo / tra cứu hay không
    const isExplicitQuery =
      lowerText.includes('báo cáo') ||
      lowerText.includes('cho tôi') ||
      lowerText.includes('cho mình') ||
      lowerText.includes('thống kê') ||
      lowerText.includes('tổng kết') ||
      lowerText.includes('bao nhiêu') ||
      lowerText.includes('lịch sử') ||
      lowerText.includes('xem') ||
      lowerText.includes('kiểm tra') ||
      lowerText.includes('tra cứu') ||
      lowerText.includes('những đơn') ||
      lowerText.includes('đơn nào') ||
      lowerText.endsWith('?');

    // =========================================================================
    // TẦNG 1.5: BỘ PHÂN TÍCH NHANH SIÊU TỐC (0 TOKEN LLM, PHẢN HỒI < 10MS)
    // Xử lý tức thì các giao dịch hôm nay lẫn quá khứ (hôm qua, hôm kia, ngày 05/09)
    // =========================================================================
    if (!photoUrl && userText && !isExplicitQuery) {
      // Nếu user đang có một ảnh đang được tải/phân tích trong vòng 25s, tạm hoãn xử lý độc lập
      // để chờ ảnh đọc xong và tự động liên kết thành một giao dịch hoàn chỉnh
      const inFlight = inFlightImageTasks.get(user.id);
      if (inFlight && Date.now() - inFlight.timestamp < 25000) {
        console.log(`⏳ User ${user.id} vừa gửi ảnh và đang chat bổ sung: "${userText}". Sẽ tự động liên kết khi ảnh đọc xong!`);
        return;
      }

      const categories = await DatabaseService.getCategories();
      const quickParsed = ZaloBotHandler.parseQuickInput(userText, categories);
      if (quickParsed) {
        const customDate = ZaloBotHandler.extractTransactionDate(userText);
        const txDate = customDate ? customDate.dateIso : new Date().toISOString();
        console.log(`⚡ [Zalo Bot - Tier 1.5: Fast Local Parser] Khớp nhanh: ${quickParsed.category_name} - ${quickParsed.amount}đ (${quickParsed.transaction_type}) - Ngày: ${customDate ? customDate.dateDisplay : 'Hôm nay'}`);

        const matchedCategory = await DatabaseService.matchCategoryByName(quickParsed.category_name);
        const tx = await DatabaseService.createTransaction({
          user_id: user.id,
          amount: quickParsed.amount,
          category_id: matchedCategory?.id,
          transaction_type: quickParsed.transaction_type,
          description: quickParsed.description || matchedCategory?.name,
          raw_input: userText,
          transaction_date: txDate,
        });

        await DatabaseService.clearPendingClarification(user.id);
        await ConversationService.clearPendingDraft(user.id);
        const successMsg = ZaloBotService.buildSuccessText(tx, matchedCategory?.name, isGroup ? senderName : undefined);
        await ZaloBotService.sendMessage(chatId, successMsg);
        return;
      }

      // Nếu không khớp giao dịch hoàn chỉnh, kiểm tra xem có phải là thông tin thiếu hoặc typo không
      const incompleteCheck = ZaloBotHandler.detectTypoOrIncomplete(userText, categories);
      if (incompleteCheck) {
        console.log(`⚠️ [Zalo Bot - Incomplete/Typo] Phát hiện: ${incompleteCheck.type} - Hỏi lại user ${user.id}`);
        await ConversationService.setPendingDraft(
          user.id,
          incompleteCheck.draft,
          incompleteCheck.waitingFor,
          incompleteCheck.question,
          chatId
        );
        await ZaloBotService.sendMessage(chatId, incompleteCheck.question);
        return;
      }
    }

    // =========================================================================
    // TẦNG 1.2: BỘ MÁY TRUY VẤN & BÁO CÁO TỰ NHIÊN BẰNG AI (NL2QUERY ENGINE)
    // =========================================================================
    const isNaturalQueryCandidate =
      isExplicitQuery ||
      lowerText.includes('hôm qua') ||
      lowerText.includes('tuần trước') ||
      lowerText.includes('tháng trước') ||
      lowerText.includes('tháng này') ||
      lowerText.includes('tổng thu') ||
      lowerText.includes('tổng chi') ||
      lowerText.includes('doanh thu') ||
      lowerText.includes('chi phí') ||
      /tháng\s*\d+/i.test(lowerText);

    if (isNaturalQueryCandidate && !photoUrl) {
      console.log(`🔍 [Zalo Bot] Phát hiện câu hỏi/yêu cầu báo cáo: "${userText}". Bắt đầu phân tích qua AI...`);
      const vnDate = new Date();
      const vnNowStr = vnDate.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
      const vnNowIso = vnDate.toISOString();

      const parsedQuery = await LLMService.parseNaturalLanguageQuery(userText, {
        nowIso: vnNowIso,
        nowText: vnNowStr,
      });

      if (parsedQuery && parsedQuery.is_query) {
        console.log(`🤖 [Zalo Bot - NL2Query] Kết quả phân tích:`, JSON.stringify(parsedQuery, null, 2));

        const customQueryResult = await DatabaseService.queryTransactionsCustom(user.id, {
          startDate: parsedQuery.start_date || undefined,
          endDate: parsedQuery.end_date || undefined,
          type: parsedQuery.type_filter || 'ALL',
          categoryName: parsedQuery.category_filter || undefined,
        });

        // Nếu là yêu cầu xem báo cáo tổng thể hoặc theo mốc thời gian -> dùng format báo cáo chuẩn đẹp
        const isGeneralReportReq =
          lowerText.includes('báo cáo') ||
          lowerText.includes('tổng kết') ||
          lowerText.includes('thống kê') ||
          !parsedQuery.specific_question;

        if (isGeneralReportReq && !parsedQuery.category_filter) {
          const report = customQueryResult.report;
          if (parsedQuery.period_title) {
            report.periodTitle = parsedQuery.period_title;
          }
          const reportText = ZaloBotService.buildReportText(report, parsedQuery.type_filter || 'ALL');
          await ZaloBotService.sendMessage(chatId, reportText);
          return;
        }

        // Nếu là câu hỏi cụ thể (ví dụ: "tháng này bán được bao nhiêu tiền tủ hoa?") -> AI sinh câu trả lời trực tiếp
        const aiAnswer = await LLMService.generateQueryAnswer(userText, {
          periodTitle: parsedQuery.period_title || customQueryResult.report.periodTitle,
          totalIncome: customQueryResult.report.totalIncome,
          totalExpense: customQueryResult.report.totalExpense,
          netAmount: customQueryResult.report.netAmount,
          incomeCount: customQueryResult.report.incomeCount,
          expenseCount: customQueryResult.report.expenseCount,
          items: customQueryResult.report.items,
          transactions: customQueryResult.transactions,
        });

        if (aiAnswer) {
          await ZaloBotService.sendMessage(chatId, aiAnswer);
          return;
        }

        // Fallback sang buildReportText nếu AI answer rỗng
        const report = customQueryResult.report;
        if (parsedQuery.period_title) {
          report.periodTitle = parsedQuery.period_title;
        }
        const reportText = ZaloBotService.buildReportText(report, parsedQuery.type_filter || 'ALL');
        await ZaloBotService.sendMessage(chatId, reportText);
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
        const preferredType = pending.partial_transaction.transaction_type;
        const matchedCat = await DatabaseService.matchCategoryByName(userText, preferredType);
        if (matchedCat) {
          const customDate = ZaloBotHandler.extractTransactionDate(userText);
          const finalDate = customDate?.dateIso || pending.partial_transaction.transaction_date || new Date().toISOString();
          const tx = await DatabaseService.createTransaction({
            user_id: user.id,
            amount: pending.partial_transaction.amount || 0,
            category_id: matchedCat.id,
            transaction_type: matchedCat.type || pending.partial_transaction.transaction_type || 'INCOME',
            description: pending.partial_transaction.description || userText || matchedCat.name,
            raw_input: `${pending.partial_transaction.raw_input || ''} + ${userText}`,
            image_url: pending.partial_transaction.image_url,
            transaction_date: finalDate,
          });

          await DatabaseService.clearPendingClarification(user.id);
          const successMsg = ZaloBotService.buildSuccessText(tx, matchedCat.name, isGroup ? senderName : undefined);
          await ZaloBotService.sendMessage(chatId, successMsg);
          return;
        }
      }

      // Trường hợp 2: Đang thiếu số tiền / amount (Người dùng nhắn tên mặt hàng/khoản chi trước đó)
      if (pending.missing_field === 'amount') {
        const amount = ZaloBotHandler.extractAmount(lowerText);

        if (amount && amount > 0) {
          const categories = await DatabaseService.getCategories();
          const cat = categories.find((c) => c.id === (pending.partial_transaction as any).category_id) || categories[0];
          const customDate = ZaloBotHandler.extractTransactionDate(userText);
          const finalDate = customDate?.dateIso || pending.partial_transaction.transaction_date || new Date().toISOString();

          const tx = await DatabaseService.createTransaction({
            user_id: user.id,
            amount,
            category_id: cat?.id,
            transaction_type: pending.partial_transaction.transaction_type || cat?.type || 'INCOME',
            description: pending.partial_transaction.description || userText,
            raw_input: `${pending.partial_transaction.raw_input || ''} + ${userText}`,
            image_url: pending.partial_transaction.image_url,
            transaction_date: finalDate,
          });

          await DatabaseService.clearPendingClarification(user.id);
          const successMsg = ZaloBotService.buildSuccessText(tx, cat?.name, isGroup ? senderName : undefined);
          await ZaloBotService.sendMessage(chatId, successMsg);
          return;
        }
      }
    }

    // =========================================================================
    // TẦNG 2.5: LIÊN KẾT BỔ SUNG (KHI NGƯỜI DÙNG CHỈ NHẮN TÊN DANH MỤC KHÔNG CÓ TIỀN)
    // =========================================================================
    if (!photoUrl && userText) {
      const extractedAmt = ZaloBotHandler.extractAmount(userText);
      if (!extractedAmt) {
        const matchedCat = await DatabaseService.matchCategoryByName(userText);
        if (matchedCat && matchedCat.name !== 'Khác') {
          const catType = matchedCat.type || 'INCOME';
          const typeLabel = catType === 'INCOME' ? 'mặt hàng' : 'khoản chi';
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
                `✅ **ĐÃ LIÊN KẾT BỔ SUNG ${typeLabel.toUpperCase()}!**\n\n` +
                `🏷️ **${catType === 'INCOME' ? 'Mặt hàng' : 'Mục chi'}:** ${matchedCat.icon} **${matchedCat.name}**\n` +
                `💵 **Số tiền:** **${ZaloBotService.formatCurrency(updated.amount)}**\n` +
                `📝 **Nội dung:** ${userText}\n\n` +
                `━━━━━━━━━━━━━━━━━━\n` +
                `💡 _Gõ **#baocao** để xem lại tổng kết._`
              );
              return;
            }
          } else {
            const customDate = ZaloBotHandler.extractTransactionDate(userText);
            const dateDisplay = customDate ? ` (ngày ${customDate.dateDisplay})` : '';

            // Người dùng chỉ gõ tên danh mục mà chưa có số tiền và chưa có giao dịch ảnh trước đó
            await DatabaseService.savePendingClarification(
              user.id,
              {
                category_id: matchedCat.id,
                category_name: matchedCat.name,
                transaction_type: catType,
                description: userText,
                raw_input: userText,
                transaction_date: customDate?.dateIso || new Date().toISOString(),
              },
              'amount',
              15
            );

            await ZaloBotService.sendMessage(
              chatId,
              `${matchedCat.icon} Đã nhận ${typeLabel}: **${matchedCat.name}**${dateDisplay}!\n` +
              `👉 Bạn cho mình xin số tiền nhé (ví dụ: **115k**, **299k**, **35k**):`
            );
            return;
          }
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
        const clarText = ZaloBotService.buildClarificationText(
          question,
          missingField,
          categories,
          extraction.transaction.type || 'INCOME'
        );
        await ZaloBotService.sendMessage(chatId, clarText);
        return;
      }

      if (extraction.status === 'SUCCESS' && extraction.transaction.amount) {
        const matchedCategory = await DatabaseService.matchCategoryByName(
          extraction.transaction.category_name || 'Khác',
          extraction.transaction.type
        );

        const customDate = userText ? ZaloBotHandler.extractTransactionDate(userText) : null;
        const finalTxDate = customDate?.dateIso || extraction.transaction.transaction_date || new Date().toISOString();

        const tx = await DatabaseService.createTransaction({
          user_id: user.id,
          amount: extraction.transaction.amount,
          category_id: matchedCategory?.id,
          transaction_type: extraction.transaction.type || matchedCategory?.type || 'EXPENSE',
          description: extraction.transaction.description || userText || matchedCategory?.name,
          raw_input: userText || '[Ảnh hóa đơn/chuyển khoản]',
          image_url: photoUrl,
          transaction_date: finalTxDate,
        });

        console.log(`✅ [Zalo Bot] Đã lưu giao dịch ${tx.id} (${tx.amount}đ) và gửi phản hồi thành công!`);
        const successMsg = ZaloBotService.buildSuccessText(tx, matchedCategory?.name, isGroup ? senderName : undefined);
        await ZaloBotService.sendMessage(chatId, successMsg);
      }
    } finally {
      if (photoUrl) {
        inFlightImageTasks.delete(user.id);
      }
    }
  }

  /**
   * Che các định dạng ngày tháng năm bằng khoảng trắng có cùng độ dài để bảo toàn chỉ số index
   */
  public static maskDatesPreservingLength(text: string): string {
    return text
      .replace(/\b(?:\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)\b/g, (m) => ' '.repeat(m.length))
      .replace(/\b(?:ngày\s+)?\d{1,2}\s+(?:tháng|thg)\s+\d{1,2}(?:\s+(?:năm\s+)?\d{4})?\b/gi, (m) => ' '.repeat(m.length))
      .replace(/\b(?:tháng|thang)\s*\d{1,2}(?:\/\d{2,4})?\b/gi, (m) => ' '.repeat(m.length))
      .replace(/\b(?:năm|nam)\s*\d{4}\b/gi, (m) => ' '.repeat(m.length))
      .replace(/\/\d{4}\b/g, (m) => ' '.repeat(m.length));
  }

  /**
   * Trích xuất số tiền linh hoạt kèm vị trí bắt đầu và kết thúc (startIndex, endIndex)
   */
  public static extractAmountWithRange(text: string): ExtractedAmountInfo | null {
    if (!text) return null;

    const masked = this.maskDatesPreservingLength(text);
    const lower = masked.toLowerCase();

    // 1. Dạng triệu phức: 1tr2, 1tr200, 1 triệu 200
    const trComplex = lower.match(/(\d+)\s*(?:tr|triệu)\s*(\d+)/i);
    if (trComplex && trComplex.index !== undefined) {
      const main = parseInt(trComplex[1], 10) * 1000000;
      const subDigits = trComplex[2];
      const sub = parseInt(subDigits.padEnd(6, '0').slice(0, 6), 10);
      const startIndex = trComplex.index;
      const endIndex = startIndex + trComplex[0].length;
      return {
        amount: main + sub,
        startIndex,
        endIndex,
        matchedRaw: text.slice(startIndex, endIndex),
      };
    }

    // 2. Dạng triệu đơn: 1.5tr, 2 triệu, 1.2tr
    const trSimple = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:tr|triệu)\b/i);
    if (trSimple && trSimple.index !== undefined) {
      const val = parseFloat(trSimple[1].replace(',', '.'));
      const startIndex = trSimple.index;
      const endIndex = startIndex + trSimple[0].length;
      return {
        amount: Math.round(val * 1000000),
        startIndex,
        endIndex,
        matchedRaw: text.slice(startIndex, endIndex),
      };
    }

    // 3. Dạng nghìn/k: 50k, 115k, 299 nghìn, 50.5k
    const kMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:k|nghìn|ngàn)\b/i);
    if (kMatch && kMatch.index !== undefined) {
      const val = parseFloat(kMatch[1].replace(',', '.'));
      const startIndex = kMatch.index;
      const endIndex = startIndex + kMatch[0].length;
      return {
        amount: Math.round(val * 1000),
        startIndex,
        endIndex,
        matchedRaw: text.slice(startIndex, endIndex),
      };
    }

    // 4. Dạng số có dấu chấm/phẩy phân cách ngàn: 50.000, 115.000, 1.200.000 hoặc 50,000
    const dottedMatch = lower.match(/\b(\d{1,3}(?:[.,]\d{3})+)(?:\s*(?:đ|vnd|dong))?\b/i);
    if (dottedMatch && dottedMatch.index !== undefined) {
      const rawDigits = dottedMatch[1].replace(/[.,]/g, '');
      const val = parseInt(rawDigits, 10);
      if (val > 0) {
        const startIndex = dottedMatch.index;
        const endIndex = startIndex + dottedMatch[0].length;
        return {
          amount: val,
          startIndex,
          endIndex,
          matchedRaw: text.slice(startIndex, endIndex),
        };
      }
    }

    // 5. Dạng số liền: +50000, 50000, 115000 (loại trừ các số 4 chữ số thuộc về năm 2020-2035)
    const pureNumMatch = lower.match(/(?:^|\D)(\d{4,9})(?:\s*(?:đ|vnd|dong))?(?:\D|$)/i);
    if (pureNumMatch && pureNumMatch.index !== undefined) {
      const rawDigits = pureNumMatch[1];
      const val = parseInt(rawDigits, 10);
      const isYear = val >= 2020 && val <= 2035 && !lower.includes('đ') && !lower.includes('vnd') && !lower.includes('dong');
      if (!isYear && val > 0) {
        const digitsPosInMatch = pureNumMatch[0].indexOf(rawDigits);
        const startIndex = pureNumMatch.index + digitsPosInMatch;
        let endIndex = startIndex + rawDigits.length;
        const afterDigits = text.slice(endIndex);
        const unitSuffixMatch = afterDigits.match(/^\s*(?:đ|vnd|dong)/i);
        if (unitSuffixMatch) {
          endIndex += unitSuffixMatch[0].length;
        }
        return {
          amount: val,
          startIndex,
          endIndex,
          matchedRaw: text.slice(startIndex, endIndex),
        };
      }
    }

    return null;
  }

  /**
   * Trích xuất số tiền linh hoạt và chuẩn xác từ văn bản tiếng Việt
   */
  public static extractAmount(text: string): number | null {
    const info = this.extractAmountWithRange(text);
    return info ? info.amount : null;
  }

  /**
   * Phát hiện các lỗi gõ số tiền bị typo (nhân đôi ký tự k, oo, ký tự lạ dính liền)
   */
  public static detectTypo(text: string): { typoRaw: string; question: string } | null {
    if (!text) return null;
    const lower = text.toLowerCase();

    // 1. Số tiền bị nhân đôi/nhân ba đơn vị: 115kk, 500kkk, 1trr, 1trieuu, 50nghinn
    const doubleUnitMatch = lower.match(/\b(\d+(?:[.,]\d+)?)\s*(k{2,}|oo|k0|trr|triệuu|nghinn|ngann)\b/i);
    if (doubleUnitMatch) {
      return {
        typoRaw: doubleUnitMatch[0],
        question: `⚠️ Số tiền "**${doubleUnitMatch[0]}**" dường như bị lỗi typo (thừa ký tự).\n👉 Bạn vui lòng nhắn lại chính xác **số tiền** nhé (ví dụ: **115k**, **115.000**):`,
      };
    }

    // 2. Kèm ký tự dính liền ngay sau số và k (không có khoảng trắng): 115kj, 115kl, 115kv
    const attachedCharMatch = lower.match(/\b(\d+)(?:k|tr)([a-z]{1,2})(?:$|[^a-zà-ỹ0-9])/i);
    if (attachedCharMatch && !['kg', 'km', 'kw'].includes(attachedCharMatch[2])) {
      const typoSnippet = `${attachedCharMatch[1]}k${attachedCharMatch[2]}`;
      return {
        typoRaw: typoSnippet,
        question: `⚠️ Số tiền "**${typoSnippet}**" dường như bị gõ nhầm ký tự "${attachedCharMatch[2]}".\n👉 Bạn vui lòng nhắn lại **số tiền** nhé (ví dụ: **115k**, **115.000**):`,
      };
    }

    // 3. Dấu chấm lửng dính vào số: 115k.. hoặc 115..
    const dotTypoMatch = lower.match(/\b(\d+)\s*(?:\.{2,}|,{2,})\b/);
    if (dotTypoMatch) {
      return {
        typoRaw: dotTypoMatch[0],
        question: `⚠️ Số tiền "**${dotTypoMatch[0]}**" dường như bị lỗi dấu chấm/phẩy.\n👉 Bạn vui lòng nhắn lại **số tiền** nhé (ví dụ: **115k**, **115.000**):`,
      };
    }

    return null;
  }

  /**
   * Phát hiện thông tin chưa đủ ý hoặc lỗi typo để đặt câu hỏi làm rõ
   */
  public static detectTypoOrIncomplete(
    text: string,
    categories: Category[] = []
  ): {
    type: 'TYPO_AMOUNT' | 'MISSING_AMOUNT' | 'MISSING_CATEGORY_OR_REASON' | 'MISSING_TYPE' | 'UNCLEAR';
    draft: PendingDraft;
    waitingFor: WaitingField;
    question: string;
  } | null {
    if (!text) return null;
    const raw = text.trim();
    const lower = raw.toLowerCase();
    const stripped = removeVietnameseTones(lower);

    // Chặn các câu lệnh hệ thống
    if (
      /\b(?:xoa|huy|sua|doi|thay|chinh|baocao|thongke|kiemtra|lichsu|xem)\b/i.test(stripped) ||
      lower.includes('báo cáo') ||
      lower.includes('thống kê')
    ) {
      return null;
    }

    // 1. Kiểm tra lỗi typo số tiền trước tiên
    const typo = this.detectTypo(raw);
    if (typo) {
      let txType: 'INCOME' | 'EXPENSE' = 'INCOME';
      if (lower.startsWith('-') || /^(?:chi|trả|mua)/i.test(lower)) {
        txType = 'EXPENSE';
      }
      return {
        type: 'TYPO_AMOUNT',
        draft: { transaction_type: txType, raw_input: raw },
        waitingFor: 'amount',
        question: typo.question,
      };
    }

    // 2. Kiểm tra dấu hiệu Thu '+' hoặc Chi '-' nhưng THIẾU SỐ TIỀN
    const isIncome =
      lower.startsWith('+') ||
      /^(?:thu\s+|bán\s+|ban\s+|nhận\s+|đơn\s+|don\s+)/i.test(lower);
    const isExpense =
      lower.startsWith('-') ||
      /^(?:chi\s+|trả\s+|tra\s+|mua\s+|tiền\s+ra\s+|phí\s+|phi\s+)/i.test(lower);

    const amountInfo = this.extractAmountWithRange(raw);

    if ((isIncome || isExpense) && !amountInfo) {
      const txType: 'INCOME' | 'EXPENSE' = isIncome ? 'INCOME' : 'EXPENSE';
      const cleanText = raw
        .replace(/^[+\-\/#\s]+/, '')
        .replace(/^(?:thu|bán|ban|chi|trả|tra|mua|đơn|don)\s+/i, '')
        .trim();

      let matchedCat: Category | null = null;
      for (const cat of categories) {
        if (hasWholePhrase(cleanText.toLowerCase(), cat.name.toLowerCase())) {
          matchedCat = cat;
          break;
        }
      }

      let itemName = cleanText;
      let note = '';
      if (matchedCat) {
        itemName = matchedCat.name;
        const remainder = cleanText.replace(new RegExp(matchedCat.name, 'i'), '').trim();
        note = remainder.replace(/^[\s\-:,]+/, '').trim();
      }

      const label = txType === 'INCOME' ? 'đơn bán' : 'khoản chi';
      const icon = txType === 'INCOME' ? '🌸' : '💸';
      const noteDisplay = note ? ` (${note})` : '';

      const question =
        `${icon} Đã nhận ${label}: **${itemName || 'chưa rõ'}**${noteDisplay}!\n` +
        `👉 Bạn cho mình xin **số tiền** nhé (ví dụ: **115k**, **115.000**):`;

      return {
        type: 'MISSING_AMOUNT',
        draft: {
          transaction_type: txType,
          category_id: matchedCat?.id,
          category_name: matchedCat?.name || itemName,
          item_name: itemName,
          note: note || undefined,
          description: note || itemName,
          raw_input: raw,
        },
        waitingFor: 'amount',
        question,
      };
    }

    // 3. Có dấu '+' hoặc '-' kèm số tiền nhưng KHÔNG CÓ MẶT HÀNG / LÝ DO (ví dụ: "+ 115k" hoặc "- 50k")
    if ((isIncome || isExpense) && amountInfo) {
      const before = raw.slice(0, amountInfo.startIndex).replace(/^[+\-\/#\s]+/, '').trim();
      const after = raw.slice(amountInfo.endIndex).replace(/^[+\-\/#\s:,]+/, '').trim();

      if (!before && !after) {
        const txType: 'INCOME' | 'EXPENSE' = isIncome ? 'INCOME' : 'EXPENSE';
        const formattedAmt = ZaloBotService.formatCurrency(amountInfo.amount);
        const icon = txType === 'INCOME' ? '🌸' : '💸';
        const typeWord = txType === 'INCOME' ? 'Thu' : 'Chi';
        const exampleWord = txType === 'INCOME' ? 'Thư hoa khách hàng Abc, Tủ hoa' : 'Tiền điện, Ruy băng';

        const question =
          `${icon} Đã nhận số tiền: **${formattedAmt}** (${typeWord})!\n` +
          `👉 Bạn cho mình xin **tên mặt hàng** hoặc **lý do/khách hàng** nhé (ví dụ: **${exampleWord}**):`;

        return {
          type: 'MISSING_CATEGORY_OR_REASON',
          draft: {
            transaction_type: txType,
            amount: amountInfo.amount,
            raw_input: raw,
          },
          waitingFor: 'category_or_reason',
          question,
        };
      }
    }

    // 4. Có số tiền và ghi chú nhưng KHÔNG CÓ '+' hoặc '-' và KHÔNG rõ danh mục
    // Ví dụ: "115k khách hàng Abc"
    if (!isIncome && !isExpense && amountInfo) {
      const before = raw.slice(0, amountInfo.startIndex).trim();
      const after = raw.slice(amountInfo.endIndex).trim();
      const note = (before + ' ' + after).replace(/^[+\-\/#\s:,]+/, '').trim();

      let matchedCat: Category | null = null;
      for (const cat of categories) {
        if (hasWholePhrase(note.toLowerCase(), cat.name.toLowerCase())) {
          matchedCat = cat;
          break;
        }
      }

      if (!matchedCat && note.length > 0) {
        const formattedAmt = ZaloBotService.formatCurrency(amountInfo.amount);
        const question =
          `🤔 Khoản **${formattedAmt}** (${note}) là **THU** (bán hàng) hay **CHI** (chi phí) ạ?\n` +
          `👉 Bạn nhắn **+** (Thu) hoặc **-** (Chi) giúp shop nhé!`;

        return {
          type: 'MISSING_TYPE',
          draft: {
            amount: amountInfo.amount,
            note,
            description: note,
            raw_input: raw,
          },
          waitingFor: 'type',
          question,
        };
      }
    }

    return null;
  }

  /**
   * Trích xuất ngày giao dịch trong quá khứ hoặc ngày cụ thể từ tin nhắn (ví dụ: hôm qua, hôm kia, ngày 05/09, 05/09/2026)
   */
  public static extractTransactionDate(text: string): {
    dateIso: string;
    dateDisplay: string;
    matchedText: string;
  } | null {
    if (!text) return null;
    const lower = text.toLowerCase().trim();

    // Lấy ngày hiện tại theo giờ Việt Nam (UTC+7)
    const vnFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const todayVnStr = vnFormatter.format(new Date()); // YYYY-MM-DD
    const [currentYearStr, currentMonthStr, currentDayStr] = todayVnStr.split('-');
    const currentYear = parseInt(currentYearStr, 10);
    const currentMonth = parseInt(currentMonthStr, 10);
    const currentDay = parseInt(currentDayStr, 10);

    const formatIso = (y: number, m: number, d: number) => {
      const yStr = String(y);
      const mStr = String(m).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      return `${yStr}-${mStr}-${dStr}T12:00:00.000+07:00`;
    };

    const formatDisplay = (d: number, m: number, y: number) => {
      return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
    };

    // 1. "hôm kia" / "ngày hôm kia" (-2 ngày)
    if (/\b(?:ngày\s+)?hôm\s*kia\b/i.test(lower) || /\b(?:ngay\s+)?hom\s*kia\b/i.test(lower)) {
      const targetDate = new Date(Date.UTC(currentYear, currentMonth - 1, currentDay - 2));
      const y = targetDate.getUTCFullYear();
      const m = targetDate.getUTCMonth() + 1;
      const d = targetDate.getUTCDate();
      return {
        dateIso: formatIso(y, m, d),
        dateDisplay: formatDisplay(d, m, y),
        matchedText: 'hôm kia',
      };
    }

    // 2. "hôm qua" / "hôm trước" / "ngày hôm qua" (-1 ngày)
    if (
      /\b(?:ngày\s+)?hôm\s*(?:qua|trước|trc)\b/i.test(lower) ||
      /\b(?:ngay\s+)?hom\s*(?:qua|truoc|trc)\b/i.test(lower)
    ) {
      const targetDate = new Date(Date.UTC(currentYear, currentMonth - 1, currentDay - 1));
      const y = targetDate.getUTCFullYear();
      const m = targetDate.getUTCMonth() + 1;
      const d = targetDate.getUTCDate();
      return {
        dateIso: formatIso(y, m, d),
        dateDisplay: formatDisplay(d, m, y),
        matchedText: 'hôm qua',
      };
    }

    // 3. "ngày D tháng M" / "D tháng M"
    const dayMonthTextMatch = lower.match(/\b(?:ngày\s+)?(\d{1,2})\s+(?:tháng|thg)\s+(\d{1,2})(?:\s+(?:năm\s+)?(\d{4}))?\b/i);
    if (dayMonthTextMatch) {
      const d = parseInt(dayMonthTextMatch[1], 10);
      const m = parseInt(dayMonthTextMatch[2], 10);
      let y = dayMonthTextMatch[3] ? parseInt(dayMonthTextMatch[3], 10) : currentYear;
      if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
        return {
          dateIso: formatIso(y, m, d),
          dateDisplay: formatDisplay(d, m, y),
          matchedText: dayMonthTextMatch[0],
        };
      }
    }

    // 4. "ngày DD/MM" / "ngày DD-MM" / "DD/MM/YYYY" / "DD/MM"
    const dateMatch = lower.match(/\b(?:ngày\s+)?(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/i);
    if (dateMatch) {
      const d = parseInt(dateMatch[1], 10);
      const m = parseInt(dateMatch[2], 10);
      let y = currentYear;
      if (dateMatch[3]) {
        const yearParsed = parseInt(dateMatch[3], 10);
        y = yearParsed < 100 ? 2000 + yearParsed : yearParsed;
      }
      if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
        return {
          dateIso: formatIso(y, m, d),
          dateDisplay: formatDisplay(d, m, y),
          matchedText: dateMatch[0],
        };
      }
    }

    return null;
  }

  /**
   * Bộ phân tích nhanh cục bộ (Tier 1.5) - Rule-based Fast Parser (< 10ms, 0 Token LLM)
   * Tuân thủ quy tắc rõ ràng:
   * - THU: Bắt đầu bằng '+' (hoặc 'thu', 'bán', 'đơn'...) -> + [mặt hàng] [số tiền] [lý do/ghi chú]
   * - CHI: Bắt đầu bằng '-' (hoặc 'chi', 'trả', 'mua'...) -> - [khoản chi] [số tiền] [lý do/ghi chú]
   * - Tự nhiên: [mặt hàng] [số tiền] nếu khớp danh mục
   * - Sau số tiền là lý do / ghi chú (ví dụ: "+ thư hoa 115k khách hàng Abc" -> note: "khách hàng Abc")
   * - Chặn tuyệt đối các từ khóa hành động: xóa, hủy, sửa, đổi, tìm, báo cáo...
   */
  public static parseQuickInput(
    text: string,
    categories: Category[] = []
  ): QuickParsedResult | null {
    if (!text) return null;
    const raw = text.trim();
    const lower = raw.toLowerCase();
    const stripped = removeVietnameseTones(lower);

    // 0. CHẶN NGUY CƠ NHẬN NHẦM: Nếu tin nhắn chứa động từ hành vi (xóa, sửa, báo cáo...) -> KHÔNG parse tạo giao dịch!
    if (
      /\b(?:xoa|huy|sua|doi|thay|chinh|baocao|thongke|kiemtra|lichsu|xem)\b/i.test(stripped) ||
      lower.includes('báo cáo') ||
      lower.includes('thống kê') ||
      lower.includes('kiểm tra')
    ) {
      return null;
    }

    // 1. Phân loại Thu / Chi theo quy tắc rõ ràng
    let explicitType: 'INCOME' | 'EXPENSE' | null = null;

    // RULE THU: Bắt đầu bằng '+', hoặc chứa '+ [tiền]', hoặc bắt đầu bằng từ khóa thu/bán/đơn
    const isIncomePrefix =
      lower.startsWith('+') ||
      /\+\s*\d/i.test(lower) ||
      /^(?:thu\s+|bán\s+|ban\s+|nhận\s+|nhan\s+|tiền\s+vào\s+|đơn\s+|don\s+)/i.test(lower);

    // RULE CHI: Bắt đầu bằng '-', hoặc chứa '- [tiền]', hoặc bắt đầu bằng từ khóa chi/trả/mua
    const isExpensePrefix =
      lower.startsWith('-') ||
      /-\s*\d/i.test(lower) ||
      /^(?:chi\s+|trả\s+|tra\s+|mua\s+|tiền\s+ra\s+|phí\s+|phi\s+|nộp\s+|nop\s+)/i.test(lower);

    if (isIncomePrefix && !isExpensePrefix) {
      explicitType = 'INCOME';
    } else if (isExpensePrefix) {
      explicitType = 'EXPENSE';
    }

    // 2. Trích xuất số tiền linh hoạt kèm vị trí
    const amountInfo = this.extractAmountWithRange(raw);
    if (!amountInfo || amountInfo.amount <= 0) return null;

    const amount = amountInfo.amount;

    // Bóc tách phần văn bản trước và sau số tiền
    let beforeRaw = raw.slice(0, amountInfo.startIndex).trim();
    let afterRaw = raw.slice(amountInfo.endIndex).trim();

    // Làm sạch từ khóa ngày tháng năm
    const cleanDateTokens = (str: string) =>
      str
        .replace(/\b(?:hôm qua|hom qua|hôm kia|hom kia|hôm nay|hom nay)\b/gi, '')
        .replace(/\b(?:ngày\s+)?\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?\b/gi, '')
        .replace(/\b(?:ngày\s+)?\d{1,2}\s+(?:tháng|thg)\s+\d{1,2}(?:\s+(?:năm\s+)?\d{4})?\b/gi, '')
        .trim();

    beforeRaw = cleanDateTokens(beforeRaw);
    afterRaw = cleanDateTokens(afterRaw);

    // Làm sạch tiền tố (+, -, thu, bán, chi, mua...)
    const cleanPrefix = (str: string) =>
      str
        .replace(/^[+\-\/#\s]+/, '')
        .replace(/\s*[+\-]\s*$/, '')
        .replace(/^(?:thu|bán|ban|chi|trả|tra|mua|đơn|don)\s+/i, '')
        .trim();

    let beforeText = cleanPrefix(beforeRaw);
    let afterText = afterRaw.replace(/^[+\-\/#\s:,]+/, '').trim();

    // 3. Khớp danh mục động:
    let matchedCategory: { name: string; defaultType: 'INCOME' | 'EXPENSE' } | null = null;
    let matchedFrom: 'before' | 'after' | 'full' | null = null;
    let matchedKeyword = '';

    const sortedCats = [...categories].sort((a, b) => b.name.length - a.name.length);
    const candidateCats = explicitType
      ? [...sortedCats.filter((c) => c.type === explicitType), ...sortedCats.filter((c) => c.type !== explicitType)]
      : sortedCats;

    // a. Kiểm tra trong beforeText trước (ví dụ: "+ thư hoa 115k khách hàng Abc" -> beforeText là "thư hoa")
    if (beforeText) {
      const beforeLower = beforeText.toLowerCase();
      const beforeStripped = removeVietnameseTones(beforeLower);
      for (const cat of candidateCats) {
        const catLower = cat.name.toLowerCase();
        const catStripped = removeVietnameseTones(catLower);
        if (hasWholePhrase(beforeLower, catLower) || hasWholePhrase(beforeStripped, catStripped)) {
          matchedCategory = { name: cat.name, defaultType: cat.type };
          matchedFrom = 'before';
          matchedKeyword = cat.name;
          break;
        }
      }
    }

    // b. Nếu chưa thấy, kiểm tra trong afterText (ví dụ: "+ 115k thư hoa khách hàng Abc" -> afterText là "thư hoa khách hàng Abc")
    if (!matchedCategory && afterText) {
      const afterLower = afterText.toLowerCase();
      const afterStripped = removeVietnameseTones(afterLower);
      for (const cat of candidateCats) {
        const catLower = cat.name.toLowerCase();
        const catStripped = removeVietnameseTones(catLower);
        if (hasWholePhrase(afterLower, catLower) || hasWholePhrase(afterStripped, catStripped)) {
          matchedCategory = { name: cat.name, defaultType: cat.type };
          matchedFrom = 'after';
          matchedKeyword = cat.name;
          break;
        }
      }
    }

    // c. Kiểm tra các từ khóa quen thuộc tích hợp của shop
    if (!matchedCategory) {
      const builtInKeywords: Array<{
        name: string;
        defaultType: 'INCOME' | 'EXPENSE';
        keywords: string[];
      }> = [
        { name: 'Thư hoa', defaultType: 'INCOME', keywords: ['thư hoa', 'thu hoa', 'bức thư hoa', 'bức thư'] },
        { name: 'Huy chương', defaultType: 'INCOME', keywords: ['huy chương', 'huy chuong', 'hc'] },
        { name: 'Tủ hoa', defaultType: 'INCOME', keywords: ['tủ hoa', 'tu hoa', 'tủ kính', 'tủ'] },
        { name: 'Thiệp lẻ', defaultType: 'INCOME', keywords: ['thiệp lẻ', 'thiep le', 'thiệp', 'thiep'] },
        { name: 'Khung ảnh', defaultType: 'INCOME', keywords: ['khung ảnh', 'khung anh', 'khung hình', 'khung hinh', 'khung'] },
        { name: 'Cúp hoa', defaultType: 'INCOME', keywords: ['cúp hoa', 'cup hoa', 'cúp', 'cup'] },
        { name: 'Móc khóa', defaultType: 'INCOME', keywords: ['móc khóa', 'móc khoá', 'moc khoa'] },
        { name: 'Nguyên vật liệu', defaultType: 'EXPENSE', keywords: ['nguyên vật liệu', 'nguyen vat lieu', 'vật liệu', 'vat lieu', 'nguyên liệu', 'nguyen lieu', 'phụ liệu', 'phu lieu', 'mua đồ', 'mua do', 'mua hoa', 'hoa sáp', 'giấy gói', 'ruy băng', 'hộp hoa', 'keo nến', 'nvl'] },
        { name: 'Ship bưu cục', defaultType: 'EXPENSE', keywords: ['ship bưu cục', 'ship buu cuc', 'bưu cục', 'buu cuc', 'gửi hàng', 'gui hang', 'viettel post', 'vnpost', 'ghtk', 'giao hàng tiết kiệm', 'bưu điện', 'buu dien', 'ship thường', 'chuyển phát'] },
        { name: 'Ship hoả tốc', defaultType: 'EXPENSE', keywords: ['ship hoả tốc', 'ship hỏa tốc', 'ship hoa toc', 'hoả tốc', 'hỏa tốc', 'hoa toc', 'grab', 'ahamove', 'giao gấp', 'ship gấp', 'lalamove', 'be delivery'] },
        { name: 'Khác', defaultType: 'EXPENSE', keywords: ['khác', 'khac', 'chi phí', 'chi tieu'] },
      ];

      const checkList = [
        { text: beforeText, from: 'before' as const },
        { text: afterText, from: 'after' as const },
      ];

      for (const item of checkList) {
        if (!item.text) continue;
        const lowerItem = item.text.toLowerCase();
        const strippedItem = removeVietnameseTones(lowerItem);

        for (const cat of builtInKeywords) {
          for (const kw of cat.keywords) {
            if (hasWholePhrase(lowerItem, kw) || hasWholePhrase(strippedItem, removeVietnameseTones(kw))) {
              matchedCategory = { name: cat.name, defaultType: cat.defaultType };
              matchedFrom = item.from;
              matchedKeyword = kw;
              break;
            }
          }
          if (matchedCategory) break;
        }
        if (matchedCategory) break;
      }
    }

    // 4. TRƯỜNG HỢP CÓ DẤU HIỆU RULE RÕ RÀNG (+ HOẶC -):
    // Luôn ghi nhận, không bao giờ bắt cứng danh mục!
    if (explicitType === 'INCOME') {
      if (!matchedCategory || matchedCategory.defaultType !== 'INCOME') {
        const defaultIncomeCat = categories.find((c) => c.type === 'INCOME') || { name: 'Khác', type: 'INCOME' as const };
        matchedCategory = { name: defaultIncomeCat.name, defaultType: 'INCOME' };
      }
    } else if (explicitType === 'EXPENSE') {
      if (!matchedCategory || matchedCategory.defaultType !== 'EXPENSE') {
        const defaultExpenseCat =
          categories.find((c) => c.type === 'EXPENSE' && c.name.toLowerCase() === 'khác') ||
          categories.find((c) => c.type === 'EXPENSE') ||
          { name: 'Khác', type: 'EXPENSE' as const };
        matchedCategory = { name: defaultExpenseCat.name, defaultType: 'EXPENSE' };
      }
    }

    // Nếu không có dấu hiệu '+' hoặc '-' và cũng không khớp danh mục nào:
    // Trả về null để tránh ghi nhầm tin nhắn trò chuyện thông thường!
    if (!matchedCategory) {
      return null;
    }

    const finalType = explicitType || matchedCategory.defaultType;

    // 5. BÓC TÁCH MẶT HÀNG (ITEM) VÀ LÝ DO / GHI CHÚ (NOTE):
    // Quy tắc: Sau số tiền là lý do!
    let itemName = '';
    let note = '';

    if (matchedFrom === 'before') {
      // Trước số tiền là mặt hàng, sau số tiền là lý do
      // Ví dụ: "+ thư hoa 115k khách hàng Abc"
      itemName = beforeText;
      note = afterText;
    } else if (matchedFrom === 'after') {
      // Số tiền đứng trước mặt hàng: "+ 115k thư hoa khách hàng Abc"
      // Hoặc: "- 35k ruy băng gửi bạn An"
      const catWord = matchedKeyword || matchedCategory.name;
      const strippedAfter = afterText.replace(new RegExp(catWord, 'i'), '').trim();
      itemName = catWord;
      note = strippedAfter.replace(/^[+\-\/#\s:,]+/, '').trim();
    } else {
      itemName = beforeText || (afterText ? afterText.split(/\s+/).slice(0, 2).join(' ') : matchedCategory.name);
      note = afterText;
    }

    // Làm sạch note
    note = note.replace(/^[+\-\/#\s:,]+/, '').trim();

    // Xác định description lưu vào database
    let description = '';
    if (note) {
      if (matchedCategory.name !== 'Khác') {
        description = note; // Ví dụ: "khách hàng Abc"
      } else {
        description = itemName ? `${itemName} - ${note}` : note;
      }
    } else {
      description = itemName || matchedCategory.name;
    }

    return {
      amount,
      category_name: matchedCategory.name,
      transaction_type: finalType,
      item_name: itemName || matchedCategory.name,
      note: note || undefined,
      description: description || matchedCategory.name,
    };
  }
}
