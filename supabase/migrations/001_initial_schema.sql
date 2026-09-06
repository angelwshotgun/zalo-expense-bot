-- ==============================================================================
-- SUPABASE POSTGRESQL INITIAL SCHEMA MIGRATION
-- Project: Zalo OA Expense Management Chatbot
-- ==============================================================================

-- Bật extension tạo UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. BẢNG CẤU HÌNH DANH MỤC CHI TIÊU CHUẨN (categories)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    icon VARCHAR(20),
    type VARCHAR(10) DEFAULT 'EXPENSE' CHECK (type IN ('EXPENSE', 'INCOME')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Dữ liệu hạt giống cho danh mục chi tiêu chuẩn
INSERT INTO categories (name, icon, type) VALUES
('Ăn uống', '🍜', 'EXPENSE'),
('Di chuyển', '🚗', 'EXPENSE'),
('Mua sắm', '🛍️', 'EXPENSE'),
('Hóa đơn/Điện nước', '💡', 'EXPENSE'),
('Nhà ở', '🏠', 'EXPENSE'),
('Lương/Thưởng', '💰', 'INCOME'),
('Khác', '📦', 'EXPENSE')
ON CONFLICT DO NOTHING;

-- ==============================================================================
-- 2. BẢNG QUẢN LÝ NGƯỜI DÙNG TỪ ZALO (users)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zalo_user_id VARCHAR(64) UNIQUE NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 3. BẢNG GIAO DỊCH CHI TIÊU / THU NHẬP (transactions)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    category_id INT REFERENCES categories(id) ON DELETE SET NULL,
    transaction_type VARCHAR(10) DEFAULT 'EXPENSE' CHECK (transaction_type IN ('EXPENSE', 'INCOME')),
    description TEXT,
    raw_input TEXT,
    image_url TEXT,
    transaction_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 4. BẢNG LƯU TRẠNG THÁI HỘI THOẠI DỞ (pending_clarifications)
-- Thay thế Redis session, lưu trữ trạng thái chờ làm rõ thông tin
-- ==============================================================================
CREATE TABLE IF NOT EXISTS pending_clarifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    partial_transaction JSONB NOT NULL,
    missing_field VARCHAR(30) NOT NULL CHECK (missing_field IN ('category', 'amount', 'type', 'description')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 5. CHỈ MỤC TỐI ƯU HIỆU NĂNG TRUY VẤN (Indexes)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_users_zalo_user_id ON users(zalo_user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_pending_clarifications_user ON pending_clarifications(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_clarifications_expires ON pending_clarifications(expires_at);

-- ==============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_clarifications ENABLE ROW LEVEL SECURITY;

-- Cho phép backend service role toàn quyền đọc ghi (dùng Supabase service_role key)
CREATE POLICY "Service role full access on categories" ON categories
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on users" ON users
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on transactions" ON transactions
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on pending_clarifications" ON pending_clarifications
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Cho phép người dùng anon/authenticated đọc danh mục chuẩn công khai
CREATE POLICY "Public read categories" ON categories
    FOR SELECT TO anon, authenticated USING (true);

-- ==============================================================================
-- 7. STORED PROCEDURES / RPC FUNCTIONS HỖ TRỢ BÁO CÁO NHANH
-- ==============================================================================

-- Báo cáo tổng hợp chi tiêu theo danh mục trong một khoảng thời gian
CREATE OR REPLACE FUNCTION get_expense_summary_by_category(
    p_user_id UUID,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
    category_id INT,
    category_name VARCHAR(50),
    category_icon VARCHAR(20),
    total_amount NUMERIC(15, 2),
    transaction_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id AS category_id,
        c.name AS category_name,
        c.icon AS category_icon,
        COALESCE(SUM(t.amount), 0) AS total_amount,
        COUNT(t.id) AS transaction_count
    FROM categories c
    JOIN transactions t ON t.category_id = c.id
    WHERE t.user_id = p_user_id
      AND t.transaction_type = 'EXPENSE'
      AND t.transaction_date >= p_start_date
      AND t.transaction_date <= p_end_date
    GROUP BY c.id, c.name, c.icon
    ORDER BY total_amount DESC;
END;
$$;

-- Tự động dọn dẹp các bản ghi pending_clarifications đã hết hạn
CREATE OR REPLACE FUNCTION clean_expired_pending_clarifications()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INT;
BEGIN
    DELETE FROM pending_clarifications
    WHERE expires_at < CURRENT_TIMESTAMP;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;
