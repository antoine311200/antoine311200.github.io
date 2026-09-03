import React, { useEffect, useMemo, useState } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

import Template from '../components/template';
import {
  Figure, boids, life, pendulum, harmonic, fourier,
  bloch, sphereflock, descent, lorenz, clt,
  phase, spectrum, ising, epidemic,
} from '../lib/figures';

/**
 * Scratch page — /#/test_figure
 *
 * Two sandboxes:
 *   1. a typography lab for choosing the article body font and how KaTeX
 *      should sit inside it
 *   2. a showcase for the figures library, one figure per kind of model
 */

const SANS_FONT = 'system-ui, -apple-system, sans-serif';

/* ══════════════════════════════════════════════════════════════════════════
   Typography lab
   ══════════════════════════════════════════════════════════════════════════ */

// EB Garamond and Crimson Pro are already loaded site-wide by public/index.html.
// The rest are pulled in only while this sandbox page is mounted, so the real
// site pays nothing for the experiment.
const EXTRA_FONTS =
  'https://fonts.googleapis.com/css2' +
  '?family=IBM+Plex+Sans:ital,wght@0,400;0,600;1,400' +
  '&family=IBM+Plex+Serif:ital,wght@0,400;0,600;1,400' +
  '&family=Inter:ital,wght@0,400;0,600;1,400' +
  '&family=Literata:ital,wght@0,400;0,600;1,400' +
  '&family=Newsreader:ital,wght@0,400;0,600;1,400' +
  '&family=Source+Serif+4:ital,wght@0,400;0,600;1,400' +
  '&display=swap';

const BODY_FONTS = [
  { id: 'garamond', label: 'EB Garamond', note: 'current', stack: '"EB Garamond", "Palatino Linotype", Georgia, serif' },
  { id: 'crimson',  label: 'Crimson Pro', note: 'already loaded', stack: '"Crimson Pro", Georgia, serif' },
  { id: 'source',   label: 'Source Serif 4', note: 'screen-first serif', stack: '"Source Serif 4", Georgia, serif' },
  { id: 'literata', label: 'Literata', note: 'large x-height', stack: 'Literata, Georgia, serif' },
  { id: 'news',     label: 'Newsreader', note: 'sturdier old-style', stack: 'Newsreader, Georgia, serif' },
  { id: 'plexserif',label: 'IBM Plex Serif', note: 'technical serif', stack: '"IBM Plex Serif", Georgia, serif' },
  { id: 'inter',    label: 'Inter', note: 'sans', stack: 'Inter, system-ui, sans-serif' },
  { id: 'ui',       label: 'System UI', note: 'sans, no download', stack: 'system-ui, -apple-system, "Segoe UI", sans-serif' },
];

const MATH_MODES = [
  { id: 'cm',      label: 'KaTeX default', note: 'Computer Modern' },
  { id: 'inherit', label: 'Inherit body',  note: 'math takes the body face' },
  { id: 'sans',    label: 'Sans math',     note: 'Inter for maths too' },
];

// Crude on purpose: overriding every descendant is the only way to make KaTeX
// abandon its own faces, and seeing what that costs is the point of the test.
const MATH_CSS = `
.mm-inherit .katex, .mm-inherit .katex * { font-family: inherit !important; }
.mm-sans .katex, .mm-sans .katex * { font-family: Inter, system-ui, sans-serif !important; }
.typelab .katex { font-size: calc(1em * var(--math-scale, 1)); }
`;

function Tex({ tex, block = false }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(tex, { throwOnError: false, displayMode: block });
    } catch (err) {
      return null;
    }
  }, [tex, block]);
  if (!html) return <span>{tex}</span>;
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

