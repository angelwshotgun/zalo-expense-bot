// ==============================================================================
// ZALO OA SERVICE (API v3 & INTERACTIVE UI HELPERS)
// Project: Zalo OA Expense Management Chatbot
// ==============================================================================

import crypto from 'crypto';
import axios from 'axios';
import { env } from '../config/env.js';
import {
  Category,
  Transaction,
  CategoryExpenseSummary,
  ZaloQuickReplyAction,
  ZaloSendMessageBody,
} from '../types/index.js';

const ZALO_OPENAPI_BASE = 'https://openapi.zalo.me/v3.0/oa/message/cs';

export class ZaloService {
  /**
   * Xác thực chữ ký Webhook từ Zalo OA
   * Zalo thường gửi chữ ký qua header 'X-ZEvent-Signature'
   * mac = sha256(appId + data + timestamp + secretKey) hoặc HMAC-SHA256
   */
  static verifySignature(
    signature: string | undefined,
    rawBody: string,
    timestamp?: string | number
  ): boolean {
    if (!env.ZALO_OA_SECRET_KEY) {
      console.warn('⚠️ ZALO_OA_SECRET_KEY chưa được cấu hình. Bỏ qua kiểm tra chữ ký (dev mode).');
      return true;
    }

    if (!signature) {
      return false;
    }

    // 1. Kiểm tra theo chuẩn Zalo Event: sha256(appId + rawBody + timestamp + secretKey)
    if (env.ZALO_APP_ID && timestamp) {
      const dataToHash = `${env.ZALO_APP_ID}${rawBody}${timestamp}${env.ZALO_OA_SECRET_KEY}`;
      const computedHash = crypto.createHash('sha256').update(dataToHash, 'utf8').digest('hex');
      const prefixSig = signature.startsWith('mac=') ? signature.slice(4) : signature;

      if (crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(prefixSig))) {
        return true;
      }
    }

    // 2. Kiểm tra chuẩn HMAC-SHA256 của rawBody với secretKey
    const hmac = crypto.createHmac('sha256', env.ZALO_OA_SECRET_KEY);
    hmac.update(rawBody);
    const expectedHmac = hmac.digest('hex');
    const cleanSig = signature.startsWith('mac=') ? signature.slice(4) : signature;

