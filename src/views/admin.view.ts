// ==============================================================================
// ADMIN DASHBOARD WEB UI FOR CATEGORIES MANAGEMENT
// Project: Zalo Expense Management Chatbot
// ==============================================================================

export function renderAdminHtml(verificationCode: string): string {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="zalo-platform-site-verification" content="${verificationCode}" />
  <title>Quản Trị Danh Mục Thu & Chi - Shop Hoa Xinh</title>
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
      padding: 24px 20px 32px;
      box-shadow: var(--shadow);
    }
    .header-container {
      max-width: 1100px;
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
      font-size: 36px;
      background: rgba(255, 255, 255, 0.2);
      width: 54px;
      height: 54px;
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
      opacity: 0.85;
    }

    .auth-badge {
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(255, 255, 255, 0.15);
      padding: 8px 16px;
      border-radius: 9999px;
      backdrop-filter: blur(8px);
      cursor: pointer;
      transition: all 0.2s;
    }
    .auth-badge:hover {
      background: rgba(255, 255, 255, 0.25);
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
      max-width: 1100px;
      margin: -16px auto 0;
      padding: 0 20px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .stat-card {
      background: var(--card-bg);
      padding: 20px;
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      border: 1px solid var(--border);
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .stat-icon {
      font-size: 28px;
      width: 50px;
      height: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
      background: #f1f5f9;
    }
    .stat-value {
      font-size: 24px;
      font-weight: 700;
      color: var(--text);
    }
    .stat-label {
      font-size: 13px;
      color: var(--text-muted);
    }

    .controls-bar {
      background: var(--card-bg);
      padding: 16px 20px;
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      border: 1px solid var(--border);
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }
    .filter-tabs {
      display: flex;
      gap: 8px;
      background: #f1f5f9;
      padding: 4px;
      border-radius: 10px;
    }
    .tab-btn {
      border: none;
      background: transparent;
      padding: 6px 14px;
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
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

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
      position: relative;
      overflow: hidden;
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
    .badge-income {
      background: var(--income-bg);
      color: var(--income);
    }
    .badge-expense {
      background: var(--expense-bg);
      color: var(--expense);
    }

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
      max-width: 440px;
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
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
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
    }
    .form-input {
      width: 100%;
      padding: 10px 14px;
      border-radius: 10px;
      border: 1px solid var(--border);
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s;
    }
    .form-input:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
    }

    .type-selector {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 16px;
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

    .emoji-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }
    .emoji-item {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      border-radius: 8px;
      border: 1px solid var(--border);
      cursor: pointer;
      transition: transform 0.1s;
    }
    .emoji-item:hover {
      transform: scale(1.15);
      background: #f1f5f9;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 24px;
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
          <p class="brand-desc">Hệ thống Quản Trị Danh Mục Thu & Chi - Zalo Expense Bot</p>
        </div>
      </div>
      <div class="auth-badge" id="authBadge" onclick="openPinModal()">
        <div class="auth-dot" id="authDot"></div>
        <span class="auth-text" id="authText">Nhập mã PIN Admin</span>
      </div>
    </div>
  </header>

  <main class="container">
    <!-- Statistics -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">📊</div>
        <div>
          <div class="stat-value" id="totalCount">0</div>
          <div class="stat-label">Tổng số danh mục</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: var(--income-bg); color: var(--income)">🌸</div>
        <div>
          <div class="stat-value" id="incomeCount">0</div>
          <div class="stat-label">Mặt hàng bán (Thu)</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: var(--expense-bg); color: var(--expense)">💸</div>
        <div>
          <div class="stat-value" id="expenseCount">0</div>
          <div class="stat-label">Khoản chi phí (Chi)</div>
        </div>
      </div>
    </div>

    <!-- Controls -->
    <div class="controls-bar">
      <div class="filter-tabs">
        <button class="tab-btn active" onclick="setFilter('ALL', this)">Tất cả</button>
        <button class="tab-btn" onclick="setFilter('INCOME', this)">🌸 Mặt hàng bán (Thu)</button>
        <button class="tab-btn" onclick="setFilter('EXPENSE', this)">💸 Khoản chi (Chi)</button>
      </div>
      <div>
        <button class="btn btn-primary" onclick="openAddModal()">
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
  </main>

  <!-- MODAL: NHẬP MÃ PIN -->
  <div class="modal-overlay" id="pinModal">
    <div class="modal">
      <h3 class="modal-title">🔐 Mở Khóa Quyền Admin</h3>
      <p class="modal-desc">Vui lòng nhập mã PIN của chủ shop để có quyền thêm, sửa hoặc xóa danh mục.</p>
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

  <!-- MODAL: THÊM DANH MỤC MỚI -->
  <div class="modal-overlay" id="addModal">
    <div class="modal">
      <h3 class="modal-title">➕ Thêm Danh Mục Mới</h3>
      <p class="modal-desc">Thêm mặt hàng bán mới hoặc khoản chi phí mới cho shop.</p>
      <form onsubmit="handleAddSubmit(event)">
        <div class="form-group">
          <label class="form-label">Loại danh mục:</label>
          <div class="type-selector">
            <div class="type-opt selected-income" id="typeIncomeOpt" onclick="selectType('INCOME')">🌸 Thu (Bán hàng)</div>
            <div class="type-opt" id="typeExpenseOpt" onclick="selectType('EXPENSE')">💸 Chi (Chi phí)</div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Tên danh mục:</label>
          <input type="text" class="form-input" id="addNameInput" placeholder="Ví dụ: Bó hoa sáp, Tiền điện..." required />
        </div>

        <div class="form-group">
          <label class="form-label">Biểu tượng (Icon / Emoji):</label>
          <input type="text" class="form-input" id="addIconInput" value="🌸" style="width: 80px; text-align: center; font-size: 20px;" maxlength="4" />
          <div class="emoji-row" id="quickEmojis">
            <span class="emoji-item" onclick="setEmoji('🌸')">🌸</span>
            <span class="emoji-item" onclick="setEmoji('🪻')">🪻</span>
            <span class="emoji-item" onclick="setEmoji('💐')">💐</span>
            <span class="emoji-item" onclick="setEmoji('🌹')">🌹</span>
            <span class="emoji-item" onclick="setEmoji('🏅')">🏅</span>
            <span class="emoji-item" onclick="setEmoji('✉️')">✉️</span>
            <span class="emoji-item" onclick="setEmoji('🖼️')">🖼️</span>
            <span class="emoji-item" onclick="setEmoji('🏆')">🏆</span>
            <span class="emoji-item" onclick="setEmoji('🔑')">🔑</span>
            <span class="emoji-item" onclick="setEmoji('📦')">📦</span>
            <span class="emoji-item" onclick="setEmoji('🧱')">🧱</span>
            <span class="emoji-item" onclick="setEmoji('📮')">📮</span>
            <span class="emoji-item" onclick="setEmoji('⚡')">⚡</span>
            <span class="emoji-item" onclick="setEmoji('💡')">💡</span>
            <span class="emoji-item" onclick="setEmoji('🏢')">🏢</span>
            <span class="emoji-item" onclick="setEmoji('🛵')">🛵</span>
          </div>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn btn-outline" onclick="closeModal('addModal')">Hủy</button>
          <button type="submit" class="btn btn-primary" id="addSubmitBtn">Lưu Danh Mục</button>
        </div>
      </form>
    </div>
  </div>

  <!-- MODAL: SỬA DANH MỤC -->
  <div class="modal-overlay" id="editModal">
    <div class="modal">
      <h3 class="modal-title">✏️ Chỉnh Sửa Danh Mục</h3>
      <p class="modal-desc">Thay đổi tên hoặc icon biểu tượng của danh mục.</p>
      <form onsubmit="handleEditSubmit(event)">
        <input type="hidden" id="editId" />
        <div class="form-group">
          <label class="form-label">Tên danh mục:</label>
          <input type="text" class="form-input" id="editNameInput" required />
        </div>
        <div class="form-group">
          <label class="form-label">Biểu tượng (Icon / Emoji):</label>
          <input type="text" class="form-input" id="editIconInput" style="width: 80px; text-align: center; font-size: 20px;" maxlength="4" />
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-outline" onclick="closeModal('editModal')">Hủy</button>
          <button type="submit" class="btn btn-primary">Lưu Thay Đổi</button>
        </div>
      </form>
    </div>
  </div>

  <!-- MODAL: XÁC NHẬN XÓA -->
  <div class="modal-overlay" id="deleteModal">
    <div class="modal">
      <h3 class="modal-title" style="color: var(--expense)">🗑️ Xác Nhận Xóa</h3>
      <p class="modal-desc" id="deleteMsg">Bạn có chắc chắn muốn xóa danh mục này?</p>
      <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 12px; border-radius: 10px; font-size: 13px; color: #991b1b; margin-bottom: 20px;">
        🛡️ <strong>Bảo toàn lịch sử:</strong> Các đơn hàng hoặc khoản chi cũ thuộc danh mục này sẽ tự động chuyển về mục <strong>"Khác"</strong> để không bao giờ bị lệch tổng doanh thu.
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-outline" onclick="closeModal('deleteModal')">Hủy</button>
        <button type="button" class="btn" style="background: var(--expense); color: white;" onclick="confirmDelete()">Xóa Danh Mục</button>
      </div>
    </div>
  </div>

  <div class="toast-container" id="toastContainer"></div>

  <script>
    let categories = [];
    let currentFilter = 'ALL';
    let selectedType = 'INCOME';
    let deleteTargetId = null;
    let adminPin = localStorage.getItem('zalo_bot_admin_pin') || '';

    async function init() {
      updateAuthUI();
      await fetchCategories();
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

    async function fetchCategories() {
      try {
        const res = await fetch('/api/categories');
        const data = await res.json();
        if (data.success) {
          categories = data.data;
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

      document.getElementById('totalCount').innerText = categories.length;
      document.getElementById('incomeCount').innerText = incomeList.length;
      document.getElementById('expenseCount').innerText = expenseList.length;

      // Filter handling
      if (currentFilter === 'ALL') {
        incomeSection.style.display = 'block';
        expenseSection.style.display = 'block';
      } else if (currentFilter === 'INCOME') {
        incomeSection.style.display = 'block';
        expenseSection.style.display = 'none';
      } else {
        incomeSection.style.display = 'none';
        expenseSection.style.display = 'block';
      }

      incomeGrid.innerHTML = incomeList.length ? incomeList.map(c => renderCard(c)).join('') : '<div style="color: var(--text-muted);">Chưa có mặt hàng nào.</div>';
      expenseGrid.innerHTML = expenseList.length ? expenseList.map(c => renderCard(c)).join('') : '<div style="color: var(--text-muted);">Chưa có khoản chi nào.</div>';
    }

    function renderCard(cat) {
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
            <button class="action-btn" title="Chỉnh sửa" onclick="openEditModal(\${cat.id}, '\${escapeHtml(cat.name)}', '\${cat.icon || ''}')">✏️</button>
            \${!isKhac ? \`<button class="action-btn delete" title="Xóa danh mục" onclick="openDeleteModal(\${cat.id}, '\${escapeHtml(cat.name)}')">🗑️</button>\` : ''}
          </div>
        </div>
      \`;
    }

    function escapeHtml(str) {
      return (str || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
    }

    function setFilter(filter, btn) {
      currentFilter = filter;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderCategories();
    }

    function selectType(type) {
      selectedType = type;
      const incomeOpt = document.getElementById('typeIncomeOpt');
      const expenseOpt = document.getElementById('typeExpenseOpt');
      const iconInput = document.getElementById('addIconInput');

      if (type === 'INCOME') {
        incomeOpt.className = 'type-opt selected-income';
        expenseOpt.className = 'type-opt';
        if (iconInput.value === '💸') iconInput.value = '🌸';
      } else {
        expenseOpt.className = 'type-opt selected-expense';
        incomeOpt.className = 'type-opt';
        if (iconInput.value === '🌸') iconInput.value = '💸';
      }
    }

    function setEmoji(emoji) {
      document.getElementById('addIconInput').value = emoji;
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

    function openAddModal() {
      if (!checkAuthRequired()) return;
      document.getElementById('addNameInput').value = '';
      selectType('INCOME');
      openModal('addModal');
    }

    async function handleAddSubmit(e) {
      e.preventDefault();
      const name = document.getElementById('addNameInput').value.trim();
      const icon = document.getElementById('addIconInput').value.trim();
      if (!name) return;

      try {
        const res = await fetch('/api/categories', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-pin': adminPin
          },
          body: JSON.stringify({ name, type: selectedType, icon })
        });
        const data = await res.json();
        if (data.success) {
          closeModal('addModal');
          showToast(\`✅ Đã thêm "\${name}" thành công!\`);
          await fetchCategories();
        } else {
          if (res.status === 401) {
            openPinModal();
          }
          showToast('❌ ' + (data.error || 'Lỗi thêm danh mục'));
        }
      } catch (err) {
        showToast('Lỗi: ' + err.message);
      }
    }

    function openEditModal(id, name, icon) {
      if (!checkAuthRequired()) return;
      document.getElementById('editId').value = id;
      document.getElementById('editNameInput').value = name;
      document.getElementById('editIconInput').value = icon;
      openModal('editModal');
    }

    async function handleEditSubmit(e) {
      e.preventDefault();
      const id = document.getElementById('editId').value;
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
          closeModal('editModal');
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

    function openDeleteModal(id, name) {
      if (!checkAuthRequired()) return;
      deleteTargetId = id;
      document.getElementById('deleteMsg').innerText = \`Bạn có chắc chắn muốn xóa danh mục "\${name}" không?\`;
      openModal('deleteModal');
    }

    async function confirmDelete() {
      if (!deleteTargetId) return;
      try {
        const res = await fetch(\`/api/categories/\${deleteTargetId}\`, {
          method: 'DELETE',
          headers: {
            'x-admin-pin': adminPin
          }
        });
        const data = await res.json();
        if (data.success) {
          closeModal('deleteModal');
          showToast('🗑️ ' + data.message);
          deleteTargetId = null;
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
