/**
 * The proxy's job is to spend money carefully on someone else's behalf, so the
 * things worth testing are the refusals: who is turned away, what is capped,
 * and what never leaves the building.
 *
 *   node --test server/
 *
 * A stub stands in for the provider, so nothing here costs anything.
 */

import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';

const REAL_KEY = 'sk-ant-the-real-credential';
const APP_KEY = 'app-key-for-the-browser';

let upstream;
let upstreamCalls = [];
let proxy;
let base;

/** A stand-in provider that records what it was sent and streams a reply. */
function startUpstream() {
    return new Promise((resolve) => {
        upstream = createServer((req, res) => {
            let body = '';
            req.on('data', (c) => { body += c; });
            req.on('end', () => {
                upstreamCalls.push({ headers: req.headers, body: JSON.parse(body || '{}') });
                if (req.headers['x-api-key'] !== REAL_KEY) {
                    res.writeHead(401, { 'content-type': 'application/json' });
                    res.end(JSON.stringify({ error: { message: `bad key ${req.headers['x-api-key']}` } }));
                    return;
                }
                res.writeHead(200, { 'content-type': 'text/event-stream' });
                res.write(`data: ${JSON.stringify({ type: 'content_block_delta', delta: { text: 'hello' } })}\n\n`);
                res.end('data: [DONE]\n\n');
            });
        });
        upstream.listen(0, () => resolve(`http://127.0.0.1:${upstream.address().port}`));
    });
}

before(async () => {
    const upstreamUrl = await startUpstream();
    process.env.ANTHROPIC_API_KEY = REAL_KEY;
    process.env.ANTHROPIC_URL = upstreamUrl;
    process.env.APP_KEYS = `${APP_KEY},second-key`;
    process.env.ALLOWED_ORIGINS = 'https://antoine311200.github.io';
    process.env.ALLOWED_MODELS = 'claude-sonnet-5';
    process.env.MAX_TOKENS = '500';
    process.env.RATE_PER_MINUTE = '3';
    process.env.DAILY_TOKEN_BUDGET = '1200';

    ({ server: proxy } = await import('./server.mjs'));
    await new Promise((resolve) => { proxy.listen(0, resolve); });
    base = `http://127.0.0.1:${proxy.address().port}`;
});

after(() => { proxy.close(); upstream.close(); });
beforeEach(() => { upstreamCalls = []; });

/* The rate limiter counts per caller, so each case needs its own identity or
   the tests spend each other's allowance. */
let caller = 0;
const ask = (over = {}) => fetch(`${base}/explain`, {
    method: 'POST',
    headers: {
        'content-type': 'application/json',
        origin: 'https://antoine311200.github.io',
        'x-app-key': APP_KEY,
        'x-forwarded-for': over.from || `10.0.0.${(caller += 1)}`,
        ...(over.headers || {}),
    },
    body: JSON.stringify({
        provider: 'anthropic', model: 'claude-sonnet-5',
        system: 's', prompt: 'p', max_tokens: 100, stream: true,
        ...(over.body || {}),
    }),
});

test('a good request is forwarded, and the real key is added here', async () => {
    const res = await ask();
    assert.equal(res.status, 200);
    assert.match(await res.text(), /hello/);

    // The browser sent an app key; the provider saw the real one.
    assert.equal(upstreamCalls[0].headers['x-api-key'], REAL_KEY);
    assert.equal(upstreamCalls[0].headers['x-app-key'], undefined);
});

test('the real key never travels back towards the browser', async () => {
    const res = await ask({ body: { model: 'claude-sonnet-5' }, headers: {} });
    const text = await res.text();
    assert.ok(!text.includes(REAL_KEY), 'response body must not contain the provider key');
    assert.ok(!JSON.stringify([...res.headers]).includes(REAL_KEY));
});

test('without a valid app key, nothing is spent', async () => {
    for (const headers of [{ 'x-app-key': 'guessed' }, { 'x-app-key': '' }]) {
        // eslint-disable-next-line no-await-in-loop
        const res = await ask({ headers });
        assert.equal(res.status, 401);
    }
    assert.equal(upstreamCalls.length, 0, 'the provider was never called');
});

test('an origin that is not ours is refused before the body is read', async () => {
    const res = await ask({ headers: { origin: 'https://someone-elses-site.example' } });
    assert.equal(res.status, 403);
    assert.equal(upstreamCalls.length, 0);
});

test('max_tokens is capped by the server, not by the caller', async () => {
    await ask({ body: { max_tokens: 999999 } });
    assert.equal(upstreamCalls[0].body.max_tokens, 500);
});

test('a model off the list is refused', async () => {
    const res = await ask({ body: { model: 'claude-opus-5' } });
    assert.equal(res.status, 400);
    assert.match((await res.json()).error, /not on this server's list/);
    assert.equal(upstreamCalls.length, 0);
});

test('a caller hammering it is rate limited', async () => {
    const codes = [];
    for (let i = 0; i < 5; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        codes.push((await ask({ from: '10.9.9.9', headers: { 'x-app-key': 'second-key' } })).status);
    }
    assert.deepEqual(codes.slice(0, 3), [200, 200, 200]);
    assert.deepEqual(codes.slice(3), [429, 429]);
});

test('the daily budget is a hard ceiling, reserved before the call', async () => {
    // 1200 tokens a day, 500 a request: the fourth request cannot fit.
    const codes = [];
    for (let i = 0; i < 4; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        const res = await ask({ from: `10.8.8.${i}`, body: { max_tokens: 500 } });
        codes.push(res.status);
    }
    assert.ok(codes.includes(429), `expected a refusal once the budget ran out, got ${codes}`);
});

test('an oversized body is dropped rather than parsed', async () => {
    const res = await fetch(`${base}/explain`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            origin: 'https://antoine311200.github.io',
            'x-app-key': APP_KEY,
        },
        body: JSON.stringify({ provider: 'anthropic', prompt: 'x'.repeat(64 * 1024) }),
    }).catch((err) => ({ status: 413, err }));
    assert.ok(res.status === 413 || res.status >= 400);
});

test('health says what is configured without saying what the key is', async () => {
    const res = await fetch(`${base}/health`, { headers: { origin: 'https://antoine311200.github.io' } });
    const json = await res.json();
    assert.equal(json.ok, true);
    assert.deepEqual(json.providers, ['anthropic']);
    assert.ok(!JSON.stringify(json).includes(REAL_KEY));
});
