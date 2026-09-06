// ==============================================================================
// SUPABASE DATABASE SERVICE
// Project: Zalo OA Expense Management Chatbot
// ==============================================================================

import { getSupabaseClient } from '../db/supabase.js';
import {
  Category,
  User,
  Transaction,
  PendingClarification,
  PartialTransactionData,
  MissingFieldType,
  CategoryExpenseSummary,
  CategorySummaryItem,
  FinancialReport,
} from '../types/index.js';

// Cache danh mục trong bộ nhớ RAM để tối ưu tốc độ và giảm tải DB
let cachedCategories: Category[] | null = null;
let lastCategoriesFetched = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 giờ

export class DatabaseService {
  /**
   * Lấy hoặc tự động tạo User dựa trên zalo_user_id
   */
  static async getOrCreateUser(zaloUserId: string, displayName?: string | null): Promise<User> {
    const supabase = getSupabaseClient();

    // 1. Tìm user hiện có
    const { data: existingUser, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('zalo_user_id', zaloUserId)
      .maybeSingle();

    if (findError) {
      console.error('Lỗi tìm kiếm user:', findError);
      throw findError;
    }

    if (existingUser) {
      // Cập nhật display_name nếu có thay đổi
      if (displayName && existingUser.display_name !== displayName) {
        await supabase
          .from('users')
          .update({ display_name: displayName, updated_at: new Date().toISOString() })
          .eq('id', existingUser.id);
        existingUser.display_name = displayName;
      }
      return existingUser as User;
    }

    // 2. Tạo mới user nếu chưa tồn tại
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        zalo_user_id: zaloUserId,
        display_name: displayName || 'Người dùng Zalo',
      })
      .select()
      .single();

    if (createError) {
      console.error('Lỗi tạo mới user:', createError);
      throw createError;
    }

