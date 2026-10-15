// Read-only local preview; expose only this prototype's four public files.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const port = Number(process.argv[2] || 8791);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Choose a port from 1024 to 65535');
const routes = new Map([
  ['/', ['index.html', 'text/html']],
  ['/index.html', ['index.html', 'text/html']],
  ['/style.css', ['style.css', 'text/css']],
  ['/app.js', ['app.js', 'text/javascript']],
  ['/steward.html', ['dist/steward.html', 'text/html']],
]);
createServer(async (request, response) => {
  const route = routes.get(new URL(request.url, 'http://localhost').pathname);
  if (!route || !['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(404).end('Not found');
    return;
  }
  try {
    const body = await readFile(new URL(route[0], import.meta.url));
    response.writeHead(200, { 'Content-Type': `${route[1]}; charset=utf-8`, 'Cache-Control': 'no-store' });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch {
    response.writeHead(404).end('Build the standalone file first: node build.mjs');
  }
}).listen(port, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${port}/steward.html`));
