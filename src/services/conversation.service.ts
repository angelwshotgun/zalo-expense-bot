// ==============================================================================
// CONVERSATION CONTEXT SERVICE (MULTI-TURN DIALOGUE MANAGER)
// Project: Zalo Expense Management Chatbot
// ==============================================================================

import { DatabaseService } from './db.service.js';
import { TransactionType } from '../types/index.js';

export interface ConversationTurn {
  role: 'user' | 'bot';
  text: string;
  timestamp: number;
}

export type WaitingField = 'amount' | 'category_or_reason' | 'type' | 'clarification';

export interface PendingDraft {
  transaction_type?: TransactionType;
  amount?: number | null;
  category_id?: number | null;
  category_name?: string | null;
  item_name?: string | null;
  note?: string | null;
  description?: string | null;
  transaction_date?: string | null;
  raw_input?: string | null;
  image_url?: string | null;
}

export interface UserConversationContext {
  userId: string;
  chatId?: string;
  history: ConversationTurn[];
  pendingDraft?: PendingDraft | null;
  waitingFor?: WaitingField | null;
  lastQuestion?: string | null;
  attempts: number;
  updatedAt: number;
}

// Bộ nhớ đệm lưu trữ ngữ cảnh cuộc trò chuyện trong 15 phút (900,000 ms)
const CONTEXT_TTL_MS = 15 * 60 * 1000;
const conversationStore = new Map<string, UserConversationContext>();

export class ConversationService {
  /**
   * Lấy hoặc khởi tạo ngữ cảnh hội thoại cho người dùng
   */
  static getContext(userId: string): UserConversationContext {
    const existing = conversationStore.get(userId);
    const now = Date.now();

    if (existing) {
      if (now - existing.updatedAt < CONTEXT_TTL_MS) {
        return existing;
      } else {
        // Hết hạn context -> reset
        conversationStore.delete(userId);
      }
    }

    const newContext: UserConversationContext = {
      userId,
      history: [],
      pendingDraft: null,
      waitingFor: null,
      lastQuestion: null,
      attempts: 0,
      updatedAt: now,
    };
    conversationStore.set(userId, newContext);
    return newContext;
  }

  /**
   * Lưu trữ trạng thái nháp đang chờ làm rõ thông tin
   */
  static async setPendingDraft(
    userId: string,
    draft: PendingDraft,
    waitingFor: WaitingField,
    question: string,
    chatId?: string
  ): Promise<void> {
    const context = this.getContext(userId);
    context.pendingDraft = { ...context.pendingDraft, ...draft };
    context.waitingFor = waitingFor;
    context.lastQuestion = question;
    context.attempts = (context.attempts || 0) + 1;
    context.updatedAt = Date.now();
    if (chatId) context.chatId = chatId;

    // Ghi nhận câu hỏi của bot vào lịch sử
    this.addTurn(userId, 'bot', question);

    // Đồng bộ vào Supabase pending_clarifications để đảm bảo tính bền vững
    try {
      let missingFieldMapped: 'amount' | 'category' | 'type' | 'description' = 'amount';
      if (waitingFor === 'amount') missingFieldMapped = 'amount';
      else if (waitingFor === 'category_or_reason') missingFieldMapped = 'category';
      else if (waitingFor === 'type') missingFieldMapped = 'type';
      else missingFieldMapped = 'description';

      await DatabaseService.savePendingClarification(
        userId,
        {
          amount: draft.amount,
          category_id: draft.category_id,
          category_name: draft.category_name,
          transaction_type: draft.transaction_type,
          description: draft.description || draft.note || draft.item_name,
          raw_input: draft.raw_input,
          image_url: draft.image_url,
          transaction_date: draft.transaction_date,
        },
        missingFieldMapped,
        15
      );
    } catch (err) {
      console.warn('⚠️ Lỗi đồng bộ Supabase pending clarification (vẫn duy trì In-memory):', (err as Error).message);
    }
  }

  /**
   * Lấy thông tin nháp đang chờ bổ sung (nếu có)
   */
  static getPendingDraft(userId: string): { draft: PendingDraft; waitingFor: WaitingField; attempts: number } | null {
    const context = this.getContext(userId);
    if (context.pendingDraft && context.waitingFor) {
      return {
        draft: context.pendingDraft,
        waitingFor: context.waitingFor,
        attempts: context.attempts,
      };
    }
    return null;
  }

  /**
   * Xóa phiên chờ làm rõ khi đã hoàn tất hoặc người dùng hủy
   */
  static async clearPendingDraft(userId: string): Promise<void> {
    const context = this.getContext(userId);
    context.pendingDraft = null;
    context.waitingFor = null;
    context.lastQuestion = null;
    context.attempts = 0;
    context.updatedAt = Date.now();

    try {
      await DatabaseService.clearPendingClarification(userId);
    } catch (err) {
      console.warn('⚠️ Lỗi dọn dẹp Supabase pending clarification:', (err as Error).message);
    }
  }

  /**
   * Thêm một lượt hội thoại vào lịch sử (giới hạn 10 lượt gần nhất)
   */
  static addTurn(userId: string, role: 'user' | 'bot', text: string): void {
    const context = this.getContext(userId);
    context.history.push({
      role,
      text: text.trim(),
      timestamp: Date.now(),
    });

    if (context.history.length > 10) {
      context.history = context.history.slice(-10);
    }
    context.updatedAt = Date.now();
  }

  /**
   * Lấy toàn bộ lịch sử tin nhắn gần nhất dưới dạng text để cung cấp context cho AI/Parser
   */
  static getHistoryFormatted(userId: string): string {
    const context = this.getContext(userId);
    if (!context.history.length) return '';
    return context.history
      .map((t) => `${t.role === 'user' ? 'Người dùng' : 'Bot'}: ${t.text}`)
      .join('\n');
  }

  /**
   * Reset toàn bộ context
   */
  static clearContext(userId: string): void {
    conversationStore.delete(userId);
  }
}
