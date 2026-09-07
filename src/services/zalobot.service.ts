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
    const catLabel = tx.transaction_type === 'INCOME' ? 'Mặt hàng' : 'Mục chi';
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
      `🏷️ **${catLabel}:** ${icon} **${tx.category?.name || categoryName}**\n` +
      (tx.description ? `📝 **Nội dung:** ${tx.description}\n` : '') +
      `🕒 **Thời gian:** ${dateStr}\n\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `💡 _Nhắn **"xóa"** để hủy hoặc **"sửa thành..."** để đổi thông tin._\n` +
      `📊 _Gõ **#baocao** (tổng hợp), **#baocaothu** hoặc **#baocaochi**._`
    );
  }

  /**
   * Định dạng câu hỏi làm rõ (Clarification)
   */
  static buildClarificationText(
    question: string,
    missingField: string,
    categories: Category[],
    type: 'INCOME' | 'EXPENSE' = 'INCOME'
  ): string {
    if (missingField === 'category') {
      const filtered = categories.filter((c) => c.type === type || c.name === 'Khác');
      const headerTitle =
        type === 'EXPENSE' ? '📸 **XÁC NHẬN KHOẢN CHI**' : '📸 **XÁC NHẬN MẶT HÀNG CHO BIÊN LAI**';
      const listLabel = type === 'EXPENSE' ? 'Danh sách khoản chi:' : 'Danh sách mặt hàng:';

      const catList = filtered
        .map((c, index) => `${index + 1}. ${c.icon || '📦'} **${c.name}**`)
        .join('\n');

      return (
        `${headerTitle}\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `${question}\n\n` +
        `${listLabel}\n${catList}\n\n` +
        `👉 _Bạn chỉ cần nhắn TÊN hoặc SỐ (ví dụ: gõ **1** hoặc tên danh mục)_\n` +
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
   * Định dạng báo cáo tài chính (Hỗ trợ: Báo cáo Tổng hợp, Báo cáo Riêng Thu, Báo cáo Riêng Chi)
   */
  static buildReportText(
    report: FinancialReport,
    filterType: 'ALL' | 'INCOME' | 'EXPENSE' = 'ALL'
  ): string {
    // 1. BÁO CÁO RIÊNG THU (BÁN HÀNG)
    if (filterType === 'INCOME') {
      if (report.incomeCount === 0) {
        return (
          `💰 **BÁO CÁO DOANH THU (${report.periodTitle})**\n\n` +
          `Chưa có đơn hàng nào được ghi nhận trong thời gian này.\n` +
          `💡 Ví dụ ghi chép: "Thư hoa +115k", "Tủ hoa 299k", "Móc khóa 50k"`
        );
      }

      let msg =
        `💰 **BÁO CÁO DOANH THU BÁN HÀNG (${report.periodTitle})**\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `💵 **Tổng thu:** **${this.formatCurrency(report.totalIncome)}** (${report.incomeCount} đơn)\n\n` +
        `**Chi tiết sản phẩm bán được:**\n`;

      const incomeItems = report.items.filter((i) => i.type === 'INCOME');
      for (const item of incomeItems) {
        const icon = item.category_icon || '🌸';
        msg += `${icon} **${item.category_name}**: ${this.formatCurrency(item.total_amount)} (${item.transaction_count} đơn)\n`;
      }

      msg += `\n━━━━━━━━━━━━━━━━━━\n💡 _Gõ **#baocaochi** để xem chi phí hoặc **#baocao** để xem tổng hợp!_`;
      return msg;
    }

    // 2. BÁO CÁO RIÊNG CHI (CHI PHÍ HOẠT ĐỘNG)
    if (filterType === 'EXPENSE') {
      if (report.expenseCount === 0) {
        return (
          `💸 **BÁO CÁO CHI PHÍ (${report.periodTitle})**\n\n` +
          `Chưa có khoản chi nào được ghi nhận trong thời gian này.\n` +
          `💡 Ví dụ ghi chép: "Nguyên vật liệu 500k", "Ship bưu cục 30k", "Ship hoả tốc 45k"`
        );
      }

      let msg =
        `💸 **BÁO CÁO CHI PHÍ HOẠT ĐỘNG (${report.periodTitle})**\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `💵 **Tổng chi:** **${this.formatCurrency(report.totalExpense)}** (${report.expenseCount} lần chi)\n\n` +
        `**Chi tiết từng danh mục chi:**\n`;

      const expenseItems = report.items.filter((i) => i.type === 'EXPENSE');
      for (const item of expenseItems) {
        const icon = item.category_icon || '💸';
        msg += `${icon} **${item.category_name}**: ${this.formatCurrency(item.total_amount)} (${item.transaction_count} lần)\n`;
      }

      msg += `\n━━━━━━━━━━━━━━━━━━\n💡 _Gõ **#baocaothu** để xem doanh thu hoặc **#baocao** để xem tổng hợp!_`;
      return msg;
    }

    // 3. BÁO CÁO TỔNG HỢP CẢ THU VÀ CHI
    if (report.totalCount === 0) {
      return (
        `📊 **BÁO CÁO THU CHI (${report.periodTitle})**\n\n` +
        `Bạn chưa có giao dịch nào được ghi nhận trong thời gian này.\n` +
        `💡 Hãy gửi ví dụ: "Thư hoa +115k", "Tủ hoa 299k", "Ship bưu cục 30k" hoặc gửi ảnh biên lai!`
      );
    }

    let reportMsg =
      `📊 **BÁO CÁO TỔNG HỢP THU CHI (${report.periodTitle})**\n` +
      `━━━━━━━━━━━━━━━━━━\n`;

    reportMsg += `💰 **Tổng thu (Bán hàng):** **${this.formatCurrency(report.totalIncome)}** (${report.incomeCount} đơn)\n`;
    reportMsg += `💸 **Tổng chi phí:** **${this.formatCurrency(report.totalExpense)}** (${report.expenseCount} lần chi)\n`;
    const sign = report.netAmount >= 0 ? '+' : '';
    reportMsg += `📈 **Lợi nhuận ròng:** **${sign}${this.formatCurrency(report.netAmount)}**\n\n`;

    const incomeItems = report.items.filter((i) => i.type === 'INCOME');
    const expenseItems = report.items.filter((i) => i.type === 'EXPENSE');

    if (incomeItems.length > 0) {
      reportMsg += `🌸 **DOANH THU THEO MẶT HÀNG:**\n`;
      for (const item of incomeItems) {
        const icon = item.category_icon || '🌸';
        reportMsg += `${icon} **${item.category_name}**: ${this.formatCurrency(item.total_amount)} (${item.transaction_count} đơn)\n`;
      }
      reportMsg += `\n`;
    }

    if (expenseItems.length > 0) {
      reportMsg += `💸 **CHI TIẾT KHOẢN CHI:**\n`;
      for (const item of expenseItems) {
        const icon = item.category_icon || '💸';
        reportMsg += `${icon} **${item.category_name}**: ${this.formatCurrency(item.total_amount)} (${item.transaction_count} lần)\n`;
      }
      reportMsg += `\n`;
    }

    reportMsg += `━━━━━━━━━━━━━━━━━━\n💡 _Gõ **#baocaothu** hoặc **#baocaochi** để xem báo cáo riêng từng phần._`;
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
