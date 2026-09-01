@TITLE Stochastic Coupling
@DATE 29 August 2026
@DESCRIPTION How to compare two random processes by building them on the same probability space: the coupling inequality, maximal couplings, synchronous and reflection couplings of diffusions, Eberle's construction for non-convex potentials, and the asymptotic couplings behind ergodicity in infinite dimensions.
@TAGS mathematics, probability, stochastic calculus, analysis
@IMAGEPATH /images/coupling.png

# Stochastic Coupling

Two random variables with different laws are, on the face of it, incomparable objects: they live on whatever probability spaces they were built on, and nothing forces those spaces to be related. **Coupling** is the observation that we get to choose. If we want to compare $\mu$ and $\nu$, we may construct a *single* probability space carrying a pair $(X, Y)$ with $X \sim \mu$ and $Y \sim \nu$, and then reason about the pair. The marginals are fixed; the joint law is ours to design.

That freedom is worth a surprising amount. It converts analytic statements — a bound on total variation, a rate of convergence to equilibrium, a gradient estimate — into geometric statements about two paths on the same picture, of the form *how long until they meet, and how fast do they approach*. This article is about the couplings that appear again and again in proofs, and about what each one buys.

>[!definition] Coupling
> Let $\mu, \nu$ be probability measures on a measurable space $(E, \mathcal{E})$. A **coupling** of $\mu$ and $\nu$ is a probability measure $\pi$ on $(E \times E, \mathcal{E} \otimes \mathcal{E})$ whose marginals are $\mu$ and $\nu$:
> $$\pi(A \times E) = \mu(A), \qquad \pi(E \times B) = \nu(B) \qquad \forall A, B \in \mathcal{E}.$$
> Equivalently, a pair of random variables $(X,Y)$ on one probability space with $X \sim \mu$ and $Y \sim \nu$.

Couplings always exist — the product measure $\mu \otimes \nu$ is one — so the content is never existence but *construction*: which coupling makes the pair do something useful.

## The coupling inequality

Recall the total variation distance. For probability measures on $(E,\mathcal E)$,

$$\|\mu - \nu\|_{TV} \;=\; \sup_{A \in \mathcal{E}} |\mu(A) - \nu(A)| \;=\; \frac{1}{2}\int |p - q| \, d\lambda \;=\; 1 - \int \min(p, q) \, d\lambda,$$

the last two expressions holding when $\mu, \nu$ have densities $p, q$ against a common dominating measure $\lambda$. The third form is the one to remember: **total variation is one minus the mass the two laws can share.**

>[!theorem] Coupling inequality
> For any coupling $(X,Y)$ of $\mu$ and $\nu$,
> $$\|\mu - \nu\|_{TV} \;\leq\; \mathbb{P}(X \neq Y).$$

>[!proof] Proof
> Let $A \in \mathcal{E}$. Then
> $$\mu(A) - \nu(A) = \mathbb{P}(X \in A) - \mathbb{P}(Y \in A) = \mathbb{E}\big[\mathbf{1}_{X \in A} - \mathbf{1}_{Y \in A}\big].$$
> On the event $\{X = Y\}$ the integrand vanishes, so
> $$|\mu(A) - \nu(A)| \le \mathbb{E}\big[\,|\mathbf{1}_{X \in A} - \mathbf{1}_{Y \in A}|\,\mathbf{1}_{X \neq Y}\big] \le \mathbb{P}(X \neq Y).$$
> Taking the supremum over $A$ gives the claim. $\square$

The proof is three lines, and the whole method rests on it. To bound a distance between laws, exhibit *one* coupling and estimate the probability that it fails to identify the two copies. There is no need to compute either law.

## Maximal couplings: the inequality is sharp

The bound would be of limited use if it were never attained. It always is.

>[!theorem] Maximal coupling
> There exists a coupling $(X,Y)$ of $\mu$ and $\nu$ with
> $$\mathbb{P}(X \neq Y) = \|\mu - \nu\|_{TV}.$$

