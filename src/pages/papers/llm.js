/**
 * Talking to a model, from a static site.
 *
 * There is no server here, so there is nowhere to hide a secret: whatever the
 * browser sends, the browser knows. That shapes every decision below.
 *
 * WHERE THE KEY LIVES
 *   It is your key, on your device, sent only to the provider over TLS. It is
 *   held apart from the library, in its own localStorage entry, so that it can
 *   never travel inside an export, a BibTeX file or a shared note — the store
 *   that gets exported simply does not contain it. "Remember on this device"
 *   off keeps it in memory for the session and writes nothing at all.
 *
 * WHAT THAT DOES NOT PROTECT AGAINST
 *   Anything already running in this page can read it: a cross-site scripting
 *   hole, a compromised npm dependency, a browser extension with page access.
 *   No amount of care in this file changes that, so the honest advice is a key
 *   with a hard spend cap, rotated when it has been somewhere it should not.
 *
 * THE WAY OUT
 *   Set a proxy URL and no key is stored in the browser at all: requests go to
 *   something you control — a Cloudflare Worker, a small function — which holds
 *   the real key server-side and forwards the call. That is the only way to
 *   keep a secret genuinely secret from a page like this one.
 */

const KEY_STORE = 'paper-radar:llm';

/* Kept out of localStorage when the reader asked us not to remember it. */
let session = { apiKey: '', appKey: '' };

/* Two different secrets with two different weights:
     apiKey — the provider credential, worth real money if it leaks;
     appKey — the token a proxy accepts, worth only what its own limits allow,
              and rotated by editing one line of the server's .env.
   Both are held here rather than in the library, so neither can ride out inside
   an export. */
function readStored() {
    try {
        const raw = localStorage.getItem(KEY_STORE);
        if (!raw) return { apiKey: '', appKey: '' };
        // Older installs stored the provider key as a bare string.
        if (!raw.startsWith('{')) return { apiKey: raw, appKey: '' };
        const parsed = JSON.parse(raw);
        return { apiKey: parsed.apiKey || '', appKey: parsed.appKey || '' };
    } catch { return { apiKey: '', appKey: '' }; }
}

function writeStored(next) {
    try {
        if (next.apiKey || next.appKey) localStorage.setItem(KEY_STORE, JSON.stringify(next));
        else localStorage.removeItem(KEY_STORE);
    } catch { /* private mode: the session copy still works */ }
}

export const PROVIDERS = {
    anthropic: {
        id: 'anthropic',
        label: 'Anthropic',
        // Anthropic gates browser calls behind an explicit opt-in header, which
        // is a deliberate "you are choosing to expose this key" acknowledgement.
        endpoint: 'https://api.anthropic.com/v1/messages',
        models: ['claude-sonnet-5', 'claude-opus-5', 'claude-haiku-4-5-20251001'],
        defaultModel: 'claude-sonnet-5',
        keyHint: 'sk-ant-…',
        console: 'https://console.anthropic.com/settings/keys',
    },
    openai: {
        id: 'openai',
        label: 'OpenAI-compatible',
        endpoint: 'https://api.openai.com/v1/chat/completions',
        models: [],
        defaultModel: 'gpt-4o-mini',
        keyHint: 'sk-…',
        console: 'https://platform.openai.com/api-keys',
        // Anything speaking the same shape works: OpenRouter, Groq, a local server.
        editableEndpoint: true,
    },
};

/* ------------------------------------------------------------------- the key */

export function loadKey() {
    return session.apiKey || readStored().apiKey || '';
}

/** The token a proxy asks for. Cheap by design — see server/README.md. */
export function loadAppKey() {
    return session.appKey || readStored().appKey || '';
}

export function saveKey(key, { remember }) {
    session = { ...session, apiKey: key || '' };
    const stored = readStored();
    writeStored({ apiKey: remember && key ? key : '', appKey: stored.appKey });
}

export function saveAppKey(key) {
    session = { ...session, appKey: key || '' };
    writeStored({ ...readStored(), appKey: key || '' });
}

export function forgetKey() {
    session = { apiKey: '', appKey: session.appKey };
    writeStored({ ...readStored(), apiKey: '' });
}

/** Whether the key outlives this tab, which is a thing worth showing plainly. */
export function keyIsRemembered() {
    return !!readStored().apiKey;
}

/** "sk-ant-…4f2a" — enough to recognise, not enough to use. */
export function maskKey(key) {
    const k = String(key || '');
    if (!k) return '';
    return k.length <= 8 ? '••••' : `${k.slice(0, 6)}…${k.slice(-4)}`;
}