    return newUser as User;
  }

  /**
   * Lấy danh sách danh mục chuẩn (có caching bộ nhớ)
   */
  static async getCategories(): Promise<Category[]> {
    const now = Date.now();
    if (cachedCategories && now - lastCategoriesFetched < CACHE_TTL_MS) {
      return cachedCategories;
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error('Lỗi truy vấn categories:', error);
      return cachedCategories || [];
    }

    cachedCategories = data as Category[];
    lastCategoriesFetched = now;
    return cachedCategories;
  }

  /**
   * Khớp danh mục theo tên hoặc từ khóa (fuzzy match cơ bản trong Node, không tốn LLM)
   */
  static async matchCategoryByName(categoryName: string): Promise<Category | null> {
    if (!categoryName) return null;
    const categories = await this.getCategories();
    const normalized = categoryName.trim().toLowerCase();

    // 1. Khớp theo số thứ tự từ 1 đến 8 (theo thứ tự hiển thị chuẩn)
    const indexOrder = [
      'Thư hoa',
      'Huy chương',
      'Tủ hoa',
      'Thiệp lẻ',
      'Khung ảnh',
      'Cúp hoa',
      'Móc khóa',
      'Khác',
    ];

    const numMatch = normalized.match(/^[#\s]*([1-8])\s*$/);
    if (numMatch) {
      const idx = parseInt(numMatch[1], 10) - 1;
      const targetName = indexOrder[idx];
      const found = categories.find((c) => c.name.toLowerCase() === targetName.toLowerCase());
      if (found) return found;
    }

    // 2. Khớp chính xác tên
    const exact = categories.find((c) => c.name.toLowerCase() === normalized);
    if (exact) return exact;

    // 3. Khớp theo từ khóa sản phẩm thực tế
    const keywordMap: Array<{ name: string; keywords: string[] }> = [
      { name: 'Thư hoa', keywords: ['thư hoa', 'thu hoa', 'bức thư hoa', 'bức thư', 'thu'] },
      { name: 'Huy chương', keywords: ['huy chương', 'huy chuong', 'hc'] },
      { name: 'Tủ hoa', keywords: ['tủ hoa', 'tu hoa', 'tủ kính', 'tủ', 'tu'] },
      { name: 'Thiệp lẻ', keywords: ['thiệp lẻ', 'thiep le', 'thiệp', 'thiep'] },
      { name: 'Khung ảnh', keywords: ['khung ảnh', 'khung anh', 'khung hình', 'khung hinh', 'khung'] },
      { name: 'Cúp hoa', keywords: ['cúp hoa', 'cup hoa', 'cúp', 'cup'] },
      { name: 'Móc khóa', keywords: ['móc khóa', 'moc khoa', 'móc khoá', 'khoá', 'khóa'] },
      { name: 'Khác', keywords: ['khác', 'khac', 'chi phí', 'chi tieu', 'tiền ship', 'vật liệu', 'mua đồ'] },
    ];

    for (const item of keywordMap) {
      for (const kw of item.keywords) {
        if (normalized.includes(kw)) {
          const found = categories.find((c) => c.name.toLowerCase() === item.name.toLowerCase());
          if (found) return found;
        }
      }
    }

    // Mặc định chọn mục 'Khác' nếu không khớp
    return categories.find((c) => c.name === 'Khác') || categories[0] || null;
  }

  /**
   * Tạo giao dịch chi tiêu mới
   */
  static async createTransaction(data: {
    user_id: string;
    amount: number;
    category_id?: number | null;
    transaction_type?: 'EXPENSE' | 'INCOME';
    description?: string | null;
    raw_input?: string | null;
    image_url?: string | null;
    transaction_date?: string;
  }): Promise<Transaction> {
    const supabase = getSupabaseClient();

    const payload = {
      user_id: data.user_id,
      amount: data.amount,
      category_id: data.category_id || null,
      transaction_type: data.transaction_type || 'EXPENSE',
      description: data.description || null,
      raw_input: data.raw_input || null,
      image_url: data.image_url || null,
      transaction_date: data.transaction_date || new Date().toISOString(),
    };

    const { data: newTx, error } = await supabase
      .from('transactions')
      .insert(payload)
      .select('*, category:categories(*)')
      .single();

    if (error) {
      console.error('Lỗi khi tạo transaction:', error);
      throw error;
    }

    return newTx as unknown as Transaction;
  }

  /**
   * Lưu phiên làm rõ thông tin (pending clarification)
   * Sử dụng UPSERT trên user_id UNIQUE
   */
  static async savePendingClarification(
    userId: string,
    partialTransaction: PartialTransactionData,
    missingField: MissingFieldType,
    ttlMinutes = 15
  ): Promise<PendingClarification> {
    const supabase = getSupabaseClient();
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('pending_clarifications')
      .upsert(
        {
          user_id: userId,
          partial_transaction: partialTransaction,
          missing_field: missingField,
          expires_at: expiresAt,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (error) {
      console.error('Lỗi lưu pending clarification:', error);
      throw error;
    }

    return data as PendingClarification;
  }

  /**
   * Lấy phiên làm rõ thông tin hiện hành (bỏ qua nếu đã hết hạn)
   */
  static async getPendingClarification(userId: string): Promise<PendingClarification | null> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('pending_clarifications')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Lỗi đọc pending clarification:', error);
      return null;
    }

    if (!data) return null;

    // Kiểm tra thời hạn
    if (new Date(data.expires_at).getTime() < Date.now()) {
      // Đã hết hạn -> xóa dọn dẹp
      await this.clearPendingClarification(userId);
      return null;
    }

    return data as PendingClarification;
  }

  /**
   * Xóa phiên làm rõ thông tin khi đã hoàn tất hoặc bị hủy
   */
  static async clearPendingClarification(userId: string): Promise<void> {
    const supabase = getSupabaseClient();
    await supabase.from('pending_clarifications').delete().eq('user_id', userId);
  }

  /**
   * Xóa giao dịch (cho nút 'Hủy giao dịch')
   */
  static async deleteTransaction(transactionId: string, userId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', transactionId)
      .eq('user_id', userId);

    if (error) {
      console.error('Lỗi xóa transaction:', error);
      return false;
    }
    return true;
  }

  /**
   * Lấy giao dịch gần nhất của người dùng
   */
  static async getLatestTransaction(userId: string): Promise<Transaction | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('transactions')
      .select('id, user_id, amount, transaction_type, description, raw_input, image_url, transaction_date, created_at, category:categories(id, name, icon)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Lỗi lấy latest transaction:', error);
      return null;
    }
    return data as unknown as Transaction;
  }

  /**
   * Xóa giao dịch gần nhất của người dùng
   */
  static async deleteLatestTransaction(userId: string): Promise<Transaction | null> {
    const latest = await this.getLatestTransaction(userId);
    if (!latest) return null;

    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', latest.id)
      .eq('user_id', userId);

    if (error) {
      console.error('Lỗi xóa latest transaction:', error);
      return null;
    }
    return latest;
  }

  /**
   * Cập nhật thông tin giao dịch gần nhất
   */
  static async updateLatestTransaction(
    userId: string,
    updates: {
      amount?: number;
      category_id?: number;
      transaction_type?: 'INCOME' | 'EXPENSE';
      description?: string;
    }
  ): Promise<Transaction | null> {
    const latest = await this.getLatestTransaction(userId);
    if (!latest) return null;

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', latest.id)
      .eq('user_id', userId)
      .select('id, user_id, amount, transaction_type, description, raw_input, image_url, transaction_date, created_at, category:categories(id, name, icon)')
      .single();

    if (error) {
      console.error('Lỗi cập nhật latest transaction:', error);
      return null;
    }
    return data as unknown as Transaction;
  }

  /**
   * Tính toán khoảng thời gian theo múi giờ Việt Nam (Asia/Ho_Chi_Minh - UTC+7)
   */
  static getVietnamDayRange(date = new Date()): { start: string; end: string; dateStr: string } {
    const vnDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(date); // YYYY-MM-DD
    const start = `${vnDateStr}T00:00:00.000+07:00`;
    const end = `${vnDateStr}T23:59:59.999+07:00`;
    const parts = vnDateStr.split('-');
    return { start, end, dateStr: `${parts[2]}/${parts[1]}/${parts[0]}` };
  }

  static getVietnamMonthRange(date = new Date()): { start: string; end: string; monthStr: string } {
    const vnDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(date); // YYYY-MM-DD
    const [year, month] = vnDateStr.split('-');
    const lastDay = new Date(parseInt(year, 10), parseInt(month, 10), 0).getDate();
    const start = `${year}-${month}-01T00:00:00.000+07:00`;
    const end = `${year}-${month}-${lastDay}T23:59:59.999+07:00`;
    return { start, end, monthStr: `${month}/${year}` };
  }

  /**
   * Báo cáo thu chi tổng hợp cho một khoảng thời gian (bao gồm cả Thu nhập/Bán hàng và Chi tiêu)
   */
  static async getFinancialReport(
    userId: string,
    start: string,
    end: string,
    periodTitle: string
  ): Promise<FinancialReport> {
    const supabase = getSupabaseClient();
    const { data: txs, error } = await supabase
      .from('transactions')
      .select('id, amount, transaction_type, description, transaction_date, category:categories(id, name, icon)')
      .eq('user_id', userId)
      .gte('transaction_date', start)
      .lte('transaction_date', end)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Lỗi truy vấn báo cáo:', error);
      return {
        periodTitle,
        totalIncome: 0,
        totalExpense: 0,
        netAmount: 0,
        totalCount: 0,
        incomeCount: 0,
        expenseCount: 0,
        items: [],
      };
    }

    let totalIncome = 0;
    let totalExpense = 0;
    let incomeCount = 0;
    let expenseCount = 0;

    const map = new Map<number, CategorySummaryItem>();

    for (const tx of txs || []) {
      const amount = Number(tx.amount) || 0;
      const type = tx.transaction_type === 'INCOME' ? 'INCOME' : 'EXPENSE';
      const cat = (tx.category as unknown as Category) || { id: 7, name: 'Khác', icon: '📦', type: 'EXPENSE' };

      if (type === 'INCOME') {
        totalIncome += amount;
        incomeCount++;
      } else {
        totalExpense += amount;
        expenseCount++;
      }

      const current = map.get(cat.id) || {
        category_id: cat.id,
        category_name: cat.name,
        category_icon: cat.icon || '📦',
        type,
        total_amount: 0,
        transaction_count: 0,
      };
      current.total_amount += amount;
      current.transaction_count++;
      map.set(cat.id, current);
    }

    return {
      periodTitle,
      totalIncome,
      totalExpense,
      netAmount: totalIncome - totalExpense,
      totalCount: (txs || []).length,
      incomeCount,
      expenseCount,
      items: Array.from(map.values()).sort((a, b) => b.total_amount - a.total_amount),
    };
  }

  /**
   * Lấy báo cáo thu chi hôm nay
   */
  static async getDailyExpenseReport(userId: string): Promise<FinancialReport> {
    const { start, end, dateStr } = this.getVietnamDayRange();
    return this.getFinancialReport(userId, start, end, `Hôm nay ${dateStr}`);
  }

  /**
   * Lấy báo cáo thu chi tháng này
   */
  static async getMonthlyExpenseReport(userId: string): Promise<FinancialReport> {
    const { start, end, monthStr } = this.getVietnamMonthRange();
    return this.getFinancialReport(userId, start, end, `Tháng ${monthStr}`);
  }
}