>[!proof]- Construction
> Suppose $\mu, \nu$ have densities $p, q$. Write $m = \int \min(p,q)\,d\lambda$, so $\|\mu-\nu\|_{TV} = 1 - m$. If $m = 1$ the measures agree and we take $X = Y$. Otherwise define three probability densities
> $$\gamma = \frac{\min(p,q)}{m}, \qquad \alpha = \frac{p - \min(p,q)}{1-m}, \qquad \beta = \frac{q - \min(p,q)}{1-m},$$
> noting $\alpha$ and $\beta$ have disjoint supports. Flip a coin with success probability $m$. On success draw $Z \sim \gamma$ and set $X = Y = Z$. On failure draw $X \sim \alpha$ and $Y \sim \beta$ independently. Then
> $$\mathbb{P}(X \in dx) = m\,\gamma + (1-m)\,\alpha = \min(p,q) + p - \min(p,q) = p,$$
> and likewise for $Y$; so this is a coupling. Since $\alpha,\beta$ are disjointly supported, $X \neq Y$ exactly on failure, which has probability $1-m = \|\mu-\nu\|_{TV}$. $\square$

The picture is simply the overlap of the two densities. The shaded region is the mass the two laws share; everything above it must be sampled separately, and the probability of doing so is exactly the total variation distance.

```figure
model: sc-overlap
height: 360
controls: shift
caption: Two unit Gaussians. The shaded region is $\int\min(p,q)$, the mass the two laws can share; what is left is $\|p-q\|_{TV}$, and a maximal coupling pays exactly that.
```

Slide the two means apart and the shared region shrinks, so the distance grows. Bring them back together and the overlap is everything: $X = Y$ always, and the total variation distance is zero.

>[!remark] Why this matters for proofs
> Maximality means the coupling method loses nothing *in principle*. Any total-variation bound is achievable by some coupling, so failing to prove a sharp bound is a failure of the particular coupling chosen, not of the method. In practice one trades sharpness for constructibility: the maximal coupling above requires knowing both densities, which is exactly what we usually do not have.

## Couplings of Markov processes

For processes the definition is the same, applied to path space. Let $(P_t)$ be a Markov semigroup on $E$. A **coupling of the process** started from $x$ and $y$ is a process $(X_t, Y_t)$ on $E \times E$ with $X_0 = x$, $Y_0 = y$, such that each component is marginally a copy of the process. A coupling is **Markovian** if the pair is itself Markov, and **co-adapted** (or *faithful*) if each component is adapted to the joint filtration and remains a copy of the process with respect to it — the condition that matters when constructing couplings by driving both copies with the same noise.

>[!definition] Coupling time
> $$\tau = \inf\{t \geq 0 : X_t = Y_t\}.$$
> The coupling is **successful** if $\tau < \infty$ almost surely.

The processes are almost always arranged to be **sticky**: after $\tau$ we set $Y_t = X_t$ for all $t \geq \tau$. This is legitimate — by the strong Markov property, a copy of the process run from the meeting point is still a copy of the process — and it turns the coupling inequality into a statement about a *hitting time*:

$$\|\delta_x P_t - \delta_y P_t\|_{TV} \;\leq\; \mathbb{P}(\tau > t).$$

Everything that follows is a matter of designing the joint dynamics so that $\tau$ is small.

## The three couplings of a diffusion

Take the SDE on $\mathbb{R}^d$

$$dX_t = b(X_t)\,dt + \sigma\, dW_t,$$

and build a second copy driven by a Brownian motion $\widetilde{W}$. Any choice of $\widetilde W$ that is itself a standard Brownian motion in the joint filtration gives a valid coupling, because the law of $Y$ depends only on that. Three choices dominate the literature.

>[!definition] Synchronous (parallel) coupling
> $d\widetilde{W}_t = dW_t$. Both copies feel the *same* noise:
> $$dX_t = b(X_t)dt + \sigma dW_t, \qquad dY_t = b(Y_t)dt + \sigma dW_t.$$
> The difference $Z_t = X_t - Y_t$ then satisfies a **random ODE**, the noise having cancelled:
> $$dZ_t = \big(b(X_t) - b(Y_t)\big)\,dt.$$

