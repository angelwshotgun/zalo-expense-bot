// ==============================================================================
// UNIT TEST: MULTI-TURN CONTEXT, TYPO DETECTION & REASON EXTRACTION
// ==============================================================================

import { ZaloBotHandler } from '../src/handlers/zalobot.handler.js';
import { ConversationService } from '../src/services/conversation.service.js';
import { Category } from '../src/types/index.js';

console.log('===============================================================');
console.log('🧪 BẮT ĐẦU KIỂM THỬ: REASON EXTRACTION, TYPO & MULTI-TURN CONTEXT');
console.log('===============================================================\n');

const mockCategories: Category[] = [
  { id: 1, name: 'Ăn uống', icon: '🍜', type: 'EXPENSE' },
  { id: 2, name: 'Di chuyển', icon: '🚗', type: 'EXPENSE' },
  { id: 3, name: 'Thư hoa', icon: '💌', type: 'INCOME' },
  { id: 4, name: 'Tủ hoa', icon: '🪻', type: 'INCOME' },
  { id: 5, name: 'Móc khóa', icon: '🔑', type: 'INCOME' },
  { id: 6, name: 'Nguyên vật liệu', icon: '📦', type: 'EXPENSE' },
  { id: 7, name: 'Khác', icon: '📦', type: 'EXPENSE' },
];

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, actual?: any, expected?: any) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    if (actual !== undefined || expected !== undefined) {
      console.error(`     Nhận được: ${JSON.stringify(actual)} | Kỳ vọng: ${JSON.stringify(expected)}`);
    }
    failCount++;
  }
}

// ------------------------------------------------------------------------------
// TEST SUITE 1: Bóc tách Lý do / Ghi chú sau số tiền (+ [mặt hàng] [số tiền] [lý do])
// ------------------------------------------------------------------------------
console.log('--- TEST 1: Bóc tách Lý do sau số tiền ---');

// Case chính từ User: "+ thư hoa 115k khách hàng Abc"
const testCase1 = ZaloBotHandler.parseQuickInput('+ thư hoa 115k khách hàng Abc', mockCategories);
assert(testCase1 !== null, 'Phải parse thành công "+ thư hoa 115k khách hàng Abc"');
if (testCase1) {
  assert(testCase1.amount === 115000, 'Số tiền phải là 115.000', testCase1.amount, 115000);
  assert(testCase1.category_name === 'Thư hoa', 'Danh mục phải là Thư hoa', testCase1.category_name, 'Thư hoa');
  assert(testCase1.transaction_type === 'INCOME', 'Loại phải là INCOME', testCase1.transaction_type, 'INCOME');
  assert(testCase1.item_name?.toLowerCase() === 'thư hoa', 'Mặt hàng phải là thư hoa', testCase1.item_name, 'thư hoa');
  assert(testCase1.note === 'khách hàng Abc', 'Lý do/ghi chú sau tiền phải là "khách hàng Abc"', testCase1.note, 'khách hàng Abc');
  assert(testCase1.description === 'khách hàng Abc', 'Mô tả lưu DB phải là "khách hàng Abc"', testCase1.description, 'khách hàng Abc');
}

// Case có dấu gạch ngang phân cách: "+ thư hoa 115k - khách hàng Abc"
const testCase1b = ZaloBotHandler.parseQuickInput('+ thư hoa 115k - khách hàng Abc', mockCategories);
assert(testCase1b !== null, 'Phải parse thành công "+ thư hoa 115k - khách hàng Abc"');
if (testCase1b) {
  assert(testCase1b.note === 'khách hàng Abc', 'Lý do sau dấu gạch ngang phải là "khách hàng Abc"', testCase1b.note, 'khách hàng Abc');
}

// Case số tiền đứng trước mặt hàng: "+ 299k tủ hoa cọc trước 100k"
const testCase2 = ZaloBotHandler.parseQuickInput('+ 299k tủ hoa cọc trước 100k', mockCategories);
assert(testCase2 !== null, 'Phải parse thành công "+ 299k tủ hoa cọc trước 100k"');
if (testCase2) {
  assert(testCase2.amount === 299000, 'Số tiền phải là 299.000', testCase2.amount, 299000);
  assert(testCase2.category_name === 'Tủ hoa', 'Danh mục phải là Tủ hoa', testCase2.category_name, 'Tủ hoa');
  assert(testCase2.note === 'cọc trước 100k', 'Lý do sau mặt hàng phải là "cọc trước 100k"', testCase2.note, 'cọc trước 100k');
}

