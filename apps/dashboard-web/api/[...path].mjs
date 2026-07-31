import { Readable } from 'node:stream';

const BLOCKED_REQUEST_HEADERS = new Set([
  'accept-encoding',
  'connection',
  'content-length',
  'host',
  'transfer-encoding',
  'x-forwarded-for',
  'x-forwarded-host',
  'x-forwarded-port',
  'x-forwarded-proto',
]);

const BLOCKED_RESPONSE_HEADERS = new Set([
  'connection',
  'content-length',
  'set-cookie',
  'transfer-encoding',
]);

function apiOrigin() {
  const configured = process.env.AWS_API_ORIGIN?.trim().replace(/\/$/, '');
  if (!configured || !configured.startsWith('https://')) {
    throw new Error('AWS_API_ORIGIN must be configured as an HTTPS origin.');
  }
  return configured;
}

function requestPath(request) {
  const value = request.query?.path;
  if (Array.isArray(value)) return value.map(encodeURIComponent).join('/');
  if (typeof value === 'string') return value.split('/').map(encodeURIComponent).join('/');
  return '';
}

function queryString(request) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(request.query ?? {})) {
    if (key === 'path' || value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) search.append(key, String(item));
    } else {
      search.append(key, String(value));
    }
  }
  const encoded = search.toString();
  return encoded ? `?${encoded}` : '';
}

function forwardedHeaders(request) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(request.headers ?? {})) {
    const normalized = key.toLowerCase();
    if (BLOCKED_REQUEST_HEADERS.has(normalized) || value === undefined) continue;
    headers.set(key, Array.isArray(value) ? value.join(', ') : String(value));
  }
  headers.set('x-ptc-proxy', 'vercel');
  return headers;
}

function requestBody(request) {
  if (request.method === 'GET' || request.method === 'HEAD' || request.body === undefined) return undefined;
  if (Buffer.isBuffer(request.body)) return request.body;
  if (typeof request.body === 'string') return request.body;
  return JSON.stringify(request.body);
}

function copyResponseHeaders(upstream, response) {
  upstream.headers.forEach((value, key) => {
    if (!BLOCKED_RESPONSE_HEADERS.has(key.toLowerCase())) response.setHeader(key, value);
  });

  const setCookies = typeof upstream.headers.getSetCookie === 'function'
    ? upstream.headers.getSetCookie()
    : [upstream.headers.get('set-cookie')].filter(Boolean);
  if (setCookies.length) response.setHeader('Set-Cookie', setCookies);
}

export default async function handler(request, response) {
  try {
    const path = requestPath(request);
    const realtime = request.method === 'GET' && path === 'realtime';
    const target = `${apiOrigin()}/api/${path}${queryString(request)}`;
    const upstream = await fetch(target, {
      method: request.method,
      headers: forwardedHeaders(request),
      body: requestBody(request),
      redirect: 'manual',
      ...(realtime ? {} : { signal: AbortSignal.timeout(25_000) }),
    });

    copyResponseHeaders(upstream, response);
    response.status(upstream.status);
    if (!upstream.body || request.method === 'HEAD') {
      response.end();
      return;
    }

    if (realtime) {
      Readable.fromWeb(upstream.body).pipe(response);
      return;
    }

    const body = Buffer.from(await upstream.arrayBuffer());
    response.send(body);
  } catch (error) {
    console.error('PTC Vercel proxy failure', error);
    if (!response.headersSent) {
      response.status(502).json({
        code: 'UPSTREAM_UNAVAILABLE',
        message: 'The staging API is temporarily unavailable.',
      });
      return;
    }
    response.end();
  }
}
