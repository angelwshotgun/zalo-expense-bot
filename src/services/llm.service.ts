// ==============================================================================
// MULTIMODAL LLM CLIENT (GEMINI 2.5 FLASH / GPT-4O-MINI)
// Project: Zalo OA Expense Management Chatbot
// ==============================================================================

import { GoogleGenerativeAI, SchemaType, ResponseSchema } from '@google/generative-ai';
import OpenAI from 'openai';
import { env } from '../config/env.js';
import { LLMExtractionResult } from '../types/index.js';

const SYSTEM_INSTRUCTION = `Bạn là trợ lý tài chính thông minh chuyên trích xuất dữ liệu thu/chi và bán hàng từ tin nhắn văn bản hoặc hình ảnh hóa đơn, biên lai, ảnh chụp màn hình ngân hàng (Vietcombank, MBBank, Techcombank, MoMo, BIDV, v.v.).

Quy tắc xử lý:
1. Quy đổi số tiền:
   - Quy đổi tất cả về số nguyên VND (Ví dụ: "50k" -> 50000, "115k" -> 115000, "299k" -> 299000, "1tr2" hoặc "1.2 triệu" -> 1200000, "350 nghìn" -> 350000).
   - Nếu là ảnh chuyển khoản ngân hàng hoặc hóa đơn, tìm đúng "Số tiền giao dịch" hoặc "Tổng cộng/Tổng thanh toán".

2. Phân loại loại giao dịch (type):
   - 'INCOME' (Thu nhập/Bán hàng):
     + Các đơn hàng sản phẩm: "Thư hoa", "Huy chương", "Tủ hoa", "Thiệp lẻ", "Khung ảnh", "Cúp hoa", "Móc khóa".
     + Tin nhắn có dấu '+' (Ví dụ: "+115k", "+ 299k tủ hoa", "thư hoa +115k").
     + Ảnh tiền chuyển khoản vào tài khoản.
   - 'EXPENSE' (Khoản chi):
     + Tin nhắn có dấu '-' (Ví dụ: "-50k", "-30k tiền ship").
     + Tin nhắn có từ khóa: "chi", "tiêu", "mua", "ăn", "ship", "trả tiền".

3. Danh mục chuẩn (category_name):
   Chỉ chọn một trong các danh mục sau:
   - Danh mục THU (Bán hàng):
     + 'Thư hoa'
     + 'Huy chương'
     + 'Tủ hoa'
     + 'Thiệp lẻ'
     + 'Khung ảnh'
     + 'Cúp hoa'
     + 'Móc khóa'
   - Danh mục CHI (Chi phí):
     + 'Nguyên vật liệu' (mua hoa sáp, ruy băng, hộp, keo, đồ làm sản phẩm)
     + 'Ship bưu cục' (tiền gửi bưu điện, VNPost, Viettel Post, GHTK, ship thường)
     + 'Ship hoả tốc' (tiền ship Grab, Ahamove, Be, Lalamove, giao hàng hỏa tốc trong ngày)
     + 'Khác' (khoản chi tiêu khác, ăn uống, sinh hoạt hoặc sản phẩm ngoài danh mục)

4. Phân loại trạng thái (status):
   - 'SUCCESS': Khi có ĐỦ số tiền (amount) và tên sản phẩm/danh mục chi rõ ràng.
   - 'NEED_CLARIFICATION':
     + Ảnh biên lai/chuyển khoản ngân hàng đọc được số tiền nhưng CHƯA rõ tên sản phẩm/mục đích -> BẮT BUỘC đặt status = 'NEED_CLARIFICATION', missing_field = 'category', giữ nguyên số tiền vào transaction.amount.
     + Tin nhắn có số tiền nhưng KHÔNG rõ sản phẩm/mục đích chi -> missing_field = 'category'.
     + Có tên danh mục nhưng KHÔNG có số tiền -> missing_field = 'amount', giữ nguyên category_name.
   - 'IRRELEVANT': Tin nhắn chào hỏi ("alo", "chào bot", "test") hoặc ảnh hoàn toàn không liên quan đến tiền bạc/thanh toán.

Tuyệt đối chỉ trả về JSON hợp lệ theo đúng schema được định nghĩa.`;