/** A realistic stress test: dense inline maths inside ordinary sentences. */
function Sample({ short = false }) {
  return (
    <>
      <p style={{ marginBottom: '1.1em' }}>
        Let <Tex tex="(X, \mathcal{F}, \mu)" /> be a measure space. A function{' '}
        <Tex tex="f : X \to \mathbb{R}" /> is <strong>measurable</strong> when{' '}
        <Tex tex="f^{-1}\big((-\infty, c]\big) \in \mathcal{F}" /> for every{' '}
        <Tex tex="c \in \mathbb{R}" />, and it is enough to check this on a
        generating collection — a fact that saves a great deal of work in practice.
      </p>

      {!short && (
        <>
          <p style={{ marginBottom: '1.1em' }}>
            For a simple function <Tex tex="\varphi = \sum_{i=1}^{n} a_i \mathbf{1}_{A_i}" /> with{' '}
            <Tex tex="a_i \geq 0" /> and the <Tex tex="A_i \in \mathcal{F}" /> pairwise disjoint,
            the <em>Lebesgue integral</em> is defined by
          </p>

          <div style={{ margin: '1.3em 0', textAlign: 'center' }}>
            <Tex block tex="\int_X \varphi \, d\mu \;=\; \sum_{i=1}^{n} a_i\, \mu(A_i)," />
          </div>

          <p>
            and the general case follows by monotone approximation: every measurable{' '}
            <Tex tex="f \geq 0" /> is the increasing limit of simple functions, so{' '}
            <Tex tex="\int f \, d\mu := \lim_n \int \varphi_n \, d\mu" /> is well defined and
            independent of the approximating sequence.
          </p>
        </>
      )}
    </>
  );
}

function Control({ label, children }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-[0.12em] text-slate-500 mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}

const selectClass =
  'w-full text-[12px] rounded-md border border-slate-700 bg-slate-900/70 ' +
  'text-slate-200 px-2 py-1.5 focus:outline-none focus:border-slate-500';

