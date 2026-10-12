// Preview only the bundled artifact; never serve the raw download directory.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
const html = await readFile(new URL('dist/soundscape.html', import.meta.url));
const server = createServer((request, response) => {
  if (request.url !== '/' && request.url !== '/soundscape.html') { response.writeHead(404).end('Not found'); return; }
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(html);
});
server.listen(4176, '127.0.0.1', () => console.log('Soundscape preview: http://127.0.0.1:4176'));
