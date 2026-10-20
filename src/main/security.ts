import { app, shell, WebContents } from 'electron';
import http from 'http';
import https from 'https';
import { URL } from 'url';
import net from 'net';

/**
 * Checks if an IP address is a private/loopback/link-local address (SSRF protection).
 */
export function isPrivateIp(ip: string): boolean {
  if (ip === 'localhost' || ip === '::1' || ip === '127.0.0.1') {
    return true;
  }

  // IPv4 checks
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    // 127.0.0.0/8 (Loopback)
    if (parts[0] === 127) return true;
    // 10.0.0.0/8 (Private)
    if (parts[0] === 10) return true;
    // 172.16.0.0/12 (Private)
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.0.0/16 (Private)
    if (parts[0] === 192 && parts[1] === 168) return true;
    // 169.254.0.0/16 (Link-local)
    if (parts[0] === 169 && parts[1] === 254) return true;
    // 0.0.0.0/8
    if (parts[0] === 0) return true;
  }

  // IPv6 checks
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (lower === '::1' || lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80')) {
      return true;
    }
  }

  return false;
}

/**
 * Sanitizes URLs for logging, stripping sensitive query params like tokens, keys, signatures.
 */
export function sanitizeUrlForLogging(urlString: string): string {
  try {
    const parsed = new URL(urlString);
    const sensitiveParams = ['token', 'key', 'auth', 'secret', 'signature', 'sig', 'api_key', 'access_token'];
    for (const key of Array.from(parsed.searchParams.keys())) {
      if (sensitiveParams.some((param) => key.toLowerCase().includes(param))) {
        parsed.searchParams.set(key, '[REDACTED]');
      }
    }
    return parsed.toString();
  } catch {
    return '[MALFORMED_URL]';
  }
}

/**
 * Validates whether an external URL is safe to open via shell.openExternal.
 */
export function isSafeExternalUrl(targetUrl: string): boolean {
  try {
    const parsed = new URL(targetUrl);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return false;
    }
    if (isPrivateIp(parsed.hostname)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Configures navigation and window opening guards on a WebContents.
 */
export function applyWebContentsSecurity(contents: WebContents): void {
  // Block creation of new windows from renderer; open verified safe URLs externally
  contents.setWindowOpenHandler(({ url }) => {
    if (isSafeExternalUrl(url)) {
      shell.openExternal(url).catch((err) => {
        console.error('Failed to open external url:', err);
      });
    }
    return { action: 'deny' };
  });

  // Block in-app navigation away from application shell
  contents.on('will-navigate', (event, navigationUrl) => {
    // Allow local dev server or app file navigation only
    if (
      navigationUrl.startsWith('http://localhost:5173') ||
      navigationUrl.startsWith('http://127.0.0.1:5173') ||
      navigationUrl.startsWith('file://')
    ) {
      return;
    }
    event.preventDefault();
    if (isSafeExternalUrl(navigationUrl)) {
      shell.openExternal(navigationUrl).catch(console.error);
    }
  });
}

/**
 * Safely inspects a remote URL using HEAD request with timeout, redirect limit, and SSRF guard.
 */
export async function safeInspectUrl(targetUrl: string): Promise<{
  valid: boolean;
  mimeType?: string;
  contentLength?: number;
  isStream?: boolean;
  error?: string;
}> {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(targetUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return resolve({ valid: false, error: 'Protocol must be http: or https:' });
      }

      if (isPrivateIp(parsed.hostname)) {
        return resolve({ valid: false, error: 'Private or local IP addresses are blocked' });
      }

      const client = parsed.protocol === 'https:' ? https : http;
      let redirectCount = 0;
      const maxRedirects = 3;

      const performRequest = (reqUrl: string) => {
        const u = new URL(reqUrl);
        const req = client.request(
          {
            protocol: u.protocol,
            hostname: u.hostname,
            port: u.port || (u.protocol === 'https:' ? 443 : 80),
            path: u.pathname + u.search,
            method: 'HEAD',
            timeout: 5000,
            headers: {
              'User-Agent': 'LoopWave/1.0.0 DesktopPlayer'
            }
          },
          (res) => {
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
              if (redirectCount >= maxRedirects) {
                return resolve({ valid: false, error: 'Too many redirects' });
              }
              redirectCount++;
              const nextUrl = new URL(res.headers.location, reqUrl).toString();
              return performRequest(nextUrl);
            }

            const contentType = res.headers['content-type'] || '';
            const contentLength = res.headers['content-length']
              ? parseInt(res.headers['content-length'], 10)
              : undefined;

            const isStream =
              contentType.includes('application/x-mpegURL') ||
              contentType.includes('application/vnd.apple.mpegurl') ||
              reqUrl.includes('.m3u8');

            const isMedia =
              contentType.startsWith('video/') ||
              contentType.startsWith('audio/') ||
              isStream ||
              /\.(mp4|webm|m3u8|mp3|ogg|wav|aac|flac)$/i.test(u.pathname);

            resolve({
              valid: (res.statusCode || 0) < 400 && isMedia,
              mimeType: contentType,
              contentLength,
              isStream
            });
          }
        );

        req.on('timeout', () => {
          req.destroy();
          resolve({ valid: false, error: 'Request timed out' });
        });

        req.on('error', (err) => {
          resolve({ valid: false, error: err.message });
        });

        req.end();
      };

      performRequest(targetUrl);
    } catch (err: any) {
      resolve({ valid: false, error: err.message || 'Invalid URL' });
    }
  });
}
