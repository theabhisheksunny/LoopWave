import http from 'http';
import fs from 'fs';
import path from 'path';

let localServer: http.Server | null = null;
let serverBaseUrl: string | null = null;

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm'
};

/**
 * Starts a minimal, secure local loopback HTTP server to serve the renderer bundle.
 * This ensures standard HTTP/HTTPS origin semantics for third-party embeds (such as
 * the YouTube IFrame Player API) and eliminates file:// origin postMessage restrictions
 * and embedder identity errors (YT error 152 / 153).
 */
export function startLocalServer(rendererDir: string): Promise<string> {
  if (serverBaseUrl && localServer) {
    return Promise.resolve(serverBaseUrl);
  }

  return new Promise((resolve, reject) => {
    localServer = http.createServer((req, res) => {
      // Disallow non-GET/HEAD methods for static file server
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, { 'Content-Type': 'text/plain' });
        res.end('Method Not Allowed');
        return;
      }

      let pathname = '/index.html';
      try {
        const parsed = new URL(req.url || '/', 'http://127.0.0.1');
        pathname = decodeURIComponent(parsed.pathname);
      } catch {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Bad Request');
        return;
      }

      if (pathname === '/' || pathname === '') {
        pathname = '/index.html';
      }

      // Security: Prevent directory traversal
      const safeRelative = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
      let filePath = path.join(rendererDir, safeRelative);

      // Verify filePath is contained within rendererDir
      if (!filePath.startsWith(rendererDir)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Forbidden');
        return;
      }

      fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
          // SPA fallback: return index.html for extensionless or missing routes
          filePath = path.join(rendererDir, 'index.html');
        }

        fs.readFile(filePath, (readErr, content) => {
          if (readErr) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
            return;
          }

          const ext = path.extname(filePath).toLowerCase();
          const contentType = MIME_TYPES[ext] || 'application/octet-stream';

          res.writeHead(200, {
            'Content-Type': contentType,
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'X-Content-Type-Options': 'nosniff',
            'Access-Control-Allow-Origin': '*'
          });

          if (req.method === 'HEAD') {
            res.end();
          } else {
            res.end(content);
          }
        });
      });
    });

    // Bind strictly to loopback interface on random available OS port (0)
    localServer.listen(0, '127.0.0.1', () => {
      const address = localServer?.address();
      if (address && typeof address === 'object') {
        serverBaseUrl = `http://127.0.0.1:${address.port}`;
        resolve(serverBaseUrl);
      } else {
        reject(new Error('Failed to retrieve local server address'));
      }
    });

    localServer.on('error', (err) => {
      console.error('Local HTTP server error:', err);
      reject(err);
    });
  });
}

/**
 * Stops the local loopback HTTP server gracefully.
 */
export function stopLocalServer(): void {
  if (localServer) {
    try {
      localServer.close();
    } catch {
      // ignore
    }
    localServer = null;
    serverBaseUrl = null;
  }
}
