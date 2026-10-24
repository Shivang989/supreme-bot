import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions";
import { NewMessage } from "telegram/events";
import { ENV } from "./env";
import { DB, UserSessionData } from "./db";

// Feature Modules
import { handleAiChatCommand, handleOwnerAwake, checkAndHandleAssistMimic } from "./assistant/aiChat";
import { handleQuotly } from "./assistant/quotly";
import { handleOwnership } from "./assistant/ownership";
import { runSystemOptimization } from "./assistant/optimize";
import { schedulerRouter } from "./scheduler";
import { sanitizerRouter, applyGlobalDestructHook } from "./sanitizer";
import { vaultRouter } from "./modules/vault";
import { quickDmRouter } from "./modules/quickDm";
import { adminRouter } from "./modules/admin";
import { mediaVoiceRouter } from "./modules/mediaVoice";
import { entertainmentRouter } from "./modules/entertainment";
import { cloneRouter } from "./modules/clone";

// Active simulation loops
const typingLoops = new Map<string, NodeJS.Timeout>();
const onlineLoops = new Map<string, NodeJS.Timeout>();

export class ClientPool {
    public activeClients: Map<string, TelegramClient> = new Map();
    private heartbeats: Map<string, NodeJS.Timeout> = new Map();

    /**
     * Executes commands queued in MongoDB while the Hugging Face Space was offline
     */
    public async processPendingQueue(client: TelegramClient, ownerId: string): Promise<void> {
        try {
            if (!DB.pendingCommands) return;

            const pending = await DB.pendingCommands
                .find({ status: "PENDING" })
                .sort({ createdAt: 1 })
                .limit(10)
                .toArray();

            if (pending.length === 0) return;

            console.log(`🔄 [Queue] Found ${pending.length} pending command(s) to execute.`);

            for (const item of pending) {
                await DB.pendingCommands.updateOne(
                    { _id: item._id },
                    { $set: { status: "PROCESSING" } }
                );

                try {
                    const cleanChatId: any = /^-?\d+$/.test(item.chatId) ? BigInt(item.chatId) : item.chatId;
                    const entity = await client.getInputEntity(cleanChatId);
                    const messages = await client.getMessages(entity, { ids: [item.messageId] });
                    const targetMsg = messages[0];

                    if (targetMsg && targetMsg.text) {
                        console.log(`▶️ [Queue] Executing replayed command: ${targetMsg.text}`);
                        await this.handleMessage(targetMsg, client, ownerId);
                    }

                    await DB.pendingCommands.updateOne(
                        { _id: item._id },
                        { $set: { status: "COMPLETED" } }
                    );
                } catch (err: any) {
                    console.error(`❌ [Queue] Failed to execute queued command ${item.eventKey}:`, err.message);
                    await DB.pendingCommands.updateOne(
                        { _id: item._id },
                        { $set: { status: "FAILED" } }
                    );
                }
            }
        } catch (err: any) {
            console.error("❌ [Queue] Queue processor encountered an error:", err.message);
        }
    }

