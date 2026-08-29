# Writing a figure

A figure is **one file** in `models/`, **one line** in `models/index.js`, and
then either a `<Figure>` in JSX or a ` ```figure ` block in an article.

Everything else — the canvas, the loop, the controls, play/pause/step/reset,
the readouts, off-screen pausing, accessibility — already exists and is shared.
Your job is the maths.

---

## 1. Pick the kind

| | use | authoring call |
| --- | --- | --- |
| **Simulation** | state that is *advanced*: agents, lattices, ODEs, Monte Carlo | `defineModel` |
| **Plot** | a *drawing of a function*: y = f(x) animated by time | `definePlot` |
| **3D** | anything spatial: spheres, manifolds, phase portraits | `defineModel` + `core/scene3d.js` (§7b) |

If you can write the answer in closed form, use `definePlot` — you get axes,
ticks, a legend and a hover readout for free, and the curve stays exact instead
of accumulating integrator error. Reach for `defineModel` when the state has to
be carried forward step by step.

You can mix: a `defineModel` may `import { createPlot } from '../core/plot'`
when it needs axes *and* a simulation.

---

## 2. A minimal simulation

`models/random-walk.js`:

```js
import { defineModel } from '../core/model';

export default defineModel({
  id: 'random-walk',
  name: 'Random walk',
  description: 'Dots drifting on a dark field, tracing a scatter of paths.',

  params: [
    { key: 'walkers', label: 'Walkers', min: 1, max: 400, step: 1, default: 60 },
    { key: 'sigma', label: 'Step size', tex: '\\sigma', min: 1, max: 40, step: 0.5, default: 12 },
  ],

  init(params, rng, env) {
    const pts = [];
    for (let i = 0; i < params.walkers; i++) {
      pts.push({ x: env.width / 2, y: env.height / 2 });
    }
    return { pts };
  },

  step(state, params, dt, rng) {
    for (const p of state.pts) {
      p.x += (rng() - 0.5) * params.sigma * dt * 60;
      p.y += (rng() - 0.5) * params.sigma * dt * 60;
    }
  },

  draw(ctx, state, params, env) {
    ctx.fillStyle = '#fb923c';
    for (const p of state.pts) ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
  },

  stats(state) {
    return [{ label: 'Walkers', value: state.pts.length }];
  },
});
```

Add `randomWalk` to the array in `models/index.js` and it is done — sliders,
toolbar, seeded reset and all.

---

## 3. The lifecycle

Per rendered frame, the engine does:

```
ensure state            init(params, rng, env)     ← once, and after every reset
write state.width/height/time/pointer
sync(state, params, rng, env)                      ← optional, every frame
step(state, params, dt, rng) × n                   ← n from the accumulator
clear(ctx, state, params, env)                     ← optional, default clearRect
draw(ctx, state, params, env)
stats(state, params)                               ← optional, throttled to 5 Hz
```

**`init(params, rng, env)` → state**
Build everything. `env` is `{ width, height, theme }` in CSS pixels. Return a
plain object; the engine adds `width`, `height`, `time` and `pointer` to it
before every frame, so read those from `state` rather than storing your own.

**`sync(state, params, rng, env)`**
Runs before stepping, once per *frame* (not per step). This is where you absorb
a parameter change that would otherwise need a restart — growing or shrinking a
population, rebuilding a lattice after a canvas resize. Prefer this over marking
a parameter `reinit`.

**`step(state, params, dt, rng)`**
`dt` is always `1 / model.rate` — it never varies. Playback speed, pause and
single-step are handled by calling `step` more or fewer times, so your maths
never sees a variable timestep. Mutate `state` in place.

**`draw(ctx, state, params, env)`**
`ctx` is already scaled for the device pixel ratio: draw in CSS pixels and the
result is sharp on a retina screen. Do not read `canvas.width`.

**`clear(ctx, state, params, env)`**
Optional. Override it to paint a translucent background instead of clearing —
that is how `boids` gets its trails, for a fraction of the cost of storing
position history.

**`stats(state, params)` → `[{ label, value, color, dashed }]`**
The readout bar under the canvas. `color` draws a legend swatch. Called at 5 Hz,
so a little work here is fine — `fourier` samples 2400 points in it.

**`onPointer(state, pointer, params, rng)`**
Called on press and while dragging. `pointer` is `{ x, y, active, down }` in CSS
pixels. For *continuous* pointer influence (the boids' predator cursor) do not
use this — just read `state.pointer` inside `step`.

---

## 4. Parameters

```js
{ key, label, type, default, ...  }
```

| field | meaning |
| --- | --- |
| `type` | `range` (default), `toggle`, `select` |
| `min` `max` `step` | range bounds. `step` also sets the displayed precision: `0.05` → `1.60` |
| `default` | **required** |
| `unit` | appended to the readout, e.g. `' px/s'` |
| `tex` | KaTeX label, e.g. `'w_{\\mathrm{sep}}'`. `label` remains the accessible name and the tooltip |
| `group` | controls are laid out under group headings, in declaration order |
| `hint` | tooltip text |
| `format` | `(v) => string`, for a custom readout |
| `options` | `select` only: `[{ value, label }]` |
| `reinit` | changing it rebuilds state instead of being absorbed live |

Everything is **live** by default: dragging a slider reshapes the running
simulation. Only mark `reinit` when the change genuinely cannot be absorbed —
an initial condition, a lattice cell size. `boids` has no `reinit` at all,
because `sync` grows and shrinks the flock in place.

### Presets and actions

```js
presets: [
  { name: 'Swarm', values: { separation: 2.4, alignment: 0.1, cohesion: 1.6 } },
],
actions: [
  { id: 'clear', label: 'Clear', run(state, params, rng, env) { … } },
],
```

Presets are partial — they merge over the current values. Actions are buttons
that mutate state directly; use them for *do this now* (Clear, Re-seed), not for
settings.

---

## 5. Rules that are not negotiable

**No `Math.random()`, ever.** Use the `rng` argument. The toolbar promises that
↺ replays the identical run and 🎲 is the only thing that changes it; one stray
`Math.random()` breaks that promise silently.

**No `Date.now()`, no `performance.now()`.** Time is `state.time` (simulated
seconds) and `dt`. Otherwise pause, speed and single-step all lie.

**No React, no DOM.** The only browser object a model touches is the 2D context.
This is what makes models testable and portable.

**Order-independence.** If agents interact, compute all forces from the current
state first, then integrate — otherwise agent 0 sees stale neighbours and agent
*n* sees fresh ones, and the result depends on array order. `boids` does this in
two explicit passes.

---

## 6. Drawing well

**Batch by colour.** `ctx.fillStyle = …` per item is the expensive part, not the
geometry. Build a `Path2D` per colour band and issue one `fill` each:

```js
const paths = Array.from({ length: 24 }, () => new Path2D());
for (const a of agents) paths[bucket(a)].moveTo(…);       // …lineTo, closePath
for (let i = 0; i < 24; i++) { ctx.fillStyle = hue(i); ctx.fill(paths[i]); }
```

`boids` draws 700 agents this way in 24 fills; `life` uses the same trick for
its age ramp.

**Allocate nothing in the inner loop.** Hoist scratch objects and arrays to
module scope and reuse them. A `{ x, y }` per agent per frame is 15k short-lived
objects a second.

**Use `env.theme`.** Canvas cannot read CSS variables, so the engine resolves the
palette once and hands it over: `theme.bg`, `fg`, `muted`, `faint`, `track`,
`grid`, `accent`. Use it instead of hard-coding greys, and the figure follows
whatever the host page is themed to.

**Set `rate` for discrete models.** `rate: 12` gives Life a 1/12 s timestep, so
"step once" means one generation. The speed buttons still work.

---

## 7. Plots

`definePlot` covers *equation + parameters → animated curve*.

```js
import { definePlot } from '../core/definePlot';

