# figures

Interactive figures for articles. Self-contained: depends on React and KaTeX,
ships its own stylesheet, and knows nothing about the site it is embedded in.

```jsx
import { Figure, boids } from '../lib/figures';

<Figure model={boids} height={440} caption="Reynolds flocking on a torus." />
```

**Writing a figure: see [AUTHORING.md](./AUTHORING.md).** This file is the
overview and reference.

## Why it is split this way

The shell — canvas sizing, the animation loop, play/pause/step/reset, the
control panel, off-screen pausing, accessibility — is written once. A figure is
then a *model*: plain data and plain functions with no React in them. Adding a
figure costs one small file and one registry line, not a component.

```
core/     engine, model & plot contracts, params, registry, seeded rng,
          plot.js (2D axes), scene3d.js (orbit camera + painter's algorithm)
react/    Figure, FigureBlock, useFigure, controls — the only files with React
models/   the figures themselves
figures.css
```

Seven models ship with it: `boids`, `game-of-life`, `double-pendulum`,
`harmonic-oscillator`, `fourier-series`, `bloch-sphere`, `sphere-flock`.

## Two kinds of figure

**`defineModel`** — a simulation that is stepped.

```js
export default defineModel({
  id: 'boids',
  name: 'Flocking · Reynolds boids',
  description: 'Read aloud as the canvas alt text.',
  rate: 60,                                  // simulation steps per second

  params: [
    { key: 'count', label: 'Agents', min: 20, max: 700, step: 10, default: 260, group: 'Population' },
    { key: 'trails', label: 'Trails', type: 'toggle', default: true },
  ],
  presets: [{ name: 'Swarm', values: { cohesion: 1.6 } }],
  actions: [{ id: 'clear', label: 'Clear', run(state, params, rng) { … } }],

  init(params, rng, env)         { return { … }; },   // required
  step(state, params, dt, rng)   { … },               // required, fixed dt
  draw(ctx, state, params, env)  { … },               // required

  sync(state, params, rng, env)  { … },   // optional, before each frame
  clear(ctx, state, params, env) { … },   // optional, default is clearRect
  stats(state, params)           { return [{ label: 'Order φ', value: '0.93' }]; },
  onPointer(state, pointer, params, rng) { … },       // press & drag
});
```

**`definePlot`** — an equation drawn as a curve, animated by time.

```js
export default definePlot({
  id: 'harmonic-oscillator',
  name: 'Oscillation · Damped harmonic',

  params: [ … ],
  xLabel: 't  (s)',
  yLabel: 'x(t)',
  xDomain: (p, t) => (t <= p.window ? [0, p.window] : [t - p.window, t]),  // slides
  yDomain: (p) => (p.autoscale ? 'auto' : [-1.4, 1.4]),

  series: [
    { id: 'x', label: 'x(t)', color: '#fb923c', width: 2, fn: (t, p) => … },
    { id: 'v', label: 'v(t)', color: '#38bdf8', dash: [6, 3],
      visible: p => p.velocity, fn: (t, p) => … },
  ],

  decorate(plot, params, t, state) { plot.dot(t, x, { color: '#fb923c' }); },
});
```

Axes, ticks, the legend, and the hover readout (a vertical cut through every
series) come for free. `core/plot.js` is also usable directly from a
`defineModel` if a figure needs axes *and* a simulation.

**3D** is a third option, not a third contract: a `defineModel` imports
`createScene` from `core/scene3d.js` and draws into the same 2D context. See
[AUTHORING.md](./AUTHORING.md) — there is no WebGL and no extra dependency.

## Rules for a model

- **No React, no DOM** beyond the 2D context handed to `draw`.
- **No `Math.random()`, no `Date.now()`.** Randomness comes from the `rng`
  argument and time from `dt`, so a run is reproducible: the toolbar's ↺
  replays the identical run, and 🎲 asks for a new seed.
- **`step` gets a fixed `dt`** (`1 / model.rate`), so behaviour is the same at
  60Hz and 144Hz and playback speed is just a multiplier.
- Before every frame the engine writes `state.width`, `state.height`,
  `state.time` and `state.pointer` onto the state object.

## Parameter specs

| field | meaning |
| --- | --- |
| `type` | `range` (default), `toggle`, `select` |
| `min` / `max` / `step` | range bounds; `step` also sets the displayed precision |
| `default` | required |
| `unit` | appended to the readout |
| `tex` | KaTeX label, e.g. `w_{\mathrm{sep}}`; `label` stays the accessible name |
| `group` | controls are laid out in labelled groups |
| `hint` | tooltip |
| `format` | `(v) => string` for a custom readout |
| `reinit` | changing it rebuilds state instead of being absorbed live |

Everything else is live: dragging a slider reshapes the running simulation.
Prefer absorbing a change in `sync` over marking it `reinit` — `boids` grows
and shrinks its population in place rather than restarting.

## `<Figure>` props

| prop | default | |
| --- | --- | --- |
| `model` | — | model object or registered id |
| `overrides` | `{}` | starting parameter values |
| `height` | `400` | stage height in px |
| `aspect` | — | e.g. `16/9`, instead of `height` |
| `caption` | — | string or node |
| `controls` | `true` | show the parameter panel |
| `stats` | `true` | show the readout bar |
| `speeds` | `true` | show 0.25×–4× |
| `autoplay` | `true` | ignored when the OS asks for reduced motion |

## Theming

The stylesheet is namespaced under `.figx` and driven by custom properties.
Override them on any ancestor:

```css
.my-article { --figx-accent: #38bdf8; --figx-bg: #06111f; }
```

Canvas drawing cannot read CSS variables, so the engine resolves the palette
once and passes it to models as `env.theme` (`bg`, `fg`, `muted`, `faint`,
`track`, `grid`, `accent`). Plots use it automatically.

## In a markdown article

Articles embed figures as a fenced `figure` block, handled by
`components/MarkdownRenderer.js`:

````markdown
```figure
model: boids
height: 430
caption: Reynolds flocking on a torus. Order $\varphi$ measures alignment.
controls: false
param.count: 420
param.cohesion: 1.35
```
````

| key | |
| --- | --- |
| `model` | **required** — a registered model id |
| `height` `aspect` | stage size |
| `caption` | plain text; `$…$` renders as maths |
| `controls` `stats` `speeds` `autoplay` | booleans, all default `true` |
| `param.<key>` | starting value for one parameter |

A whole-block JSON object works too. A code fence was chosen over raw HTML or a
remark directive because it needs no extra plugin and degrades gracefully:
GitHub and Obsidian show it as a readable config block rather than as broken
markup. A block naming an unknown model renders an error in place listing the
ids that exist, so a typo is obvious rather than silent.

## Adding a model

1. Write `models/<name>.js` with `defineModel` or `definePlot` — see
   [AUTHORING.md](./AUTHORING.md).
2. Add it to the array in `models/index.js`.
3. `<Figure model="<id>" />`, or a ```figure block in an article.