// JSON Schema chuẩn cho Gemini Structured Outputs
const GEMINI_RESPONSE_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    status: {
      type: SchemaType.STRING,
      format: 'enum',
      enum: ['SUCCESS', 'NEED_CLARIFICATION', 'IRRELEVANT'],
      description: 'Trạng thái trích xuất dữ liệu',
    },
    transaction: {
      type: SchemaType.OBJECT,
      properties: {
        amount: {
          type: SchemaType.NUMBER,
          description: 'Số tiền quy đổi sang số nguyên VND (null nếu không xác định được)',
          nullable: true,
        },
        category_name: {
          type: SchemaType.STRING,
          description: 'Tên danh mục dự đoán (Ăn uống, Di chuyển, Mua sắm, v.v.)',
          nullable: true,
        },
        type: {
          type: SchemaType.STRING,
          format: 'enum',
          enum: ['EXPENSE', 'INCOME'],
          description: 'Loại giao dịch: EXPENSE (Chi tiêu) hoặc INCOME (Thu nhập)',
        },
        description: {
          type: SchemaType.STRING,
          description: 'Mô tả ngắn gọn nội dung chi tiêu',
          nullable: true,
        },
        transaction_date: {
          type: SchemaType.STRING,
          description: 'Thời gian giao dịch dạng ISO 8601 (hoặc null)',
          nullable: true,
        },
      },
      required: ['type'],
    },
    clarification: {
      type: SchemaType.OBJECT,
      properties: {
        missing_field: {
          type: SchemaType.STRING,
          format: 'enum',
          enum: ['amount', 'category', 'description'],
          description: 'Trường thông tin bị thiếu cần hỏi lại',
          nullable: true,
        },
        question: {
          type: SchemaType.STRING,
          description: 'Câu hỏi gợi ý ngắn gọn, lịch sự để gửi cho người dùng Zalo',
          nullable: true,
        },
      },
    },
  },
  required: ['status', 'transaction', 'clarification'],
};

export class LLMService {
  private static geminiClient: GoogleGenerativeAI | null = null;
  private static openaiClient: OpenAI | null = null;

  private static getGemini() {
    if (!this.geminiClient && env.GEMINI_API_KEY) {
      this.geminiClient = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    }
    return this.geminiClient;
  }

  private static getOpenAI() {
    if (!this.openaiClient && env.OPENAI_API_KEY) {
      this.openaiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    }
    return this.openaiClient;
  }

  /**
   * Trích xuất thông tin giao dịch qua Multimodal LLM (Gemini 2.5 Flash / GPT-4o-mini)
   * @param text Văn bản tin nhắn từ người dùng
   * @param imageBuffer Buffer ảnh (nếu người dùng gửi ảnh hóa đơn / màn hình ngân hàng)
   * @param mimeType Định dạng ảnh (mặc định: image/jpeg)
   */
  static async extractExpense(
    text?: string,
    imageBuffer?: Buffer,
    mimeType = 'image/jpeg'
  ): Promise<LLMExtractionResult> {
    const provider = env.LLM_PROVIDER;

    // 1. Ưu tiên sử dụng Gemini 2.5 Flash
    if (provider === 'gemini' && env.GEMINI_API_KEY) {
      return this.callGemini(text, imageBuffer, mimeType);
    }

    // 2. Sử dụng OpenAI GPT-4o-mini nếu cấu hình
    if (provider === 'openai' && env.OPENAI_API_KEY) {
      return this.callOpenAI(text, imageBuffer, mimeType);
    }

    // 3. Fallback chế độ mô phỏng nếu chưa điền API Key (dành cho test cục bộ)
    console.warn('⚠️ Không tìm thấy GEMINI_API_KEY hoặc OPENAI_API_KEY. Sử dụng bộ phân tích heuristic cục bộ.');
    return this.mockLocalExtraction(text);
  }

  /**
   * Gọi Google Gemini 2.5 Flash với Structured Output (responseSchema)
   */
  private static async callGemini(
    text?: string,
    imageBuffer?: Buffer,
    mimeType = 'image/jpeg'
  ): Promise<LLMExtractionResult> {
    const gemini = this.getGemini();
    if (!gemini) {
      throw new Error('Chưa cấu hình GEMINI_API_KEY');
    }

    // Thử danh sách các model flash mới nhất của Gemini
    const candidateModels = ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.8-flash'];
    let lastError: unknown = null;

    const parts: Array<string | { inlineData: { data: string; mimeType: string } }> = [];

    // Nếu có ảnh -> chuyển sang base64
    if (imageBuffer) {
      let normalizedMime = (mimeType || 'image/jpeg').toLowerCase();
      if (normalizedMime === 'image/jpg') normalizedMime = 'image/jpeg';

      parts.push({
        inlineData: {
          data: imageBuffer.toString('base64'),
          mimeType: normalizedMime,
        },
      });
    }

    const promptText = text ? `Nội dung người dùng gửi: "${text}"` : 'Hãy đọc ảnh hóa đơn/chuyển khoản này và trích xuất thông tin chi tiêu.';
    parts.push(promptText);

    for (const modelName of candidateModels) {
      try {
        const model = gemini.getGenerativeModel({
          model: modelName,
          systemInstruction: SYSTEM_INSTRUCTION,
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: GEMINI_RESPONSE_SCHEMA,
            temperature: 0.1,
          },
        });

        const result = await model.generateContent(parts);
        const response = await result.response;
        const jsonText = response.text();
        return JSON.parse(jsonText) as LLMExtractionResult;
      } catch (err) {
        console.warn(`⚠️ [Gemini ${modelName}] lỗi:`, (err as Error).message);
        lastError = err;
        // Tiếp tục thử model kế tiếp
      }
    }

