@TITLE Infinitesimal generator
@DATE 7 October 2025
@DESCRIPTION Definition and properties of the infinitesimal generator of a stochastic process, with examples and intuition.
@IMAGEPATH /images/articles/infinitesimal_generator/banner.png
@TAGS mathematics, finance, probability

### Introduction & Definition

>[!note] Remember
>This is a note.
>Another line.

>[!warning]- Caution
>This one is collapsible.

> [!definition] Infinitesimal generator of a stochastic process
> Given a stochastic process $(X_{t})$, the infinitesimal generator of the process for a test function $\phi$ is defined as
> $$\mathcal{A}\phi(x)=\lim_{ s \to 0 } \frac{\mathbb{E}^x\left[\phi(X_{t+s})\right]-\phi(X_{t})}{s}$$
> For time-invariant stochastic process, this simplifies as
> $$\mathcal{A}\phi(x)=\lim_{ t \to 0 } \frac{\mathbb{E}^x\left[\phi(X_{t})\right]-\phi(X_{0})}{t}$$
> where $\mathbb{E}^x\left[\phi(X_{t})\right]=\mathbb{E}\left[\phi(X_{t})\mid X_{0}=x\right]$ is an element of the [Feller semigroup] of $(X_{t})$.

For an Itô process,



$$dX_{t}=\mu(X_{t},t)\text{d}t+\sigma(X_{t},t)\text{d}W_{t}$$

```math
dX_{t}=\mu(X_{t},t)\text{d}t+\sigma(X_{t},t)\text{d}W_{t}
```

the generator is given as

$$\mathcal{A}\phi=\left( \nabla \phi \right)^\top \mu + tr\left( \left( \nabla^2 \phi \right)D \right) = \sum_{i} \frac{\partial \phi}{\partial x_{i}}\mu_{i}+\frac{1}{2}\sum_{i,j} \left( \frac{\partial^2 \phi}{\partial x_{i} \partial x_{j}} \left( \sigma \sigma^\top \right)_{i,j}\right) $$

with $D=\frac{1}{2}\sigma \sigma^\top$


> [!definition] Generalized infinitesimal generator of a stochastic process
> For time-dependent test functions,
> $$\mathcal{A}_t \phi(x, t) = \lim_{ s \to 0 } \frac{\mathbb{E}\left[\phi(x_{t+s}, t+s)\right]-\phi(x_{t},t)}{s}$$

This yields for the previous Itô process,
$$\mathcal{A}_{t}\phi = \frac{\partial \phi}{\partial t} + \left( \nabla \phi \right)^\top \mu + tr\left( \left( \nabla^2 \phi \right)D \right)$$

> [!intuition] Intuition
> The notion of infinitesimal generator is important in the sens that it acts as an object describing the movement of the process in an infinitesimal time interval.
> By Taylor's formula,
> $$\mathbb{E}\left[\phi(X_{t})\right] \approx f(x)+t \mathcal{A}\phi(x)$$
> for small $t\geq 0$.
> Using the notation $u(x,t):=P_{t}\phi(x)=\mathbb{E}^x\left[\phi(X_{t})\right]$,
> we recover the generalized Kolmogorov forward equation (also called [[Fokker-Planch-Kolmogorov equation]])
> $$\frac{\partial u(x,t)}{\partial t}=\mathcal{A}u(x,t), \qquad u(x,0)=\phi(x)$$
> Furthermore, the process $\text{d}M_{t}^\phi = \text{d}\phi(X_{t})+\mathcal{A}\phi(X_{t})\text{d}t$ is a martingale.


### Adjoint operator

### Dynkin's formula

Let $X$ be a Feller process with an infinitesimal generator $\mathcal{A}$, $\mathbb{P}^x$ the law of $X$ starting from $X_{0}=x$ and the expectation with respect to $\mathbb{P}^x$ be $\mathbb{E}^x$.
Then, for any function $\phi$ and finite stopping time $\tau$ (i.e $\mathbb{E}\left[\tau\right]<+\infty$)
$$\mathbb{E}^x\left[\phi(X_{\tau})\right]=\phi(x)+\mathbb{E}^x\left[\int_{0}^\tau \mathcal{A}\phi(X_{s})\text{d}s\right]$$

