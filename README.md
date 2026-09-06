# 🤖 Zalo OA Expense Management Chatbot

Hệ thống Chatbot Quản lý Chi tiêu thông minh tích hợp **Zalo Official Account (Zalo OA)**, cơ sở dữ liệu **Supabase (PostgreSQL)**, và **LLM Multimodal (Google Gemini 2.5 Flash / GPT-4o-mini)**.

Dịch vụ được thiết kế theo nguyên tắc **Token-Saving Engine** (tiết kiệm chi phí tối đa: **0 Token LLM** cho các thao tác lặp lại, xem báo cáo, chọn danh mục) và **Vòng lặp làm rõ (Clarification Loop)** chống hallucination.

---

## 🚀 Tính Năng Nổi Bật

| Tính Năng | Cơ Chế Xử Lý | Tiêu Thụ Token LLM |
| :--- | :--- | :--- |
| **Xem báo cáo ngày/tháng** | Phím tắt Quick Reply / Lệnh `#baocao` $\rightarrow$ Truy vấn SQL Supabase trực tiếp | **0 Token (100% Free)** |
| **Chọn danh mục chi tiêu** | Bấm nút Zalo Quick Reply $\rightarrow$ Cập nhật thẳng vào DB | **0 Token (100% Free)** |
| **Hủy giao dịch vừa nhập** | Bấm nút `[❌ Hủy giao dịch này]` $\rightarrow$ Xóa record transactions | **0 Token (100% Free)** |
| **Bổ sung thông tin thiếu** | Nhập số tiền/nội dung khi đang có session `pending_clarifications` | **0 Token** |
| **Ghi nhận qua Text tự do** | "Ăn phở 45k", "Đổ xăng 70 nghìn" $\rightarrow$ Gemini 2.5 Flash trích xuất JSON | **1 Lần gọi LLM** |
| **Ghi nhận qua Hình ảnh** | Hóa đơn siêu thị, biên lai, ảnh chụp chuyển khoản ngân hàng $\rightarrow$ Multimodal Vision | **1 Lần gọi LLM** |
| **Hỏi lại khi thiếu dữ liệu** | Thiếu mục đích hoặc thiếu tiền $\rightarrow$ Lưu pending session, gửi Quick Reply hỏi lại | Chống đoán mò |

---

## 📁 Cấu Trúc Dự Án

```
zalo-expense-bot/
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql       # SQL DDL: categories, users, transactions, pending_clarifications, RLS, RPC
├── src/
│   ├── types/
│   │   └── index.ts                     # TypeScript types (DB entities, Zalo Webhook, LLM JSON schema)
│   ├── config/
│   │   └── env.ts                       # Zod validation cấu hình môi trường
│   ├── db/
│   │   ├── supabase.ts                  # Supabase Client kết nối bằng service_role key
│   ├── services/
│   │   ├── db.service.ts                # Nghiệp vụ DB: User, Category, Transaction, Pending State, Reports
│   │   ├── zalo.service.ts              # Zalo API v3: Verify HMAC, Send Messages, Quick Replies, Image Downloader
│   │   └── llm.service.ts               # Gemini 2.5 Flash Multimodal (Text + Image Buffer) với JSON Schema
│   ├── handlers/
│   │   └── webhook.handler.ts           # Router 3 tầng tiết kiệm Token LLM
│   ├── app.ts                           # Fastify App, Raw Body Plugin, CORS, Routes
│   └── server.ts                        # Server Entrypoint
├── tests/
│   └── simulation.ts                    # Kịch bản kiểm thử mô phỏng luồng hoạt động
├── .env.example                         # Mẫu file cấu hình môi trường
├── package.json                         # Dependencies & Scripts
├── tsconfig.json                        # Cấu hình TypeScript
├── Dockerfile                           # Multi-stage production container
├── docker-compose.yml                   # Docker Compose deploy
└── README.md                            # Hướng dẫn chi tiết
```

---

## 🛠️ Hướng Dẫn Cài Đặt & Triển Khai

