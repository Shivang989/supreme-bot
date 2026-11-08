import { CONFIG } from "../config";

interface TelegramResponse<T = any> {
  ok: boolean;
  result?: T;
  description?: string;
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

export const FORCE_SUB_API = {
  async deleteMessage(chatId: number, messageId: number): Promise<boolean> {
    const res = await callTelegram("deleteMessage", {
      chat_id: chatId,
      message_id: messageId,
    });
    return res.ok;
  },

  async getChatMember(chatId: string | number, userId: number): Promise<string | null> {
    const res = await callTelegram<{ status: string }>("getChatMember", {
      chat_id: chatId,
      user_id: userId,
    });
    if (res.ok && res.result) {
      return res.result.status;
    }
    return null;
  },
};
