import { createReadStream } from 'node:fs';
import { access, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(process.env.STATIC_DIR ?? fileURLToPath(new URL('../dist', import.meta.url)));
const port = Number(process.env.PORT ?? 8080);
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const candidate = resolve(root, `.${normalize(decoded)}`);
  return candidate.startsWith(`${root}/`) || candidate === root ? candidate : null;
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

const server = createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { allow: 'GET, HEAD' }).end();
    return;
  }
  const requestedPath = safePath(request.url ?? '/');
  const indexPath = join(root, 'index.html');
  let filePath = requestedPath && (await fileExists(requestedPath)) ? requestedPath : indexPath;
  if (filePath !== indexPath) {
    const fileStats = await stat(filePath);
    if (fileStats.isDirectory()) filePath = indexPath;
  }
  if (!(await fileExists(filePath))) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Not found');
    return;
  }
  const contentType = mimeTypes[extname(filePath)] ?? 'application/octet-stream';
  response.writeHead(200, { 'content-type': contentType, 'cache-control': filePath === indexPath ? 'no-cache' : 'public, max-age=31536000, immutable' });
  if (request.method === 'HEAD') {
    response.end();
    return;
  }
  createReadStream(filePath).pipe(response);
});

server.listen(port, '0.0.0.0', () => {
  console.log(JSON.stringify({ level: 'info', service: 'casioplus-static-surface', port, root }));
});
