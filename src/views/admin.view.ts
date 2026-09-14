// ==============================================================================
// ADMIN DASHBOARD WEB UI FOR EXPENSES & CATEGORIES MANAGEMENT
// Project: Zalo Expense Management Chatbot
// ==============================================================================

export function renderAdminHtml(verificationCode: string): string {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="zalo-platform-site-verification" content="${verificationCode}" />
  <title>Quản Trị Thu Chi & Danh Mục - Shop Hoa Xinh</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌸</text></svg>">
  <style>
    :root {
      --primary: #6366f1;
      --primary-hover: #4f46e5;
      --bg: #f8fafc;
      --card-bg: #ffffff;
      --text: #0f172a;
      --text-muted: #64748b;
      --border: #e2e8f0;
      --income: #10b981;
      --income-bg: #ecfdf5;
      --expense: #ef4444;
      --expense-bg: #fef2f2;
      --radius: 16px;
      --shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05);
      --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.08);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
      padding-bottom: 60px;
    }

    .header {
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      color: white;
      padding: 20px 20px 32px;
      box-shadow: var(--shadow);
    }
    .header-container {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-icon {
      font-size: 34px;
      background: rgba(255, 255, 255, 0.2);
      width: 52px;
      height: 52px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 14px;
      backdrop-filter: blur(8px);
    }
    .brand-title {
      font-size: 22px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .brand-desc {
      font-size: 13px;
      opacity: 0.88;
    }

    .auth-badge {
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(255, 255, 255, 0.18);
      padding: 8px 16px;
      border-radius: 9999px;
      backdrop-filter: blur(8px);
      cursor: pointer;
      transition: all 0.2s;
    }
    .auth-badge:hover {
      background: rgba(255, 255, 255, 0.28);
    }
    .auth-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #ef4444;
    }
    .auth-dot.unlocked {
      background: #10b981;
      box-shadow: 0 0 10px #10b981;
    }
    .auth-text {
      font-size: 13px;
      font-weight: 500;
    }

    .container {
      max-width: 1200px;
      margin: -18px auto 0;
      padding: 0 16px;
    }

    /* Main Navigation Tabs */
    .nav-tabs-wrapper {
      background: var(--card-bg);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      border: 1px solid var(--border);
      padding: 6px;
      display: inline-flex;
      gap: 8px;
      margin-bottom: 20px;
      width: 100%;
      max-width: 520px;
    }
    .nav-tab-btn {
      flex: 1;
      border: none;
      background: transparent;
      padding: 10px 18px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s;
    }
    .nav-tab-btn.active {
      background: var(--primary);
      color: white;
      box-shadow: 0 2px 6px rgba(99, 102, 241, 0.35);
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 20px;
    }
    .stat-card {
      background: var(--card-bg);
      padding: 18px 20px;
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      border: 1px solid var(--border);
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .stat-icon {
      font-size: 26px;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
      background: #f1f5f9;
    }
    .stat-value {
      font-size: 22px;
      font-weight: 700;
      color: var(--text);
      letter-spacing: -0.5px;
    }
    .stat-label {
      font-size: 13px;
      color: var(--text-muted);
      margin-top: 2px;
    }

    .controls-bar {
      background: var(--card-bg);
      padding: 16px 20px;
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      border: 1px solid var(--border);
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }
    .filter-tabs {
      display: flex;
      gap: 6px;
      background: #f1f5f9;
      padding: 4px;
      border-radius: 10px;
      flex-wrap: wrap;
    }
    .tab-btn {
      border: none;
      background: transparent;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      color: var(--text-muted);
      transition: all 0.2s;
    }
    .tab-btn.active {
      background: white;
      color: var(--primary);
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }

    .search-box {
      display: flex;
      align-items: center;
      background: #f1f5f9;
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 0 12px;
      height: 38px;
      min-width: 220px;
    }
    .search-box input {
      border: none;
      background: transparent;
      outline: none;
      font-size: 13px;
      width: 100%;
      color: var(--text);
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 9px 18px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }
    .btn-sm {
      padding: 5px 10px;
      font-size: 12px;
      border-radius: 6px;
    }
    .btn-primary {
      background: var(--primary);
      color: white;
    }
    .btn-primary:hover {
      background: var(--primary-hover);
      transform: translateY(-1px);
    }
    .btn-outline {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text);
    }
    .btn-outline:hover {
      background: #f8fafc;
    }

    .section-title {
      font-size: 17px;
      font-weight: 700;
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* Table Styles */
    .table-container {
      background: var(--card-bg);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      border: 1px solid var(--border);
      overflow: hidden;
      margin-bottom: 24px;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 14px;
    }
    .data-table th {
      background: #f8fafc;
      padding: 12px 16px;
      font-weight: 600;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .data-table td {
      padding: 14px 16px;
      border-bottom: 1px solid var(--border);
      color: var(--text);
      vertical-align: middle;
    }
    .data-table tr:last-child td {
      border-bottom: none;
    }
    .data-table tr:hover td {
      background: #f8fafc;
    }

    .tx-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 9999px;
    }
    .tx-badge-income {
      background: var(--income-bg);
      color: var(--income);
    }
    .tx-badge-expense {
      background: var(--expense-bg);
      color: var(--expense);
    }

    .amount-income {
      color: var(--income);
      font-weight: 700;
      font-size: 15px;
    }
    .amount-expense {
      color: var(--expense);
      font-weight: 700;
      font-size: 15px;
    }

    /* Categories Grid */
    .categories-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }
    .category-card {
      background: var(--card-bg);
      border-radius: var(--radius);
      padding: 18px;
      box-shadow: var(--shadow);
      border: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      transition: all 0.2s;
    }
    .category-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-lg);
    }
    .category-info {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .category-emoji {
      font-size: 28px;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
      background: #f8fafc;
      border: 1px solid var(--border);
    }
    .category-name {
      font-size: 16px;
      font-weight: 600;
      color: var(--text);
    }
    .category-type-badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 9999px;
      margin-top: 4px;
    }
    .badge-income { background: var(--income-bg); color: var(--income); }
    .badge-expense { background: var(--expense-bg); color: var(--expense); }

    .card-actions {
      display: flex;
      gap: 6px;
    }
    .action-btn {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: white;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      transition: all 0.15s;
    }
    .action-btn:hover {
      background: #f1f5f9;
      color: var(--text);
    }
    .action-btn.delete:hover {
      background: var(--expense-bg);
      color: var(--expense);
      border-color: #fca5a5;
    }

    .pagination-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background: #f8fafc;
      border-top: 1px solid var(--border);
      font-size: 13px;
      color: var(--text-muted);
    }

    /* Modal Styles */
    .modal-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999;
      padding: 20px;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease;
    }
    .modal-overlay.active {
      opacity: 1;
      pointer-events: auto;
    }
    .modal {
      background: white;
      width: 100%;
      max-width: 520px;
      max-height: 90vh;
      overflow-y: auto;
      border-radius: 20px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      padding: 24px;
      transform: scale(0.95);
      transition: transform 0.2s ease;
    }
    .modal-overlay.active .modal {
      transform: scale(1);
    }
    .modal-title {
      font-size: 19px;
      font-weight: 700;
      margin-bottom: 8px;
      color: var(--text);
    }
    .modal-desc {
      font-size: 13px;
      color: var(--text-muted);
      margin-bottom: 20px;
    }

    .form-group {
      margin-bottom: 16px;
    }
    .form-label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 6px;
      color: var(--text);
    }
    .form-input, .form-select {
      width: 100%;
      padding: 10px 14px;
      border-radius: 10px;
      border: 1px solid var(--border);
      font-size: 14px;
      outline: none;
      color: var(--text);
      background: white;
      transition: border-color 0.2s;
    }
    .form-input:focus, .form-select:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
    }

    .type-selector {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .type-opt {
      border: 2px solid var(--border);
      border-radius: 12px;
      padding: 10px;
      text-align: center;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      transition: all 0.2s;
    }
    .type-opt.selected-income {
      border-color: var(--income);
      background: var(--income-bg);
      color: var(--income);
    }
    .type-opt.selected-expense {
      border-color: var(--expense);
      background: var(--expense-bg);
      color: var(--expense);
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 24px;
    }

    /* Emoji Picker Styles */
    .emoji-picker-container {
      background: #f8fafc;
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 12px;
      margin-top: 8px;
    }
    .emoji-picker-header {
      margin-bottom: 8px;
    }
    .emoji-search-input {
      width: 100%;
      padding: 8px 12px;
      border-radius: 8px;
      border: 1px solid var(--border);
      font-size: 13px;
      outline: none;
      background: white;
    }
    .emoji-cat-tabs {
      display: flex;
      gap: 4px;
      overflow-x: auto;
      padding-bottom: 6px;
      margin-bottom: 8px;
    }
    .emoji-cat-btn {
      border: none;
      background: white;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 4px 8px;
      font-size: 12px;
      cursor: pointer;
      white-space: nowrap;
      color: var(--text-muted);
    }
    .emoji-cat-btn.active {
      background: var(--primary);
      color: white;
      border-color: var(--primary);
    }
    .emoji-grid-scroll {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(36px, 1fr));
      gap: 6px;
      max-height: 160px;
      overflow-y: auto;
      padding: 4px;
    }
    .emoji-grid-item {
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      border-radius: 8px;
      cursor: pointer;
      background: white;
      border: 1px solid transparent;
      transition: all 0.15s;
    }
    .emoji-grid-item:hover {
      transform: scale(1.2);
      background: #eef2ff;
      border-color: #c7d2fe;
    }
    .emoji-grid-item.selected {
      background: #e0e7ff;
      border-color: var(--primary);
    }

    /* Toast */
    .toast-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .toast {
      background: #0f172a;
      color: white;
      padding: 12px 20px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 500;
      box-shadow: var(--shadow-lg);
      display: flex;
      align-items: center;
      gap: 10px;
      animation: slideUp 0.3s ease;
    }
    @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  </style>
