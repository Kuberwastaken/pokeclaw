#!/usr/bin/env node
import http from 'node:http';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';

const CONFIG = {
  mode: (process.env.BRIDGE_MODE || 'stdio').toLowerCase(),
  host: process.env.BRIDGE_HOST || '127.0.0.1',
  port: Number(process.env.BRIDGE_PORT || 8787),
  upstreamTransport: (process.env.UPSTREAM_TRANSPORT || 'stdio').toLowerCase(),
  upstreamCommand: process.env.UPSTREAM_COMMAND || '',
  upstreamArgsJson: process.env.UPSTREAM_ARGS_JSON || '[]',
  upstreamCwd: process.env.UPSTREAM_CWD || process.cwd(),
  upstreamEnvJson: process.env.UPSTREAM_ENV_JSON || '{}',
  upstreamSseUrl: process.env.UPSTREAM_SSE_URL || '',
  upstreamSsePostUrl: process.env.UPSTREAM_SSE_POST_URL || '',
  upstreamSseHeadersJson: process.env.UPSTREAM_SSE_HEADERS_JSON || '{}',
  reconnectDelayMs: Number(process.env.UPSTREAM_RECONNECT_DELAY_MS || 3000),
  sessionTimeoutMs: Number(process.env.SESSION_TIMEOUT_MS || 30 * 60 * 1000),
};

function log(...args) {
  process.stderr.write(`[pokeclaw-bridge] ${args.join(' ')}\n`);
}

