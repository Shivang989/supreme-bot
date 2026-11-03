import { CONFIG } from "../config";

interface TelegramResponse<T = any> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
  parameters?: {
    retry_after?: number;
    migrate_to_chat_id?: number;
  };
}

async function callTelegram<T = any>(endpoint: string, payload: Record<string, any>): Promise<TelegramResponse<T>> {
  const url = `https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/${endpoint}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return (await response.json()) as TelegramResponse<T>;
}

export const BROADCAST_API = {
  async copyMessage(params: {
    chat_id: number;
    from_chat_id: number;
    message_id: number;
    reply_markup?: any;
    disable_notification?: boolean;
    protect_content?: boolean;
  }): Promise<TelegramResponse<{ message_id: number }>> {
    return callTelegram("copyMessage", params);
  },

  async forwardMessage(params: {
    chat_id: number;
    from_chat_id: number;
    message_id: number;
    disable_notification?: boolean;
    protect_content?: boolean;
  }): Promise<TelegramResponse<{ message_id: number }>> {
    return callTelegram("forwardMessage", params);
  },

  async copyMessages(params: {
    chat_id: number;
    from_chat_id: number;
    message_ids: number[];
    disable_notification?: boolean;
    protect_content?: boolean;
  }): Promise<TelegramResponse<{ message_id: number }[]>> {
    return callTelegram("copyMessages", params);
  },

  async pinChatMessage(params: {
    chat_id: number;
    message_id: number;
    disable_notification?: boolean;
  }): Promise<TelegramResponse<boolean>> {
    return callTelegram("pinChatMessage", params);
  },

  async unpinChatMessage(params: {
    chat_id: number;
    message_id: number;
  }): Promise<TelegramResponse<boolean>> {
    return callTelegram("unpinChatMessage", params);
  },

  async sendTextMessage(params: {
    chat_id: number;
    text: string;
    parse_mode?: string;
    entities?: any[];
    disable_notification?: boolean;
    reply_markup?: any;
  }): Promise<TelegramResponse<{ message_id: number }>> {
    return callTelegram("sendMessage", params);
  },
};

