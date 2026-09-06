// ==============================================================================
// TYPES & INTERFACES DEFINITION
// Project: Zalo OA Expense Management Chatbot
// ==============================================================================

// ------------------------------------------------------------------------------
// 1. DATABASE ENTITIES (Supabase)
// ------------------------------------------------------------------------------

export type TransactionType = 'EXPENSE' | 'INCOME';

export interface Category {
  id: number;
  name: string;
  icon: string | null;
  type: TransactionType;
  created_at?: string;
}

export interface User {
  id: string; // UUID
  zalo_user_id: string;
  display_name: string | null;
  avatar_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Transaction {
  id: string; // UUID
  user_id: string; // references users.id
  amount: number;
  category_id: number | null;
  transaction_type: TransactionType;
  description: string | null;
  raw_input: string | null;
  image_url: string | null;
  transaction_date: string;
  created_at?: string;
  // Joined fields
  category?: Category;
}

export interface PartialTransactionData {
  amount?: number | null;
  category_id?: number | null;
  category_name?: string | null;
  transaction_type?: TransactionType;
  description?: string | null;
  raw_input?: string | null;
  image_url?: string | null;
  transaction_date?: string | null;
}

export type MissingFieldType = 'category' | 'amount' | 'type' | 'description';

export interface PendingClarification {
  id: string; // UUID
  user_id: string;
  partial_transaction: PartialTransactionData;
  missing_field: MissingFieldType;
  expires_at: string;
  created_at?: string;
}

export interface CategoryExpenseSummary {
  category_id: number;
  category_name: string;
  category_icon: string | null;
  total_amount: number;
  transaction_count: number;
}

export interface CategorySummaryItem {
  category_id: number;
  category_name: string;
  category_icon: string | null;
  type: TransactionType;
  total_amount: number;
  transaction_count: number;
}

export interface FinancialReport {
  periodTitle: string;
  totalIncome: number;
  totalExpense: number;
  netAmount: number;
  totalCount: number;
  incomeCount: number;
  expenseCount: number;
  items: CategorySummaryItem[];
}

// ------------------------------------------------------------------------------
// 2. LLM STRUCTURED OUTPUTS
// ------------------------------------------------------------------------------

export type LLMExtractionStatus = 'SUCCESS' | 'NEED_CLARIFICATION' | 'IRRELEVANT';

export interface LLMTransactionData {
  amount: number | null;
  category_name: string | null;
  type: TransactionType;
  description: string | null;
  transaction_date: string | null;
}

export interface LLMClarificationData {
  missing_field: MissingFieldType | null;
  question: string | null;
}

export interface LLMExtractionResult {
  status: LLMExtractionStatus;
  transaction: LLMTransactionData;
  clarification: LLMClarificationData;
}

// ------------------------------------------------------------------------------
// 3. ZALO OA WEBHOOK & API PAYLOADS
// ------------------------------------------------------------------------------

export interface ZaloSender {
  id: string;
}

export interface ZaloRecipient {
  id: string;
}

export interface ZaloAttachmentPayload {
  thumbnail?: string;
  url?: string;
  id?: string;
  type?: string;
}

export interface ZaloAttachment {
  type: 'image' | 'template' | 'file' | string;
  payload: ZaloAttachmentPayload;
}

export interface ZaloWebhookMessage {
  msg_id: string;
  text?: string;
  attachments?: ZaloAttachment[];
}

export interface ZaloWebhookPayload {
  app_id?: string;
  user_id_by_app?: string;
  event_name: 'user_send_text' | 'user_send_image' | 'user_submit_action' | 'follow' | 'unfollow' | string;
  sender: ZaloSender;
  recipient: ZaloRecipient;
  message?: ZaloWebhookMessage;
  info?: {
    payload?: string; // Khi user click nút button hoặc quick reply
  };
  timestamp: string | number;
}

// Zalo Open API v3 Message structures
export interface ZaloQuickReplyAction {
  type: 'oa.query.show' | 'oa.query.hide' | 'oa.open.url';
  title: string;
  payload: string;
}

export interface ZaloSendMessageBody {
  recipient: {
    user_id: string;
  };
  message: {
    text?: string;
    attachment?: {
      type: 'template';
      payload: {
        template_type: 'media' | 'list';
        elements: Array<Record<string, unknown>>;
        buttons?: Array<Record<string, unknown>>;
      };
    };
    quick_reply?: {
      actions: ZaloQuickReplyAction[];
    };
  };
}
