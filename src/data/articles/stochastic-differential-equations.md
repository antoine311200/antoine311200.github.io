@TITLE Stochastic Differential Equations and Itô Calculus
@DATE 1 March 2026
@DESCRIPTION An introduction to stochastic differential equations (SDEs), Brownian motion, the Itô integral, Itô's formula, and classical applications in mathematical finance and physics.
@TAGS mathematics, stochastic calculus, probability, finance

# Stochastic Differential Equations and Itô Calculus

Deterministic differential equations describe smooth, predictable dynamics. Real-world systems — from financial markets to diffusing particles — are driven by noise. Stochastic differential equations (SDEs) provide the language to model such systems rigorously.

## Brownian Motion

>[!definition] Brownian Motion (Wiener Process)
> A stochastic process $(W_t)_{t \geq 0}$ on a probability space $(\Omega, \mathcal{F}, \mathbb{P})$ is a **standard Brownian motion** if:
> 1. $W_0 = 0$ almost surely
> 2. **Independent increments**: for $0 \leq s < t$, $W_t - W_s \perp \mathcal{F}_s$
> 3. **Gaussian increments**: $W_t - W_s \sim \mathcal{N}(0, t-s)$
> 4. **Continuous paths**: $t \mapsto W_t(\omega)$ is continuous a.s.

>[!remark]
> Brownian motion paths are continuous but nowhere differentiable — they have infinite variation on any interval. This is precisely why classical Riemann-Stieltjes integration fails, and a new theory is needed.

>[!property] Quadratic variation
> A key property of Brownian motion is its **quadratic variation**:
> $$[W, W]_t = \lim_{\|\Pi\| \to 0} \sum_{k} (W_{t_{k+1}} - W_{t_k})^2 = t \quad \text{a.s.}$$
> This is written informally as $dW_t \cdot dW_t = dt$. In contrast, for any smooth function $f$, $[f,f]_t = 0$.

## The Itô Integral

Because Brownian paths have infinite variation, the classical Riemann-Stieltjes integral $\int_0^T H_s \, dW_s$ is undefined. Itô constructed a new stochastic integral.

>[!definition] Itô Integral
> For an **adapted**, square-integrable process $(H_t)_{0 \leq t \leq T}$ (i.e. $\mathbb{E}\!\left[\int_0^T H_s^2 \, ds\right] < \infty$), the **Itô integral** is defined as the $L^2$ limit of Riemann sums with **left endpoints**:
> $$\int_0^T H_s \, dW_s := \lim_{\|\Pi\| \to 0} \sum_k H_{t_k}(W_{t_{k+1}} - W_{t_k})$$

>[!warning] Non-commutativity
> The choice of **left endpoints** is not arbitrary! Using midpoints gives the Stratonovich integral $\int H \circ dW$, which differs from the Itô integral by a correction term. Unlike classical calculus, the two choices yield different results.

>[!theorem] Itô Isometry
> For adapted square-integrable $H$:
> $$\mathbb{E}\!\left[\left(\int_0^T H_s \, dW_s\right)^2\right] = \mathbb{E}\!\left[\int_0^T H_s^2 \, ds\right]$$
> This is the fundamental isometry that makes $\int \cdot \, dW$ a well-defined isometry from $L^2(\Omega \times [0,T])$ to $L^2(\Omega)$.

## Itô's Formula

This is the stochastic analogue of the chain rule — arguably the most important result in stochastic calculus.

