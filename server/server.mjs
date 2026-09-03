#!/usr/bin/env node
/**
 * Paper Radar's model proxy.
 *
 * The site is static, so a key in the browser is a key anyone can read. This
 * moves the real one server-side: the browser presents a cheap app key that
 * only this server accepts, and this server holds the provider key in .env and
 * never sends it anywhere but the provider.
 *
 * The app key is deliberately worth little. It authorises spending *here*, under
 * the limits below, and if it leaks you rotate one line of .env rather than
 * revoking a provider credential and re-issuing it everywhere.
 *
 * What stands between a leaked app key and your bill:
 *   - an allowlist of app keys, and of the origins that may call at all;
 *   - a request-per-minute ceiling per caller;
 *   - a daily token budget for the whole server, reserved up front per request;
 *   - a hard cap on max_tokens, whatever the client asks for;
 *   - an allowlist of models, so nobody can talk you into the expensive one.
 *
 * No dependencies: node:http and the platform fetch. Node 20.6+ reads .env
 * itself, so there is no dotenv either.
 *
 *   node --env-file=.env server.mjs
 */

import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';

const env = (name, fallback = '') => process.env[name] ?? fallback;
const list = (name) => env(name).split(',').map((s) => s.trim()).filter(Boolean);
const int = (name, fallback) => {
    const n = Number.parseInt(env(name, ''), 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
};

const PORT = int('PORT', 8787);
const APP_KEYS = list('APP_KEYS');
const ALLOWED_ORIGINS = list('ALLOWED_ORIGINS');
const ALLOWED_MODELS = list('ALLOWED_MODELS');
const MAX_TOKENS = int('MAX_TOKENS', 4000);
const RATE_PER_MINUTE = int('RATE_PER_MINUTE', 12);
const DAILY_TOKEN_BUDGET = int('DAILY_TOKEN_BUDGET', 300000);
const MAX_BODY_BYTES = int('MAX_BODY_BYTES', 32 * 1024);

const PROVIDERS = {
    anthropic: {
        url: env('ANTHROPIC_URL', 'https://api.anthropic.com/v1/messages'),
        key: env('ANTHROPIC_API_KEY'),
        defaultModel: env('ANTHROPIC_MODEL', 'claude-sonnet-5'),
        headers: (key) => ({
            'content-type': 'application/json',
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
        }),
        body: ({ model, system, prompt, maxTokens, stream }) => ({
            model,
            max_tokens: maxTokens,
            system,
            stream,
            messages: [{ role: 'user', content: prompt }],
        }),
    },
    openai: {
        url: env('OPENAI_URL', 'https://api.openai.com/v1/chat/completions'),
        key: env('OPENAI_API_KEY'),
        defaultModel: env('OPENAI_MODEL', 'gpt-4o-mini'),
        headers: (key) => ({ 'content-type': 'application/json', authorization: `Bearer ${key}` }),
        body: ({ model, system, prompt, maxTokens, stream }) => ({
            model,
            max_tokens: maxTokens,
            stream,
            messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
        }),
    },
};

/* ------------------------------------------------------------------ limits */

const minute = new Map();          // caller -> { windowStartedAt, count }
let day = { startedAt: Date.now(), tokens: 0 };

/** Compare without leaking, through timing, how much of a guess was right. */
function keyAccepted(given) {
    if (!APP_KEYS.length) return false;
    const candidate = Buffer.from(String(given || ''));
    return APP_KEYS.some((known) => {
        const expected = Buffer.from(known);
        if (expected.length !== candidate.length) return false;
        return timingSafeEqual(expected, candidate);
    });
}

function withinRate(caller) {
    const now = Date.now();
    const seen = minute.get(caller);
    if (!seen || now - seen.windowStartedAt > 60000) {
        minute.set(caller, { windowStartedAt: now, count: 1 });
        return true;
    }
    seen.count += 1;
    return seen.count <= RATE_PER_MINUTE;
}

/**
 * Reserve the worst case up front. A request that asks for 4000 tokens costs
 * 4000 against the budget whether or not it uses them, which is the only way to
 * hold a ceiling without waiting to see the bill.
 */
function reserveTokens(maxTokens) {
    const now = Date.now();
    if (now - day.startedAt > 864e5) day = { startedAt: now, tokens: 0 };
    if (day.tokens + maxTokens > DAILY_TOKEN_BUDGET) return false;
    day.tokens += maxTokens;
    return true;
}

/* ------------------------------------------------------------------- plumbing */

function corsHeaders(origin) {
    const allowed = !ALLOWED_ORIGINS.length || ALLOWED_ORIGINS.includes(origin);
    if (!allowed) return null;
    return {
        'access-control-allow-origin': ALLOWED_ORIGINS.length ? origin : '*',
        'access-control-allow-headers': 'content-type,x-app-key',
        'access-control-allow-methods': 'POST,OPTIONS',
        'access-control-max-age': '86400',
        vary: 'origin',
    };
}

const send = (res, status, headers, payload) => {
    res.writeHead(status, { 'content-type': 'application/json', ...headers });
    res.end(JSON.stringify(payload));
};

function readBody(req) {
    return new Promise((resolve, reject) => {
        let size = 0;
        const chunks = [];
        req.on('data', (chunk) => {
            size += chunk.length;
            if (size > MAX_BODY_BYTES) {
                reject(Object.assign(new Error('Body too large'), { status: 413 }));
                req.destroy();
                return;
            }
            chunks.push(chunk);
        });
        req.on('end', () => {
            try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch {
                reject(Object.assign(new Error('Body was not JSON'), { status: 400 }));
            }
        });
        req.on('error', reject);
    });
}

/* --------------------------------------------------------------- the handler */

async function handle(req, res) {
    const origin = req.headers.origin || '';
    const cors = corsHeaders(origin);

    if (req.method === 'OPTIONS') {
        if (!cors) return send(res, 403, {}, { error: 'Origin not allowed' });
        res.writeHead(204, cors);
        return res.end();
    }

    if (req.method === 'GET' && req.url.startsWith('/health')) {
        return send(res, 200, cors || {}, {
            ok: true,
            providers: Object.entries(PROVIDERS).filter(([, p]) => p.key).map(([id]) => id),
            budget: { used: day.tokens, of: DAILY_TOKEN_BUDGET },
        });
    }

    if (req.method !== 'POST') return send(res, 405, cors || {}, { error: 'Use POST' });
    // An unlisted origin is refused before anything is read, let alone spent.
    if (!cors) return send(res, 403, {}, { error: 'Origin not allowed' });

    if (!keyAccepted(req.headers['x-app-key'])) {
        return send(res, 401, cors, { error: 'Bad or missing app key' });
    }

    const caller = String(req.headers['x-app-key']).slice(0, 8)
        + (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '');
    if (!withinRate(caller)) {
        return send(res, 429, { ...cors, 'retry-after': '60' }, { error: `More than ${RATE_PER_MINUTE} requests a minute` });
    }

    let body;
    try { body = await readBody(req); } catch (err) {
        return send(res, err.status || 400, cors, { error: err.message });
    }

    const provider = PROVIDERS[body.provider] || PROVIDERS.anthropic;
    if (!provider.key) return send(res, 501, cors, { error: `No key configured for ${body.provider}` });

    const model = body.model || provider.defaultModel;
    if (ALLOWED_MODELS.length && !ALLOWED_MODELS.includes(model)) {
        return send(res, 400, cors, { error: `Model ${model} is not on this server's list` });
    }

    // Whatever the client asked for, the ceiling here is the one that counts.
    const maxTokens = Math.min(Number(body.max_tokens) || 1000, MAX_TOKENS);
    if (!reserveTokens(maxTokens)) {
        return send(res, 429, cors, { error: "Today's token budget for this server is spent" });
    }

    const stream = body.stream !== false;
    let upstream;
    try {
        upstream = await fetch(provider.url, {
            method: 'POST',
            headers: provider.headers(provider.key),
            body: JSON.stringify(provider.body({
                model,
                system: String(body.system || ''),
                prompt: String(body.prompt || ''),
                maxTokens,
                stream,
            })),
        });
    } catch {
        return send(res, 502, cors, { error: 'Could not reach the provider' });
    }

    if (!upstream.ok) {
        const detail = await upstream.text().catch(() => '');
        // Never pass the provider's echo of our own request back to a browser.
        const safe = detail.includes(provider.key) ? '(withheld)' : detail.slice(0, 300);
        return send(res, upstream.status, cors, { error: 'Provider refused', detail: safe });
    }

    // Forwarded verbatim, so the browser parses the provider's own stream shape
    // and this server never has to understand what it is relaying.
    res.writeHead(200, {
        ...cors,
        'content-type': upstream.headers.get('content-type') || 'application/json',
        'cache-control': 'no-store',
    });
    const reader = upstream.body.getReader();
    for (;;) {
        // eslint-disable-next-line no-await-in-loop
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
    }
    return res.end();
}

export const server = createServer((req, res) => {
    handle(req, res).catch(() => {
        if (!res.headersSent) send(res, 500, {}, { error: 'Something went wrong' });
        else res.end();
    });
});

/* Started only when run directly, so the tests can import it and pick a port. */
if (process.argv[1] && process.argv[1].endsWith('server.mjs')) {
    if (!APP_KEYS.length) {
        console.error('APP_KEYS is empty — every request would be refused. Set it in .env.');
        process.exit(1);
    }
    server.listen(PORT, () => {
        console.log(`Paper Radar proxy on :${PORT}`);
        console.log(`  providers : ${Object.entries(PROVIDERS).filter(([, p]) => p.key).map(([id]) => id).join(', ') || '(none configured)'}`);
        console.log(`  origins   : ${ALLOWED_ORIGINS.join(', ') || '(any)'}`);
        console.log(`  ceilings  : ${RATE_PER_MINUTE}/min · ${MAX_TOKENS} tokens/request · ${DAILY_TOKEN_BUDGET}/day`);
    });
}
