// ==============================================================================
// UNIT & REGRESSION TEST: SMART DELETE & RULE-BASED PARSER
// ==============================================================================

import { ZaloBotHandler } from '../src/handlers/zalobot.handler.js';
import { hasWholePhrase, removeVietnameseTones } from '../src/services/db.service.js';
import { Category } from '../src/types/index.js';

console.log('===============================================================');
console.log('🧪 BẮT ĐẦU KIỂM THỬ: RULE-BASED PARSER & SMART DELETE ENGINE');
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

let failed = 0;
let passed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

// --------------------------------------------------------------------------
// TEST 1: Kiểm tra chống nhận nhầm 'khoản chi' thành 'Móc khóa' (Word boundary)
// --------------------------------------------------------------------------
console.log('--- TEST 1: Kiểm tra chống dính từ khóa substring ---');
assert(!hasWholePhrase('xoa khoan chi 137.000', 'khoa'), "'xoa khoan chi 137.000' KHÔNG được khớp từ 'khoa'");
assert(hasWholePhrase('mua moc khoa 50k', 'khoa'), "'mua moc khoa 50k' PHẢI khớp từ 'khoa'");
assert(hasWholePhrase('ban 1 chiec khoa', 'khoa'), "'ban 1 chiec khoa' PHẢI khớp từ 'khoa'");

// --------------------------------------------------------------------------
// TEST 2: Kiểm tra lệnh XÓA bị chặn hoàn toàn ở parseQuickInput
// --------------------------------------------------------------------------
console.log('\n--- TEST 2: Kiểm tra lệnh Xóa không bị tạo mới giao dịch ---');
const deleteCases = [
  'xóa khoản chi 137.000',
  'xoá khoản chi 137.000',
  'xóa 137k',
  'hủy đơn 299k',
  'xóa đơn vừa rồi',
  'xóa',
  '#xoa',
  '/xoa',
];

for (const tc of deleteCases) {
  const res = ZaloBotHandler.parseQuickInput(tc, mockCategories);
  assert(res === null, `Lệnh xóa "${tc}" phải trả về null (không được tạo giao dịch)`);
}

// --------------------------------------------------------------------------
// TEST 3: Kiểm tra Rule THU (+)
// --------------------------------------------------------------------------
console.log('\n--- TEST 3: Kiểm tra Rule THU (+) linh hoạt ---');
const incomeCases = [
  {
    input: '+ Thư hoa 115k',
    expectedType: 'INCOME',
    expectedAmount: 115000,
    expectedCat: 'Thư hoa',
  },
  {
    input: '+ 299k tủ hoa',
    expectedType: 'INCOME',
    expectedAmount: 299000,
    expectedCat: 'Tủ hoa',
  },
  {
    input: '+ Hoa baby trắng 250k', // Chưa có trong danh mục
    expectedType: 'INCOME',
    expectedAmount: 250000,
    expectedDescIncludes: 'Hoa baby trắng',
  },
  {
    input: 'thư hoa + 115.000',
    expectedType: 'INCOME',
    expectedAmount: 115000,
    expectedCat: 'Thư hoa',
  },
  {
    input: 'bán bó hoa sáp 300k',
    expectedType: 'INCOME',
    expectedAmount: 300000,
  },
];

for (const tc of incomeCases) {
  const res = ZaloBotHandler.parseQuickInput(tc.input, mockCategories);
  assert(res !== null, `"${tc.input}" phải parse thành công`);
  if (res) {
    assert(res.transaction_type === tc.expectedType, `Loại phải là ${tc.expectedType}`);
    assert(res.amount === tc.expectedAmount, `Số tiền phải là ${tc.expectedAmount}, nhận được ${res.amount}`);
    if (tc.expectedCat) {
      assert(res.category_name === tc.expectedCat, `Danh mục phải là ${tc.expectedCat}, nhận được ${res.category_name}`);
    }
    if (tc.expectedDescIncludes) {
      assert(res.description.includes(tc.expectedDescIncludes), `Mô tả phải chứa "${tc.expectedDescIncludes}", nhận được "${res.description}"`);
    }
  }
}

// --------------------------------------------------------------------------
// TEST 4: Kiểm tra Rule CHI (-)
// --------------------------------------------------------------------------
console.log('\n--- TEST 4: Kiểm tra Rule CHI (-) linh hoạt ---');
const expenseCases = [
  {
    input: '- Tiền điện 500k',
    expectedType: 'EXPENSE',
    expectedAmount: 500000,
  },
  {
    input: '- 35k ruy băng',
    expectedType: 'EXPENSE',
    expectedAmount: 35000,
  },
  {
    input: 'mua hoa sáp 200k',
    expectedType: 'EXPENSE',
    expectedAmount: 200000,
  },
  {
    input: 'tiền ship bưu cục - 30.000đ',
    expectedType: 'EXPENSE',
    expectedAmount: 30000,
  },
];

for (const tc of expenseCases) {
  const res = ZaloBotHandler.parseQuickInput(tc.input, mockCategories);
  assert(res !== null, `"${tc.input}" phải parse thành công`);
  if (res) {
    assert(res.transaction_type === tc.expectedType, `Loại phải là ${tc.expectedType}`);
    assert(res.amount === tc.expectedAmount, `Số tiền phải là ${tc.expectedAmount}, nhận được ${res.amount}`);
  }
}

// --------------------------------------------------------------------------
// TEST 5: Trích xuất ngày lùi
// --------------------------------------------------------------------------
console.log('\n--- TEST 5: Kiểm tra trích xuất ngày lùi ---');
const dateYesterday = ZaloBotHandler.extractTransactionDate('Hôm qua + tủ hoa 299k');
assert(dateYesterday !== null && dateYesterday.matchedText === 'hôm qua', "Phải nhận diện được 'hôm qua'");

const dateSpecific = ZaloBotHandler.extractTransactionDate('Ngày 05/09 + thư hoa 115k');
assert(dateSpecific !== null && dateSpecific.dateDisplay.startsWith('05/09'), "Phải nhận diện được ngày '05/09'");

console.log('\n===============================================================');
console.log(`🏁 KẾT QUẢ: ${passed} PASS, ${failed} FAIL`);
console.log('===============================================================');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
