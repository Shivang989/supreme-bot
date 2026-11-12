import http from "node:http";
import { CloudflareEnv, TelegramUpdate } from "./types";
import { handleMessage } from "./router";
import { setRuntimeBotToken } from "./index";
import { createD1RestAdapter } from "./adapters/d1RestAdapter";
import { BROADCAST_ENGINE } from "./modules/broadcastEngine";

const PORT = parseInt(process.env.PORT || "7860", 10);
const BOT_TOKEN = process.env.BOT_TOKEN || "";
const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID || "";
const CF_DATABASE_ID = process.env.CF_DATABASE_ID || "148f24eb-71c8-4751-9f16-6f5db0153af9";
const CF_API_TOKEN = process.env.CF_API_TOKEN || "";
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";
const HF_SPACE_URL = (process.env.HF_SPACE_URL || "").replace(/\/$/, "");
const AUTO_SET_WEBHOOK = process.env.AUTO_SET_WEBHOOK === "true";

if (!BOT_TOKEN) {
  console.error("[FATAL] BOT_TOKEN environment variable is missing.");
  process.exit(1);
}

if (!CF_ACCOUNT_ID || !CF_API_TOKEN) {
  console.error("[FATAL] CF_ACCOUNT_ID and CF_API_TOKEN are required for authoritative D1 access.");
  process.exit(1);
}

setRuntimeBotToken(BOT_TOKEN);

const d1Db = createD1RestAdapter({
  accountId: CF_ACCOUNT_ID,
  databaseId: CF_DATABASE_ID,
  apiToken: CF_API_TOKEN,
});

const env: CloudflareEnv = {
  DB: d1Db,
  BOT_TOKEN,
  OWNER_ID: process.env.OWNER_ID || "8210345021",
};

// Track active in-flight updates for graceful container shutdown
const inFlightTasks = new Set<Promise<unknown>>();
let isShuttingDown = false;
let broadcastBusy = false;

function trackTask(promise: Promise<unknown>): void {
  inFlightTasks.add(promise);
  promise.finally(() => inFlightTasks.delete(promise));
}

// Replaces Cloudflare's 1-minute cron trigger for background broadcasts
const broadcastInterval = setInterval(() => {
  if (isShuttingDown || broadcastBusy) return;
  broadcastBusy = true;

  const task = BROADCAST_ENGINE.runContinuousWorker(env.DB, 25000)
    .catch((err) => console.error("[BroadcastWorker] Error:", err))
    .finally(() => {
      broadcastBusy = false;
    });

  trackTask(task);
}, 60_000);

async function readJsonBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    const MAX_BYTES = 1024 * 1024; // 1 MB max Telegram update payload

    req.on("data", (chunk: Buffer) => {
      totalBytes += chunk.length;
      if (totalBytes > MAX_BYTES) {
        reject(new Error("Payload too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });

    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = req.url?.split("?")[0] || "/";

  // Health & Liveness Check for Hugging Face Spaces
  if (req.method === "GET" && (url === "/" || url === "/health")) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: isShuttingDown ? "draining" : "ok",
        service: "aloo-telegram-bot",
        runtime: "huggingface-node",
        database: "cloudflare-d1-authoritative",
        in_flight_tasks: inFlightTasks.size,
        uptime_sec: Math.floor(process.uptime()),
      })
    );
    return;
  }

  // Telegram Webhook Endpoint
  if (req.method === "POST" && (url === "/webhook" || url === "/")) {
    if (isShuttingDown) {
      res.writeHead(503, { "Content-Type": "text/plain" });
      res.end("Server restarting");
      return;
    }

    // Verify Telegram secret token if configured
    if (WEBHOOK_SECRET) {
      const incomingSecret = req.headers["x-telegram-bot-api-secret-token"];
      if (incomingSecret !== WEBHOOK_SECRET) {
        res.writeHead(401, { "Content-Type": "text/plain" });
        res.end("Unauthorized");
        return;
      }
    }

    try {
      const update = (await readJsonBody(req)) as TelegramUpdate;

      // Acknowledge immediately so Telegram never retries duplicate updates
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("OK");

      const task = handleMessage(update, env).catch((err) => {
        console.error("[Webhook] Unhandled error in handleMessage:", err);
      });
      trackTask(task);
    } catch (err) {
      console.error("[Webhook] Invalid request payload:", err);
      if (!res.headersSent) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("Bad Request");
      }
    }
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not Found");
});

async function registerWebhookIfEnabled(): Promise<void> {
  if (!AUTO_SET_WEBHOOK || !HF_SPACE_URL) {
    console.log("[Startup] AUTO_SET_WEBHOOK disabled; existing webhook untouched.");
    return;
  }

  const webhookUrl = `${HF_SPACE_URL}/webhook`;
  const body: Record<string, any> = {
    url: webhookUrl,
    drop_pending_updates: false,
  };
  if (WEBHOOK_SECRET) {
    body.secret_token = WEBHOOK_SECRET;
  }

  const resp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await resp.json();
  console.log("[Startup] Telegram setWebhook response:", JSON.stringify(data));
}

server.listen(PORT, "0.0.0.0", async () => {
  console.log(`[Startup] Aloo Bot server listening on 0.0.0.0:${PORT}`);
  try {
    // Verify D1 connectivity on startup
    await env.DB.prepare("SELECT 1").first();
    console.log("[Startup] Authoritative D1 database connection verified.");
    await registerWebhookIfEnabled();
  } catch (err) {
    console.error("[Startup] Initialization warning:", err);
  }
});

// Graceful shutdown on container restart / stop
async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`[Shutdown] Received ${signal}. Draining ${inFlightTasks.size} active tasks...`);

  clearInterval(broadcastInterval);
  server.close();

  const timeout = new Promise((resolve) => setTimeout(resolve, 10_000));
  await Promise.race([Promise.allSettled(Array.from(inFlightTasks)), timeout]);

  console.log("[Shutdown] Clean exit complete.");
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
