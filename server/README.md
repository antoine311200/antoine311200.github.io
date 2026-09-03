# Paper Radar's model proxy

The site is static, so any key it holds is a key its visitors hold. This moves the
real one behind a server: the browser presents a cheap **app key**, this server adds
the **provider key** from `.env`, and nothing that matters is ever in a page.

```
browser ──x-app-key──▶ this server ──x-api-key──▶ Anthropic
   (rotatable, cheap)     (.env, never sent back)
```

## Run it

```bash
cd server
cp .env.example .env          # then fill in ANTHROPIC_API_KEY and APP_KEYS
npm start                     # node --env-file=.env server.mjs
```

Generate an app key worth using:

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

Then in Paper Radar: **Settings → AI explanations → Or a proxy you control**, set the
URL (`http://localhost:8787/explain` while testing) and paste the app key below it. The
provider-key field disappears — there is nothing for the browser to hold any more.

Check it is up: `curl localhost:8787/health`.

## What protects the credit

An app key is meant to be low-value: it authorises spending *through this server only*,
under ceilings this server enforces. If one leaks, change a line in `.env` and restart
— no provider credential is revoked, nothing else has to be re-issued.

| `.env` | does |
|---|---|
| `APP_KEYS` | the only tokens accepted; comma-separated, compared in constant time |
| `ALLOWED_ORIGINS` | which sites may call at all — set this in production |
| `RATE_PER_MINUTE` | per-caller ceiling (app key + IP) |
| `MAX_TOKENS` | hard cap per request, whatever the client asks for |
| `DAILY_TOKEN_BUDGET` | server-wide ceiling, reserved up front, reset every 24h |
| `ALLOWED_MODELS` | optional allowlist, so nobody talks you into the expensive one |

The budget reserves the request's worst case *before* calling out, which is the only way
to hold a ceiling without waiting for the bill. A stranger who finds the endpoint gets
403 on the origin, then 401 on the key, having spent nothing.

`server/.env` is gitignored. Check before every push that it still is:
`git check-ignore -v server/.env`.

## Deploying

It is one file with no dependencies, so anything that runs Node 20.6+ will do — Fly,
Railway, Render, a VPS, a Raspberry Pi. Set the same variables as real environment
variables rather than shipping `.env`, and put it behind HTTPS: an app key sent over
plain HTTP is an app key on the wire.

Set `ALLOWED_ORIGINS=https://antoine311200.github.io` in production, or the endpoint is
open to any page that finds it.

## Tests

```bash
node --test server/server.test.mjs
```

Ten cases, all about refusals: bad key, wrong origin, capped tokens, unlisted model, rate
limit, exhausted budget, oversized body — and that the provider key never appears in a
response. A stub provider stands in, so the suite costs nothing.

## The shape it speaks

`POST /explain`, with `x-app-key`:

```json
{ "provider": "anthropic", "model": "claude-sonnet-5",
  "system": "…", "prompt": "…", "max_tokens": 1200, "stream": true }
```

The provider's own response is streamed back byte for byte, so the browser parses the
provider's format and this server never has to understand what it is relaying.