>[!definition] Reflection (mirror) coupling
> With $e_t = Z_t/|Z_t|$ the unit vector along the gap, drive $Y$ by the noise reflected in the hyperplane orthogonal to $e_t$:
> $$d\widetilde{W}_t = \left(I - 2\,e_t e_t^{\top}\right) dW_t \quad \text{for } t < \tau, \qquad d\widetilde W_t = dW_t \text{ for } t \ge \tau.$$
> The matrix $R_t = I - 2 e_te_t^\top$ is orthogonal and symmetric, so $\widetilde{W}$ is again a standard Brownian motion and $Y$ is again a copy of the process — only the joint law has changed.

>[!definition] Independent coupling
> $\widetilde{W} \perp W$. The naive choice; almost never optimal, but the baseline against which the other two are judged.

The figure below runs all three on the same equation, with no drift at all, so that the choice of noise is the only thing at work. Step through the couplings and watch the gap.

```figure
model: sc-paths
height: 420
controls: coupling
caption: Two Brownian motions, $b \equiv 0$, started at $\pm 1.2$. Above, the two paths; below, the gap $X_t - Y_t$. The green line marks the coupling time $\tau$.
param.coupling: reflection
```

Three things are worth doing to it before reading on. Switch to **synchronous**: the gap is exactly constant, and the two paths are translates of one another forever — the coupling never succeeds. Switch to **independent**: the gap is a Brownian motion of variance $2\sigma^2$, and eventually hits zero. Switch back to **reflection**: the gap is a Brownian motion of variance $4\sigma^2$, and hits zero sooner.

### Why reflection doubles the noise

The computation is short and explains the entire advantage. In one dimension $R_t = -1$, so for $t < \tau$

$$dZ_t = \big(b(X_t)-b(Y_t)\big)dt + \sigma\,dW_t - \sigma\,d\widetilde W_t = \big(b(X_t)-b(Y_t)\big)dt + 2\sigma\,dW_t.$$

The gap is driven by a Brownian motion of **variance $4\sigma^2$**, twice the variance of the independent coupling's $2\sigma^2$ and infinitely more than the synchronous coupling's zero. In $d$ dimensions the same happens along $e_t$: writing $Z_t = X_t - Y_t$,

$$dZ_t = \big(b(X_t) - b(Y_t)\big)dt + \sigma (I - R_t)\,dW_t = \big(b(X_t)-b(Y_t)\big)dt + 2\sigma\, e_t e_t^{\top} dW_t,$$

so the noise acts **only along the gap** and not at all transversally. The two paths therefore share their sideways motion exactly and disagree only in the one direction that matters. That is the geometric content of the mirror.

```figure
model: sc-mirror
height: 440
controls: coupling
caption: Reflection coupling in the plane. The grey dashed line is the mirror — the perpendicular bisector of $XY$ — and the two arrows are the noise directions, mirror images in it. They are drawn at a fixed length, which costs nothing: a reflection is an isometry, so the two increments always have the same length. Transverse motion is shared, so only the gap along $e$ diffuses.
param.coupling: reflection
```

Watch the two noise arrows: their components perpendicular to the dashed mirror are identical, and their components along it are opposite. Switch to synchronous and both arrows coincide — the gap vector never changes, and the pair drifts across the plane forever as a rigid body.

### A sharp bound for Brownian motion

For $b \equiv 0$, $d = 1$, the reflection coupling gives everything. The gap starts at $d_0 = |x - y|$ and is a Brownian motion of variance $4\sigma^2$, so by the reflection principle

$$\mathbb{P}(\tau > t) = \mathbb{P}\left(\min_{s\le t} |Z_s| > 0\right) = 2\Phi\!\left(\frac{d_0}{2\sigma\sqrt{t}}\right) - 1.$$

And an explicit computation with two Gaussians gives exactly the same quantity for the total variation distance between $\mathcal{N}(x, \sigma^2 t)$ and $\mathcal{N}(y, \sigma^2 t)$. The coupling inequality is therefore an *equality* here:

>[!theorem] Reflection coupling is maximal for Brownian motion
> For one-dimensional Brownian motion, the reflection coupling attains
> $$\mathbb{P}(\tau > t) \;=\; \|\delta_x P_t - \delta_y P_t\|_{TV} \;=\; 2\Phi\!\left(\frac{|x-y|}{2\sigma\sqrt t}\right) - 1 .$$
> No coupling can meet sooner.

This is not a coincidence of dimension one: reflection couplings are maximal for Brownian motion in any dimension, and for a large class of processes with symmetric transition densities. The next figure measures the right-hand side from a sample of pairs and draws the exact left-hand side beside it, so the inequality can be checked rather than believed.

```figure
model: sc-bound
height: 380
controls: coupling
caption: Five hundred pairs of Brownian motions started at $\pm 1.5$, run under one coupling. Green is the measured $\mathbb{P}(\tau > t)$; the grey dashed curve is the exact total variation distance. Under reflection the two coincide.
param.coupling: reflection
```

Switch to **independent** and the green curve pulls away above the dashed one: the bound is still valid, but wasteful — the coupling takes far longer to meet than the laws take to merge. Switch to **synchronous**: the green curve is pinned at $1$ forever while the true distance decays to zero. The inequality holds, vacuously. A bad coupling proves nothing, and this is what "nothing" looks like.

## Synchronous coupling and contraction

If the reflection coupling is the one that wins in total variation, why is the synchronous coupling used at all? Because it is the one that wins in **Wasserstein** distance, and because its analysis needs no stochastic calculus whatsoever.

>[!definition] One-sided Lipschitz / dissipativity
> The drift $b$ is **one-sided Lipschitz with constant $-\kappa$** if
> $$\langle b(x) - b(y),\, x - y\rangle \leq -\kappa\,|x-y|^2 \qquad \forall x,y.$$
> For a gradient drift $b = -\nabla V$ this is exactly $\nabla^2 V \succeq \kappa I$: the potential is $\kappa$-strongly convex.

>[!theorem] Exponential contraction under synchronous coupling
> Under the above condition, the synchronous coupling satisfies
> $$|X_t - Y_t| \leq e^{-\kappa t}\,|x - y| \qquad \text{almost surely},$$
> and consequently, for every $p \geq 1$,
> $$\mathcal{W}_p(\delta_x P_t, \delta_y P_t) \leq e^{-\kappa t}\,|x-y|.$$

>[!proof] Proof
> Under the synchronous coupling the noise cancels, so $Z_t = X_t - Y_t$ solves the random ODE $\dot Z_t = b(X_t) - b(Y_t)$ pathwise. Hence
> $$\frac{d}{dt}|Z_t|^2 = 2\langle Z_t, b(X_t)-b(Y_t)\rangle \leq -2\kappa |Z_t|^2,$$
> and Grönwall gives $|Z_t|^2 \le e^{-2\kappa t}|Z_0|^2$. The Wasserstein bound follows because $(X_t,Y_t)$ is a coupling of the two laws, and $\mathcal W_p$ is an infimum over couplings. $\square$

No Itô formula, no martingale, no stochastic integral — the noise simply is not there. This is why synchronous coupling is the workhorse for log-concave sampling, for Langevin Monte Carlo error bounds, and for proving that a diffusion with a strongly convex potential is exponentially ergodic in $\mathcal{W}_2$.

The figure below runs the synchronous coupling in a quadratic well, with the gap on a logarithmic scale: a straight line of slope $-\kappa/\ln 10$, decaying deterministically, with no randomness left in it at all.

```figure
model: sc-paths
height: 420
controls: false
stats: false
caption: Synchronous coupling in a quadratic potential. On the log scale the gap is an exact straight line — the noise has cancelled, and the decay rate is the convexity constant.
param.coupling: synchronous
param.potential: well
param.logGap: true
```

