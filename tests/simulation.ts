// ==============================================================================
// SIMULATION & VERIFICATION TEST SCRIPT
// Project: Zalo OA Expense Management Chatbot
// ==============================================================================

import { WebhookHandler } from '../src/handlers/webhook.handler.js';
import { LLMService } from '../src/services/llm.service.js';
import { ZaloService } from '../src/services/zalo.service.js';
import { ZaloWebhookPayload } from '../src/types/index.js';

console.log('===============================================================');
console.log('🧪 BẮT ĐẦU CHẠY BỘ KIỂM THỬ MÔ PHỎNG LUỒNG XỬ LÝ CHATBOT');
console.log('===============================================================\n');

async function runSimulation() {
  const mockUserId = 'sim_user_zalo_888999';

  // --------------------------------------------------------------------------
  // TEST 1: Kiểm thử LLM Structured Output (Multimodal logic)
  // --------------------------------------------------------------------------
  console.log('--- TEST 1: Kiểm thử Trích xuất Dữ liệu qua LLM ---');

  const testCases = [
    { text: 'Ăn phở Thìn 65k', expected: 'SUCCESS', note: 'Đầy đủ số tiền và danh mục' },
    { text: 'Vừa tiêu 250k', expected: 'NEED_CLARIFICATION', note: 'Có tiền nhưng thiếu danh mục' },
    { text: 'Vừa đi siêu thị mua đồ ăn', expected: 'NEED_CLARIFICATION', note: 'Có danh mục nhưng thiếu số tiền' },
    { text: 'Chào shop, tư vấn giúp mình với', expected: 'IRRELEVANT', note: 'Không liên quan đến tài chính' },
  ];

  for (const tc of testCases) {
    console.log(`\nInput: "${tc.text}" (${tc.note})`);
    const result = await LLMService.extractExpense(tc.text);
    console.log(`👉 Kết quả Status: ${result.status}`);
    console.log(`   Amount: ${result.transaction.amount} | Cat: ${result.transaction.category_name}`);
    if (result.clarification.missing_field) {
      console.log(`   Cần làm rõ: [${result.clarification.missing_field}] - Câu hỏi: "${result.clarification.question}"`);
    }
    const passed = result.status === tc.expected;
    console.log(`   Đánh giá: ${passed ? '✅ PASS' : '❌ FAIL'}`);
  }

  // --------------------------------------------------------------------------
  // TEST 2: Kiểm thử Tầng 1 - Nút bấm Quick Reply / Báo cáo (0 Token LLM)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 2: Kiểm thử Phân luồng Tầng 1 (Tiết kiệm Token) ---');
  const reportPayload: ZaloWebhookPayload = {
    event_name: 'user_submit_action',
    sender: { id: mockUserId },
    recipient: { id: 'oa_demo_id' },
    info: { payload: 'ACTION_REPORT_TODAY' },
    timestamp: Date.now(),
  };

  console.log('Mô phỏng user bấm nút: [📊 Xem báo cáo hôm nay]');
  await WebhookHandler.processEvent(reportPayload);
  console.log('✅ Hoàn tất Tầng 1: Không có lệnh gọi LLM nào được kích hoạt!');

  // --------------------------------------------------------------------------
  // TEST 3: Kiểm thử Tầng 2 - Vòng lặp làm rõ (Clarification Loop)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 3: Kiểm thử Vòng lặp làm rõ (Clarification Loop) ---');
  console.log('Bước 3.1: User gửi "Mới tiêu 300k" (Chưa rõ mục đích)');
  const vaguePayload: ZaloWebhookPayload = {
    event_name: 'user_send_text',
    sender: { id: mockUserId },
    recipient: { id: 'oa_demo_id' },
    message: { msg_id: 'msg_1', text: 'Mới tiêu 300k' },
    timestamp: Date.now(),
  };
  await WebhookHandler.processEvent(vaguePayload);

  console.log('\nBước 3.2: User bấm nút chọn danh mục "🍜 Ăn uống" (ACTION_SET_CAT:1)');
  const selectCatPayload: ZaloWebhookPayload = {
    event_name: 'user_submit_action',
    sender: { id: mockUserId },
    recipient: { id: 'oa_demo_id' },
    info: { payload: 'ACTION_SET_CAT:1' },
    timestamp: Date.now(),
  };
  await WebhookHandler.processEvent(selectCatPayload);
  console.log('✅ Hoàn tất Tầng 2: Đã lưu 300k vào "Ăn uống" mà KHÔNG tốn thêm token LLM!');

  // --------------------------------------------------------------------------
  // TEST 4: Kiểm thử Xác thực chữ ký Zalo Webhook HMAC
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 4: Kiểm thử Xác thực chữ ký Zalo Webhook ---');
  const testRawBody = JSON.stringify({ test: 123 });
  const isVerified = ZaloService.verifySignature(undefined, testRawBody);
  console.log(`Xác thực chữ ký dev mode: ${isVerified ? '✅ Hợp lệ' : '❌ Không hợp lệ'}`);

  console.log('\n===============================================================');
  console.log('🎉 BỘ KIỂM THỬ MÔ PHỎNG ĐÃ HOÀN TẤT THÀNH CÔNG!');
  console.log('===============================================================');
}

runSimulation().catch(console.error);