/** A provider error can echo the request back; never let that reach a screen. */
function scrub(text, key) {
    const s = String(text || '');
    return key ? s.split(key).join('«your key»') : s;
}

/* ------------------------------------------------------------------ requests */

function buildRequest({ config, key, system, prompt, maxTokens, stream }) {
    const provider = PROVIDERS[config.provider] || PROVIDERS.anthropic;
    const model = config.model || provider.defaultModel;

    // A proxy holds the key itself, so the browser sends none.
    if (config.proxyUrl) {
        return {
            url: config.proxyUrl,
            headers: {
                'content-type': 'application/json',
                // Not the provider credential: the token the proxy accepts.
                ...(config.appKey ? { 'x-app-key': config.appKey } : {}),
            },
            body: { provider: provider.id, model, system, prompt, max_tokens: maxTokens, stream },
            shape: provider.id === 'anthropic' ? 'anthropic' : 'openai',
        };
    }

    if (provider.id === 'anthropic') {
        return {
            url: provider.endpoint,
            headers: {
                'content-type': 'application/json',
                'x-api-key': key,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true',
            },
            body: { model, max_tokens: maxTokens, system, stream, messages: [{ role: 'user', content: prompt }] },
            shape: 'anthropic',
        };
    }

    return {
        url: config.endpoint || provider.endpoint,
        headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
        body: {
            model,
            max_tokens: maxTokens,
            stream,
            messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
        },
        shape: 'openai',
    };
}

/** Pull the text out of one SSE data payload, whichever shape it is. */
function deltaFrom(shape, json) {
    if (shape === 'anthropic') {
        if (json.type === 'content_block_delta' && json.delta && typeof json.delta.text === 'string') return json.delta.text;
        return '';
    }
    const choice = (json.choices || [])[0];
    return (choice && choice.delta && choice.delta.content) || '';
}

async function readStream(res, shape, onToken) {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let text = '';

    for (;;) {
        // eslint-disable-next-line no-await-in-loop
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const payload = trimmed.slice(5).trim();
            if (!payload || payload === '[DONE]') continue;
            try {
                const chunk = deltaFrom(shape, JSON.parse(payload));
                if (chunk) { text += chunk; onToken(text); }
            } catch { /* a partial frame; the next read completes it */ }
        }
    }
    return text;
}

/**
 * Ask for one explanation.
 *
 * @param onToken called with the whole text so far, so the caller can render it
 *        as it arrives rather than staring at a spinner for twenty seconds.
 * @returns {Promise<{text: string, model: string}>}
 */
export async function complete({ config, system, prompt, maxTokens = 2000, onToken, signal }) {
    const key = config.proxyUrl ? '' : loadKey();
    const withAppKey = { ...config, appKey: config.proxyUrl ? (config.appKey ?? loadAppKey()) : '' };
    if (!key && !config.proxyUrl) {
        const err = new Error('No API key set. Settings → AI explanations.');
        err.code = 'NO_KEY';
        throw err;
    }

    const stream = typeof onToken === 'function';
    const req = buildRequest({ config: withAppKey, key, system, prompt, maxTokens, stream });

    let res;
    try {
        res = await fetch(req.url, {
            method: 'POST',
            headers: req.headers,
            body: JSON.stringify(req.body),
            signal,
        });
    } catch (err) {
        if (err.name === 'AbortError') throw err;
        throw new Error(config.proxyUrl
            ? 'Could not reach your proxy.'
            : 'Could not reach the provider — check the network, or the endpoint in Settings.');
    }

    if (!res.ok) {
        const body = scrub(await res.text().catch(() => ''), key);
        let message = `${res.status}`;
        try {
            const parsed = JSON.parse(body);
            message = (parsed.error && (parsed.error.message || parsed.error.type)) || message;
        } catch { message = body.slice(0, 200) || message; }
        if (res.status === 401 || res.status === 403) throw new Error(`The key was refused (${message}).`);
        if (res.status === 429) throw new Error('The provider is rate-limiting or out of credit.');
        throw new Error(`The provider returned ${res.status}: ${message}`);
    }

    const model = req.body.model;
    if (!stream) {
        const json = await res.json();
        const text = req.shape === 'anthropic'
            ? (json.content || []).map((c) => c.text || '').join('')
            : (((json.choices || [])[0] || {}).message || {}).content || '';
        return { text, model };
    }
    return { text: await readStream(res, req.shape, onToken), model };
}

/** A one-token round trip, to say whether the key works before it is needed. */
export async function testKey(config) {
    const { text } = await complete({
        config,
        system: 'Reply with the single word: ready',
        prompt: 'ready?',
        maxTokens: 16,
    });
    return text.trim().slice(0, 40);
}