export default definePlot({
  id: 'gaussian',
  name: 'Gaussian',

  params: [
    { key: 'mu', label: 'Mean', tex: '\\mu', min: -3, max: 3, step: 0.1, default: 0 },
    { key: 'sigma', label: 'Std dev', tex: '\\sigma', min: 0.2, max: 3, step: 0.05, default: 1 },
  ],

  xLabel: 'x',
  yLabel: 'p(x)',
  xDomain: [-6, 6],
  yDomain: 'auto',

  series: [
    { id: 'p', label: 'p(x)', color: '#fb923c', width: 2,
      fn: (x, p) => Math.exp(-((x - p.mu) ** 2) / (2 * p.sigma ** 2))
                    / (p.sigma * Math.sqrt(2 * Math.PI)) },
  ],
});
```

You get axes, nice ticks, the legend, and a hover readout that cuts vertically
through every series and prints the values.

**Series fields**: `id`, `label`, `color`, `width`, `dash` (e.g. `[6, 3]`),
`alpha`, `samples`, `visible: (params) => bool`, and
`fn: (x, params, t, state) => y`. Return `NaN` to break the line — that is how
`harmonic` stops its trace at t = 0.

**Domains** may be constants or functions of `(params, t)`. A sliding
oscilloscope window is one line:

```js
xDomain: (p, t) => (t <= p.window ? [0, p.window] : [t - p.window, t]),
```

`yDomain` may also be `'auto'`, or a function returning `'auto'` — which is how
`harmonic` gets its "auto y-scale" toggle. Auto ranges are eased toward their
target so the axis settles instead of twitching; tune with
`autoRange: { symmetric: true, ease: 0.08, pad: 0.12 }`.

**`decorate(plot, params, t, state)`** draws on top of the series, clipped to the
plot rectangle. The `plot` object gives you `curve`, `line`, `dot`, `vline`,
`tag`, `xToPx`, `yToPx`. `fourier` uses it for the faint individual harmonics;
`harmonic` uses it for the moving leading dot.

**Override `stats`** to replace the automatic legend with something richer —
regime names, derived quantities, hover values (`state.hover`).

**Watch your sampling.** Curves default to about one sample per pixel. If the
interesting feature is narrower than that, say so: `fourier` sets
`samples: 1400` because at one-per-pixel the Gibbs spike vanishes and the figure
quietly tells a lie.

---

## 7b. Three dimensions

`core/scene3d.js` gives a `defineModel` an orbit camera, perspective projection
and a painter's algorithm — over the *same* 2D context. There is no WebGL and no
extra dependency.

```js
import { createScene, makeCamera, orbitFromPointer } from '../core/scene3d';