>[!theorem] Itô's Formula (1D)
> Let $X_t$ be an Itô process:
> $$dX_t = \mu_t \, dt + \sigma_t \, dW_t$$
> and let $f \in C^2(\mathbb{R})$. Then:
> $$df(X_t) = f'(X_t) \, dX_t + \frac{1}{2} f''(X_t) \, d[X,X]_t$$
> Expanding with $d[X,X]_t = \sigma_t^2 \, dt$:
> $$df(X_t) = \left(\mu_t f'(X_t) + \frac{1}{2}\sigma_t^2 f''(X_t)\right) dt + \sigma_t f'(X_t) \, dW_t$$

>[!intuition]- Why the second-order term?
> In standard calculus, Taylor expansion gives $df = f'(x) \, dx + \frac{1}{2}f''(x)(dx)^2 + \cdots$, and $(dx)^2$ is negligible. For Brownian motion, $(dW_t)^2 = dt$ is **not** negligible — it is order $dt$, not $(dt)^2$. So the second-order term survives in the limit, giving the extra $\frac{1}{2}\sigma^2 f''$ term. This is the heart of stochastic calculus.

>[!example] The stochastic exponential
> Let $X_t = W_t$ and $f(x) = e^{\sigma x - \frac{\sigma^2}{2}t}$. By Itô's formula:
> $$d\!\left(e^{\sigma W_t - \frac{\sigma^2}{2}t}\right) = \sigma \cdot e^{\sigma W_t - \frac{\sigma^2}{2}t} \, dW_t$$
> This shows $Z_t = e^{\sigma W_t - \frac{\sigma^2}{2}t}$ is a martingale (no $dt$ term), called the **stochastic exponential** or Doléans-Dade exponential.

## Stochastic Differential Equations

>[!definition] Stochastic Differential Equation
> An **SDE** for a process $(X_t)$ is written as:
> $$dX_t = b(t, X_t) \, dt + \sigma(t, X_t) \, dW_t, \quad X_0 = x_0$$
> where $b : [0,T] \times \mathbb{R} \to \mathbb{R}$ is the **drift** and $\sigma : [0,T] \times \mathbb{R} \to \mathbb{R}$ is the **diffusion coefficient**.

>[!theorem] Existence and Uniqueness (Itô)
> If $b$ and $\sigma$ satisfy the **Lipschitz and linear growth** conditions:
> $$|b(t,x) - b(t,y)| + |\sigma(t,x) - \sigma(t,y)| \leq L|x - y|$$
> $$|b(t,x)|^2 + |\sigma(t,x)|^2 \leq C(1 + |x|^2)$$
> then the SDE has a unique **strong solution** (i.e. adapted to the filtration of $W$).

### Classical SDEs

**Geometric Brownian Motion (GBM):**

$$dS_t = \mu S_t \, dt + \sigma S_t \, dW_t, \quad S_0 = s_0$$

Applying Itô's formula with $f(x) = \log x$:

$$d(\log S_t) = \left(\mu - \frac{\sigma^2}{2}\right) dt + \sigma \, dW_t$$

Integrating:

$$S_t = s_0 \exp\!\left(\left(\mu - \frac{\sigma^2}{2}\right)t + \sigma W_t\right)$$

>[!example] Black-Scholes model
> In the Black-Scholes model, the stock price $S_t$ follows GBM. The option price $V(t, S_t)$ satisfies the **Black-Scholes PDE** (derived via Itô + no-arbitrage):
> $$\frac{\partial V}{\partial t} + \frac{\sigma^2 S^2}{2} \frac{\partial^2 V}{\partial S^2} + rS \frac{\partial V}{\partial S} - rV = 0$$

**Ornstein-Uhlenbeck process (mean-reverting noise):**

$$dX_t = \theta(\mu - X_t) \, dt + \sigma \, dW_t$$

This has explicit solution:

$$X_t = \mu + (X_0 - \mu)e^{-\theta t} + \sigma \int_0^t e^{-\theta(t-s)} \, dW_s$$

The process reverts to mean $\mu$ at rate $\theta$, with long-run distribution $\mathcal{N}(\mu, \sigma^2 / 2\theta)$.

## Numerical Simulation

In practice, SDEs are solved numerically. The **Euler-Maruyama** scheme is the simplest:

$$X_{t_{k+1}} \approx X_{t_k} + b(t_k, X_{t_k})\Delta t + \sigma(t_k, X_{t_k})\sqrt{\Delta t} \cdot Z_k$$

where $Z_k \sim \mathcal{N}(0,1)$ i.i.d.

```python
import numpy as np
import matplotlib.pyplot as plt

def euler_maruyama(mu, sigma, x0, T, N, n_paths=10):
    """Simulate GBM paths using Euler-Maruyama."""
    dt = T / N
    t = np.linspace(0, T, N + 1)

    paths = np.zeros((n_paths, N + 1))
    paths[:, 0] = x0

    for k in range(N):
        Z = np.random.standard_normal(n_paths)
        drift = mu * paths[:, k] * dt
        diffusion = sigma * paths[:, k] * np.sqrt(dt) * Z
        paths[:, k + 1] = paths[:, k] + drift + diffusion

    return t, paths

# Simulate GBM: dS = 0.05 S dt + 0.2 S dW
t, paths = euler_maruyama(mu=0.05, sigma=0.2, x0=100, T=1, N=252, n_paths=20)

plt.figure(figsize=(10, 5))
plt.plot(t, paths.T, alpha=0.5, linewidth=0.8)
plt.xlabel("Time (years)")
plt.ylabel("Price")
plt.title("Geometric Brownian Motion — 20 simulated paths")
plt.grid(alpha=0.3)
plt.show()
```

>[!note] Convergence
> The Euler-Maruyama scheme has **strong order 0.5** and **weak order 1.0**. The higher-order **Milstein scheme** achieves strong order 1.0 by adding a correction term $\frac{\sigma \sigma'}{2}(\Delta W^2 - \Delta t)$.

## The Generator of a Diffusion

>[!definition] Infinitesimal Generator
> The **infinitesimal generator** $\mathcal{L}$ of the SDE $dX_t = b(X_t)\,dt + \sigma(X_t)\,dW_t$ is the operator:
> $$\mathcal{L}f(x) = b(x) f'(x) + \frac{1}{2}\sigma^2(x) f''(x)$$
> for $f \in C^2(\mathbb{R})$.

>[!property] Dynkin's Formula
> For a stopping time $\tau$ with $\mathbb{E}[\tau] < \infty$:
> $$\mathbb{E}_x[f(X_\tau)] = f(x) + \mathbb{E}_x\!\left[\int_0^\tau \mathcal{L}f(X_s)\,ds\right]$$

>[!theorem] Feynman-Kac Formula
> The solution to the PDE:
> $$\frac{\partial u}{\partial t} + \mathcal{L}u - ru = -g, \quad u(T, x) = \Phi(x)$$
> admits a stochastic representation:
> $$u(t, x) = \mathbb{E}\!\left[\int_t^T e^{-r(s-t)} g(X_s)\,ds + e^{-r(T-t)}\Phi(X_T) \,\Big|\, X_t = x\right]$$
> This bridges PDEs and stochastic processes — the Black-Scholes formula is a special case.

## Summary

| Concept | Formula |
|---------|---------|
| Itô isometry | $\mathbb{E}[(\int H\,dW)^2] = \mathbb{E}[\int H^2\,ds]$ |
| Itô formula | $df = f' dX + \frac{1}{2}f'' \sigma^2 dt$ |
| GBM solution | $S_t = S_0 \exp((\mu - \frac{\sigma^2}{2})t + \sigma W_t)$ |
| Generator | $\mathcal{L}f = b f' + \frac{1}{2}\sigma^2 f''$ |
| Feynman-Kac | $u(t,x) = \mathbb{E}[\Phi(X_T) + \cdots \mid X_t = x]$ |