    console.error('❌ Tất cả các model Gemini đều trả về lỗi. Dùng fallback heuristic:', lastError);
    return this.mockLocalExtraction(text);
  }

  /**
   * Gọi OpenAI GPT-4o-mini với Structured Outputs
   */
  private static async callOpenAI(
    text?: string,
    imageBuffer?: Buffer,
    mimeType = 'image/jpeg'
  ): Promise<LLMExtractionResult> {
    const openai = this.getOpenAI();
    if (!openai) {
      throw new Error('Chưa cấu hình OPENAI_API_KEY');
    }

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_INSTRUCTION },
    ];

    const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];

    if (imageBuffer) {
      const base64Image = imageBuffer.toString('base64');
      userContent.push({
        type: 'image_url',
        image_url: {
          url: `data:${mimeType};base64,${base64Image}`,
        },
      });
    }

    if (text) {
      userContent.push({ type: 'text', text: `Nội dung người dùng: "${text}"` });
    } else {
      userContent.push({ type: 'text', text: 'Trích xuất thông tin từ ảnh này' });
    }

    messages.push({ role: 'user', content: userContent });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    const raw = completion.choices[0]?.message?.content || '{}';
    return JSON.parse(raw) as LLMExtractionResult;
  }

  /**
   * Mock parser cục bộ hỗ trợ test/dev khi chưa gắn API Key
   */
  private static mockLocalExtraction(text?: string): LLMExtractionResult {
    if (!text) {
      return {
        status: 'IRRELEVANT',
        transaction: { amount: null, category_name: null, type: 'EXPENSE', description: null, transaction_date: null },
        clarification: { missing_field: null, question: null },
      };
    }

    const normalized = text.toLowerCase();

    // Tìm số tiền dạng 50k, 200000, 1.5tr
    let amount: number | null = null;
    const kMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:k|nghìn|ngàn)/);
    const trMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:tr|triệu)/);
    const rawNumMatch = normalized.match(/(\d{4,9})/);

    if (kMatch) {
      amount = Math.round(parseFloat(kMatch[1]) * 1000);
    } else if (trMatch) {
      amount = Math.round(parseFloat(trMatch[1]) * 1000000);
    } else if (rawNumMatch) {
      amount = parseInt(rawNumMatch[1], 10);
    }

    // Nếu không có số tiền và không có từ khóa chi tiêu
    if (!amount && !normalized.includes('mua') && !normalized.includes('ăn') && !normalized.includes('tiêu')) {
      return {
        status: 'IRRELEVANT',
        transaction: { amount: null, category_name: null, type: 'EXPENSE', description: null, transaction_date: null },
        clarification: { missing_field: null, question: null },
      };
    }

    // Có số tiền nhưng không rõ mục đích
    const genericPhrases = ['vừa tiêu', 'tiêu hết', 'mới chuyển', 'chi hết', 'vừa chuyển'];
    const isGeneric = genericPhrases.some((p) => normalized.startsWith(p) || normalized === p) || normalized.trim() === `${amount}`;

    if (amount && (isGeneric || normalized.length <= 12)) {
      return {
        status: 'NEED_CLARIFICATION',
        transaction: {
          amount,
          category_name: null,
          type: 'EXPENSE',
          description: text,
          transaction_date: new Date().toISOString(),
        },
        clarification: {
          missing_field: 'category',
          question: `Bạn vừa chi tiêu ${new Intl.NumberFormat('vi-VN').format(amount)} đ cho khoản nào? Vui lòng chọn danh mục bên dưới:`,
        },
      };
    }

    if (!amount) {
      return {
        status: 'NEED_CLARIFICATION',
        transaction: {
          amount: null,
          category_name: 'Khác',
          type: 'EXPENSE',
          description: text,
          transaction_date: new Date().toISOString(),
        },
        clarification: {
          missing_field: 'amount',
          question: `Bạn đã chi bao nhiêu tiền cho "${text}"? Vui lòng nhập số tiền (ví dụ: 50k hoặc 150000).`,
        },
      };
    }

    // Đầy đủ
    let category = 'Khác';
    if (normalized.includes('ăn') || normalized.includes('cơm') || normalized.includes('phở') || normalized.includes('cafe')) category = 'Ăn uống';
    else if (normalized.includes('xăng') || normalized.includes('grab') || normalized.includes('xe')) category = 'Di chuyển';
    else if (normalized.includes('mua') || normalized.includes('áo') || normalized.includes('quần')) category = 'Mua sắm';

    return {
      status: 'SUCCESS',
      transaction: {
        amount,
        category_name: category,
        type: 'EXPENSE',
        description: text,
        transaction_date: new Date().toISOString(),
      },
      clarification: { missing_field: null, question: null },
    };
  }
}
