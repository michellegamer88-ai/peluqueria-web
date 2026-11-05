import http from "node:http"; import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs"; import { join, extname } from "node:path";
import { BlobsServer } from "@netlify/blobs/server";
const R = process.cwd(); const dir = process.env.BLOBS_DIR; mkdirSync(dir, { recursive: true });
const bs = new BlobsServer({ directory: dir, port: 8077, token: "t" }); await bs.start();
process.env.NETLIFY_BLOBS_CONTEXT = Buffer.from(JSON.stringify({ edgeURL: "http://localhost:8077", uncachedEdgeURL: "http://localhost:8077", siteID: "local", token: "t" })).toString("base64");
const routes = { "/asistente-ia.php": "netlify/edge-functions/chat.js", "/lector-capilar.php": "netlify/edge-functions/lector.js", "/look.php": "netlify/edge-functions/look.js", "/lead.php": "netlify/functions/lead.mjs", "/panel.php": "netlify/functions/panel.mjs" };
const types = { ".html": "text/html", ".css": "text/css", ".js": "application/javascript", ".webp": "image/webp", ".svg": "image/svg+xml" };
http.createServer(async (q, s) => {
  const u = new URL(q.url, "http://" + q.headers.host);
  if (routes[u.pathname]) {
    const mod = await import(join(R, routes[u.pathname]));
    const chunks = []; for await (const c of q) chunks.push(c);
    const req = new Request(u, { method: q.method, headers: q.headers, body: ["GET", "HEAD"].includes(q.method) ? undefined : Buffer.concat(chunks), duplex: "half" });
    const res = await mod.default(req, { ip: q.socket.remoteAddress });
    const hd = {}; res.headers.forEach((v, k) => { hd[k] = v; }); s.writeHead(res.status, hd);
    if (res.body) for await (const c of res.body) s.write(c); s.end(); return;
  }
  let f = join(R, "dist", u.pathname === "/" ? "index.html" : u.pathname);
  if (!existsSync(f) || statSync(f).isDirectory()) { s.writeHead(404); s.end("404"); return; }
  s.writeHead(200, { "Content-Type": types[extname(f)] || "application/octet-stream" }); s.end(readFileSync(f));
}).listen(8090, () => console.log("harness 8090"));