</head>
<body>

  <header class="header">
    <div class="header-container">
      <div class="brand">
        <div class="brand-icon">🌸</div>
        <div>
          <h1 class="brand-title">Shop Hoa Xinh</h1>
          <p class="brand-desc">Hệ thống Quản Trị Thu Chi & Danh Mục - Zalo Expense Bot</p>
        </div>
      </div>
      <div class="auth-badge" id="authBadge" onclick="openPinModal()">
        <div class="auth-dot" id="authDot"></div>
        <span class="auth-text" id="authText">Nhập mã PIN Admin</span>
      </div>
    </div>
  </header>

  <main class="container">
    <!-- Main Navigation Tabs -->
    <div class="nav-tabs-wrapper">
      <button class="nav-tab-btn active" id="tabBtnTransactions" onclick="switchView('TRANSACTIONS')">
        📊 Quản Lý Thu & Chi
      </button>
      <button class="nav-tab-btn" id="tabBtnCategories" onclick="switchView('CATEGORIES')">
        🏷️ Danh Mục Thu & Chi
      </button>
    </div>

    <!-- ===================================================================== -->
    <!-- VIEW 1: QUẢN LÝ THU & CHI (TRANSACTIONS VIEW)                         -->
    <!-- ===================================================================== -->
    <section id="transactionsView">
      <!-- KPI Statistics -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon" style="background: var(--income-bg); color: var(--income)">🌸</div>
          <div>
            <div class="stat-value" id="txTotalIncome" style="color: var(--income);">0 ₫</div>
            <div class="stat-label">Tổng Thu (Bán hàng)</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background: var(--expense-bg); color: var(--expense)">💸</div>
          <div>
            <div class="stat-value" id="txTotalExpense" style="color: var(--expense);">0 ₫</div>
            <div class="stat-label">Tổng Chi (Chi phí)</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background: #eef2ff; color: var(--primary);">⚖️</div>
          <div>
            <div class="stat-value" id="txNetAmount">0 ₫</div>
            <div class="stat-label">Lợi Nhuận / Số Dư Ròng</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📋</div>
          <div>
            <div class="stat-value" id="txTotalCount">0</div>
            <div class="stat-label">Tổng số giao dịch</div>
          </div>
        </div>
      </div>

      <!-- Controls and Filters -->
      <div class="controls-bar">
        <div class="filter-tabs">
          <button class="tab-btn active" onclick="setTxPeriod('ALL', this)">Tất cả</button>
          <button class="tab-btn" onclick="setTxPeriod('TODAY', this)">Hôm nay</button>
          <button class="tab-btn" onclick="setTxPeriod('WEEK', this)">7 ngày qua</button>
          <button class="tab-btn" onclick="setTxPeriod('MONTH', this)">Tháng này</button>
        </div>

        <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
          <!-- Lọc loại -->
          <div class="filter-tabs">
            <button class="tab-btn active" onclick="setTxType('ALL', this)">Tất cả loại</button>
            <button class="tab-btn" onclick="setTxType('INCOME', this)">🌸 Thu</button>
            <button class="tab-btn" onclick="setTxType('EXPENSE', this)">💸 Chi</button>
          </div>

          <!-- Lọc danh mục -->
          <select class="form-select" id="txCategoryFilter" style="width: 150px; padding: 6px 10px; font-size: 13px;" onchange="handleTxFilterChange()">
            <option value="">Tất cả danh mục</option>
          </select>

          <!-- Tìm kiếm -->
          <div class="search-box">
            <span>🔍</span>
            <input type="text" id="txSearchInput" placeholder="Tìm mặt hàng, ghi chú..." oninput="handleTxSearch(this.value)" />
          </div>

          <!-- Nút thêm giao dịch -->
          <button class="btn btn-primary" onclick="openAddTxModal()">
            <span>➕</span> Thêm Giao Dịch
          </button>
        </div>
      </div>

      <!-- Bảng Giao Dịch -->
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Thời Gian</th>
              <th>Loại</th>
              <th>Danh Mục</th>
              <th>Mặt Hàng / Nội Dung</th>
              <th>Số Tiền</th>
              <th>Nguồn Tạo</th>
              <th style="text-align: right;">Hành Động</th>
            </tr>
          </thead>
          <tbody id="transactionsTbody">
            <tr>
              <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px;">
                Đang tải danh sách giao dịch...
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Phân trang -->
        <div class="pagination-bar">
          <span id="txPaginationInfo">Hiển thị 0 giao dịch</span>
          <div style="display: flex; gap: 6px;">
            <button class="btn btn-outline btn-sm" id="txPrevBtn" onclick="changeTxPage(-1)" disabled>◀ Trước</button>
            <button class="btn btn-outline btn-sm" id="txNextBtn" onclick="changeTxPage(1)" disabled>Sau ▶</button>
          </div>
        </div>
      </div>
    </section>

    <!-- ===================================================================== -->
    <!-- VIEW 2: QUẢN TRỊ DANH MỤC (CATEGORIES VIEW)                           -->
    <!-- ===================================================================== -->
    <section id="categoriesView" style="display: none;">
      <!-- Statistics -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">📊</div>
          <div>
            <div class="stat-value" id="catTotalCount">0</div>
            <div class="stat-label">Tổng số danh mục</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background: var(--income-bg); color: var(--income)">🌸</div>
          <div>
            <div class="stat-value" id="catIncomeCount">0</div>
            <div class="stat-label">Mặt hàng bán (Thu)</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background: var(--expense-bg); color: var(--expense)">💸</div>
          <div>
            <div class="stat-value" id="catExpenseCount">0</div>
            <div class="stat-label">Khoản chi phí (Chi)</div>
          </div>
        </div>
      </div>

      <!-- Controls -->
      <div class="controls-bar">
        <div class="filter-tabs">
          <button class="tab-btn active" onclick="setCatFilter('ALL', this)">Tất cả</button>
          <button class="tab-btn" onclick="setCatFilter('INCOME', this)">🌸 Mặt hàng bán (Thu)</button>
          <button class="tab-btn" onclick="setCatFilter('EXPENSE', this)">💸 Khoản chi (Chi)</button>
        </div>
        <div>
          <button class="btn btn-primary" onclick="openAddCatModal()">
            <span>➕</span> Thêm Danh Mục Mới
          </button>
        </div>
      </div>

      <!-- Danh mục THU -->
      <div id="incomeSection">
        <h2 class="section-title">🌸 Mặt Hàng Bán Hàng (THU NHẬP)</h2>
        <div class="categories-grid" id="incomeGrid">
          <div style="color: var(--text-muted); font-size: 14px;">Đang tải danh mục...</div>
        </div>
      </div>

      <!-- Danh mục CHI -->
      <div id="expenseSection">
        <h2 class="section-title">💸 Khoản Chi Phí Vận Hành (CHI TIÊU)</h2>
        <div class="categories-grid" id="expenseGrid">
          <div style="color: var(--text-muted); font-size: 14px;">Đang tải danh mục...</div>
        </div>
      </div>
    </section>
  </main>

  <!-- ===================================================================== -->
  <!-- MODAL: NHẬP MÃ PIN ADMIN                                              -->
  <!-- ===================================================================== -->
  <div class="modal-overlay" id="pinModal">
    <div class="modal">
      <h3 class="modal-title">🔐 Mở Khóa Quyền Admin</h3>
      <p class="modal-desc">Vui lòng nhập mã PIN của chủ shop để có quyền thêm, sửa hoặc xóa dữ liệu.</p>
      <form onsubmit="handlePinSubmit(event)">
        <div class="form-group">
          <label class="form-label">Mã PIN Quản Trị:</label>
          <input type="password" class="form-input" id="pinInput" placeholder="Nhập mã PIN (mặc định: 123456)" required autocomplete="off" autofocus />
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-outline" onclick="closeModal('pinModal')">Đóng</button>
          <button type="submit" class="btn btn-primary">Xác Nhận</button>
        </div>
      </form>
    </div>
  </div>

  <!-- ===================================================================== -->
  <!-- MODALS: GIAO DỊCH (THÊM, SỬA, XÓA)                                   -->
  <!-- ===================================================================== -->

  <!-- MODAL THÊM GIAO DỊCH MỚI -->
  <div class="modal-overlay" id="addTxModal">
    <div class="modal">
      <h3 class="modal-title">➕ Thêm Giao Dịch Thu / Chi Mới</h3>
      <p class="modal-desc">Nhập khoản thu bán hàng hoặc khoản chi phí thủ công vào sổ của shop.</p>
      <form onsubmit="handleAddTxSubmit(event)">
        <div class="form-group">
          <label class="form-label">Loại giao dịch:</label>
          <div class="type-selector">
            <div class="type-opt selected-income" id="txAddTypeIncome" onclick="selectTxAddType('INCOME')">🌸 Thu (Bán hàng)</div>
            <div class="type-opt" id="txAddTypeExpense" onclick="selectTxAddType('EXPENSE')">💸 Chi (Chi phí)</div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Số tiền (VNĐ):</label>
          <input type="number" class="form-input" id="txAddAmount" placeholder="Ví dụ: 150000" min="1000" step="1000" required oninput="previewTxAmount(this.value, 'txAddAmountPreview')" />
          <div id="txAddAmountPreview" style="font-size: 13px; color: var(--primary); font-weight: 600; margin-top: 4px;"></div>
        </div>

        <div class="form-group">
          <label class="form-label">Danh mục:</label>
          <select class="form-select" id="txAddCategory" required>
            <option value="">-- Chọn danh mục --</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Mặt hàng / Nội dung / Ghi chú:</label>
          <input type="text" class="form-input" id="txAddDescription" placeholder="Ví dụ: Bó hoa sáp 5 bông, Tiền cước bưu điện..." required />
        </div>

        <div class="form-group">
          <label class="form-label">Thời gian giao dịch:</label>
          <input type="datetime-local" class="form-input" id="txAddDate" required />
        </div>

        <div class="modal-actions">
          <button type="button" class="btn btn-outline" onclick="closeModal('addTxModal')">Hủy</button>
          <button type="submit" class="btn btn-primary">Lưu Giao Dịch</button>
        </div>
      </form>
    </div>
  </div>

  <!-- MODAL SỬA GIAO DỊCH -->
  <div class="modal-overlay" id="editTxModal">
    <div class="modal">
      <h3 class="modal-title">✏️ Chỉnh Sửa Giao Dịch</h3>
      <p class="modal-desc">Cập nhật lại số tiền, danh mục hoặc nội dung của giao dịch.</p>
      <form onsubmit="handleEditTxSubmit(event)">
        <input type="hidden" id="txEditId" />
        <div class="form-group">
          <label class="form-label">Loại giao dịch:</label>
          <div class="type-selector">
            <div class="type-opt" id="txEditTypeIncome" onclick="selectTxEditType('INCOME')">🌸 Thu (Bán hàng)</div>
            <div class="type-opt" id="txEditTypeExpense" onclick="selectTxEditType('EXPENSE')">💸 Chi (Chi phí)</div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Số tiền (VNĐ):</label>
          <input type="number" class="form-input" id="txEditAmount" min="1000" step="1000" required oninput="previewTxAmount(this.value, 'txEditAmountPreview')" />
          <div id="txEditAmountPreview" style="font-size: 13px; color: var(--primary); font-weight: 600; margin-top: 4px;"></div>
        </div>

        <div class="form-group">
          <label class="form-label">Danh mục:</label>
          <select class="form-select" id="txEditCategory" required>
            <option value="">-- Chọn danh mục --</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Mặt hàng / Nội dung / Ghi chú:</label>
          <input type="text" class="form-input" id="txEditDescription" required />
        </div>

        <div class="form-group">
          <label class="form-label">Thời gian giao dịch:</label>
          <input type="datetime-local" class="form-input" id="txEditDate" required />
        </div>

        <div class="modal-actions">
          <button type="button" class="btn btn-outline" onclick="closeModal('editTxModal')">Hủy</button>
          <button type="submit" class="btn btn-primary">Lưu Thay Đổi</button>
        </div>
      </form>
    </div>
  </div>

  <!-- MODAL XÓA GIAO DỊCH -->
  <div class="modal-overlay" id="deleteTxModal">
    <div class="modal">
      <h3 class="modal-title" style="color: var(--expense)">🗑️ Xác Nhận Xóa Giao Dịch</h3>
      <p class="modal-desc" id="deleteTxMsg">Bạn có chắc chắn muốn xóa giao dịch này không?</p>
      <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 12px; border-radius: 10px; font-size: 13px; color: #991b1b; margin-bottom: 20px;">
        ⚠️ <strong>Lưu ý:</strong> Giao dịch bị xóa sẽ được gỡ hoàn toàn khỏi sổ và trừ ra khỏi báo cáo tổng thu chi.
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-outline" onclick="closeModal('deleteTxModal')">Hủy</button>
        <button type="button" class="btn" style="background: var(--expense); color: white;" onclick="confirmDeleteTx()">Xóa Giao Dịch</button>
      </div>
    </div>
  </div>

  <!-- ===================================================================== -->
  <!-- MODALS: DANH MỤC (THÊM, SỬA, XÓA)                                     -->
  <!-- ===================================================================== -->

  <!-- MODAL: THÊM DANH MỤC MỚI -->
  <div class="modal-overlay" id="addCatModal">
    <div class="modal">
      <h3 class="modal-title">➕ Thêm Danh Mục Mới</h3>
      <p class="modal-desc">Thêm mặt hàng bán mới hoặc khoản chi phí mới cho shop.</p>
      <form onsubmit="handleAddCatSubmit(event)">
        <div class="form-group">
          <label class="form-label">Loại danh mục:</label>
          <div class="type-selector">
            <div class="type-opt selected-income" id="typeIncomeOpt" onclick="selectCatType('INCOME')">🌸 Thu (Bán hàng)</div>
            <div class="type-opt" id="typeExpenseOpt" onclick="selectCatType('EXPENSE')">💸 Chi (Chi phí)</div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Tên danh mục:</label>
          <input type="text" class="form-input" id="addNameInput" placeholder="Ví dụ: Bó hoa sáp, Tiền điện..." required />
        </div>

        <div class="form-group">
          <label class="form-label">Biểu tượng (Icon / Emoji):</label>
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
            <input type="text" class="form-input" id="addIconInput" value="🌸" style="width: 70px; text-align: center; font-size: 24px; padding: 6px;" maxlength="4" />
            <span style="font-size: 13px; color: var(--text-muted);">Bấm emoji bên dưới hoặc dán emoji tùy ý</span>
          </div>
          <div class="emoji-picker-container" id="addEmojiPicker"></div>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn btn-outline" onclick="closeModal('addCatModal')">Hủy</button>
          <button type="submit" class="btn btn-primary" id="addSubmitBtn">Lưu Danh Mục</button>
        </div>
      </form>
    </div>
  </div>

  <!-- MODAL: SỬA DANH MỤC -->
  <div class="modal-overlay" id="editCatModal">
    <div class="modal">
      <h3 class="modal-title">✏️ Chỉnh Sửa Danh Mục</h3>
      <p class="modal-desc">Thay đổi tên hoặc icon biểu tượng của danh mục.</p>
      <form onsubmit="handleEditCatSubmit(event)">
        <input type="hidden" id="editCatId" />
        <div class="form-group">
          <label class="form-label">Tên danh mục:</label>
          <input type="text" class="form-input" id="editNameInput" required />
        </div>
        <div class="form-group">
          <label class="form-label">Biểu tượng (Icon / Emoji):</label>
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
            <input type="text" class="form-input" id="editIconInput" style="width: 70px; text-align: center; font-size: 24px; padding: 6px;" maxlength="4" />
            <span style="font-size: 13px; color: var(--text-muted);">Bấm emoji bên dưới hoặc dán emoji tùy ý</span>
          </div>
          <div class="emoji-picker-container" id="editEmojiPicker"></div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-outline" onclick="closeModal('editCatModal')">Hủy</button>
          <button type="submit" class="btn btn-primary">Lưu Thay Đổi</button>
        </div>
      </form>
    </div>
  </div>

  <!-- MODAL: XÁC NHẬN XÓA DANH MỤC -->
  <div class="modal-overlay" id="deleteCatModal">
    <div class="modal">
      <h3 class="modal-title" style="color: var(--expense)">🗑️ Xác Nhận Xóa Danh Mục</h3>
      <p class="modal-desc" id="deleteCatMsg">Bạn có chắc chắn muốn xóa danh mục này không?</p>
      <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 12px; border-radius: 10px; font-size: 13px; color: #991b1b; margin-bottom: 20px;">
        🛡️ <strong>Bảo toàn lịch sử:</strong> Các đơn hàng hoặc khoản chi cũ thuộc danh mục này sẽ tự động chuyển về mục <strong>"Khác"</strong> để không bao giờ bị lệch tổng doanh thu.
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-outline" onclick="closeModal('deleteCatModal')">Hủy</button>
        <button type="button" class="btn" style="background: var(--expense); color: white;" onclick="confirmDeleteCat()">Xóa Danh Mục</button>
      </div>
    </div>
  </div>

  <div class="toast-container" id="toastContainer"></div>

  <script>
    // State quản trị
    let currentMainView = 'TRANSACTIONS';
    let adminPin = localStorage.getItem('zalo_bot_admin_pin') || '';

    // State danh mục
    let categories = [];
    let currentCatFilter = 'ALL';
    let selectedCatType = 'INCOME';
    let deleteTargetCatId = null;

    // State giao dịch
    let transactions = [];
    let txPage = 1;
    let txLimit = 20;
    let txTotal = 0;
    let txCurrentPeriod = 'ALL';
    let txCurrentType = 'ALL';
    let txCurrentCategoryId = '';
    let txCurrentSearch = '';
    let txSearchTimeout = null;
    let deleteTargetTxId = null;
    let txAddSelectedType = 'INCOME';
    let txEditSelectedType = 'INCOME';

    async function init() {
      updateAuthUI();
      await fetchCategories();
      await fetchTransactions();
    }

    function switchView(view) {
      currentMainView = view;
      const tabTransactions = document.getElementById('tabBtnTransactions');
      const tabCategories = document.getElementById('tabBtnCategories');
      const viewTransactions = document.getElementById('transactionsView');
      const viewCategories = document.getElementById('categoriesView');

      if (view === 'TRANSACTIONS') {
        tabTransactions.classList.add('active');
        tabCategories.classList.remove('active');
        viewTransactions.style.display = 'block';
        viewCategories.style.display = 'none';
        fetchTransactions();
      } else {
        tabTransactions.classList.remove('active');
        tabCategories.classList.add('active');
        viewTransactions.style.display = 'none';
        viewCategories.style.display = 'block';
        renderCategories();
      }
    }

    function updateAuthUI() {
      const authDot = document.getElementById('authDot');
      const authText = document.getElementById('authText');
      if (adminPin) {
        authDot.classList.add('unlocked');
        authText.innerText = 'Admin: Đã Mở Khóa';
      } else {
        authDot.classList.remove('unlocked');
        authText.innerText = 'Nhập mã PIN Admin';
      }
    }

    function formatVND(num) {
      const val = Number(num) || 0;
      return val.toLocaleString('vi-VN') + ' ₫';
    }

    function formatDateTime(isoStr) {
      if (!isoStr) return '--';
      try {
        const d = new Date(isoStr);
        const pad = (n) => String(n).padStart(2, '0');
        return \`\${pad(d.getHours())}:\${pad(d.getMinutes())} \${pad(d.getDate())}/\${pad(d.getMonth() + 1)}/\${d.getFullYear()}\`;
      } catch (e) {
        return isoStr;
      }
    }

    function toLocalIsoString(d) {
      const pad = (n) => String(n).padStart(2, '0');
      return \`\${d.getFullYear()}-\${pad(d.getMonth() + 1)}-\${pad(d.getDate())}T\${pad(d.getHours())}:\${pad(d.getMinutes())}\`;
    }

    function escapeHtml(str) {
      return (str || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
    }

    // =========================================================================
    // LOGIC GIAO DỊCH (TRANSACTIONS)
    // =========================================================================

    async function fetchTransactions() {
      try {
        const params = new URLSearchParams();
        params.append('page', txPage);
        params.append('limit', txLimit);
        if (txCurrentType !== 'ALL') params.append('type', txCurrentType);
        if (txCurrentCategoryId) params.append('categoryId', txCurrentCategoryId);
        if (txCurrentSearch) params.append('search', txCurrentSearch);

        // Khoảng thời gian
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');

        if (txCurrentPeriod === 'TODAY') {
          params.append('startDate', \`\${y}-\${m}-\${d}T00:00:00.000+07:00\`);
          params.append('endDate', \`\${y}-\${m}-\${d}T23:59:59.999+07:00\`);
        } else if (txCurrentPeriod === 'WEEK') {
          const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          params.append('startDate', past.toISOString());
          params.append('endDate', now.toISOString());
        } else if (txCurrentPeriod === 'MONTH') {
          params.append('startDate', \`\${y}-\${m}-01T00:00:00.000+07:00\`);
          const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
          params.append('endDate', \`\${y}-\${m}-\${lastDay}T23:59:59.999+07:00\`);
        }

        const res = await fetch(\`/api/transactions?\${params.toString()}\`);
        const data = await res.json();
        if (data.success) {
          transactions = data.transactions;
          txTotal = data.total;
          renderTransactionsTable();
          renderTxKPI(data.summary, data.total);
          renderTxPagination();
        }
      } catch (err) {
        showToast('Lỗi tải giao dịch: ' + err.message);
      }
    }

    function renderTxKPI(summary, total) {
      document.getElementById('txTotalIncome').innerText = formatVND(summary?.totalIncome || 0);
      document.getElementById('txTotalExpense').innerText = formatVND(summary?.totalExpense || 0);

      const net = summary?.netAmount || 0;
      const netElem = document.getElementById('txNetAmount');
      netElem.innerText = formatVND(net);
      netElem.style.color = net >= 0 ? 'var(--income)' : 'var(--expense)';

      document.getElementById('txTotalCount').innerText = total || 0;
    }

    function renderTransactionsTable() {
      const tbody = document.getElementById('transactionsTbody');
      if (!transactions.length) {
        tbody.innerHTML = \`
          <tr>
            <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 32px;">
              Chưa có giao dịch nào phù hợp với bộ lọc hiện tại.
            </td>
          </tr>
        \`;
        return;
      }

      tbody.innerHTML = transactions.map(tx => {
        const isIncome = tx.transaction_type === 'INCOME';
        const badgeClass = isIncome ? 'tx-badge-income' : 'tx-badge-expense';
        const badgeText = isIncome ? '🌸 Thu' : '💸 Chi';
        const amountClass = isIncome ? 'amount-income' : 'amount-expense';
        const amountPrefix = isIncome ? '+' : '-';
        const catName = tx.category?.name || 'Khác';
        const catIcon = tx.category?.icon || (isIncome ? '🌸' : '💸');
        const source = tx.raw_input?.includes('Web Admin') ? '🌐 Web Admin' : '🤖 Zalo Bot';

        return \`
          <tr>
            <td style="white-space: nowrap; font-size: 13px; color: var(--text-muted);">
              \${formatDateTime(tx.transaction_date || tx.created_at)}
            </td>
            <td>
              <span class="tx-badge \${badgeClass}">\${badgeText}</span>
            </td>
            <td>
              <strong>\${catIcon} \${escapeHtml(catName)}</strong>
            </td>
            <td>
              <div style="font-weight: 500;">\${escapeHtml(tx.description || catName)}</div>
              \${tx.raw_input && !tx.raw_input.includes('Web Admin') ? \`<div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">\${escapeHtml(tx.raw_input)}</div>\` : ''}
            </td>
            <td>
              <span class="\${amountClass}">\${amountPrefix}\${formatVND(tx.amount)}</span>
            </td>
            <td style="font-size: 12px; color: var(--text-muted);">
              \${source}
            </td>
            <td style="text-align: right; white-space: nowrap;">
              <button class="action-btn" style="display: inline-flex;" title="Chỉnh sửa" onclick="openEditTxModal('\${tx.id}')">✏️</button>
              <button class="action-btn delete" style="display: inline-flex;" title="Xóa giao dịch" onclick="openDeleteTxModal('\${tx.id}', '\${escapeHtml(tx.description || catName)}', \${tx.amount})">🗑️</button>
            </td>
          </tr>
        \`;
      }).join('');
    }

    function renderTxPagination() {
      const totalPages = Math.ceil(txTotal / txLimit) || 1;
      const start = txTotal === 0 ? 0 : (txPage - 1) * txLimit + 1;
      const end = Math.min(txPage * txLimit, txTotal);
      document.getElementById('txPaginationInfo').innerText = \`Hiển thị \${start} - \${end} / \${txTotal} giao dịch (Trang \${txPage}/\${totalPages})\`;

      document.getElementById('txPrevBtn').disabled = txPage <= 1;
      document.getElementById('txNextBtn').disabled = txPage >= totalPages;
    }

    function changeTxPage(delta) {
      txPage += delta;
      fetchTransactions();
    }

    function setTxPeriod(period, btn) {
      txCurrentPeriod = period;
      txPage = 1;
      btn.parentElement.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      fetchTransactions();
    }

    function setTxType(type, btn) {
      txCurrentType = type;
      txPage = 1;
      btn.parentElement.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      fetchTransactions();
    }

    function handleTxFilterChange() {
      txCurrentCategoryId = document.getElementById('txCategoryFilter').value;
      txPage = 1;
      fetchTransactions();
    }

    function handleTxSearch(val) {
      clearTimeout(txSearchTimeout);
      txSearchTimeout = setTimeout(() => {
        txCurrentSearch = val.trim();
        txPage = 1;
        fetchTransactions();
      }, 350);
    }

    function previewTxAmount(val, targetId) {
      const el = document.getElementById(targetId);
      if (!val || Number(val) <= 0) {
        el.innerText = '';
        return;
      }
      el.innerText = '👉 ' + formatVND(val);
    }

    function openAddTxModal() {
      if (!checkAuthRequired()) return;
      document.getElementById('txAddAmount').value = '';
      document.getElementById('txAddAmountPreview').innerText = '';
      document.getElementById('txAddDescription').value = '';
      document.getElementById('txAddDate').value = toLocalIsoString(new Date());
      selectTxAddType('INCOME');
      openModal('addTxModal');
    }

    function selectTxAddType(type) {
      txAddSelectedType = type;
      const incOpt = document.getElementById('txAddTypeIncome');
      const expOpt = document.getElementById('txAddTypeExpense');
      if (type === 'INCOME') {
        incOpt.className = 'type-opt selected-income';
        expOpt.className = 'type-opt';
      } else {
        expOpt.className = 'type-opt selected-expense';
        incOpt.className = 'type-opt';
      }
      populateCategoryDropdown('txAddCategory', type);
    }

    async function handleAddTxSubmit(e) {
      e.preventDefault();
      const amount = Number(document.getElementById('txAddAmount').value);
      const category_id = document.getElementById('txAddCategory').value;
      const description = document.getElementById('txAddDescription').value.trim();
      const dateVal = document.getElementById('txAddDate').value;
      const transaction_date = dateVal ? new Date(dateVal).toISOString() : new Date().toISOString();

      try {
        const res = await fetch('/api/transactions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-pin': adminPin
          },
          body: JSON.stringify({
            amount,
            category_id: category_id ? parseInt(category_id, 10) : null,
            transaction_type: txAddSelectedType,
            description,
            transaction_date
          })
        });
        const data = await res.json();
        if (data.success) {
          closeModal('addTxModal');
          showToast('✅ Đã thêm giao dịch thành công!');
          fetchTransactions();
        } else {
          if (res.status === 401) openPinModal();
          showToast('❌ ' + (data.error || 'Lỗi thêm giao dịch'));
        }
      } catch (err) {
        showToast('Lỗi: ' + err.message);
      }
    }

    function openEditTxModal(id) {
      if (!checkAuthRequired()) return;
      const tx = transactions.find(t => t.id === id);
      if (!tx) return;

      document.getElementById('txEditId').value = tx.id;
      document.getElementById('txEditAmount').value = tx.amount;
      previewTxAmount(tx.amount, 'txEditAmountPreview');
      document.getElementById('txEditDescription').value = tx.description || '';

      const txDate = tx.transaction_date ? new Date(tx.transaction_date) : new Date();
      document.getElementById('txEditDate').value = toLocalIsoString(txDate);

      selectTxEditType(tx.transaction_type);
      document.getElementById('txEditCategory').value = tx.category_id || '';
      openModal('editTxModal');
    }

    function selectTxEditType(type) {
      txEditSelectedType = type;
      const incOpt = document.getElementById('txEditTypeIncome');
      const expOpt = document.getElementById('txEditTypeExpense');
      if (type === 'INCOME') {
        incOpt.className = 'type-opt selected-income';
        expOpt.className = 'type-opt';
      } else {
        expOpt.className = 'type-opt selected-expense';
        incOpt.className = 'type-opt';
      }
      populateCategoryDropdown('txEditCategory', type);
    }

    async function handleEditTxSubmit(e) {
      e.preventDefault();
      const id = document.getElementById('txEditId').value;
      const amount = Number(document.getElementById('txEditAmount').value);
      const category_id = document.getElementById('txEditCategory').value;
      const description = document.getElementById('txEditDescription').value.trim();
      const dateVal = document.getElementById('txEditDate').value;
      const transaction_date = dateVal ? new Date(dateVal).toISOString() : new Date().toISOString();

      try {
        const res = await fetch(\`/api/transactions/\${id}\`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-pin': adminPin
          },
          body: JSON.stringify({
            amount,
            category_id: category_id ? parseInt(category_id, 10) : null,
            transaction_type: txEditSelectedType,
            description,
            transaction_date
          })
        });
        const data = await res.json();
        if (data.success) {
          closeModal('editTxModal');
          showToast('✅ Đã cập nhật giao dịch thành công!');
          fetchTransactions();
        } else {
          if (res.status === 401) openPinModal();
          showToast('❌ ' + (data.error || 'Lỗi cập nhật giao dịch'));
        }
      } catch (err) {
        showToast('Lỗi: ' + err.message);
      }
    }

    function openDeleteTxModal(id, desc, amount) {
      if (!checkAuthRequired()) return;
      deleteTargetTxId = id;
      document.getElementById('deleteTxMsg').innerHTML = \`Bạn có chắc muốn xóa giao dịch <strong>"\${escapeHtml(desc)}"</strong> có số tiền <strong>\${formatVND(amount)}</strong>?\`;
      openModal('deleteTxModal');
    }

    async function confirmDeleteTx() {
      if (!deleteTargetTxId) return;
      try {
        const res = await fetch(\`/api/transactions/\${deleteTargetTxId}\`, {
          method: 'DELETE',
          headers: { 'x-admin-pin': adminPin }
        });
        const data = await res.json();
        if (data.success) {
          closeModal('deleteTxModal');
          showToast('🗑️ Đã xóa giao dịch thành công!');
          deleteTargetTxId = null;
          fetchTransactions();
        } else {
          if (res.status === 401) openPinModal();
          showToast('❌ ' + (data.error || 'Lỗi xóa giao dịch'));
        }
      } catch (err) {
        showToast('Lỗi: ' + err.message);
      }
    }

    function populateCategoryDropdown(elementId, filterType) {
      const select = document.getElementById(elementId);
      if (!select) return;
      const currentVal = select.value;
      const filtered = filterType ? categories.filter(c => c.type === filterType || c.name === 'Khác') : categories;

      select.innerHTML = '<option value="">-- Chọn danh mục --</option>' +
        filtered.map(c => \`<option value="\${c.id}">\${c.icon || ''} \${escapeHtml(c.name)}</option>\`).join('');

      if (currentVal) select.value = currentVal;
    }

    // =========================================================================
    // LOGIC QUẢN TRỊ DANH MỤC (CATEGORIES)
    // =========================================================================

    async function fetchCategories() {
      try {
        const res = await fetch('/api/categories');
        const data = await res.json();
        if (data.success) {
          categories = data.data;

          // Cập nhật bộ lọc danh mục cho giao dịch
          const filterSel = document.getElementById('txCategoryFilter');
          if (filterSel) {
            filterSel.innerHTML = '<option value="">Tất cả danh mục</option>' +
              categories.map(c => \`<option value="\${c.id}">\${c.icon || ''} \${escapeHtml(c.name)}</option>\`).join('');
          }

          renderCategories();
        }
      } catch (err) {
        showToast('Lỗi tải danh mục: ' + err.message);
      }
    }

    function renderCategories() {
      const incomeGrid = document.getElementById('incomeGrid');
      const expenseGrid = document.getElementById('expenseGrid');
      const incomeSection = document.getElementById('incomeSection');
      const expenseSection = document.getElementById('expenseSection');

      const incomeList = categories.filter(c => c.type === 'INCOME');
      const expenseList = categories.filter(c => c.type === 'EXPENSE');

      document.getElementById('catTotalCount').innerText = categories.length;
      document.getElementById('catIncomeCount').innerText = incomeList.length;
      document.getElementById('catExpenseCount').innerText = expenseList.length;

      if (currentCatFilter === 'ALL') {
        incomeSection.style.display = 'block';
        expenseSection.style.display = 'block';
      } else if (currentCatFilter === 'INCOME') {
        incomeSection.style.display = 'block';
        expenseSection.style.display = 'none';
      } else {
        incomeSection.style.display = 'none';
        expenseSection.style.display = 'block';
      }

      incomeGrid.innerHTML = incomeList.length ? incomeList.map(c => renderCatCard(c)).join('') : '<div style="color: var(--text-muted);">Chưa có mặt hàng nào.</div>';
      expenseGrid.innerHTML = expenseList.length ? expenseList.map(c => renderCatCard(c)).join('') : '<div style="color: var(--text-muted);">Chưa có khoản chi nào.</div>';
    }

    function renderCatCard(cat) {
      const isKhac = cat.name.toLowerCase() === 'khác';
      const badgeClass = cat.type === 'INCOME' ? 'badge-income' : 'badge-expense';
      const badgeText = cat.type === 'INCOME' ? '🌸 Bán hàng' : '💸 Chi phí';

      return \`
        <div class="category-card">
          <div class="category-info">
            <div class="category-emoji">\${cat.icon || (cat.type === 'INCOME' ? '🌸' : '💸')}</div>
            <div>
              <div class="category-name">\${escapeHtml(cat.name)}</div>
              <span class="category-type-badge \${badgeClass}">\${badgeText}</span>
            </div>
          </div>
          <div class="card-actions">
            <button class="action-btn" title="Chỉnh sửa" onclick="openEditCatModal(\${cat.id}, '\${escapeHtml(cat.name)}', '\${cat.icon || ''}')">✏️</button>
            \${!isKhac ? \`<button class="action-btn delete" title="Xóa danh mục" onclick="openDeleteCatModal(\${cat.id}, '\${escapeHtml(cat.name)}')">🗑️</button>\` : ''}
          </div>
        </div>
      \`;
    }

    function setCatFilter(filter, btn) {
      currentCatFilter = filter;
      btn.parentElement.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderCategories();
    }

    // Emoji groups
    const EMOJI_GROUPS = [
      {
        name: 'Hoa & Cây',
        icon: '🌸',
        keywords: 'hoa flower bong hong tulip huong duong thien nhien cay la sen thao moc',
        emojis: ['🌸', '🪻', '💐', '🌹', '🥀', '🌺', '🌻', '🌼', '🌷', '🪷', '🪴', '🌲', '🍀', '🌿', '🍃', '🌾', '🌱', '🎋', '🌵', '🌴']
      },
      {
        name: 'Quà & Thủ công',
        icon: '🎁',
        keywords: 'qua gift ribbon no hop qua bong bay phao nen mau ve len moc tranh',
        emojis: ['🎁', '🎀', '🧸', '🎈', '🎉', '🎊', '🎐', '🎏', '🪄', '🕯️', '🎨', '🧵', '🧶', '🪡', '🔮', '🖼️', '💌', '✉️', '🪆']
      },
      {
        name: 'Phụ kiện & Giải',
        icon: '🏅',
        keywords: 'huy chuong medal cup trophy thuong khoa moc khoa key ring nhan kim cuong tui vi kinh non',
        emojis: ['🏅', '🥇', '🥈', '🥉', '🏆', '🎖️', '🔑', '💍', '💎', '👑', '📿', '🕶️', '🎒', '👜', '👛', '⌚', '📸', '🔖', '👒', '🧣']
      },
      {
        name: 'Đóng gói & Vật liệu',
        icon: '📦',
        keywords: 'hop box package dong goi boc hang vat lieu keo keo nen gach da go keo cat thuoc kep tag tem mac xop',
        emojis: ['📦', '🛍️', '🏷️', '🧱', '🪵', '🪨', '✂️', '📏', '📎', '📌', '📍', '🗂️', '📐', '🧴', '🧰', '🧲', '🪜', '🔨', '🔧', '🪚', '🧻', '🧼', '🪣', '🛒', '🧪']
      },
      {
        name: 'Vận chuyển',
        icon: '🚚',
        keywords: 'ship giao hang van chuyen buu dien buu cuc post viettel xe tai xe may grab aha hoa toc le fast bike car',
        emojis: ['📮', '🚚', '🛵', '🚗', '🚲', '⚡', '✈️', '🚀', '🛴', '🛳️', '⛽', '🛣️', '🏃💨', '🗺️', '🚂', '🛞', '🅿️', '🏎️', '⛵', '🚤']
      },
      {
        name: 'Tiền & Bán hàng',
        icon: '💰',
        keywords: 'tien money dollar vnd doanh thu gia ngan hang the bill hoa don atm pos loi nhuan',
        emojis: ['💰', '💵', '💸', '💳', '🪙', '🏦', '🧾', '📈', '📉', '🏧', '💹', '📊', '🧧', '🤑', '💲']
      },
      {
        name: 'Chi phí & Văn phòng',
        icon: '🏢',
        keywords: 'mat bang tien nha tien dien nuoc internet mang wifi may tinh laptop dt dien thoai may in don dep ve sinh thung rac',
        emojis: ['🏢', '🏠', '💡', '⚡', '💧', '🔌', '📶', '💻', '📱', '☎️', '🖨️', '🧹', '🧺', '🧯', '🖥️', '⌨️', '🖱️', '🚪', '❄️', '🗑️', '🪑', '🛠️', '📻']
      },
      {
        name: 'Ăn uống',
        icon: '☕',
        keywords: 'cafe ca phe tra sua tra an uong banh nuoc ngot com pizza tieu vat sinh hoat hoa qua trai cay',
        emojis: ['☕', '🧋', '🍵', '🍰', '🥪', '🍜', '🍲', '🍱', '🍕', '🍔', '🍉', '🍊', '🧃', '🥤', '🍻', '🎂', '🍩', '🍫', '🍦', '🍇', '🍓', '🍎', '🥐', '🍙', '🍗', '🍟', '🍹']
      },
      {
        name: 'Biểu tượng & Khác',
        icon: '⭐',
        keywords: 'sao star tim heart lua fire tron tick ok chuong thong bao lich ngay gio thoi gian',
        emojis: ['⭐', '✨', '💖', '❤️', '🌟', '🎯', '⚙️', '🔒', '📝', '💬', '🔥', '💯', '✅', '📢', '🔔', '📅', '⏰', '🌈', '☀️', '🌙', '☘️', '🚩']
      }
    ];

    function setupEmojiPicker(containerId, inputId) {
      const container = document.getElementById(containerId);
      if (!container) return;

      let currentGroupIdx = 0;
      let searchQuery = '';

      function render() {
        const currentSelected = document.getElementById(inputId).value.trim();

        let displayEmojis = [];
        if (searchQuery) {
          const q = searchQuery.toLowerCase().trim();
          EMOJI_GROUPS.forEach(g => {
            if (g.name.toLowerCase().includes(q) || g.keywords.toLowerCase().includes(q) || g.emojis.includes(q)) {
              displayEmojis.push(...g.emojis);
            }
          });
          displayEmojis = Array.from(new Set(displayEmojis));
        } else if (currentGroupIdx === -1) {
          EMOJI_GROUPS.forEach(g => displayEmojis.push(...g.emojis));
          displayEmojis = Array.from(new Set(displayEmojis));
        } else {
          displayEmojis = EMOJI_GROUPS[currentGroupIdx] ? EMOJI_GROUPS[currentGroupIdx].emojis : [];
        }

        const totalCount = Array.from(new Set(EMOJI_GROUPS.flatMap(g => g.emojis))).length;

        const headerHtml = \`
          <div class="emoji-picker-header">
            <input type="text" 
                   class="emoji-search-input" 
                   placeholder="🔍 Tìm emoji (ví dụ: hoa, quà, ship, tiền, điện, cafe...)" 
                   value="\${escapeHtml(searchQuery)}" 
                   oninput="window['searchEmoji_\${containerId}'](this.value)" />
          </div>
          <div class="emoji-cat-tabs">
            <button type="button" 
                    class="emoji-cat-btn \${currentGroupIdx === -1 && !searchQuery ? 'active' : ''}" 
                    onclick="window['changeEmojiGroup_\${containerId}'](-1)">
              🌟 Tất cả (\${totalCount})
            </button>
            \${EMOJI_GROUPS.map((g, idx) => \`
              <button type="button" 
                      class="emoji-cat-btn \${currentGroupIdx === idx && !searchQuery ? 'active' : ''}" 
                      onclick="window['changeEmojiGroup_\${containerId}'](\${idx})">
                \${g.icon} \${g.name}
              </button>
            \`).join('')}
          </div>
        \`;

        const gridHtml = \`
          <div class="emoji-grid-scroll">
            \${displayEmojis.length > 0 ? displayEmojis.map(emoji => \`
              <div class="emoji-grid-item \${emoji === currentSelected ? 'selected' : ''}" 
                   onclick="window['selectEmoji_\${containerId}']('\${emoji}')" 
                   title="\${emoji}">
                \${emoji}
              </div>
            \`).join('') : '<div style="grid-column: 1 / -1; padding: 12px; font-size: 13px; color: var(--text-muted); text-align: center;">Không tìm thấy emoji nào phù hợp.</div>'}
          </div>
        \`;

        container.innerHTML = headerHtml + gridHtml;
      }

      window[\`changeEmojiGroup_\${containerId}\`] = function(idx) {
        currentGroupIdx = idx;
        searchQuery = '';
        render();
      };

      window[\`searchEmoji_\${containerId}\`] = function(q) {
        searchQuery = q;
        render();
      };

      window[\`selectEmoji_\${containerId}\`] = function(emoji) {
        const input = document.getElementById(inputId);
        input.value = emoji;
        render();
      };

      render();
    }

    function selectCatType(type) {
      selectedCatType = type;
      const incomeOpt = document.getElementById('typeIncomeOpt');
      const expenseOpt = document.getElementById('typeExpenseOpt');
      const iconInput = document.getElementById('addIconInput');

      if (type === 'INCOME') {
        incomeOpt.className = 'type-opt selected-income';
        expenseOpt.className = 'type-opt';
        if (iconInput.value === '💸') {
          iconInput.value = '🌸';
          setupEmojiPicker('addEmojiPicker', 'addIconInput');
        }
      } else {
        expenseOpt.className = 'type-opt selected-expense';
        incomeOpt.className = 'type-opt';
        if (iconInput.value === '🌸') {
          iconInput.value = '💸';
          setupEmojiPicker('addEmojiPicker', 'addIconInput');
        }
      }
    }

    // Modal helpers
    function openModal(id) { document.getElementById(id).classList.add('active'); }
    function closeModal(id) { document.getElementById(id).classList.remove('active'); }

    function openPinModal() {
      document.getElementById('pinInput').value = adminPin;
      openModal('pinModal');
    }

    async function handlePinSubmit(e) {
      e.preventDefault();
      const pin = document.getElementById('pinInput').value.trim();
      try {
        const res = await fetch('/api/admin/verify-pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin })
        });
        const data = await res.json();
        if (data.success) {
          adminPin = pin;
          localStorage.setItem('zalo_bot_admin_pin', pin);
          updateAuthUI();
          closeModal('pinModal');
          showToast('✅ Đã mở khóa quyền Admin thành công!');
        } else {
          showToast('❌ Mã PIN không chính xác!');
        }
      } catch (err) {
        showToast('Lỗi kết nối: ' + err.message);
      }
    }

    function checkAuthRequired() {
      if (!adminPin) {
        openPinModal();
        showToast('⚠️ Vui lòng nhập mã PIN Admin để thực hiện thao tác!');
        return false;
      }
      return true;
    }

    function openAddCatModal() {
      if (!checkAuthRequired()) return;
      document.getElementById('addNameInput').value = '';
      document.getElementById('addIconInput').value = '🌸';
      selectCatType('INCOME');
      setupEmojiPicker('addEmojiPicker', 'addIconInput');
      openModal('addCatModal');
    }

    async function handleAddCatSubmit(e) {
      e.preventDefault();
      const name = document.getElementById('addNameInput').value.trim();
      const icon = document.getElementById('addIconInput').value.trim() || (selectedCatType === 'INCOME' ? '🌸' : '💸');
      if (!name) return;

      try {
        const res = await fetch('/api/categories', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-pin': adminPin
          },
          body: JSON.stringify({ name, type: selectedCatType, icon })
        });
        const data = await res.json();
        if (data.success) {
          closeModal('addCatModal');
          showToast(\`✅ Đã thêm "\${name}" thành công!\`);
          await fetchCategories();
        } else {
          if (res.status === 401) openPinModal();
          showToast('❌ ' + (data.error || 'Lỗi thêm danh mục'));
        }
      } catch (err) {
        showToast('Lỗi: ' + err.message);
      }
    }

    function openEditCatModal(id, name, icon) {
      if (!checkAuthRequired()) return;
      document.getElementById('editCatId').value = id;
      document.getElementById('editNameInput').value = name;
      document.getElementById('editIconInput').value = icon || '🌸';
      setupEmojiPicker('editEmojiPicker', 'editIconInput');
      openModal('editCatModal');
    }

    async function handleEditCatSubmit(e) {
      e.preventDefault();
      const id = document.getElementById('editCatId').value;
      const name = document.getElementById('editNameInput').value.trim();
      const icon = document.getElementById('editIconInput').value.trim();

      try {
        const res = await fetch(\`/api/categories/\${id}\`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-pin': adminPin
          },
          body: JSON.stringify({ name, icon })
        });
        const data = await res.json();
        if (data.success) {
          closeModal('editCatModal');
          showToast('✅ Đã cập nhật danh mục thành công!');
          await fetchCategories();
        } else {
          if (res.status === 401) openPinModal();
          showToast('❌ ' + (data.error || 'Lỗi cập nhật'));
        }
      } catch (err) {
        showToast('Lỗi: ' + err.message);
      }
    }

    function openDeleteCatModal(id, name) {
      if (!checkAuthRequired()) return;
      deleteTargetCatId = id;
      document.getElementById('deleteCatMsg').innerText = \`Bạn có chắc chắn muốn xóa danh mục "\${name}" không?\`;
      openModal('deleteCatModal');
    }

    async function confirmDeleteCat() {
      if (!deleteTargetCatId) return;
      try {
        const res = await fetch(\`/api/categories/\${deleteTargetCatId}\`, {
          method: 'DELETE',
          headers: { 'x-admin-pin': adminPin }
        });
        const data = await res.json();
        if (data.success) {
          closeModal('deleteCatModal');
          showToast('🗑️ ' + data.message);
          deleteTargetCatId = null;
          await fetchCategories();
        } else {
          if (res.status === 401) openPinModal();
          showToast('❌ ' + (data.error || 'Lỗi xóa danh mục'));
        }
      } catch (err) {
        showToast('Lỗi: ' + err.message);
      }
    }

    function showToast(msg) {
      const container = document.getElementById('toastContainer');
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.innerText = msg;
      container.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }, 3500);
    }

    window.addEventListener('DOMContentLoaded', init);
  </script>
</body>
</html>`;
}
