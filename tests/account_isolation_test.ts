import { ZaloBotService } from '../src/services/zalobot.service.js';
import { FinancialReport, Transaction } from '../src/types/index.js';

console.log('===============================================================');
console.log('🧪 BẮT ĐẦU KIỂM THỬ: PHÂN BIỆT TÀI KHOẢN & NHÓM CHAT (MULTI-ACCOUNT)');
console.log('===============================================================');

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failCount++;
  }
}

// TEST 1: Kiểm tra buildSuccessText ngắn gọn, không rườm rà Sổ / Nhóm
console.log('\n--- TEST 1: Thẻ thông báo thành công (buildSuccessText) ---');
const dummyTx: Transaction = {
  id: 'tx-001',
  user_id: 'u-group-1',
  amount: 115000,
  transaction_type: 'INCOME',
  description: 'khách hàng Abc',
  raw_input: '+ thư hoa 115k khách hàng Abc',
  transaction_date: new Date().toISOString(),
  created_at: new Date().toISOString(),
  category: {
    id: 1,
    name: 'Thư hoa',
    type: 'INCOME',
    icon: '🌸',
  },
};

const msgGroup = ZaloBotService.buildSuccessText(dummyTx, 'Thư hoa', 'Nguyễn Văn A');
assert(!msgGroup.includes('Sổ / Nhóm:'), 'Tin nhắn bot không hiển thị dòng Sổ / Nhóm rườm rà');
assert(msgGroup.includes('👤 **Người ghi:** Nguyễn Văn A'), 'Phải hiển thị rõ người nhắn trong nhóm');
assert(msgGroup.includes('115.000'), 'Phải hiển thị số tiền 115.000đ');
assert(msgGroup.includes('khách hàng Abc'), 'Phải hiển thị ghi chú khách hàng Abc');

const msgPersonal = ZaloBotService.buildSuccessText(dummyTx, 'Thư hoa');
assert(!msgPersonal.includes('Sổ / Nhóm:'), 'Chat riêng cá nhân giữ định dạng ngắn gọn sạch sẽ');

// TEST 2: Kiểm tra buildReportText sạch sẽ, chuẩn đẹp như cũ
console.log('\n--- TEST 2: Tiêu đề báo cáo chuẩn đẹp (buildReportText) ---');
const dummyReport: FinancialReport = {
  periodTitle: 'Hôm nay',
  totalIncome: 500000,
  totalExpense: 100000,
  netAmount: 400000,
  incomeCount: 2,
  expenseCount: 1,
  totalCount: 3,
  items: [
    {
      category_name: 'Thư hoa',
      type: 'INCOME',
      total_amount: 500000,
      transaction_count: 2,
      category_icon: '🌸',
    },
  ],
};

const reportAll = ZaloBotService.buildReportText(dummyReport, 'ALL');
assert(reportAll.includes('BÁO CÁO TỔNG HỢP THU CHI'), 'Báo cáo tổng hợp giữ đúng định dạng quen thuộc');
assert(!reportAll.includes('Sổ / Nhóm:'), 'Báo cáo bot không rườm rà dòng Sổ / Nhóm');
assert(reportAll.includes('500.000'), 'Báo cáo tổng hợp phải hiển thị tổng thu');

const reportIncome = ZaloBotService.buildReportText(dummyReport, 'INCOME');
assert(reportIncome.includes('BÁO CÁO DOANH THU BÁN HÀNG'), 'Báo cáo thu chuẩn đẹp');

const reportExpense = ZaloBotService.buildReportText(dummyReport, 'EXPENSE');
assert(reportExpense.includes('BÁO CÁO CHI PHÍ HOẠT ĐỘNG'), 'Báo cáo chi chuẩn đẹp');

