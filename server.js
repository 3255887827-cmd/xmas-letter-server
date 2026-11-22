/**
 * 圣诞 H5 信件后台（零依赖，Node >= 18）
 *
 * 接口：
 *   POST /api/letters          写信   body: { "password": "4-12位", "message": "祝福内容" }
 *   GET  /api/letters/:pwd    取信   返回 { "message": "..." }，不存在返回 404
 *   GET  /api/health           健康检查
 *
 * 数据存储在本目录 data/letters.json。
 * 端口由环境变量 PORT 决定，未设置时默认 3000。
 */
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "letters.json");
const INDEX_FILE = path.join(__dirname, "index.html");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

function loadDB() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, "utf8")); }
  catch (e) { return {}; }
}

function saveDB(db) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function send(res, status, obj) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", ...CORS });
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (c) => {
      body += c;
      if (body.length > 4096) req.destroy();
    });
    req.on("end", () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch (e) { reject(e); }
    });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");

  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS);
    return res.end();
  }

  if (url.pathname === "/api/health") {
    return send(res, 200, { ok: true });
  }

  // 静态首页：对外提供干净版 H5
  if (req.method === "GET" && url.pathname === "/") {
    try {
      const html = fs.readFileSync(INDEX_FILE, "utf8");
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", ...CORS });
      res.end(html);
    } catch (e) {
      send(res, 500, { error: "index missing" });
    }
    return;
  }

  // 写信
  if (req.method === "POST" && url.pathname === "/api/letters") {
    let data;
    try { data = await readBody(req); }
    catch (e) { return send(res, 400, { error: "bad json" }); }

    const pwd = String(data.password || "").trim();
    const msg = String(data.message || "").trim();

    if (pwd.length < 4 || pwd.length > 12 || /\s/.test(pwd)) {
      return send(res, 400, { error: "invalid password" });
    }
    if (!msg || msg.length > 100) {
      return send(res, 400, { error: "invalid message" });
    }

    const db = loadDB();
    db[pwd] = { password: pwd, message: msg, createdAt: Date.now() };
    saveDB(db);
    return send(res, 200, { ok: true });
  }

  // 取信
  if (req.method === "GET") {
    const m = url.pathname.match(/^\/api\/letters\/(.+)$/);
    if (!m) return send(res, 404, { error: "not found" });
    const pwd = decodeURIComponent(m[1]);
    const db = loadDB();
    const rec = db[pwd];
    if (!rec) return send(res, 404, { error: "not found" });
    return send(res, 200, { message: rec.message });
  }

  send(res, 404, { error: "not found" });
});

server.listen(PORT, () => {
  console.log(`xmas-letter-server running on port ${PORT}`);
});