init() {
  return { camera: makeCamera({ azimuth: 0.7, elevation: 0.3, distance: 3.6 }) };
},

step(state, params, dt) {
  // Drag beats auto-rotation. Call this from step, not onPointer: the engine
  // keeps pointer.down current every frame, so the release is seen.
  if (!orbitFromPointer(state.camera, state.pointer)) {
    state.camera.azimuth += params.spin * dt;
  }
  …
},

draw(ctx, state, params, env) {
  const scene = createScene(ctx, env, state.camera);
  scene.globe(1, { wire: true, opacity: 0.85 });
  scene.circle([0, 1, 0], 1, { color: '#94a3b8' });        // equator
  scene.path(trailPoints, { color: '#a78bfa' });           // sorted per segment
  scene.polyline(trailPoints, { color: '#a78bfa' });       // one sorted item
  scene.arrow([0, 0, 0], r, { color: '#fb923c' });
  scene.point(p, { r: 3, color: '#fb923c' });
  scene.text(p, '|0⟩');
  scene.render();                                          // sorts and paints
}
```

Nothing draws until `render()`: every primitive queues a call tagged with its
view depth, and `render` sorts back-to-front. Two things follow.

**Occlusion is a trick, and a good one.** `globe()` fills the sphere's
silhouette at the depth of its *centre*. Anything behind the centre is queued
with a larger depth, so it is painted first and covered; the front half is
painted after. That is why a trajectory correctly disappears round the back.

**Choose `path` or `polyline` deliberately.** `path` emits one sorted item per
segment, so the line can genuinely pass behind other geometry — right for a
Bloch trajectory. `polyline` emits a single item at the mean depth — right for
hundreds of short trails, where per-segment sorting would swamp the frame. As a
rule of thumb keep the total under a couple of thousand items.

Vector helpers are exported too: `add`, `sub`, `scale`, `dot`, `cross`, `len`,
`normalize`, `rotateAbout` (Rodrigues) and `tangent` (the component of a vector
tangent to the unit sphere at a point). `sphere-flock` is built almost entirely
out of the last two.

**Coordinates.** The scene's vertical is its own *y*. Physics conventions rarely
agree with that — the Bloch sphere wants *z* up — so convert once, in one place,
rather than sprinkling swaps through `draw`:

```js
const toScene = r => [r[0], r[2], r[1]];
```

**When to reach for three.js instead.** Lit meshes, shadows, real surfaces,
GPU-scale geometry. That would be a second renderer alongside this one, not a
change to it — the model contract (a model sees only a 2D context) is what keeps
models testable and deterministic, and it is worth keeping.

## 7c. KaTeX inside a figure

Canvas cannot draw KaTeX — it is HTML and web fonts, and rasterising it through
an SVG `foreignObject` is unreliable (the KaTeX faces do not load inside a
data-URL document, and Safari refuses outright). So maths is queued to an HTML
overlay the shell paints on top of the stage: real fonts, MathML alongside for
assistive tech, crisp at any pixel ratio.

Every model gets a per-frame label sink at `state.labels`, cleared before each
`draw`. The helpers push into it for you:

```js
plot.label(x, y, tex, opts)       // data coordinates
plot.labelPx(px, py, tex, opts)   // canvas pixels — corner cards, HUDs
scene.label(p3, tex, opts)        // a world point, faded with depth
scene.labelPx(px, py, tex, opts)
state.labels.push({ id, tex, x, y, anchor, color, size, chip, opacity })
```

`anchor` says which part of the label sits on the point: `center` (default),
`top-left`, `bottom-right`, `left`, `right`, … `chip: true` draws a panel behind
it, which is what makes a formula readable over a busy simulation.

**Give every label a stable `id`.** Positions are written straight to the DOM
every frame, keyed by id, so a label pinned to a moving point tracks it at 60fps
without React in the loop. The *content* re-renders on a ~90 ms throttle, since
a value ticking sixty times a second is unreadable anyway.

### Live formulae

The point of all this is that the formula on screen can be the one being
computed. `definePlot` has an `equation` field for exactly that:

```js
equation: (p) => {
  const z = p.zeta.toFixed(2);
  const w = p.omega0.toFixed(2);
  return `\\ddot{x} + 2(${z})(${w})\\,\\dot{x} + (${w})^{2}\\,x = 0`;
},
```

Drag ζ and the equation re-typesets with it. `fourier` does the same with N in
the summation limit; `bloch` substitutes ω, Γ₁ and Γ₂ into the master equation;
`boids` shows the definition of the order parameter next to its value.

A series with a `tex` field also gets a small label at the right-hand end of its
curve, so a legend is not needed to tell curves apart — opt out with
`seriesLabels: false`. `hoverTex: (x, values, params) => tex` controls the
readout that follows the cursor.

Keep it to a handful of labels per figure. They are DOM nodes, not draw calls.

## 8. Accessibility

`description` becomes the canvas `aria-label`. Write what someone would *see*,
not what the model computes:

> 'Several hundred agents moving as arrowheads on a dark field, coloured by
> heading. They gather into flocks that split and merge.'

Everything else is handled: sliders are native `<input type="range">` (arrow-key
steppable, with `aria-valuetext` carrying the formatted value and unit),
toggles and speed buttons carry `aria-pressed`, and a figure starts paused when
the OS asks for reduced motion.

---

## 9. Using it

**In JSX:**

```jsx
import { Figure, boids } from '../lib/figures';

<Figure model={boids} height={430} caption="Reynolds flocking on a torus." />
```

**In a markdown article** — a fenced `figure` block anywhere in the body:

````markdown
```figure
model: boids
height: 430
caption: Reynolds flocking on a torus. Order $\varphi$ measures alignment.
param.count: 420
param.cohesion: 1.35
```
````

Keys: `model` (required), `height`, `aspect`, `caption`, `controls`, `stats`,
`speeds`, `autoplay`, and `param.<key>` for starting parameter values.
`$…$` in the caption renders as maths. Because the block is a normal code
fence, GitHub and Obsidian show it as readable config rather than broken markup.

`<Figure>` props are the same names, plus `overrides` as an object.

---

## 10. Checklist

- [ ] `id` is unique and kebab-case; `name` is what shows in the toolbar
- [ ] `description` describes the *picture*
- [ ] every param has a `default`, and `group` if there are more than about six
- [ ] no `Math.random()`, no wall-clock time, no DOM
- [ ] forces computed before integration, if things interact
- [ ] scratch objects hoisted; colours batched
- [ ] two or three `presets` that show genuinely different behaviour
- [ ] `stats` says something the picture alone does not
- [ ] added to `models/index.js`
