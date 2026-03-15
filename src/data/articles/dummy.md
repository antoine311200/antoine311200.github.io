@TITLE Infinitesimal Generator of a Stochastic Process
@DATE 7 October 2025
@DESCRIPTION Definition and properties of the infinitesimal generator of a stochastic process, with examples from diffusions and the Fokker-Planck equation.
@TAGS mathematics, stochastic calculus, probability

# Infinitesimal Generator

The **infinitesimal generator** of a stochastic process encodes how the expectation of smooth test functions evolves over infinitesimal time intervals. It plays the role of a "derivative" of the process and is central to the PDE theory of diffusions.

## Definition

>[!definition] Infinitesimal Generator
> Let $(X_t)_{t \geq 0}$ be a time-homogeneous Markov process on $\mathbb{R}^d$. The **infinitesimal generator** $\mathcal{A}$ is the operator defined for suitable test functions $\phi \in C^2(\mathbb{R}^d)$ by:
> $$\mathcal{A}\phi(x) = \lim_{t \to 0} \frac{\mathbb{E}^x[\phi(X_t)] - \phi(x)}{t}$$
> where $\mathbb{E}^x[\cdot] = \mathbb{E}[\cdot \mid X_0 = x]$.

>[!definition] Time-Dependent Generator
> For time-inhomogeneous processes or time-dependent test functions $\phi(x, t)$:
> $$\mathcal{A}_t \phi(x, t) = \lim_{s \to 0} \frac{\mathbb{E}[\phi(X_{t+s}, t+s)] - \phi(X_t, t)}{s}$$

## Generator of an Itô Diffusion

For an Itô process driven by the SDE:

$$dX_t = \mu(X_t, t)\,dt + \sigma(X_t, t)\,dW_t$$

>[!theorem] Generator formula
> The infinitesimal generator of the above Itô diffusion is:
> $$\mathcal{A}\phi = (\nabla \phi)^\top \mu + \operatorname{tr}\!\left((\nabla^2 \phi)\, D\right) = \sum_i \frac{\partial \phi}{\partial x_i} \mu_i + \frac{1}{2}\sum_{i,j} \frac{\partial^2 \phi}{\partial x_i \partial x_j} (\sigma\sigma^\top)_{ij}$$
> where $D = \frac{1}{2}\sigma\sigma^\top$ is the **diffusion tensor**.

>[!intuition] Intuition
> By Taylor's theorem and Itô's formula, for small $t \geq 0$:
> $$\mathbb{E}^x[\phi(X_t)] \approx \phi(x) + t\, \mathcal{A}\phi(x)$$
> The generator measures the instantaneous rate of change of the expected value of $\phi$ along the process. Writing $u(x, t) = \mathbb{E}^x[\phi(X_t)]$, we recover the **Kolmogorov backward equation**:
> $$\frac{\partial u}{\partial t} = \mathcal{A}u, \qquad u(x, 0) = \phi(x)$$

## Dynkin's Formula

>[!theorem] Dynkin's Formula
> Let $X$ be a Feller process with generator $\mathcal{A}$, and let $\tau$ be a stopping time with $\mathbb{E}^x[\tau] < \infty$. For any $\phi$ in the domain of $\mathcal{A}$:
> $$\mathbb{E}^x[\phi(X_\tau)] = \phi(x) + \mathbb{E}^x\!\left[\int_0^\tau \mathcal{A}\phi(X_s)\,ds\right]$$

>[!corollary] Martingale characterization
> The process $M_t^\phi = \phi(X_t) - \phi(X_0) - \int_0^t \mathcal{A}\phi(X_s)\,ds$ is a local martingale.

>[!example] Brownian motion
> For standard Brownian motion $(W_t)$, the generator is $\mathcal{A} = \frac{1}{2}\Delta$ (half the Laplacian). Dynkin's formula gives:
> $$\mathbb{E}^x[f(W_\tau)] = f(x) + \frac{1}{2}\mathbb{E}^x\!\left[\int_0^\tau \Delta f(W_s)\,ds\right]$$
> For harmonic functions ($\Delta f = 0$), this recovers the **mean value property**.

## Adjoint Operator and the Fokker-Planck Equation

The formal $L^2$-adjoint $\mathcal{A}^*$ of the generator governs the evolution of the probability density $p(x,t)$ of $X_t$.

>[!theorem] Fokker-Planck (Kolmogorov Forward) Equation
> If $X_t$ has density $p(x,t)$, then $p$ satisfies:
> $$\frac{\partial p}{\partial t} = \mathcal{A}^* p = -\nabla \cdot (\mu p) + \nabla \cdot \nabla \cdot (Dp)$$
> Explicitly in 1D with drift $\mu$ and diffusion $\sigma^2/2$:
> $$\frac{\partial p}{\partial t} = -\frac{\partial}{\partial x}(\mu p) + \frac{\partial^2}{\partial x^2}\!\left(\frac{\sigma^2}{2} p\right)$$

>[!note]
> The Kolmogorov backward equation (generator acting on initial condition) and the Fokker-Planck equation (adjoint acting on density) are the two fundamental PDEs of diffusion theory. The Feynman-Kac formula bridges these to probabilistic expectations.