>[!warning] Contraction is not coupling
> The synchronous gap decays to zero but never reaches it: $|Z_t| = e^{-\kappa t}|Z_0| > 0$ for all finite $t$. So $\tau = \infty$ almost surely and the coupling inequality gives nothing at all in total variation. Contraction in $\mathcal{W}_p$ and successful coupling in TV are genuinely different achievements, and the two standard couplings achieve one each.

## Where synchronous coupling fails

Strong convexity is a strong hypothesis. The moment the potential has two wells, $\langle b(x)-b(y), x-y \rangle$ is positive for $x,y$ on opposite sides of the barrier, and the synchronous gap *grows*.

```figure
model: sc-paths
height: 420
controls: coupling
caption: Synchronous coupling in a double well with minima at $\pm 1$. Two copies that fall into different wells are pushed apart, not together; the gap settles near the distance between the minima and stays there.
param.coupling: synchronous
param.potential: doublewell
```

The two particles sit in different wells and the shared noise keeps them there: each is jostled the same way, so both rattle in place and the gap hovers around $2$. Occasionally both hop together, which does nothing. This is not a numerical artefact but exactly what the inequality above forbids us from ruling out — the drift is not dissipative, so there is no contraction to prove.

Now switch that same figure to **reflection**, leaving the potential alone. The mirror injects noise of variance $4\sigma^2$ into the gap, which is enough to drive it across the barrier and to zero: the gap becomes a diffusion rather than a deterministic flow, and the two paths merge.

### Eberle's coupling

The naive reflection coupling has its own defect: for $|Z|$ large, the drift term $\langle b(X)-b(Y), e\rangle$ can dominate the noise, and one can only conclude that the gap eventually meets, without a rate. The fix, due to **Eberle**, is to measure distance in a different metric and use reflection coupling inside it.

>[!theorem] Contraction for non-convex potentials
> Let $b = -\nabla V$ with $\nabla^2 V \succeq \kappa I$ *outside* a ball of radius $R$ — that is, $V$ is strongly convex only at infinity, and arbitrary inside. Then there exist a strictly increasing concave $f : [0,\infty) \to [0,\infty)$ with $f(0)=0$ and a constant $c > 0$ such that the reflection coupling satisfies
> $$\mathbb{E}\, f(|X_t - Y_t|) \leq e^{-ct}\, f(|x-y|),$$
> and hence $\mathcal{W}_f(\delta_xP_t, \delta_yP_t) \le e^{-ct}\mathcal W_f$ for the Kantorovich distance built from the metric $f(|x-y|)$.