    /**
     * Centralized message and command routing pipeline
     */
    public async handleMessage(message: any, client: TelegramClient, userId: string): Promise<void> {
        if (!message) return;

        const text = message.text?.trim() || "";
        const senderId = message.senderId?.toString();
        const isSelf = Boolean(message.out) || (senderId && senderId === userId);

        // 1. Autonomous Proxy Check (.assist mimic responses for other users)
        if (!isSelf && !message.out) {
            await checkAndHandleAssistMimic(message, client, userId);
            return;
        }

        // ⛔ STRICT SINGLE-OPERATOR SECURITY: Ignore messages from others
        if (!isSelf) return;

        // 2. Global Self-Destruct Hook: Auto-delete outgoing messages if timer is enabled
        if (message.out && !text.startsWith(".destruct")) {
            applyGlobalDestructHook(message);
        }

        // 3. Wake Word Trigger ("Jarvis ...")
        if (/\bjarvis\b/i.test(text) && !text.startsWith(".")) {
            await handleOwnerAwake(message, client, userId);
            return;
        }

        if (!text.startsWith(".")) return;

        const args = text.split(" ");
        const command = args[0].toLowerCase();
        const peer = message.peerId;
        const chatKey = `${userId}_${peer?.channelId || peer?.chatId || peer?.userId}`;

        try {
            // 🏓 Latency & Diagnostics
            if (command === ".ping") {
                const start = Date.now();
                const latency = Date.now() - start;
                const res = `🏓 **Pong!**\n⚡ **Latency:** \`${latency}ms\`\n👤 **Operator:** \`${userId}\``;
                try { await message.edit({ text: res }); } catch { await client.sendMessage(peer, { message: res }); }
                return;
            }

            // 🆔 Entity Identification
            if (command === ".id") {
                const reply = await message.getReplyMessage();
                let chatIdStr = "";
                if (peer?.channelId) chatIdStr = `-100${peer.channelId}`;
                else if (peer?.chatId) chatIdStr = `-${peer.chatId}`;
                else if (peer?.userId) chatIdStr = `${peer.userId}`;

                let out = `🆔 **Entity Identification Matrix**\n━━━━━━━━━━━━━━━━━━━━━\n`;
                out += `📍 **Current Chat ID:** \`${chatIdStr}\`\n`;

                if (reply) {
                    const replySender: any = await reply.getSender();
                    const rName = replySender?.firstName || replySender?.title || "Unknown";
                    const rId = reply.senderId?.toString() || "Unknown";
                    out += `👤 **Replied User:** ${rName}\n`;
                    out += `🆔 **Replied User ID:** \`${rId}\`\n`;
                    out += `✉️ **Replied Message ID:** \`${reply.id}\`\n`;
                } else {
                    out += `👤 **Your ID:** \`${userId}\`\n`;
                    out += `✉️ **Message ID:** \`${message.id}\`\n`;
                }

                try { await message.edit({ text: out }); } catch { await client.sendMessage(peer, { message: out }); }
                return;
            }

            // 🟢 Persistent Online Simulation
            if (command === ".online") {
                const state = args[1]?.toLowerCase();
                if (state === "off") {
                    const loop = onlineLoops.get(userId);
                    if (loop) { clearInterval(loop); onlineLoops.delete(userId); }
                    await client.invoke(new Api.account.UpdateStatus({ offline: true })).catch(() => {});
                    const msgText = "🔴 **Persistent Online Mode: OFF**";
                    try { await message.edit({ text: msgText }); } catch { await client.sendMessage(peer, { message: msgText }); }
                } else {
                    if (onlineLoops.has(userId)) clearInterval(onlineLoops.get(userId)!);
                    await client.invoke(new Api.account.UpdateStatus({ offline: false })).catch(() => {});
                    const loop = setInterval(async () => {
                        try {
                            await client.invoke(new Api.account.UpdateStatus({ offline: false }));
                        } catch {}
                    }, 10000);
                    onlineLoops.set(userId, loop);
                    const msgText = "🟢 **Persistent Online Mode: ACTIVE** (10s Heartbeat)";
                    try { await message.edit({ text: msgText }); } catch { await client.sendMessage(peer, { message: msgText }); }
                }
                return;
            }

            // ✍️ Typing Indicator Simulation
            if (command === ".typing") {
                const state = args[1]?.toLowerCase();
                if (state === "off") {
                    const loop = typingLoops.get(chatKey);
                    if (loop) { clearInterval(loop); typingLoops.delete(chatKey); }
                    await message.edit({ text: "🛑 **Typing simulation stopped.**" }).catch(() => {});
                    setTimeout(async () => { try { await message.delete({ revoke: true }); } catch {} }, 2000);
                } else {
                    if (typingLoops.has(chatKey)) clearInterval(typingLoops.get(chatKey)!);
                    const resolvedPeer = await client.getInputEntity(peer);
                    await client.invoke(new Api.messages.SetTyping({ peer: resolvedPeer, action: new Api.SendMessageTypingAction() }));
                    const loop = setInterval(async () => {
                        try {
                            await client.invoke(new Api.messages.SetTyping({ peer: resolvedPeer, action: new Api.SendMessageTypingAction() }));
                        } catch {}
                    }, 4000);
                    typingLoops.set(chatKey, loop);
                    await message.delete({ revoke: true }).catch(() => {});
                }
                return;
            }

            // 🎭 Identity Clone & Revert
            if ([".clone", ".return", ".wapis"].includes(command)) {
                return await cloneRouter(message, client, userId);
            }

            // 🧠 AI Assistant & Directives
            if ([".assist", ".savememory", ".checkmemory"].includes(command)) {
                return await handleAiChatCommand(message, client, userId);
            }

            // 📦 Personal Vault
            if ([".s", ".list", ".get"].includes(command)) {
                return await vaultRouter(message, client, userId);
            }

            // 👤 Quick-DM & Account Diagnostics
            if ([".check", ".dmsave", ".dmsavedlt", ".dm"].includes(command)) {
                return await quickDmRouter(message, client, userId);
            }

            // 🛡️ Group Administration & Tags
            if ([".promote", ".demote", ".ban", ".unban", ".mute", ".unmute", ".kick", ".pin", ".admins", ".da", ".rda", ".tagall", ".tag", ".stop"].includes(command)) {
                return await adminRouter(message, client);
            }

            // 🎮 Entertainment & Image Generation
            if ([".pat", ".draw", ".game"].includes(command)) {
                return await entertainmentRouter(message, client);
            }

            // 🗣️ Media, Translation & Voice Notes
            if ([".say", ".tr"].includes(command)) {
                return await mediaVoiceRouter(message, client);
            }

            // 🎨 Stickers
            if ([".q", ".qblue"].includes(command)) {
                return await handleQuotly(message, client);
            }

            // 👑 Ownership Management
            if ([".owner", ".ownerpass"].includes(command)) {
                return await handleOwnership(message, client);
            }

            // 🧹 Sanitizer & Message Purge
            if ([".d", ".dall", ".destruct"].includes(command)) {
                return await sanitizerRouter(message, client);
            }

            // 📊 Diagnostics & System Optimization
            if ([".count", ".optimize"].includes(command)) {
                return await runSystemOptimization(message, client);
            }

            // 📅 Task Scheduler
            if ([".set", ".dbset", ".tasks", ".canceltask"].includes(command)) {
                return await schedulerRouter(message, client);
            }
        } catch (err: any) {
            if (!err.message?.includes("CHAT_WRITE_FORBIDDEN")) {
                console.error(`❌ [Command Error] ${command}:`, err.message);
            }
        }
    }

