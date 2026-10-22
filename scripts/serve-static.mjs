/**
 * Minimal static server for testing the exported site (out/) under a
 * sub-path, the way GitHub Pages serves it: http://localhost:PORT/BASE/
 *   node scripts/serve-static.mjs 3400 /kanalatlas
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const [port = "3400", base = ""] = process.argv.slice(2);
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../out");
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".woff2": "font/woff2", ".png": "image/png", ".ico": "image/x-icon", ".svg": "image/svg+xml", ".txt": "text/plain" };

http
  .createServer((req, res) => {
    let url = decodeURIComponent((req.url || "/").split("?")[0]);
    if (base && !url.startsWith(base)) return res.writeHead(404).end("outside base path");
    url = url.slice(base.length) || "/";
    let file = path.join(root, url);
    if (!file.startsWith(root)) return res.writeHead(403).end();
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    if (!fs.existsSync(file)) return res.writeHead(404).end("not found");
    res.writeHead(200, { "content-type": types[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  })
  .listen(Number(port), () => console.log(`serving out/ at http://localhost:${port}${base}/`));