### 1. Thiết lập Cơ sở dữ liệu Supabase
1. Đăng nhập [Supabase Dashboard](https://supabase.com) và tạo một dự án mới.
2. Vào mục **SQL Editor** trong dự án Supabase.
3. Mở file [001_initial_schema.sql](file:///C:/Users/Admin/.gemini/antigravity/scratch/zalo-expense-bot/supabase/migrations/001_initial_schema.sql), sao chép toàn bộ nội dung và bấm **Run**.
   - Script sẽ khởi tạo 4 bảng: `categories`, `users`, `transactions`, `pending_clarifications`.
   - Bật Row Level Security (RLS).
   - Tạo stored procedure `get_expense_summary_by_category` cho báo cáo nhanh.
4. Vào **Project Settings** $\rightarrow$ **API**:
   - Sao chép **Project URL** (gán vào `SUPABASE_URL`).
   - Sao chép **service_role secret** (gán vào `SUPABASE_SERVICE_ROLE_KEY`).

---

### 2. Thiết lập Zalo Official Account (OA) & Developers
1. Truy cập [Zalo for Developers](https://developers.zalo.me/) và tạo App liên kết với Zalo OA của bạn.
2. Vào **Official Account** $\rightarrow$ **Cấu hình Webhook**:
   - **Webhook URL**: Điền URL server của bạn (Ví dụ qua ngrok: `https://your-domain.ngrok-free.app/webhook/zalo`).
   - Đăng ký các sự kiện: `user_send_text`, `user_send_image`, `user_submit_action`.
3. Lấy thông tin xác thực:
   - **App ID**: Điền vào `ZALO_APP_ID`.
   - **OA Secret Key / Webhook Secret**: Điền vào `ZALO_OA_SECRET_KEY`.
   - Tạo **Access Token OA v3** (với quyền `oa.message`): Điền vào `ZALO_OA_ACCESS_TOKEN`.

---

### 3. Cấu hình Google Gemini API
1. Truy cập [Google AI Studio](https://aistudio.google.com/) và tạo API Key.
2. Điền API Key vào biến `GEMINI_API_KEY`.

---

### 4. Cài đặt và Chạy Server

#### Bước 4.1: Tạo file cấu hình `.env`
Sao chép từ file mẫu:
```bash
cp .env.example .env
```
Điền đầy đủ các thông tin:
```env
PORT=3000
NODE_ENV=development

ZALO_APP_ID=your_zalo_app_id
ZALO_OA_SECRET_KEY=your_oa_secret_key
ZALO_OA_ACCESS_TOKEN=your_oa_access_token_v3

SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

LLM_PROVIDER=gemini
GEMINI_API_KEY=AIzaSy...
```

#### Bước 4.2: Cài đặt thư viện & Khởi chạy Dev Server
```bash
# Cài đặt dependencies
npm install

# Chạy server ở chế độ watch (tự reload khi sửa code)
npm run dev

# Hoặc chạy kiểm thử mô phỏng toàn bộ luồng xử lý
npm run test:simulate
```

Server sẽ khởi chạy tại:
- **Webhook endpoint**: `http://localhost:3000/webhook/zalo`
- **Health check**: `http://localhost:3000/health`
- **Danh mục chuẩn**: `http://localhost:3000/api/categories`

#### Bước 4.3: Mở tunnel ra Internet bằng Ngrok (cho Webhook Zalo)
```bash
ngrok http 3000
```
Sau đó dán URL dạng `https://xxxx.ngrok-free.app/webhook/zalo` vào phần Webhook trong Zalo Developers Portal.

---

## 🐳 Triển Khai Bằng Docker

Chỉ cần một lệnh duy nhất:
```bash
docker-compose up -d --build
```
Dịch vụ sẽ tự động build image tối ưu với Node 20 Alpine và lắng nghe tại cổng `3000`.

---

## 💬 Kịch Bản Hội Thoại Thực Tế

### Luồng 1: Nhập chi tiêu có đủ thông tin (1 LLM Call)
- **User**: "Ăn trưa cơm tấm 45k"
- **Bot**:
  ```
  ✅ ĐÃ LƯU THÀNH CÔNG!

  📌 Loại: Khoản chi
  💵 Số tiền: 45.000 ₫
  🏷️ Danh mục: 🍜 Ăn uống
  📝 Nội dung: Ăn trưa cơm tấm 45k
  🕒 Thời gian: 12:30 06/09/2026

  [📊 Xem báo cáo hôm nay] [📈 Báo cáo tháng này] [❌ Hủy giao dịch này]
  ```

### Luồng 2: Vòng lặp làm rõ khi thiếu danh mục (Clarification Loop)
- **User**: "Vừa tiêu 200k"
- **Bot**:
  ```
  ❓ CẦN LÀM RÕ THÊM THÔNG TIN
  Bạn vừa chi tiêu 200.000 ₫ cho khoản nào? Vui lòng chọn danh mục bên dưới:

  [🍜 Ăn uống] [🚗 Di chuyển] [🛍️ Mua sắm] [💡 Hóa đơn] [🏠 Nhà ở] [📦 Khác]
  ```
- **User bấm**: `[🍜 Ăn uống]`
- **Bot** *(Xử lý trực tiếp với Supabase, **KHÔNG tốn token LLM**)*:
  ```
  ✅ ĐÃ LƯU THÀNH CÔNG!
  📌 Loại: Khoản chi
  💵 Số tiền: 200.000 ₫
  🏷️ Danh mục: 🍜 Ăn uống
  ```

### Luồng 3: Xem báo cáo tức thì (0 LLM Token)
- **User bấm nút**: `[📊 Xem báo cáo hôm nay]` hoặc gõ `#baocao`
- **Bot**:
  ```
  📊 BÁO CÁO CHI TIÊU (Hôm nay 06/09/2026)
  ━━━━━━━━━━━━━━━━━━
  💰 Tổng chi: 245.000 ₫
  🧾 Tổng số giao dịch: 2 lần

  Chi tiết theo danh mục:
  🍜 Ăn uống: 245.000 ₫ (100.0% - 2 lần)
  ━━━━━━━━━━━━━━━━━━
  💡 Gõ hoặc gửi ảnh bất kỳ để ghi thêm chi tiêu!
  ```