    public async startRootClient(): Promise<void> {
        if (!ENV.STRING_SESSION) return;

        try {
            const rootClient = new TelegramClient(
                new StringSession(ENV.STRING_SESSION),
                ENV.API_ID,
                ENV.API_HASH,
                { connectionRetries: 5, autoReconnect: true, useWSS: false }
            );

            await rootClient.connect();
            const me: any = await rootClient.getMe();
            const rootId = me.id.toString();

            // Synchronize Root Owner record into database
            await DB.sessions.updateOne(
                { userId: rootId },
                {
                    $set: {
                        userId: rootId,
                        firstName: me.firstName || "Owner",
                        username: me.username || "",
                        status: "ACTIVE"
                    }
                },
                { upsert: true }
            ).catch(() => {});

            await this.setupClientPipeline(rootId, rootClient);
            console.log(`✅ [ClientPool] Root owner online (${rootId}).`);

            // Process any commands sent while the Space was sleeping
            await this.processPendingQueue(rootClient, rootId);
        } catch (err: any) {
            console.error("❌ [ClientPool] Root boot failure:", err.message);
        }
    }

    public async bootAllSessions(): Promise<void> {
        try {
            const sessions = await DB.sessions.find({ status: "ACTIVE" }).toArray();
            console.log(`🔄 [ClientPool] Restoring ${sessions.length} active sessions...`);
            for (const sess of sessions) {
                if (sess.sessionString) {
                    await this.startUserClient(sess);
                }
            }
        } catch (err: any) {
            console.error("❌ [ClientPool] Session restore error:", err.message);
        }
    }

    public async startUserClient(sessionData: UserSessionData): Promise<void> {
        if (!sessionData.sessionString || this.activeClients.has(sessionData.userId)) return;

        try {
            const client = new TelegramClient(
                new StringSession(sessionData.sessionString),
                ENV.API_ID,
                ENV.API_HASH,
                { connectionRetries: 3, autoReconnect: true, useWSS: false }
            );

            await client.connect();
            await this.setupClientPipeline(sessionData.userId, client);
            console.log(`✅ [ClientPool] Client operational for ${sessionData.userId}`);
        } catch (err: any) {
            if (err.message?.includes("SESSION_REVOKED") || err.message?.includes("AUTH_KEY_UNREGISTERED")) {
                console.warn(`⚠️ [ClientPool] Pruning revoked session: ${sessionData.userId}`);
                await DB.sessions.updateOne({ userId: sessionData.userId }, { $set: { status: "REVOKED" } });
            } else {
                console.error(`❌ [ClientPool] Could not connect user ${sessionData.userId}: ${err.message}`);
            }
        }
    }

    private async setupClientPipeline(userId: string, client: TelegramClient): Promise<void> {
        const heartbeat = setInterval(async () => {
            try {
                if (client.connected) await client.getInputEntity("me");
            } catch {}
        }, 45000);

        this.heartbeats.set(userId, heartbeat);
        this.activeClients.set(userId, client);

        client.addEventHandler(async (event: any) => {
            const message = event?.message;
            if (!message) return;
            await this.handleMessage(message, client, userId);
        }, new NewMessage({}));
    }

    public async stopUserClient(userId: string): Promise<void> {
        const hb = this.heartbeats.get(userId);
        if (hb) clearInterval(hb);
        this.heartbeats.delete(userId);

        const onlineLoop = onlineLoops.get(userId);
        if (onlineLoop) { clearInterval(onlineLoop); onlineLoops.delete(userId); }

        const client = this.activeClients.get(userId);
        if (client) {
            try { await client.disconnect(); } catch {}
            this.activeClients.delete(userId);
        }
    }

    public getClient(userId: string): TelegramClient | undefined {
        return this.activeClients.get(userId);
    }

    public getActiveUsers(): string[] {
        return Array.from(this.activeClients.keys());
    }
}

export const ClientManager = new ClientPool();
