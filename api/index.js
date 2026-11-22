/**
 * Vercel Serverless 入口：圣诞 H5 信件后台
 *
 * 路由：
 *   GET  /api/health            健康检查
 *   POST /api/letters           写信   body: { password, message }
 *   GET  /api/letters/:password 凭密码取信
 *
 * 持久化优先读取环境变量中的 Upstash Redis（Vercel KV）：
 *   KV_REST_API_URL / KV_REST_API_TOKEN
 * 未配置时退化为进程内存（仅演示，冷启动后丢失）。
 */

const KV_URL = process.env.KV_REST_API_URL || "";
const KV_TOKEN = process.env.KV_REST_API_TOKEN || "";
const DB_KEY = "xmas:letters";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

let memory = {};

async function loadDB() {
  if (KV_URL && KV_TOKEN) {
    try {
      const r = await fetch(`${KV_URL}/get/${DB_KEY}`, {
        headers: { Authorization: `Bearer ${KV_TOKEN}` },
      });
      const text = await r.text();
      if (!text || text === "null") return {};
      // Upstash 可能返回 JSON 字符串或带引号的字符串
      const parsed = JSON.parse(text);
      return typeof parsed === "string" ? JSON.parse(parsed) : parsed;
    } catch (e) {
      return memory;
    }
  }
  return memory;
}

async function saveDB(db) {
  if (KV_URL && KV_TOKEN) {
    await fetch(`${KV_URL}/set/${DB_KEY}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KV_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ value: JSON.stringify(db) }),
    });
  }
  memory = db;
}

function send(res, status, obj) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", ...CORS });
  res.end(JSON.stringify(obj));
}

module.exports = async function handler(req, res) {
  const u = new URL(req.url, "http://localhost");

  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS);
    return res.end();
  }

  if (u.pathname === "/api/health") {
    return send(res, 200, { ok: true });
  }

  // 写信
  if (req.method === "POST" && u.pathname === "/api/letters") {
    let data = req.body || {};
    if (typeof data === "string") {
      try { data = JSON.parse(data); } catch (e) { data = {}; }
    }
    const pwd = String(data.password || "").trim();
    const msg = String(data.message || "").trim();

    if (pwd.length < 4 || pwd.length > 12 || /\s/.test(pwd)) {
      return send(res, 400, { error: "invalid password" });
    }
    if (!msg || msg.length > 100) {
      return send(res, 400, { error: "invalid message" });
    }

    const db = await loadDB();
    db[pwd] = { password: pwd, message: msg, createdAt: Date.now() };
    await saveDB(db);
    return send(res, 200, { ok: true });
  }

  // 取信
  if (req.method === "GET") {
    const m = u.pathname.match(/^\/api\/letters\/(.+)$/);
    if (!m) return send(res, 404, { error: "not found" });
    const pwd = decodeURIComponent(m[1]);
    const db = await loadDB();
    const rec = db[pwd];
    if (!rec) return send(res, 404, { error: "not found" });
    return send(res, 200, { message: rec.message });
  }

  send(res, 404, { error: "not found" });
};
