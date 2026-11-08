import { CONFIG } from "../config";

interface TelegramResponse<T = any> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
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
    try {
      const res = await callTelegram("deleteMessage", {
        chat_id: chatId,
        message_id: messageId,
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async getChat(chatId: string | number): Promise<{ ok: boolean; title?: string; error?: string }> {
    try {
      const res = await callTelegram<any>("getChat", { chat_id: chatId });
      if (res.ok && res.result) {
        return { ok: true, title: res.result.title || res.result.username };
      }
      return { ok: false, error: res.description || "Chat not found" };
    } catch (err: any) {
      return { ok: false, error: err?.message || "Network error" };
    }
  },

  async getChatMember(
    chatId: string | number,
    userId: number
  ): Promise<{ ok: boolean; status: string | null; isMember: boolean; error?: string }> {
    try {
      const res = await callTelegram<{ status: string; is_member?: boolean }>("getChatMember", {
        chat_id: chatId,
        user_id: userId,
      });

      if (!res.ok) {
        return { ok: false, status: null, isMember: false, error: res.description };
      }

      const status = res.result?.status || null;
      const validStatuses = ["creator", "administrator", "member"];
      let isMember = validStatuses.includes(status || "");

      // In supergroups, restricted users might still be present in the chat
      if (status === "restricted") {
        isMember = res.result?.is_member !== false;
      }

      return { ok: true, status, isMember };
    } catch (err: any) {
      return { ok: false, status: null, isMember: false, error: err?.message };
    }
  },
};
