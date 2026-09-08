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

// Hàm chuẩn hóa chuỗi tiếng Việt không dấu
export function removeVietnameseTones(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

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
   * Xóa cache danh mục để làm mới tức thì
   */
  static clearCategoriesCache(): void {
    cachedCategories = null;
    lastCategoriesFetched = 0;
  }

  /**
   * Thêm danh mục mới vào database
   */
  static async addCategory(data: {
    name: string;
    type: 'INCOME' | 'EXPENSE';
    icon?: string;
  }): Promise<Category> {
    const supabase = getSupabaseClient();
    const cleanName = data.name.trim();
    if (!cleanName) {
      throw new Error('Tên danh mục không được để trống');
    }

    const defaultIcon = data.type === 'INCOME' ? '🌸' : '💸';
    const icon = data.icon?.trim() || defaultIcon;

    const { data: newCat, error } = await supabase
      .from('categories')
      .insert({
        name: cleanName,
        type: data.type,
        icon,
      })
      .select()
      .single();

    if (error) {
      console.error('Lỗi khi thêm danh mục:', error);
      throw error;
    }

    this.clearCategoriesCache();
    return newCat as Category;
  }

  /**
   * Cập nhật danh mục (đổi tên, icon, loại)
   */
  static async updateCategory(
    id: number,
    updates: { name?: string; icon?: string; type?: 'INCOME' | 'EXPENSE' }
  ): Promise<Category | null> {
    const supabase = getSupabaseClient();
    const payload: any = {};
    if (updates.name && updates.name.trim()) payload.name = updates.name.trim();
    if (updates.icon && updates.icon.trim()) payload.icon = updates.icon.trim();
    if (updates.type) payload.type = updates.type;

    const { data, error } = await supabase
      .from('categories')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Lỗi khi cập nhật danh mục:', error);
      return null;
    }

    this.clearCategoriesCache();
    return data as Category;
  }

  /**
   * Xóa danh mục an toàn (chuyển các giao dịch cũ về danh mục 'Khác' để bảo toàn dữ liệu)
   */
  static async deleteCategory(id: number): Promise<{ deleted: Category; reassignedCount: number }> {
    const supabase = getSupabaseClient();
    const categories = await this.getCategories();
    const targetCat = categories.find((c) => c.id === id);

    if (!targetCat) {
      throw new Error(`Không tìm thấy danh mục có ID ${id}`);
    }

    if (targetCat.name.toLowerCase() === 'khác') {
      throw new Error('Không thể xóa danh mục mặc định "Khác"');
    }

    // Tìm danh mục Khác để làm fallback
    let fallbackCat = categories.find((c) => c.name.toLowerCase() === 'khác');
    if (!fallbackCat) {
      fallbackCat = await this.addCategory({ name: 'Khác', type: 'EXPENSE', icon: '📦' });
    }

    // 1. Chuyển toàn bộ transactions đang trỏ về danh mục này sang fallbackCat.id
    const { count, error: updateErr } = await supabase
      .from('transactions')
      .update({ category_id: fallbackCat.id }, { count: 'exact' })
      .eq('category_id', id);

    if (updateErr) {
      console.warn('Lỗi khi chuyển category_id của giao dịch cũ:', updateErr.message);
    }

    // 2. Xóa danh mục
    const { error: deleteErr } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (deleteErr) {
      console.error('Lỗi khi xóa category:', deleteErr);
      throw deleteErr;
    }

    this.clearCategoriesCache();
    return { deleted: targetCat, reassignedCount: count || 0 };
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
   * Khớp danh mục theo tên hoặc từ khóa (fuzzy match linh hoạt trong Node, không tốn LLM)
   */
  static async matchCategoryByName(categoryName: string, preferredType?: 'INCOME' | 'EXPENSE'): Promise<Category | null> {
    if (!categoryName) return null;
    const categories = await this.getCategories();
    const normalized = categoryName.trim().toLowerCase();
    const stripped = removeVietnameseTones(normalized);

    // 1. Khớp theo số thứ tự (khi người dùng chọn 1, 2, 3...)
    const numMatch = normalized.match(/^[#\s]*(\d+)\s*$/);
    if (numMatch) {
      const idx = parseInt(numMatch[1], 10) - 1;
      const filtered = preferredType ? categories.filter((c) => c.type === preferredType || c.name === 'Khác') : categories;
      if (idx >= 0 && idx < filtered.length) {
        return filtered[idx];
      }
    }

    // 2. Khớp chính xác tên
    const exact = categories.find((c) => c.name.toLowerCase() === normalized);
    if (exact) return exact;

    // 3. Khớp tên không dấu chính xác
    const exactStripped = categories.find((c) => removeVietnameseTones(c.name.toLowerCase()) === stripped);
    if (exactStripped) return exactStripped;

    // 4. Khớp từ khóa chứa tên danh mục (ưu tiên danh mục tên dài hơn trước)
    const sortedCats = [...categories].sort((a, b) => b.name.length - a.name.length);
    for (const c of sortedCats) {
      const catLower = c.name.toLowerCase();
      const catStripped = removeVietnameseTones(catLower);
      if (normalized.includes(catLower) || stripped.includes(catStripped)) {
        return c;
      }
    }

    // 5. Khớp theo từ khóa sản phẩm thực tế / chữ viết tắt
    const keywordMap: Array<{ name: string; keywords: string[] }> = [
      // THU (Bán hàng)
      { name: 'Thư hoa', keywords: ['thư hoa', 'thu hoa', 'bức thư hoa', 'bức thư'] },
      { name: 'Huy chương', keywords: ['huy chương', 'huy chuong', 'hc'] },
      { name: 'Tủ hoa', keywords: ['tủ hoa', 'tu hoa', 'tủ kính', 'tủ'] },
      { name: 'Thiệp lẻ', keywords: ['thiệp lẻ', 'thiep le', 'thiệp', 'thiep'] },
      { name: 'Khung ảnh', keywords: ['khung ảnh', 'khung anh', 'khung hình', 'khung hinh', 'khung'] },
      { name: 'Cúp hoa', keywords: ['cúp hoa', 'cup hoa', 'cúp', 'cup'] },
      { name: 'Móc khóa', keywords: ['móc khóa', 'móc khoá', 'moc khoa', 'khoá', 'khóa'] },

      // CHI (Chi phí hoạt động)
      { name: 'Nguyên vật liệu', keywords: ['nguyên vật liệu', 'nguyen vat lieu', 'vật liệu', 'vat lieu', 'nguyên liệu', 'nguyen lieu', 'phụ liệu', 'phu lieu', 'mua đồ', 'mua do', 'mua hoa', 'hoa sáp', 'giấy gói', 'ruy băng', 'hộp hoa', 'keo nến', 'nvl'] },
      { name: 'Ship bưu cục', keywords: ['ship bưu cục', 'ship buu cuc', 'bưu cục', 'buu cuc', 'gửi hàng', 'gui hang', 'viettel post', 'vnpost', 'ghtk', 'giao hàng tiết kiệm', 'bưu điện', 'buu dien', 'ship thường', 'chuyển phát'] },
      { name: 'Ship hoả tốc', keywords: ['ship hoả tốc', 'ship hỏa tốc', 'ship hoa toc', 'hoả tốc', 'hỏa tốc', 'hoa toc', 'grab', 'ahamove', 'giao gấp', 'ship gấp', 'lalamove', 'be delivery'] },
      { name: 'Khác', keywords: ['khác', 'khac', 'chi phí khác', 'chi khác', 'khoản khác'] },
    ];

    for (const item of keywordMap) {
      for (const kw of item.keywords) {
        if (normalized.includes(kw) || stripped.includes(removeVietnameseTones(kw))) {
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

    const map = new Map<string, CategorySummaryItem>();

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

      const key = `${cat.id}_${type}`;
      const current = map.get(key) || {
        category_id: cat.id,
        category_name: cat.name,
        category_icon: cat.icon || (type === 'INCOME' ? '🌸' : '💸'),
        type,
        total_amount: 0,
        transaction_count: 0,
      };
      current.total_amount += amount;
      current.transaction_count++;
      map.set(key, current);
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

  /**
   * Truy vấn giao dịch linh hoạt theo khoảng thời gian, loại thu/chi, và danh mục (hỗ trợ NL2Query)
   */
  static async queryTransactionsCustom(
    userId: string,
    options: {
      startDate?: string;
      endDate?: string;
      type?: 'ALL' | 'INCOME' | 'EXPENSE';
      categoryName?: string | null;
      limit?: number;
    }
  ): Promise<{
    report: FinancialReport;
    transactions: Transaction[];
  }> {
    const supabase = getSupabaseClient();
    let query = supabase
      .from('transactions')
      .select('id, amount, transaction_type, description, raw_input, transaction_date, created_at, category:categories(id, name, icon, type)')
      .eq('user_id', userId)
      .order('transaction_date', { ascending: false });

    if (options.startDate) {
      query = query.gte('transaction_date', options.startDate);
    }
    if (options.endDate) {
      query = query.lte('transaction_date', options.endDate);
    }
    if (options.type && options.type !== 'ALL') {
      query = query.eq('transaction_type', options.type);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data: rawTxs, error } = await query;
    if (error) {
      console.error('Lỗi queryTransactionsCustom:', error);
      throw error;
    }

    let txs = (rawTxs || []) as unknown as Transaction[];

    // Nếu có lọc theo tên danh mục
    if (options.categoryName) {
      const normCat = options.categoryName.trim().toLowerCase();
      txs = txs.filter((t) => t.category?.name?.toLowerCase().includes(normCat));
    }

    let totalIncome = 0;
    let totalExpense = 0;
    let incomeCount = 0;
    let expenseCount = 0;
    const map = new Map<string, CategorySummaryItem>();

    for (const tx of txs) {
      const amount = Number(tx.amount) || 0;
      const type = tx.transaction_type === 'INCOME' ? 'INCOME' : 'EXPENSE';
      const cat = tx.category || { id: 7, name: 'Khác', icon: '📦', type: 'EXPENSE' };

      if (type === 'INCOME') {
        totalIncome += amount;
        incomeCount++;
      } else {
        totalExpense += amount;
        expenseCount++;
      }

      const key = `${cat.id}_${type}`;
      const current = map.get(key) || {
        category_id: cat.id,
        category_name: cat.name,
        category_icon: cat.icon || (type === 'INCOME' ? '🌸' : '💸'),
        type,
        total_amount: 0,
        transaction_count: 0,
      };
      current.total_amount += amount;
      current.transaction_count++;
      map.set(key, current);
    }

    const report: FinancialReport = {
      periodTitle: options.startDate && options.endDate ? `${options.startDate.slice(0, 10)} đến ${options.endDate.slice(0, 10)}` : 'Tất cả thời gian',
      totalIncome,
      totalExpense,
      netAmount: totalIncome - totalExpense,
      totalCount: txs.length,
      incomeCount,
      expenseCount,
      items: Array.from(map.values()).sort((a, b) => b.total_amount - a.total_amount),
    };

    return { report, transactions: txs };
  }
}
