// ==============================================================================
// ZALO BOT PLATFORM SERVICE (NEW BOT API: bot-api.zaloplatforms.com)
// Project: Zalo Expense Management Chatbot
// ==============================================================================

import axios from 'axios';
import { env } from '../config/env.js';
import { Category, Transaction, CategoryExpenseSummary, FinancialReport } from '../types/index.js';

const BOT_API_BASE = 'https://bot-api.zaloplatforms.com';

export class ZaloBotService {
  private static getBotToken(): string {
    return process.env.ZALO_BOT_TOKEN || '684733288156613333:ceygrgzvNjJUtaXTTHBXHmiHninvaclCFZsEovKiJKATQJuTWhLKRQEYilAYKyVi';
  }

  /**
   * Gửi tin nhắn Markdown qua Zalo Bot API
   */
  static async sendMessage(chatId: string, text: string, parseMode: 'markdown' | 'html' = 'markdown'): Promise<boolean> {
    const token = this.getBotToken();
    const url = `${BOT_API_BASE}/bot${token}/sendMessage`;

    try {
      const response = await axios.post(
        url,
        {
          chat_id: chatId,
          text,
          parse_mode: parseMode,
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        }
      );

      if (response.data && response.data.ok) {
        return true;
      }
      console.error('❌ Zalo Bot sendMessage trả về lỗi:', response.data);
      return false;
    } catch (error) {
      console.error('❌ Lỗi kết nối gửi tin nhắn Zalo Bot:', (error as Error).message);
      return false;
    }
  }

  /**
   * Định dạng tiền tệ VND
   */
  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  }

  /**
   * Định dạng thẻ tin nhắn thành công
   */
  static buildSuccessText(tx: Transaction, categoryName = 'Ghi chép'): string {
    const icon = tx.category?.icon || (tx.transaction_type === 'INCOME' ? '🌸' : '💸');
    const typeLabel = tx.transaction_type === 'INCOME' ? 'Thu nhập / Bán hàng' : 'Khoản chi';
    const amountStr = this.formatCurrency(tx.amount);
    const dateStr = new Date(tx.transaction_date).toLocaleString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    return (
      `✅ **ĐÃ LƯU THÀNH CÔNG!**\n\n` +
      `📌 **Loại:** ${typeLabel}\n` +
      `💵 **Số tiền:** **${amountStr}**\n` +
      `🏷️ **Mặt hàng:** ${icon} **${tx.category?.name || categoryName}**\n` +
      (tx.description ? `📝 **Nội dung:** ${tx.description}\n` : '') +
      `🕒 **Thời gian:** ${dateStr}\n\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `💡 _Nhắn **"xóa"** để hủy đơn vừa rồi hoặc **"sửa thành..."** để đổi thông tin._\n` +
      `📊 _Gõ **#baocao** để xem tổng kết thu chi._`
    );
  }

  /**
   * Định dạng câu hỏi làm rõ (Clarification)
   */
  static buildClarificationText(question: string, missingField: string, categories: Category[]): string {
    if (missingField === 'category') {
      const catList = categories
        .map((c, index) => `${index + 1}. ${c.icon || '📦'} **${c.name}**`)
        .join('\n');

      return (
        `📸 **XÁC NHẬN MẶT HÀNG CHO BIÊN LAI**\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `${question}\n\n` +
        `Danh sách mặt hàng:\n${catList}\n\n` +
        `👉 _Bạn chỉ cần nhắn TÊN hoặc SỐ (ví dụ: gõ **1** hoặc **Tủ hoa**)_\n` +
        `_Hoặc gõ **"hủy"** để hủy thao tác._`
      );
    }

    return (
      `💵 **BỔ SUNG SỐ TIỀN**\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `${question}\n\n` +
      `👉 _Bạn vui lòng nhập số tiền (ví dụ: **115k**, **299k**, hoặc **50000**)_\n` +
      `_Hoặc gõ **"hủy"** để hủy thao tác._`
    );
  }

  /**
   * Định dạng báo cáo thu chi toàn diện
   */
  static buildReportText(report: FinancialReport): string {
    if (report.totalCount === 0) {
      return (
        `📊 **BÁO CÁO THU CHI (${report.periodTitle})**\n\n` +
        `Bạn chưa có giao dịch nào được ghi nhận trong thời gian này.\n` +
        `💡 Hãy gửi ví dụ: "Thư hoa +115k", "Tủ hoa 299k" hoặc gửi ảnh hóa đơn/chuyển khoản để bắt đầu ghi chép!`
      );
    }

    let reportMsg =
      `📊 **BÁO CÁO THU CHI (${report.periodTitle})**\n` +
      `━━━━━━━━━━━━━━━━━━\n`;

    if (report.totalIncome > 0 && report.totalExpense > 0) {
      reportMsg += `💰 **Tổng thu (Bán hàng):** **${this.formatCurrency(report.totalIncome)}** (${report.incomeCount} đơn)\n`;
      reportMsg += `💸 **Tổng chi:** **${this.formatCurrency(report.totalExpense)}** (${report.expenseCount} lần)\n`;
      const sign = report.netAmount >= 0 ? '+' : '';
      reportMsg += `📈 **Doanh thu ròng:** **${sign}${this.formatCurrency(report.netAmount)}**\n\n`;
    } else if (report.totalIncome > 0) {
      reportMsg += `💰 **Tổng thu (Bán hàng):** **${this.formatCurrency(report.totalIncome)}** (${report.incomeCount} đơn)\n\n`;
    } else {
      reportMsg += `💸 **Tổng chi:** **${this.formatCurrency(report.totalExpense)}** (${report.expenseCount} lần)\n\n`;
    }

    reportMsg += `**Chi tiết theo sản phẩm / danh mục:**\n`;
    for (const item of report.items) {
      const icon = item.category_icon || '📦';
      reportMsg += `${icon} **${item.category_name}**: ${this.formatCurrency(item.total_amount)} (${item.transaction_count} đơn)\n`;
    }

    reportMsg += `━━━━━━━━━━━━━━━━━━\n💡 _Gõ tên mặt hàng kèm số tiền (ví dụ: "Thư hoa +115k") để tiếp tục ghi chép!_`;
    return reportMsg;
  }

  /**
   * Tải ảnh từ URL của Zalo Bot thành Buffer cho Multimodal Vision LLM (kèm cơ chế retry chống CDN trễ)
   */
  static async downloadPhotoAsBuffer(photoUrl: string, maxRetries = 3): Promise<{ buffer: Buffer; mimeType: string }> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await axios.get(photoUrl, {
          responseType: 'arraybuffer',
          timeout: 15000,
        });

        const buffer = Buffer.from(response.data);
        if (buffer.length > 0) {
          const contentType = String(response.headers['content-type'] || 'image/jpeg');
          return {
            buffer,
            mimeType: contentType,
          };
        }
        console.warn(`⚠️ [Tải ảnh] Lần thử ${attempt}/${maxRetries}: Máy chủ CDN trả về 0 bytes, thử lại sau 1s...`);
      } catch (err) {
        console.warn(`⚠️ [Tải ảnh] Lần thử ${attempt}/${maxRetries} lỗi:`, (err as Error).message);
      }

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    throw new Error('Không thể tải ảnh từ Zalo CDN hoặc ảnh bị rỗng (0 bytes).');
  }
}