// Case Chi phí: "- tiền điện 500k shop hoa tháng 9"
const testCase3 = ZaloBotHandler.parseQuickInput('- tiền điện 500k shop hoa tháng 9', mockCategories);
assert(testCase3 !== null, 'Phải parse thành công "- tiền điện 500k shop hoa tháng 9"');
if (testCase3) {
  assert(testCase3.amount === 500000, 'Số tiền phải là 500.000', testCase3.amount, 500000);
  assert(testCase3.transaction_type === 'EXPENSE', 'Loại phải là EXPENSE', testCase3.transaction_type, 'EXPENSE');
  assert(testCase3.note === 'shop hoa tháng 9', 'Lý do sau tiền phải là "shop hoa tháng 9"', testCase3.note, 'shop hoa tháng 9');
  assert(testCase3.description.includes('shop hoa tháng 9'), 'Mô tả phải chứa "shop hoa tháng 9"', testCase3.description);
}

// Case Chi phí: "- 35k ruy băng gửi bạn An"
const testCase4 = ZaloBotHandler.parseQuickInput('- 35k ruy băng gửi bạn An', mockCategories);
assert(testCase4 !== null, 'Phải parse thành công "- 35k ruy băng gửi bạn An"');
if (testCase4) {
  assert(testCase4.amount === 35000, 'Số tiền phải là 35.000', testCase4.amount, 35000);
  assert(testCase4.category_name === 'Nguyên vật liệu', 'Danh mục phải là Nguyên vật liệu', testCase4.category_name, 'Nguyên vật liệu');
  assert(testCase4.note === 'gửi bạn An', 'Lý do phải là "gửi bạn An"', testCase4.note, 'gửi bạn An');
}

// ------------------------------------------------------------------------------
// TEST SUITE 2: Phát hiện Lỗi Typo Số Tiền
// ------------------------------------------------------------------------------
console.log('\n--- TEST 2: Phát hiện lỗi typo số tiền ---');

const typo1 = ZaloBotHandler.detectTypo('+ thư hoa 115kk');
assert(typo1 !== null, 'Phải phát hiện typo 115kk (thừa chữ k)');
assert(typo1?.typoRaw === '115kk', 'Ký tự typo nhận diện phải là 115kk');

const typo2 = ZaloBotHandler.detectTypo('mua hoa 200kkk');
assert(typo2 !== null, 'Phải phát hiện typo 200kkk');

const typo3 = ZaloBotHandler.detectTypo('+ 115oo tủ hoa');
assert(typo3 !== null, 'Phải phát hiện typo 115oo');

const typo4 = ZaloBotHandler.detectTypo('+ thư hoa 115k0');
assert(typo4 !== null, 'Phải phát hiện typo 115k0');

const notTypo = ZaloBotHandler.detectTypo('+ thư hoa 115k khách hàng Abc');
assert(notTypo === null, '115k hợp lệ KHÔNG được báo lỗi typo');

// ------------------------------------------------------------------------------
// TEST SUITE 3: Phát hiện Thông tin Chưa Đủ Ý (Thiếu Tiền, Thiếu Mặt Hàng, Thiếu Loại)
// ------------------------------------------------------------------------------
console.log('\n--- TEST 3: Phát hiện thông tin chưa đủ ý ---');

// Case thiếu số tiền khi có dấu '+' và mặt hàng: "+ thư hoa khách hàng Abc"
const incomplete1 = ZaloBotHandler.detectTypoOrIncomplete('+ thư hoa khách hàng Abc', mockCategories);
assert(incomplete1 !== null, 'Phải nhận diện thiếu số tiền ở "+ thư hoa khách hàng Abc"');
assert(incomplete1?.waitingFor === 'amount', 'waitingFor phải là "amount"');
assert(incomplete1?.draft.category_name === 'Thư hoa', 'Nháp phải giữ danh mục Thư hoa');
assert(incomplete1?.draft.note === 'khách hàng Abc', 'Nháp phải giữ note "khách hàng Abc"');
assert(incomplete1?.draft.transaction_type === 'INCOME', 'Nháp phải giữ type INCOME');

// Case thiếu số tiền khi chi: "- tiền điện shop hoa"
const incomplete2 = ZaloBotHandler.detectTypoOrIncomplete('- tiền điện shop hoa', mockCategories);
assert(incomplete2 !== null, 'Phải nhận diện thiếu số tiền ở "- tiền điện shop hoa"');
assert(incomplete2?.waitingFor === 'amount', 'waitingFor phải là "amount"');
assert(incomplete2?.draft.transaction_type === 'EXPENSE', 'Nháp phải giữ type EXPENSE');