function TypeLab() {
  const [body, setBody] = useState(BODY_FONTS[0].id);
  const [math, setMath] = useState('cm');
  const [scale, setScale] = useState(1);
  const [size, setSize] = useState(17);
  const [leading, setLeading] = useState(1.8);

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = EXTRA_FONTS;
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  const bodyFont = BODY_FONTS.find(f => f.id === body) || BODY_FONTS[0];

  return (
    <section className="typelab mb-16">
      <style dangerouslySetInnerHTML={{ __html: MATH_CSS }} />

      <div className="mb-6">
        <p
          className="text-[10px] uppercase tracking-[0.18em] text-orange-300/70 mb-1.5"
          style={{ fontFamily: SANS_FONT }}
        >
          Typography lab
        </p>
        <h2 className="text-slate-100 text-2xl font-semibold" style={{ fontFamily: SANS_FONT }}>
          Body font × maths font
        </h2>
        <p className="text-slate-400 text-sm mt-2 leading-relaxed" style={{ fontFamily: SANS_FONT }}>
          The same paragraph of measure theory in every combination. The question worth answering
          is not which face is prettiest on its own, but which one sits at the same weight and
          x-height as the maths running through it.
        </p>
      </div>

      {/* ── controls ── */}
      <div
        className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-4 mb-5"
        style={{ fontFamily: SANS_FONT }}
      >
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Control label="Body font">
            <select className={selectClass} value={body} onChange={e => setBody(e.target.value)}>
              {BODY_FONTS.map(f => (
                <option key={f.id} value={f.id}>{f.label} — {f.note}</option>
              ))}
            </select>
          </Control>

          <Control label="Maths">
            <select className={selectClass} value={math} onChange={e => setMath(e.target.value)}>
              {MATH_MODES.map(m => (
                <option key={m.id} value={m.id}>{m.label} — {m.note}</option>
              ))}
            </select>
          </Control>

          <Control label={`Maths scale · ${scale.toFixed(2)}`}>
            <input type="range" min="0.85" max="1.25" step="0.01" value={scale}
              onChange={e => setScale(parseFloat(e.target.value))}
              className="w-full h-1 rounded-full bg-slate-700 accent-orange-400 cursor-pointer" />
          </Control>

          <Control label={`Size · ${size}px`}>
            <input type="range" min="14" max="22" step="0.5" value={size}
              onChange={e => setSize(parseFloat(e.target.value))}
              className="w-full h-1 rounded-full bg-slate-700 accent-orange-400 cursor-pointer" />
          </Control>

          <Control label={`Leading · ${leading.toFixed(2)}`}>
            <input type="range" min="1.4" max="2.2" step="0.05" value={leading}
              onChange={e => setLeading(parseFloat(e.target.value))}
              className="w-full h-1 rounded-full bg-slate-700 accent-orange-400 cursor-pointer" />
          </Control>
        </div>
      </div>

      {/* ── reading preview ── */}
      <div
        className={`mm-${math} rounded-xl border border-slate-700/60 bg-slate-900/30 p-6 sm:p-8 mb-10 text-slate-200`}
        style={{
          fontFamily: bodyFont.stack,
          fontSize: `${size}px`,
          lineHeight: leading,
          '--math-scale': scale,
        }}
      >
        <Sample />
      </div>

      {/* ── full matrix ── */}
      <p
        className="text-[10px] uppercase tracking-[0.12em] text-slate-500 mb-3"
        style={{ fontFamily: SANS_FONT }}
      >
        Every combination · {BODY_FONTS.length} × {MATH_MODES.length}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {BODY_FONTS.map(f =>
          MATH_MODES.map(m => (
            <div
              key={`${f.id}-${m.id}`}
              className={`mm-${m.id} rounded-lg border border-slate-800 bg-slate-900/25 p-4`}
              style={{ fontFamily: f.stack, '--math-scale': scale }}
            >
              <p
                className="text-[10px] uppercase tracking-[0.1em] text-slate-600 mb-2.5 pb-2 border-b border-slate-800"
                style={{ fontFamily: SANS_FONT }}
              >
                {f.label} <span className="text-slate-700">/</span> {m.label}
              </p>
              <div className="text-slate-200" style={{ fontSize: '15px', lineHeight: 1.7 }}>
                <Sample short />
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Figures showcase
   ══════════════════════════════════════════════════════════════════════════ */

const ARTICLE_FONT = '"EB Garamond", "Palatino Linotype", Georgia, serif';

function P({ children }) {
  return (
    <p
      className="text-slate-200 mb-5 leading-[1.85]"
      style={{ fontFamily: ARTICLE_FONT, fontSize: 'clamp(15px, 2.2vw, 18px)' }}
    >
      {children}
    </p>
  );
}

function H2({ children, kicker }) {
  return (
    <div className="mt-14 mb-4">
      {kicker && (
        <p
          className="text-[10px] uppercase tracking-[0.18em] text-orange-300/70 mb-1.5"
          style={{ fontFamily: SANS_FONT }}
        >
          {kicker}
        </p>
      )}
      <h2
        className="text-slate-100 font-semibold"
        style={{ fontFamily: ARTICLE_FONT, fontSize: '1.6rem', lineHeight: 1.3 }}
      >
        {children}
      </h2>
    </div>
  );
}

function Code({ children }) {
  return (
    <pre
      className="my-6 p-4 rounded-xl border border-slate-700/60 bg-slate-900/60 overflow-x-auto text-slate-300"
      style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12.5, lineHeight: 1.65 }}
    >
      <code>{children}</code>
    </pre>
  );
}

export default function TestFigure() {
  useEffect(() => {
    document.title = 'Sandbox | Antoine Debouchage';
  }, []);

  return (
    <Template iconColor="black">
      <div className="max-w-4xl mx-auto px-6 sm:px-10 py-10">

        <div
          className="mb-8 rounded-lg border border-orange-500/30 bg-orange-500/[0.06] px-4 py-2.5 text-[12px] text-orange-200/80"
          style={{ fontFamily: SANS_FONT }}
        >
          Sandbox route <code className="text-orange-300">/#/test_figure</code> — not linked from the
          site. Fonts beyond EB Garamond and Crimson Pro load only while this page is open.
        </div>

        <TypeLab />

        <hr className="border-slate-800 my-16" />

        <h1
          className="text-slate-100 mb-4 leading-tight font-semibold"
          style={{ fontFamily: ARTICLE_FONT, fontSize: 'clamp(1.8rem, 4vw, 2.6rem)' }}
        >
          Fourteen figures, one library
        </h1>

        <p
          className="text-slate-400 italic leading-relaxed mb-10 pb-8 border-b border-slate-800"
          style={{ fontFamily: ARTICLE_FONT, fontSize: '18px' }}
        >
          Everything below runs on the same shell — the same toolbar, the same generated controls,
          the same seeded clock. Only the models differ, and a model is a few plain functions.
        </p>

        <H2 kicker="Agent simulation">Flocking, or how three local rules make a flock</H2>

        <P>
          Each agent steers by three urges computed only from the neighbours inside a perception
          cone: move away from anyone too close, match the average heading, drift toward the local
          centre of mass. Drag any slider — the simulation reshapes live rather than restarting —
          and move the cursor over the canvas to act as a predator.
        </P>

        <P>
          The curve underneath is a <em>trace</em>: the model declares which quantity to record and
          the library reserves the strip, samples it once per simulation step, and plots it. Nothing
          in the flocking code knows the strip exists. Drop alignment to zero and watch φ fall.
        </P>

        <Figure
          model={boids}
          height={500}
          caption={
            <>
              Reynolds flocking on a torus. The order parameter φ is the magnitude of the mean unit
              heading: φ ≈ 0 is a disordered gas, φ ≈ 1 a single coherent flock.
            </>
          }
        />

        <H2 kicker="Lattice automaton">A discrete model, stepping at its own rate</H2>

        <P>
          Not everything wants sixty steps a second. This model declares{' '}
          <code className="text-orange-200 text-[0.85em]">rate: 12</code>, and the engine hands it a
          fixed timestep of 1/12 s — the speed buttons still work, and single-stepping now means one
          generation, which is what you actually want when watching a glider.
        </P>

        <P>
          It is also editable: <strong className="text-slate-100">click and drag on the lattice</strong> to
          paint live cells into a running rule. Switch the rule to Seeds while a pattern is settled
          and watch what the same lattice does under different arithmetic.
        </P>

        <Figure
          model={life}
          height={380}
          caption="Life-like automata. Colour tracks how long a cell has survived, so gliders read as moving cool streaks and still lifes go blue."
        />

        <H2 kicker="Differential equation">Chaos, and why the seed matters</H2>

        <P>
          Six double pendulums released a twentieth of a degree apart, integrated with RK4 at eight
          substeps per frame. They overlap for a few seconds, then separate — and the separation
          readout climbs by orders of magnitude while nothing random is happening anywhere. Press ↺
          and the identical run replays; only 🎲 changes anything.
        </P>

        <Figure
          model={pendulum}
          height={520}
          caption="Deterministic chaos. Initial angles and copy count rebuild the state; masses, lengths and gravity are absorbed live."
        />

        <H2 kicker="Equation → curve">Plots are figures too</H2>

        <P>
          The second half of the library is for figures that are a drawing of a function rather than
          a simulation. You declare a domain and a list of series, and the library supplies axes,
          ticks, the legend, animation time, and a hover readout that cuts vertically through every
          curve.
        </P>

        <Figure
          model={harmonic}
          height={340}
          caption="ẍ + 2ζω₀ẋ + ω₀²x = 0, drawn as a scrolling trace. Push ζ past 1 and the oscillation disappears into a crawl; hover anywhere to read the value."
        />

        <P>The x-domain is a function of time, which is all it takes to make the window slide:</P>

        <Code>{`xDomain: (p, t) => (t <= p.window ? [0, p.window] : [t - p.window, t]),
yDomain: (p) => (p.autoscale ? 'auto' : [-m, m]),

series: [
  { id: 'x', label: 'x(t)', color: '#fb923c', width: 2,
    fn: (t, p) => displacement(t, p) },
  { id: 'v', label: 'v(t) / ω₀', color: '#38bdf8', dash: [6, 3],
    visible: p => p.velocity,
    fn: (t, p) => velocity(t, p) / p.omega0 },
]`}</Code>

        <H2 kicker="Decomposition">Partial sums, and a bump that never leaves</H2>

        <P>
          Raise N and watch the partial sum close on the target — then look at the corner. The
          overshoot narrows but keeps its height: about 9% of the jump, forever. That is why this
          figure samples the sum at 1400 points instead of one per pixel — at lower resolution the
          spike quietly disappears and the figure tells a lie.
        </P>

        <Figure
          model={fourier}
          height={360}
          caption="Fourier partial sums with the individual harmonics faint underneath. Switch to the triangle wave — continuous, so no Gibbs, and 1/k² convergence you can see."
        />

        <H2 kicker="Three dimensions">Projection, not WebGL</H2>

        <P>
          The 3D layer is a camera and a painter's algorithm over the same 2D canvas — no
          three.js, no WebGL context, no change to the model contract. For wireframes, points and
          arrows that is the better renderer, not merely the cheaper one: the lines stay crisp
          vectors instead of an aliased mesh, and the library keeps its only dependencies.
        </P>

        <P>
          Occlusion comes from one trick. The sphere's silhouette is filled at the depth of its
          <em>centre</em>, so wireframe and trajectory behind the centre are painted first and
          covered, while the front half is painted after. <strong className="text-slate-100">Drag
          either figure</strong> to orbit; dragging overrides the auto-rotation.
        </P>

        <Figure
          model={bloch}
          height={440}
          caption="A qubit precessing about n̂ under dr/dt = ω(n̂ × r), with T₁ and T₂ terms. Raise dephasing and watch the tip spiral off the surface — a pure state leaving the sphere is a state becoming mixed."
        />

        <P>
          The second one is the flocking model again, with S² for a world instead of a flat torus.
          Every operation has to be redone intrinsically: distance is the geodesic angle,
          "toward a neighbour" is a unit tangent along a great circle, alignment cannot simply add
          velocities that live in different tangent planes, and integration rotates position and
          velocity together about p × v rather than stepping straight and renormalising.
        </P>

        <Figure
          model={sphereflock}
          height={520}
          caption="Flocking on a sphere. There is no way for every agent to agree on a direction — you cannot comb a hairy ball — so a global flock is impossible and you get circulating bands instead. |L| is the normalised total angular momentum."
        />

        <H2 kicker="Optimisation">Axes and a simulation in the same figure</H2>

        <P>
          The two contracts compose. This is a <code className="text-orange-200 text-[0.85em]">defineModel</code> that
          imports <code className="text-orange-200 text-[0.85em]">createPlot</code>, because it needs real axes
          <em>and</em> state that is stepped. It is also where the rest of the parameter system earns
          its keep: the learning-rate slider is logarithmic and carries a{' '}
          <code className="text-orange-200 text-[0.85em]">format</code> so it reads as 3.2e-2 rather
          than −1.49; the surface is a <code className="text-orange-200 text-[0.85em]">select</code> that
          rebuilds state; each optimiser is its own toggle; and the two buttons are declared{' '}
          <code className="text-orange-200 text-[0.85em]">actions</code>.
        </P>

        <P>
          <strong className="text-slate-100">Click anywhere on the surface</strong> to drop the
          starting point there — all five restart from your click. Try the ill-conditioned bowl with
          momentum at zero, then raise it: the difference between crawling down the valley floor and
          bouncing across it is the entire argument for momentum, in one slider.
        </P>

        <Figure
          model={descent}
          height={560}
          caption="Five optimisers on one surface, with the log-scale loss curve every optimiser paper prints — one declared trace per optimiser, each behind its own toggle."
        />

        <H2 kicker="Three dimensions, unbounded">A trajectory with nothing to hide behind</H2>

        <P>
          The Bloch sphere gets its depth from an occluding globe. The Lorenz attractor has no such
          luxury: it is an unbounded curve of several thousand segments with nothing solid in the
          scene. The depth cue instead comes from fading with distance and from splitting each trail
          into ten chunks, so the near lobe paints over the far one without emitting a sortable item
          per segment.
        </P>

        <Figure
          model={lorenz}
          height={470}
          caption="ẋ = σ(y−x), ẏ = x(ρ−z)−y, ż = xy−βz. Two trajectories start six thousandths apart. The readout gives the critical ρ above which the symmetric fixed points lose stability."
        />

        <H2 kicker="Statistics">A theorem, and the case where it fails</H2>

        <P>
          Sample means, standardised and histogrammed against the normal density. Raise n and watch
          the bars converge — from the exponential quickly, from Bernoulli(0.15) slowly and visibly
          skewed, because convergence depends on the third moment and not only on the existence of
          the second.
        </P>

        <P>
          Then switch to Cauchy. It has no mean and no variance, so nothing can be standardised: the
          sample mean of n draws is Cauchy(0,1) again, for <em>every</em> n. The histogram sits
          stubbornly under the dashed Cauchy density and refuses the bell curve no matter how long
          it runs. Both densities are drawn so the failure is visible rather than asserted.
        </P>

        <Figure
          model={clt}
          height={420}
          caption="Standardised sample means against 𝒩(0,1). The equation card rewrites itself with n, and switching to Cauchy rewrites the claim itself."
        />

        <H2 kicker="Two panels">One computation, two views</H2>

        <P>
          A phase portrait and a time series are the same solution seen twice, and a textbook
          prints them side by side. <code className="text-orange-200 text-[0.85em]">panelRects</code> splits
          the canvas so a figure can do the same. <strong className="text-slate-100">Click the
          field</strong> to launch a trajectory; both panels follow it.
        </P>

        <P>
          This is also where conditional controls earn their place: each system has its own
          parameters, and a spec's <code className="text-orange-200 text-[0.85em]">visible</code> hides
          the ones that do not apply — switch from Van der Pol to Lotka–Volterra and the panel
          rebuilds itself around the new system.
        </P>

        <Figure
          model={phase}
          height={430}
          caption="Vector field, nullclines (ẋ = 0 in red, ẏ = 0 in green) and trajectories, beside the same trajectory against time."
        />

        <H2 kicker="Signals">Leakage, and what a window costs</H2>

        <P>
          Put a sinusoid at a whole number of cycles per window and its energy lands in one bin.
          Move it half a bin — the second preset — and it smears across the entire spectrum, because
          the DFT assumes the window repeats forever and a non-integer frequency does not join up at
          the seam. Switch the window to Hann and the skirts collapse, at the cost of a wider main
          lobe. That trade is the whole subject, and it is very hard to convey without a slider.
        </P>

        <Figure
          model={spectrum}
          height={440}
          caption="A signal and its magnitude spectrum. Raise Drift to sweep f₁ and watch the peak slide between bins."
        />

        <H2 kicker="Phase transition">A panel that is not a plot</H2>

        <P>
          The lattice here is painted straight into its rect — only the magnetisation trace below is
          a plot. Drag the temperature through Tc ≈ 2.269: below it one sign takes over and the
          trace pins near ±1, above it the domains dissolve and the trace rattles around zero.
          Sitting at Tc gives the scale-free tangle of domains within domains, and a magnetisation
          that wanders instead of settling — critical slowing down, visible.
        </P>

        <P>
          Drag on the lattice to force a patch of spins up, then watch whether the domain survives
          or is eaten. Below Tc it survives; above, it is gone in a few sweeps.
        </P>

        <Figure
          model={ising}
          height={520}
          caption="Metropolis on the square-lattice Ising model. H and T/Tc are typeset live from the sliders."
        />

        <H2 kicker="Nested panels">Four panels, and not a grid</H2>

        <P>
          A big simulation at full height on the left; a right-hand column split into a second
          simulation on top and a row of two plots underneath. That shape is not a grid, so{' '}
          <code className="text-orange-200 text-[0.85em]">panelRects</code> cannot express it —{' '}
          <code className="text-orange-200 text-[0.85em]">layout</code> nests rows and columns to any
          depth, and both helpers take an env or any rect, so either can be nested inside the other.
        </P>

        <P>
          The two worlds start from identical agents with identical infections and identical β and
          γ. The only difference is a mobility multiplier. Flattening the curve is not a metaphor
          here: it is the same epidemic, drawn twice. Click either arena to infect whoever is
          nearest.
        </P>

        <Figure
          model={epidemic}
          height={480}
          caption="Left and top-right are simulations; bottom-right is I(t) and the S–I plane, solid for full mobility and dashed for reduced. Agents live in the unit square, so neither simulation cares how big its panel is."
        />

        <H2 kicker="Architecture">What is where</H2>

        <div
          className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 text-[13px] text-slate-400 leading-relaxed"
          style={{ fontFamily: SANS_FONT }}
        >
          <ul className="space-y-1.5">
            <li><code className="text-slate-300">core/engine.js</code> — canvas, DPR sizing, fixed-timestep loop, seeded rng, visibility, pointer</li>
            <li><code className="text-slate-300">core/model.js</code> · <code className="text-slate-300">core/definePlot.js</code> — the two authoring contracts</li>
            <li><code className="text-slate-300">core/plot.js</code> — axes, ticks, curves, markers, auto-ranging, panel layout</li>
            <li><code className="text-slate-300">core/scene3d.js</code> — orbit camera, projection, painter's algorithm, globes</li>
            <li><code className="text-slate-300">core/spec.js</code> — the ```figure markdown block</li>
            <li><code className="text-slate-300">react/</code> — <code className="text-slate-300">Figure</code>, <code className="text-slate-300">FigureBlock</code>, <code className="text-slate-300">useFigure</code>, controls</li>
            <li><code className="text-slate-300">models/</code> — the fourteen above</li>
            <li><code className="text-slate-300">AUTHORING.md</code> — how to write a new one</li>
          </ul>
        </div>
      </div>
      <div className="h-12" />
    </Template>
  );
}