>[!intuition] Why a concave $f$
> Apply Itô to $f(|Z_t|)$ under the reflection coupling. The gap satisfies $d|Z_t| = \langle b(X_t)-b(Y_t), e_t\rangle dt + 2\sigma\, dB_t$ for a one-dimensional Brownian motion $B$, so
> $$d\,f(|Z_t|) = \Big[\underbrace{f'(|Z_t|)\langle b(X_t)-b(Y_t),e_t\rangle}_{\text{bad where } V \text{ is not convex}} + \underbrace{2\sigma^2 f''(|Z_t|)}_{\leq\, 0 \text{ since } f \text{ concave}}\Big]dt + \text{martingale}.$$
> Concavity makes the Itô correction a *friend*: it contributes a strictly negative term wherever the second derivative is strictly negative. Eberle's $f$ is chosen to be sharply concave precisely on the range of $|Z|$ where the drift is unhelpful — inside the ball of radius $R$ — and nearly linear outside it, so that the $f''$ term pays for the drift term exactly where it must. The rate $c$ then degrades like $e^{-cR^2}$ in the size of the non-convex region, which is the expected metastable cost.

This construction is the standard route to quantitative convergence rates for Langevin dynamics with multi-modal targets, and it is why reflection coupling appears in almost every modern sampling paper.

## Asymptotic coupling

Both couplings so far demand that the copies *meet*, or at least that a distance contract pathwise. In infinite dimensions neither is available. For a stochastic PDE driven by noise acting on finitely many Fourier modes, two solutions started at different points will typically never meet exactly — the noise cannot reach the unforced directions — and yet the equation may still be uniquely ergodic.

The resolution, due to **Hairer, Mattingly and Scheutzow**, is to weaken the requirement from meeting to *converging*.

>[!definition] Asymptotic coupling
> A coupling $(X_t, Y_t)$ of the process started from $x$ and $y$ is **asymptotic** if
> $$\lim_{t\to\infty} |X_t - Y_t| = 0 \qquad \text{with positive probability},$$
> where the two components need not ever be equal. More precisely one asks for a coupling of the two path-space measures giving positive mass to the "asymptotic diagonal" $\{(u,v) : \lim_{t\to\infty}\|u_t - v_t\| = 0\}$.

>[!theorem] Asymptotic coupling implies uniqueness of the invariant measure
> If for every pair $x,y$ there is a coupling of the laws on path space that is **equivalent** to the true joint law (an absolute-continuity requirement, typically supplied by Girsanov) and charges the asymptotic diagonal with positive probability, then the process has at most one invariant measure.

The construction that realises this is a **nudged** or **controlled** coupling: run the second copy with the *same* noise as the first, plus a control that pushes it toward the first copy,

$$dY_t = b(Y_t)\,dt + \kappa\,(X_t - Y_t)\,dt + \sigma\,dW_t.$$

As written this is no longer a copy of the original process — the added drift changes its law. The point of the absolute-continuity requirement is that Girsanov's theorem repairs it: as long as the control has finite energy, $\int_0^\infty |\kappa (X_s - Y_s)|^2 ds < \infty$, the shifted law is *equivalent* to the true one, and any almost-sure statement under one transfers to a positive-probability statement under the other. Since the gap under this coupling decays exponentially, its energy is finite, and the argument closes.

```figure
model: sc-paths
height: 420
controls: false
stats: false
caption: A nudged coupling of two Brownian motions. The gap decays exponentially but is never zero — the paths converge without meeting. This is what an asymptotic coupling looks like, and it is enough for uniqueness of the invariant measure even though $\tau = \infty$.
param.coupling: nudged
param.potential: flat
param.logGap: true
```

On the log scale the gap is again a straight line, and the coupling time never arrives. A stronger control works faster — at the cost of more Girsanov energy.

>[!remark] What this buys
> Asymptotic coupling is the tool behind ergodicity of the 2D stochastic Navier–Stokes equations forced by noise in only a handful of modes, where the classical Doob–Khasminskii route fails because the transition semigroup is not strong Feller. The companion notion is the **asymptotic strong Feller** property, which plays the role of strong Feller in a topology adapted to the dynamics; together with topological irreducibility it yields uniqueness of the invariant measure.

## Couplings for Markov chains

The same ideas in discrete time are older and, if anything, cleaner.

>[!definition] Doeblin minorization
> A transition kernel $P$ satisfies a **minorization condition** if there are $\varepsilon > 0$, a probability measure $\nu$ and $n \geq 1$ with
> $$P^n(x, \cdot) \geq \varepsilon\, \nu(\cdot) \qquad \text{for all } x \in E.$$

>[!theorem] Doeblin's theorem
> Under minorization with $n=1$, $P$ has a unique invariant measure $\pi$ and
> $$\|\delta_x P^k - \pi\|_{TV} \leq (1-\varepsilon)^k .$$

>[!proof]- Proof by coupling
> Minorization says every transition can be written as a mixture: $P(x,\cdot) = \varepsilon \nu(\cdot) + (1-\varepsilon) Q(x,\cdot)$ for a kernel $Q$. Run two chains together. At each step, flip a coin with probability $\varepsilon$; on success, draw a *single* point from $\nu$ and move **both** chains there — they have coupled; on failure, move each according to $Q$ from its own position. Each chain marginally follows $P$, so this is a coupling; and the pair fails to have coupled after $k$ steps only if all $k$ coins failed. Hence $\mathbb{P}(\tau > k) \le (1-\varepsilon)^k$, and the coupling inequality finishes it. $\square$

This *splitting* construction — writing a kernel as a mixture containing a common component — is Nummelin's, and it is the discrete cousin of the maximal coupling: the shared measure $\varepsilon\nu$ plays the role of $\min(p,q)$.

>[!theorem] Harris' theorem
> Suppose $P$ satisfies a Lyapunov (drift) condition $PV \le \gamma V + K$ with $\gamma < 1$, and a minorization on the sublevel set $\{V \le R\}$ for $R$ large enough. Then $P$ has a unique invariant measure and converges to it geometrically in a weighted total-variation norm.

The proof is again a coupling: the Lyapunov condition drives the pair into the small set, where the minorization gives them a fixed chance to merge on each visit; the two mechanisms compose into a geometric tail for $\tau$. Hairer and Mattingly's short proof of Harris' theorem is a good place to see this argument in its cleanest form. The **weak Harris theorem** replaces the total-variation minorization by a Wasserstein contraction and is exactly what asymptotic couplings deliver.

## What couplings prove

A summary of which construction buys what:

| Coupling | Gap dynamics | Buys | Needs |
| --- | --- | --- | --- |
| Maximal | — | $\mathbb{P}(X\neq Y) = \|\mu-\nu\|_{TV}$ | both densities |
| Independent | variance $2\sigma^2$ | a crude but valid TV bound | nothing |
| Synchronous | random ODE, no noise | $\mathcal{W}_p$ contraction at rate $\kappa$ | $\nabla^2 V \succeq \kappa I$ |
| Reflection | variance $4\sigma^2$ along $e$ | successful coupling, TV bounds | non-degenerate noise |
| Eberle (reflection + concave $f$) | as above, in metric $f$ | $\mathcal{W}_f$ contraction | convexity only at infinity |
| Nudged / asymptotic | controlled, exponentially decaying | uniqueness of invariant measure | Girsanov, finite control energy |
| Splitting (Doeblin, Nummelin) | discrete merge with prob $\varepsilon$ | geometric TV convergence | minorization |

Two further uses deserve a mention. First, **gradient estimates**: for a coupling with $\mathbb{E}|X_t - Y_t| \le c(t)|x-y|$ one gets immediately
$$|\nabla P_t f(x)| \le \mathrm{Lip}(f)\, c(t),$$
by writing $P_tf(x) - P_tf(y) = \mathbb{E}[f(X_t) - f(Y_t)]$. Coupling is the probabilistic route to regularisation estimates that would otherwise need parabolic PDE theory. Second, **mixing times**: for finite Markov chains, exhibiting a coupling whose $\tau$ has a good tail is one of the two standard techniques (the other being strong stationary times), and gives the classical results for card shuffling, the Ising Glauber dynamics at high temperature, and random walks on groups.

>[!tip] Choosing a coupling
> As a rule of thumb: if the drift is contracting, use synchronous — the analysis is calculus. If the drift is not contracting but the noise is elliptic, use reflection, and if the non-convexity is confined to a bounded region, use Eberle's metric on top of it. If the noise is degenerate and the copies cannot meet, give up on meeting and use an asymptotic coupling with a Girsanov control.

## References

- T. Lindvall, *Lectures on the Coupling Method* — the standard textbook; the coupling inequality and maximal couplings are Chapter 1.
- T. Lindvall and L. C. G. Rogers, *Coupling of multidimensional diffusions by reflection*, Ann. Prob. 14 (1986) — the reflection coupling for SDEs.
- A. Eberle, *Reflection couplings and contraction rates for diffusions*, PTRF 166 (2016) — the concave-metric construction.
- M. Hairer, J. Mattingly and M. Scheutzow, *Asymptotic coupling and a general form of Harris' theorem*, PTRF 149 (2011).
- M. Hairer and J. Mattingly, *Yet another look at Harris' ergodic theorem for Markov chains* (2008) — the short coupling proof.
- D. Levin and Y. Peres, *Markov Chains and Mixing Times* — coupling for finite chains, with the shuffling examples.
- C. Villani, *Optimal Transport: Old and New* — couplings as transport plans, and the Wasserstein picture.