// Case thiếu mặt hàng: "+ 115k"
const incomplete3 = ZaloBotHandler.detectTypoOrIncomplete('+ 115k', mockCategories);
assert(incomplete3 !== null, 'Phải nhận diện thiếu mặt hàng ở "+ 115k"');
assert(incomplete3?.waitingFor === 'category_or_reason', 'waitingFor phải là "category_or_reason"');
assert(incomplete3?.draft.amount === 115000, 'Nháp phải giữ số tiền 115.000');

// Case thiếu phân loại: "115k khách hàng Abc"
const incomplete4 = ZaloBotHandler.detectTypoOrIncomplete('115k khách hàng Abc', mockCategories);
assert(incomplete4 !== null, 'Phải nhận diện thiếu phân loại Thu/Chi ở "115k khách hàng Abc"');
assert(incomplete4?.waitingFor === 'type', 'waitingFor phải là "type"');
assert(incomplete4?.draft.amount === 115000, 'Nháp phải giữ số tiền 115.000');

// ------------------------------------------------------------------------------
// TEST SUITE 4: Quản lý Hội Thoại Đa Lượt (Multi-turn Conversation Context)
// ------------------------------------------------------------------------------
console.log('\n--- TEST 4: Ngữ cảnh cuộc trò chuyện nhiều lần chat (Multi-turn Context) ---');

const mockUserId = 'test_user_multi_turn_001';

// Lần chat 1: Người dùng gõ thiếu tiền: "+ thư hoa khách hàng Abc"
ConversationService.clearContext(mockUserId);
ConversationService.addTurn(mockUserId, 'user', '+ thư hoa khách hàng Abc');

const detected = ZaloBotHandler.detectTypoOrIncomplete('+ thư hoa khách hàng Abc', mockCategories);
assert(detected !== null, 'Lượt 1 phải phát hiện thiếu thông tin');

if (detected) {
  // Bot lưu pending draft và hỏi lại
  ConversationService.setPendingDraft(mockUserId, detected.draft, detected.waitingFor, detected.question);

  const pending = ConversationService.getPendingDraft(mockUserId);
  assert(pending !== null, 'Context phải có pending draft');
  assert(pending?.waitingFor === 'amount', 'Context phải đang chờ "amount"');
  assert(pending?.draft.category_name === 'Thư hoa', 'Context phải nhớ danh mục Thư hoa');
  assert(pending?.draft.note === 'khách hàng Abc', 'Context phải nhớ note "khách hàng Abc"');

  // Lần chat 2: Người dùng chỉ nhắn số tiền: "115k"
  ConversationService.addTurn(mockUserId, 'user', '115k');
  const userTurn2 = '115k';

  // Parser kiểm tra và hoàn thành giao dịch
  const resolvedAmount = ZaloBotHandler.extractAmount(userTurn2);
  assert(resolvedAmount === 115000, 'Lượt 2 phải trích xuất được 115.000 từ "115k"');

  // Hợp nhất dữ liệu
  const mergedTx = {
    user_id: mockUserId,
    amount: resolvedAmount!,
    category_name: pending?.draft.category_name,
    transaction_type: pending?.draft.transaction_type,
    description: pending?.draft.description,
  };

  assert(mergedTx.amount === 115000, 'Giao dịch hợp nhất phải có amount 115000');
  assert(mergedTx.category_name === 'Thư hoa', 'Giao dịch hợp nhất phải có category Thư hoa');
  assert(mergedTx.description === 'khách hàng Abc', 'Giao dịch hợp nhất phải có note "khách hàng Abc"');

  // Xóa draft sau khi hoàn thành
  ConversationService.clearPendingDraft(mockUserId);
  const cleared = ConversationService.getPendingDraft(mockUserId);
  assert(cleared === null, 'Pending draft phải được xóa sạch sau khi hoàn thành');
}

// Kiểm tra lịch sử hội thoại
const history = ConversationService.getContext(mockUserId).history;
assert(history.length >= 2, 'Lịch sử hội thoại phải lưu lại các lượt chat', history.length);

console.log('\n===============================================================');
console.log(`🏁 KẾT QUẢ: ${passCount} PASS, ${failCount} FAIL`);
console.log('===============================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