    try {
      return crypto.timingSafeEqual(Buffer.from(expectedHmac), Buffer.from(cleanSig));
    } catch {
      return false;
    }
  }

  /**
   * Gửi tin nhắn đến người dùng qua Zalo OA Message API v3
   */
  static async sendMessage(payload: ZaloSendMessageBody): Promise<boolean> {
    if (!env.ZALO_OA_ACCESS_TOKEN) {
      console.warn('⚠️ ZALO_OA_ACCESS_TOKEN chưa có. Giả lập gửi tin nhắn ra console:');
      console.log('📤 Zalo Outgoing Message:\n', JSON.stringify(payload, null, 2));
      return true;
    }

    try {
      const response = await axios.post(ZALO_OPENAPI_BASE, payload, {
        headers: {
          'Content-Type': 'application/json',
          access_token: env.ZALO_OA_ACCESS_TOKEN,
        },
        timeout: 10000,
      });

      if (response.data && response.data.error !== 0) {
        console.error('❌ Zalo API trả về lỗi:', response.data);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Lỗi kết nối gửi tin nhắn Zalo OA:', error);
      return false;
    }
  }

  /**
   * Helper: Định dạng số tiền VND (ví dụ: 150.000 ₫)
   */
  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  }

  /**
   * Helper: Gửi tin nhắn kèm Quick Replies
   */
  static async sendTextMessageWithQuickReplies(
    recipientId: string,
    text: string,
    quickReplies: ZaloQuickReplyAction[] = []
  ): Promise<boolean> {
    const payload: ZaloSendMessageBody = {
      recipient: { user_id: recipientId },
      message: {
        text,
        quick_reply: quickReplies.length > 0 ? { actions: quickReplies } : undefined,
      },
    };
    return this.sendMessage(payload);
  }

  /**
   * UI: Gửi Card xác nhận ghi nhận chi tiêu thành công
   * Kèm Quick Reply: [📊 Xem báo cáo hôm nay] [❌ Hủy giao dịch này]
   */
  static async sendTransactionSuccessCard(
    recipientId: string,
    tx: Transaction,
    categoryName = 'Chi tiêu'
  ): Promise<boolean> {
    const icon = tx.category?.icon || (tx.transaction_type === 'INCOME' ? '💰' : '💸');
    const typeLabel = tx.transaction_type === 'INCOME' ? 'Thu nhập' : 'Khoản chi';
    const amountStr = this.formatCurrency(tx.amount);
    const dateStr = new Date(tx.transaction_date).toLocaleString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    const text =
      `✅ ĐÃ LƯU THÀNH CÔNG!\n\n` +
      `📌 Loại: ${typeLabel}\n` +
      `💵 Số tiền: ${amountStr}\n` +
      `🏷️ Danh mục: ${icon} ${tx.category?.name || categoryName}\n` +
      (tx.description ? `📝 Nội dung: ${tx.description}\n` : '') +
      `🕒 Thời gian: ${dateStr}`;

    const quickReplies: ZaloQuickReplyAction[] = [
      {
        type: 'oa.query.show',
        title: '📊 Xem báo cáo hôm nay',
        payload: 'ACTION_REPORT_TODAY',
      },
      {
        type: 'oa.query.show',
        title: '📈 Báo cáo tháng này',
        payload: 'ACTION_REPORT_MONTH',
      },
      {
        type: 'oa.query.show',
        title: '❌ Hủy giao dịch này',
        payload: `ACTION_CANCEL_TX:${tx.id}`,
      },
    ];

    return this.sendTextMessageWithQuickReplies(recipientId, text, quickReplies);
  }

  /**
   * UI: Gửi giao diện hỏi lại (Clarification Loop) khi thiếu thông tin
   * Khi thiếu danh mục -> hiển thị danh sách Quick Reply buttons các danh mục chuẩn
   */
  static async sendClarificationPrompt(
    recipientId: string,
    question: string,
    missingField: string,
    categories: Category[]
  ): Promise<boolean> {
    let quickReplies: ZaloQuickReplyAction[] = [];

    if (missingField === 'category') {
      // Giới hạn các danh mục chi tiêu phổ biến để vừa khung Quick Reply
      const expenseCats = categories.filter((c) => c.type === 'EXPENSE').slice(0, 8);
      quickReplies = expenseCats.map((cat) => ({
        type: 'oa.query.show',
        title: `${cat.icon || '📁'} ${cat.name}`,
        payload: `ACTION_SET_CAT:${cat.id}`,
      }));

      // Nút hủy thao tác
      quickReplies.push({
        type: 'oa.query.show',
        title: '❌ Hủy bỏ',
        payload: 'ACTION_CANCEL_PENDING',
      });
    } else {
      quickReplies = [
        {
          type: 'oa.query.show',
          title: '❌ Hủy bỏ',
          payload: 'ACTION_CANCEL_PENDING',
        },
      ];
    }

    const promptText = `❓ CẦN LÀM RÕ THÊM THÔNG TIN\n\n${question}`;
    return this.sendTextMessageWithQuickReplies(recipientId, promptText, quickReplies);
  }

  /**
   * UI: Gửi Báo cáo chi tiêu dạng Card văn bản trực quan
   */
  static async sendExpenseReportCard(
    recipientId: string,
    periodTitle: string,
    totalAmount: number,
    count: number,
    items: CategoryExpenseSummary[]
  ): Promise<boolean> {
    if (count === 0) {
      const emptyText =
        `📊 BÁO CÁO CHI TIÊU (${periodTitle})\n\n` +
        `Bạn chưa có khoản chi tiêu nào được ghi nhận trong khoảng thời gian này.\n` +
        `💡 Hãy gửi ảnh hóa đơn hoặc gõ ví dụ: "Ăn phở 45k" để bắt đầu ghi chép!`;

      const quickReplies: ZaloQuickReplyAction[] = [
        {
          type: 'oa.query.show',
          title: '📈 Xem báo cáo tháng',
          payload: 'ACTION_REPORT_MONTH',
        },
      ];

      return this.sendTextMessageWithQuickReplies(recipientId, emptyText, quickReplies);
    }

    let reportText =
      `📊 BÁO CÁO CHI TIÊU (${periodTitle})\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `💰 Tổng chi: ${this.formatCurrency(totalAmount)}\n` +
      `🧾 Tổng số giao dịch: ${count} lần\n\n` +
      `Chi tiết theo danh mục:\n`;

    for (const item of items) {
      const percentage = totalAmount > 0 ? ((item.total_amount / totalAmount) * 100).toFixed(1) : '0';
      const icon = item.category_icon || '📁';
      reportText += `${icon} ${item.category_name}: ${this.formatCurrency(item.total_amount)} (${percentage}% - ${item.transaction_count} lần)\n`;
    }

    reportText += `━━━━━━━━━━━━━━━━━━\n💡 Gõ hoặc gửi ảnh bất kỳ để ghi thêm chi tiêu!`;

    const quickReplies: ZaloQuickReplyAction[] = [
      {
        type: 'oa.query.show',
        title: '📊 Báo cáo hôm nay',
        payload: 'ACTION_REPORT_TODAY',
      },
      {
        type: 'oa.query.show',
        title: '📈 Báo cáo tháng này',
        payload: 'ACTION_REPORT_MONTH',
      },
    ];

    return this.sendTextMessageWithQuickReplies(recipientId, reportText, quickReplies);
  }

  /**
   * Helper: Tải ảnh từ URL của Zalo CDN thành Buffer cho Multimodal Vision LLM
   */
  static async downloadImageAsBuffer(imageUrl: string): Promise<{ buffer: Buffer; mimeType: string }> {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 15000,
    });

    const contentType = String(response.headers['content-type'] || 'image/jpeg');
    return {
      buffer: Buffer.from(response.data),
      mimeType: contentType,
    };
  }
}
