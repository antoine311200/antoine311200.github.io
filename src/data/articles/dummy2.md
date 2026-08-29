@TITLE Interactive Figures in Markdown
@DATE 29 August 2026
@DESCRIPTION A worked demonstration of the figures library embedded in a markdown article: simulations and plots dropped into the text as fenced code blocks.
@TAGS mathematics, machine learning, physics

# Interactive Figures in Markdown

This article exists to demonstrate one thing: a figure is a fenced code block. Everything below is written in ordinary markdown, with a few ` ```figure ` blocks dropped into the prose where a picture belongs.

## The simplest possible block

Two lines — a model id and a caption:

```figure
model: harmonic-oscillator
height: 320
caption: A damped harmonic oscillator, drawn from its closed-form solution. Hover to read a value; push $\zeta$ past 1 to leave the oscillatory regime.
```

The block is a normal code fence, so this article still reads sensibly in GitHub, in Obsidian, or in any editor that has never heard of the library — those render it as a small config block instead of as broken markup.

## Setting starting parameters

`param.<key>` seeds a control without touching its definition. Here the flock starts denser and more cohesive than the model's own defaults, and the panel is hidden so the figure sits quietly in the text:

```figure
model: boids
height: 300
controls: false
param.count: 420
param.cohesion: 1.35
param.trails: true
caption: Reynolds flocking, starting from a preset the article chose rather than the model's defaults.
```

>[!remark]
> Hiding the controls does not hide the figure's behaviour — play/pause, step, reset and the speed multipliers stay in the toolbar. Use `controls: false` when the parameters are the article's point rather than the reader's.

## Everything at once

The full set of keys, on a model that is editable by pointer — click and drag on the lattice while it runs:

```figure
model: game-of-life
height: 340
speeds: true
stats: true
param.rule: highlife
param.pattern: random
param.cell: 6
caption: HighLife, $B36/S23$. Draw on it while it runs.
```

## Mistakes are visible

A block naming a model that does not exist renders an error in place, listing the ids that do — rather than failing silently or blanking the article:

```figure
model: schroedinger
caption: This one does not exist yet.
```

---

Everything else in markdown keeps working around the figures: maths like $\nabla \cdot (D \nabla p)$, callouts, tables, and code.

>[!note] Where to look
> The authoring guide is `src/lib/figures/AUTHORING.md`. A new figure is one file in `models/`, one line in `models/index.js`, and a block like the ones above.
