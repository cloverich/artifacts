// Preview under a repository prefix, with ordinary static-host 404 behavior.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../_site/', import.meta.url));
const prefix = '/artifacts/';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.md': 'text/plain; charset=utf-8' };
await stat(resolve(root, 'index.html'));
createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    if (!url.pathname.startsWith(prefix)) { response.writeHead(404); response.end('Not found'); return; }
    const relative = decodeURIComponent(url.pathname.slice(prefix.length));
    const path = resolve(root, relative.endsWith('/') || !relative ? relative + 'index.html' : relative);
    if (!path.startsWith(root)) { response.writeHead(403); response.end('Forbidden'); return; }
    const body = await readFile(path);
    response.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream' });
    response.end(body);
  } catch { response.writeHead(404); response.end('Not found'); }
}).listen(8765, '127.0.0.1', () => console.log('Local: http://127.0.0.1:8765/artifacts/'));