function parseJson(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function toLineMessage(message) {
  return JSON.stringify(message) + '\n';
}

function sendSse(res, eventName, data) {
  if (eventName) res.write(`event: ${eventName}\n`);
  const text = typeof data === 'string' ? data : JSON.stringify(data);
  for (const line of text.split(/\r?\n/)) {
    res.write(`data: ${line}\n`);
  }
  res.write('\n');
}

function sendSseComment(res, comment) {
  res.write(`: ${comment}\n\n`);
}

function createLineParser(onLine) {
  let buffer = '';
  return (chunk) => {
    buffer += chunk.toString('utf8');
    let index;
    while ((index = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, index).replace(/\r$/, '');
      buffer = buffer.slice(index + 1);
      if (line.trim() === '') continue;
      onLine(line);
    }
  };
}

function createStdioEndpoint({ input, output, name }) {
  const listeners = new Set();
  let closed = false;

  const handleLine = createLineParser((line) => {
    try {
      const message = JSON.parse(line);
      for (const listener of listeners) listener(message);
    } catch (error) {
      log(`${name}: failed to parse JSON line`, String(error));
    }
  });

  input.setEncoding('utf8');
  input.on('data', handleLine);
  input.on('close', () => {
    closed = true;
    for (const listener of listeners) listener({ jsonrpc: '2.0', method: 'bridge.closed', params: { transport: name } });
  });

  return {
    name,
    send(message) {
      if (closed) return;
      output.write(toLineMessage(message));
    },
    onMessage(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    close() {
      closed = true;
      try { input.destroy(); } catch {}
    },
  };
}

function spawnUpstreamStdio() {
  const args = parseJson(CONFIG.upstreamArgsJson, []);
  const extraEnv = parseJson(CONFIG.upstreamEnvJson, {});

  if (!CONFIG.upstreamCommand) {
    throw new Error('UPSTREAM_COMMAND is required when UPSTREAM_TRANSPORT=stdio');
  }

  const child = spawn(CONFIG.upstreamCommand, args, {
    cwd: CONFIG.upstreamCwd,
    env: { ...process.env, ...extraEnv },
    stdio: ['pipe', 'pipe', 'inherit'],
  });

  const endpoint = createStdioEndpoint({ input: child.stdout, output: child.stdin, name: `upstream:${child.pid}` });
  const close = () => {
    try { child.kill('SIGTERM'); } catch {}
  };
  child.on('exit', () => endpoint.close());
  child.on('error', (error) => log('upstream child error', String(error)));

  return { ...endpoint, close };
}

function createHttpSseClient() {
  if (!CONFIG.upstreamSseUrl) {
    throw new Error('UPSTREAM_SSE_URL is required when UPSTREAM_TRANSPORT=sse');
  }
  if (!CONFIG.upstreamSsePostUrl) {
    throw new Error('UPSTREAM_SSE_POST_URL is required when UPSTREAM_TRANSPORT=sse');
  }

  const headers = parseJson(CONFIG.upstreamSseHeadersJson, {});
  const listeners = new Set();
  let closed = false;
  let controller = null;

  async function connect() {
    while (!closed) {
      try {
        controller = new AbortController();
        const response = await fetch(CONFIG.upstreamSseUrl, {
          method: 'GET',
          headers: {
            Accept: 'text/event-stream',
            ...headers,
          },
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error(`SSE handshake failed with status ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let eventName = 'message';
        let dataLines = [];
        let pending = '';

        const flush = () => {
          if (!dataLines.length) {
            eventName = 'message';
            return;
          }
          const raw = dataLines.join('\n');
          dataLines = [];
          eventName = 'message';
          try {
            const message = JSON.parse(raw);
            for (const listener of listeners) listener(message);
          } catch {
            for (const listener of listeners) listener({ event: eventName, data: raw });
          }
        };

        while (!closed) {
          const { value, done } = await reader.read();
          if (done) break;
          pending += decoder.decode(value, { stream: true });

          let idx;
          while ((idx = pending.indexOf('\n')) >= 0) {
            const line = pending.slice(0, idx).replace(/\r$/, '');
            pending = pending.slice(idx + 1);
            if (line === '') {
              flush();
              continue;
            }
            if (line.startsWith('event:')) {
              eventName = line.slice(6).trim();
              continue;
            }
            if (line.startsWith('data:')) {
              dataLines.push(line.slice(5).trimStart());
              continue;
            }
          }
        }
      } catch (error) {
        if (closed) break;
        log('upstream SSE disconnected; reconnecting in', String(CONFIG.reconnectDelayMs), 'ms', '-', String(error));
        await sleep(CONFIG.reconnectDelayMs);
      }
    }
  }

  connect().catch((error) => log('upstream SSE connect loop failed', String(error)));

  return {
    name: 'upstream:sse',
    async send(message) {
      if (closed) return;
      const response = await fetch(CONFIG.upstreamSsePostUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(message),
      });
      if (!response.ok) {
        throw new Error(`upstream SSE POST failed with status ${response.status}`);
      }
    },
    onMessage(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    close() {
      closed = true;
      try { controller?.abort(); } catch {}
    },
  };
}

function createUpstreamTransport() {
  if (CONFIG.upstreamTransport === 'stdio') return spawnUpstreamStdio();
  if (CONFIG.upstreamTransport === 'sse') return createHttpSseClient();
  throw new Error(`Unsupported UPSTREAM_TRANSPORT: ${CONFIG.upstreamTransport}`);
}

function bridgePair({ inbound, outbound, onClose, label }) {
  const cancelUp = inbound.onMessage(async (message) => {
    try {
      await outbound.send(message);
    } catch (error) {
      log(label, 'failed to forward inbound -> outbound:', String(error));
    }
  });
  const cancelDown = outbound.onMessage(async (message) => {
    try {
      await inbound.send(message);
    } catch (error) {
      log(label, 'failed to forward outbound -> inbound:', String(error));
    }
  });

  return () => {
    try { cancelUp?.(); } catch {}
    try { cancelDown?.(); } catch {}
    try { inbound.close(); } catch {}
    try { outbound.close(); } catch {}
    try { onClose?.(); } catch {}
  };
}

async function runStdioMode() {
  const local = createStdioEndpoint({ input: process.stdin, output: process.stdout, name: 'local:stdio' });
  const upstream = createUpstreamTransport();
  const cleanup = bridgePair({ inbound: local, outbound: upstream, label: 'stdio-bridge' });

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  log('running in stdio mode');
}

function createHttpSession({ sessionId, res }) {
  const local = {
    name: `local:http:${sessionId}`,
    send(message) {
      if (res.writableEnded) return;
      sendSse(res, 'message', message);
    },
    onMessage() {
      throw new Error('use POST /messages for inbound HTTP messages');
    },
    close() {
      try { res.end(); } catch {}
    },
  };

  const upstream = createUpstreamTransport();
  const messageListeners = new Set();
  let closed = false;
  let timer = setInterval(() => {
    if (!closed) sendSseComment(res, 'keepalive');
  }, 15000);
  let expiry = setTimeout(() => {
    if (!closed) {
      log(`session ${sessionId} timed out after ${CONFIG.sessionTimeoutMs}ms`);
      session.close();
    }
  }, CONFIG.sessionTimeoutMs);

  const cancelUp = upstream.onMessage((message) => {
    if (!closed) local.send(message);
  });

  const session = {
    id: sessionId,
    send(message) {
      if (closed) return;
      local.send(message);
    },
    onMessage(listener) {
      messageListeners.add(listener);
      return () => messageListeners.delete(listener);
    },
    receive(message) {
      for (const listener of messageListeners) listener(message);
    },
    close() {
      if (closed) return;
      closed = true;
      clearInterval(timer);
      clearTimeout(expiry);
      try { cancelUp?.(); } catch {}
      try { upstream.close(); } catch {}
      try { res.end(); } catch {}
    },
  };

  return { session, upstream };
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

async function runHttpMode() {
  const sessions = new Map();

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || `${CONFIG.host}:${CONFIG.port}`}`);

    if (req.method === 'GET' && url.pathname === '/healthz') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (req.method === 'GET' && url.pathname === '/sse') {
      const sessionId = url.searchParams.get('session') || randomUUID();
      res.writeHead(200, {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache, no-transform',
        connection: 'keep-alive',
        'x-accel-buffering': 'no',
      });
      sendSse(res, 'endpoint', `/messages?session=${sessionId}`);
      sendSseComment(res, `session ${sessionId} ready`);

      const { session, upstream } = createHttpSession({ sessionId, res });
      sessions.set(sessionId, { session, upstream });
      req.on('close', () => {
        sessions.delete(sessionId);
        session.close();
      });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/messages') {
      const sessionId = url.searchParams.get('session');
      if (!sessionId || !sessions.has(sessionId)) {
        res.writeHead(404, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'unknown session' }));
        return;
      }

      const entry = sessions.get(sessionId);
      try {
        const message = await readJsonBody(req);
        await entry.upstream.send(message);
        res.writeHead(202, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (error) {
        res.writeHead(400, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: String(error) }));
      }
      return;
    }

    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'not found' }));
  });

  server.listen(CONFIG.port, CONFIG.host, () => {
    log(`running on http://${CONFIG.host}:${CONFIG.port}`);
  });

  process.on('SIGINT', () => server.close());
  process.on('SIGTERM', () => server.close());
}

async function main() {
  if (CONFIG.mode === 'stdio') {
    await runStdioMode();
    return;
  }

  if (CONFIG.mode === 'http' || CONFIG.mode === 'sse') {
    await runHttpMode();
    return;
  }

  if (CONFIG.mode === 'both') {
    await Promise.all([runStdioMode(), runHttpMode()]);
    return;
  }

  throw new Error(`Unsupported BRIDGE_MODE: ${CONFIG.mode}`);
}

main().catch((error) => {
  log('fatal:', String(error));
  process.exitCode = 1;
});