// TEST 3: Logic nhận diện Nhóm Chat vs Chat 1-1
console.log('\n--- TEST 3: Logic nhận diện Nhóm chat vs Chat 1-1 ---');
function resolveChatTarget(msg: { chat_id: string; sender_id: string; chat?: any; sender_name?: string }) {
  const anyChat = msg.chat;
  const isGroup =
    anyChat?.chat_type === 'GROUP' ||
    anyChat?.chat_type === 'group' ||
    anyChat?.chat_type === '2' ||
    anyChat?.chat_type === 2 ||
    Boolean(msg.chat_id && msg.sender_id && String(msg.chat_id) !== String(msg.sender_id));

  const targetZaloId = isGroup ? `group_${msg.chat_id}` : msg.sender_id;
  const targetName = isGroup ? (anyChat?.title || anyChat?.name || `Nhóm Shop (${msg.chat_id})`) : (msg.sender_name || 'Người dùng');
  return { isGroup, targetZaloId, targetName };
}

const resGroup1 = resolveChatTarget({
  chat_id: 'grp_999',
  sender_id: 'user_123',
  chat: { chat_type: 'GROUP', title: 'Nhóm Bán Hoa Sỉ' },
  sender_name: 'An',
});
assert(resGroup1.isGroup === true, 'chat_type: GROUP phải nhận diện là nhóm');
assert(resGroup1.targetZaloId === 'group_grp_999', 'targetZaloId phải có tiền tố group_');
assert(resGroup1.targetName === 'Nhóm Bán Hoa Sỉ', 'targetName phải lấy từ title của nhóm');

const resGroup2 = resolveChatTarget({
  chat_id: 'grp_888',
  sender_id: 'user_456',
  chat: { chat_type: '2' },
  sender_name: 'Bình',
});
assert(resGroup2.isGroup === true, 'chat_type: "2" phải nhận diện là nhóm');
assert(resGroup2.targetZaloId === 'group_grp_888', 'targetZaloId của chat_type "2" phải là group_grp_888');

const resPrivate = resolveChatTarget({
  chat_id: 'user_777',
  sender_id: 'user_777',
  chat: { chat_type: '1' },
  sender_name: 'Chị Cúc Chủ Shop',
});
assert(resPrivate.isGroup === false, 'Chat 1-1 phải là cá nhân');
assert(resPrivate.targetZaloId === 'user_777', 'targetZaloId phải là ID người gửi');
assert(resPrivate.targetName === 'Chị Cúc Chủ Shop', 'targetName phải là tên người gửi');

// TEST 4: Logic ẩn tài khoản/nhóm có 0 đơn trên Web Admin
console.log('\n--- TEST 4: Lọc tài khoản & ẩn sổ/nhóm 0 đơn ---');
const sampleAccounts = [
  { id: 'acc-1', display_name: 'Nhóm Shop 1', tx_count: 5, is_group: true },
  { id: 'acc-2', display_name: 'Nhóm Rỗng', tx_count: 0, is_group: true },
  { id: 'acc-3', display_name: 'Khách vãng lai', tx_count: undefined, is_group: false },
  { id: 'acc-4', display_name: 'Chủ Shop', tx_count: 12, is_group: false },
];

const activeAccounts = sampleAccounts.filter(acc => (acc.tx_count || 0) > 0);
assert(activeAccounts.length === 2, 'Chỉ giữ lại 2 tài khoản có giao dịch > 0');
assert(activeAccounts.some(a => a.id === 'acc-1'), 'Nhóm Shop 1 (5 đơn) phải được giữ lại');
assert(activeAccounts.some(a => a.id === 'acc-4'), 'Chủ Shop (12 đơn) phải được giữ lại');
assert(!activeAccounts.some(a => a.id === 'acc-2'), 'Nhóm Rỗng (0 đơn) phải bị ẩn đi');
assert(!activeAccounts.some(a => a.id === 'acc-3'), 'Khách vãng lai (undefined đơn) phải bị ẩn đi');

console.log('\n===============================================================');
console.log(`🏁 KẾT QUẢ: ${passCount} PASS, ${failCount} FAIL`);
console.log('===============================================================');

if (failCount > 0) {
  process.exit(1);
}

