import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.PORT || 3000);
const ROOT = fileURLToPath(new URL(".", import.meta.url));
const UPSTREAM_URL = "https://lastasylum.gg/api/alliance/67172519";
const CACHE_MS = 5 * 60 * 1000;
let cache = { expiresAt: 0, value: null };

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

function send(response, status, body, contentType = "text/plain; charset=utf-8") {
  response.writeHead(status, { "Content-Type": contentType, "Cache-Control": "no-store" });
  response.end(body);
}

async function getAlliance() {
  if (cache.value && cache.expiresAt > Date.now()) return cache.value;
  const upstream = await fetch(UPSTREAM_URL, { headers: { Accept: "application/json" } });
  if (!upstream.ok) throw new Error(`Upstream returned ${upstream.status}`);
  const payload = await upstream.json();
  if (!Array.isArray(payload.roster) || !payload.id || !payload.asOf) throw new Error("Unexpected upstream payload");
  cache = { value: JSON.stringify(payload), expiresAt: Date.now() + CACHE_MS };
  return cache.value;
}

createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  if (request.method === "GET" && url.pathname === "/api/alliance") {
    try {
      const body = await getAlliance();
      response.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=300" });
      response.end(body);
    } catch {
      send(response, 502, JSON.stringify({ error: "upstream_unavailable" }), "application/json; charset=utf-8");
    }
    return;
  }

  const requested = url.pathname === "/" ? "index.html" : url.pathname.replace(/^\/+/, "");
  const filePath = normalize(join(ROOT, requested));
  if (!filePath.startsWith(ROOT)) {
    send(response, 403, "Forbidden");
    return;
  }

  try {
    const content = await readFile(filePath);
    send(response, 200, content, contentTypes[extname(filePath)] || "application/octet-stream");
  } catch {
    send(response, 404, "Not found");
  }
}).listen(PORT, () => console.log(`Alliance Watch is listening on port ${PORT}`));
