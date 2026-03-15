@TITLE Reinforcement Learning: Mathematical Foundations
@DATE 20 February 2026
@DESCRIPTION A rigorous treatment of reinforcement learning through the lens of Markov Decision Processes, Bellman equations, value functions, and policy gradient methods — with Python implementations.
@TAGS machine learning, reinforcement learning, mathematics, optimization

# Reinforcement Learning: Mathematical Foundations

Reinforcement learning (RL) is the study of how an agent learns to make decisions by interacting with an environment to maximize cumulative reward. Unlike supervised learning, there is no labeled dataset — the agent must discover good behaviour through trial and error.

## Markov Decision Processes

>[!definition] Markov Decision Process
> A **Markov Decision Process (MDP)** is a tuple $\mathcal{M} = (S, A, P, R, \gamma)$ where:
> - $S$ — state space
> - $A$ — action space
> - $P : S \times A \times S \to [0,1]$ — transition kernel, $P(s' \mid s, a) = \Pr[S_{t+1} = s' \mid S_t = s, A_t = a]$
> - $R : S \times A \to \mathbb{R}$ — reward function, $R(s,a) = \mathbb{E}[r_t \mid S_t = s, A_t = a]$
> - $\gamma \in [0,1)$ — discount factor
>
> The **Markov property** asserts that the future is independent of the past given the present state.

>[!remark]
> The Markov property is a modelling assumption, not always satisfied in practice. Partially observable MDPs (POMDPs) extend this to settings where the agent only observes a noisy function of the true state.

### Policies and Returns

>[!definition] Policy
> A **policy** $\pi : S \to \Delta(A)$ maps states to probability distributions over actions. A **deterministic** policy selects $a = \pi(s)$ with certainty; a **stochastic** policy samples $a \sim \pi(\cdot \mid s)$.

>[!definition] Return and Value Functions
> The **discounted return** from time $t$ is:
> $$G_t := \sum_{k=0}^{\infty} \gamma^k r_{t+k+1}$$
>
> The **state-value function** under policy $\pi$:
> $$V^\pi(s) := \mathbb{E}_\pi[G_t \mid S_t = s] = \mathbb{E}_\pi\!\left[\sum_{k=0}^\infty \gamma^k r_{t+k+1} \,\Big|\, S_t = s\right]$$
>
> The **action-value function** (Q-function):
> $$Q^\pi(s, a) := \mathbb{E}_\pi[G_t \mid S_t = s, A_t = a]$$

>[!property] Relationship between V and Q
> $$V^\pi(s) = \sum_a \pi(a \mid s) Q^\pi(s, a) = \mathbb{E}_{a \sim \pi}[Q^\pi(s,a)]$$
> $$Q^\pi(s, a) = R(s,a) + \gamma \sum_{s'} P(s' \mid s, a) V^\pi(s')$$

## Bellman Equations

>[!theorem] Bellman Expectation Equations
> Under policy $\pi$, the value functions satisfy:
> $$V^\pi(s) = \sum_a \pi(a|s)\left[R(s,a) + \gamma \sum_{s'} P(s'|s,a)V^\pi(s')\right]$$
> $$Q^\pi(s,a) = R(s,a) + \gamma \sum_{s'} P(s'|s,a)\sum_{a'}\pi(a'|s')Q^\pi(s',a')$$
>
> In matrix form: $\mathbf{V}^\pi = \mathbf{R}^\pi + \gamma \mathbf{P}^\pi \mathbf{V}^\pi$, giving the closed-form solution $\mathbf{V}^\pi = (I - \gamma \mathbf{P}^\pi)^{-1}\mathbf{R}^\pi$.

>[!definition] Optimal Value Functions
> The **optimal value functions** are:
> $$V^*(s) := \max_\pi V^\pi(s), \qquad Q^*(s,a) := \max_\pi Q^\pi(s,a)$$

>[!theorem] Bellman Optimality Equations
> The optimal value functions satisfy:
> $$V^*(s) = \max_a \left[R(s,a) + \gamma \sum_{s'} P(s'|s,a) V^*(s')\right]$$
> $$Q^*(s,a) = R(s,a) + \gamma \sum_{s'} P(s'|s,a) \max_{a'} Q^*(s',a')$$

>[!remark]
> The Bellman optimality equations are **nonlinear** (due to the $\max$), unlike the expectation equations which are linear in $V^\pi$. The optimal policy is then greedy with respect to $V^*$: $\pi^*(s) = \arg\max_a Q^*(s,a)$.

## Dynamic Programming

### Value Iteration

>[!theorem] Value Iteration Convergence
> The **Bellman optimality operator** $\mathcal{T}$:
> $$(\mathcal{T}V)(s) = \max_a \left[R(s,a) + \gamma \sum_{s'} P(s'|s,a)V(s')\right]$$
> is a **$\gamma$-contraction** in the $\ell^\infty$ norm: $\|\mathcal{T}V - \mathcal{T}U\|_\infty \leq \gamma \|V - U\|_\infty$.
>
> By the **Banach fixed-point theorem**, iteration $V_{k+1} = \mathcal{T}V_k$ converges to the unique fixed point $V^*$ at geometric rate $\gamma$.

>[!proof]- Contraction proof
> For any two value functions $V, U$:
> $$|(\mathcal{T}V)(s) - (\mathcal{T}U)(s)| = |\max_a \mathcal{T}_a V(s) - \max_a \mathcal{T}_a U(s)|$$
> Using $|\max f - \max g| \leq \max|f - g|$:
> $$\leq \max_a \left|\gamma \sum_{s'} P(s'|s,a)(V(s') - U(s'))\right| \leq \gamma \|V - U\|_\infty$$
> Taking the supremum over $s$ yields the $\gamma$-contraction property. $\square$

```python
import numpy as np

def value_iteration(P, R, gamma=0.99, tol=1e-8):
    """
    Value iteration for a finite MDP.
    P : (S, A, S) transition tensor
    R : (S, A) reward matrix
    Returns: V* and greedy policy pi*
    """
    S, A, _ = P.shape
    V = np.zeros(S)

    while True:
        Q = R + gamma * (P * V[None, None, :]).sum(axis=2)  # (S, A)
        V_new = Q.max(axis=1)
        if np.max(np.abs(V_new - V)) < tol:
            break
        V = V_new

    pi = Q.argmax(axis=1)  # greedy policy
    return V, pi
```

### Policy Iteration

>[!theorem] Policy Improvement Theorem
> Let $\pi$ be any policy and $\pi'$ the greedy policy w.r.t. $Q^\pi$:
> $$\pi'(s) := \arg\max_a Q^\pi(s,a)$$
> Then $V^{\pi'}(s) \geq V^\pi(s)$ for all $s$, with strict inequality unless $\pi$ is already optimal.

>[!proof]- Sketch
> For any $s$:
> $$V^\pi(s) \leq Q^\pi(s, \pi'(s)) = R(s, \pi'(s)) + \gamma\sum_{s'} P(s'|s,\pi'(s)) V^\pi(s')$$
> Applying this inequality recursively along the trajectory under $\pi'$ gives $V^\pi \leq V^{\pi'}$. $\square$

Policy iteration alternates between **policy evaluation** (solving the linear system for $V^\pi$) and **policy improvement** (greedy update). It converges in finite steps for finite MDPs.

## Temporal Difference Learning

When the model $(P, R)$ is unknown, we must learn from samples.

>[!definition] TD(0) Update
> The simplest model-free algorithm updates the value estimate using a **temporal difference error**:
> $$\delta_t := r_{t+1} + \gamma V(S_{t+1}) - V(S_t)$$
> $$V(S_t) \leftarrow V(S_t) + \alpha \delta_t$$
> where $\alpha > 0$ is the learning rate.

>[!intuition]- Why does TD work?
> $r_{t+1} + \gamma V(S_{t+1})$ is a **bootstrapped** estimate of $V(S_t)$ using the observed reward and the current estimate of the successor state. The TD error $\delta_t$ is the surprise — how much reality differed from our prediction. Learning drives this surprise towards zero.

### Q-Learning

>[!definition] Q-Learning
> The off-policy TD algorithm for learning $Q^*$ directly:
> $$Q(S_t, A_t) \leftarrow Q(S_t, A_t) + \alpha\left[r_{t+1} + \gamma \max_{a'} Q(S_{t+1}, a') - Q(S_t, A_t)\right]$$

>[!theorem] Q-Learning Convergence
> Under the Robbins-Monro conditions on step sizes ($\sum \alpha_t = \infty$, $\sum \alpha_t^2 < \infty$) and all state-action pairs visited infinitely often, Q-learning converges to $Q^*$ with probability 1.

>[!warning]
> Convergence requires **tabular** representation. With function approximation (e.g. neural networks), the "deadly triad" (off-policy + bootstrapping + function approximation) can lead to divergence, as famously demonstrated by the Baird counterexample.

## Policy Gradient Methods

Value-based methods struggle with continuous action spaces. **Policy gradient** methods directly optimize the policy parameters $\theta$.

>[!definition] Policy Gradient Objective
> We optimize:
> $$J(\theta) = \mathbb{E}_{\tau \sim \pi_\theta}[G_0] = \mathbb{E}_{s_0 \sim \rho_0}[V^{\pi_\theta}(s_0)]$$
> where $\tau = (S_0, A_0, R_1, \ldots)$ is a trajectory under $\pi_\theta$.

>[!theorem] Policy Gradient Theorem
> $$\nabla_\theta J(\theta) = \mathbb{E}_{\pi_\theta}\!\left[\sum_{t=0}^T Q^{\pi_\theta}(S_t, A_t) \nabla_\theta \log \pi_\theta(A_t \mid S_t)\right]$$
> This is estimated from samples via the **REINFORCE** estimator.

>[!proof]- Derivation sketch
> Using the log-derivative trick: $\nabla_\theta \pi_\theta(a|s) = \pi_\theta(a|s) \nabla_\theta \log \pi_\theta(a|s)$. Differentiating $J(\theta)$ and expanding the trajectory distribution yields the result. $\square$

```python
import torch
import torch.nn as nn
import torch.optim as optim

class PolicyNetwork(nn.Module):
    def __init__(self, state_dim, action_dim, hidden=128):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(state_dim, hidden),
            nn.ReLU(),
            nn.Linear(hidden, action_dim),
        )

    def forward(self, state):
        logits = self.net(state)
        return torch.distributions.Categorical(logits=logits)

def reinforce(env, policy, optimizer, gamma=0.99, n_episodes=1000):
    for episode in range(n_episodes):
        states, actions, rewards = [], [], []
        obs, _ = env.reset()

        done = False
        while not done:
            dist = policy(torch.FloatTensor(obs))
            action = dist.sample()
            obs, reward, terminated, truncated, _ = env.step(action.item())
            done = terminated or truncated

            states.append(obs)
            actions.append(action)
            rewards.append(reward)

        # Compute discounted returns
        G, returns = 0, []
        for r in reversed(rewards):
            G = r + gamma * G
            returns.insert(0, G)
        returns = torch.tensor(returns, dtype=torch.float32)
        returns = (returns - returns.mean()) / (returns.std() + 1e-8)

        # Policy gradient update
        loss = 0
        for action, G_t, state in zip(actions, returns, states):
            dist = policy(torch.FloatTensor(state))
            loss -= dist.log_prob(action) * G_t

        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
```

>[!note] Variance reduction
> The REINFORCE estimator has very high variance. Common variance reduction techniques:
> - **Baseline subtraction**: replace $Q^\pi(s,a)$ with $Q^\pi(s,a) - V^\pi(s)$ (the **advantage** $A^\pi$). The baseline does not bias the gradient.
> - **Actor-Critic**: learn $V^\pi$ (the critic) alongside the policy (the actor).
> - **GAE (Generalized Advantage Estimation)**: interpolates between MC returns ($\lambda=1$) and TD errors ($\lambda=0$).

## Regret and Sample Complexity

>[!definition] Regret
> The **regret** of an agent after $T$ rounds is:
> $$\text{Regret}(T) := T \cdot V^*(s_0) - \sum_{t=1}^T r_t$$
> This measures the total reward foregone by not following the optimal policy from the start.

>[!theorem] Lower Bound on Regret (Auer et al.)
> For any RL algorithm on an MDP with $S$ states, $A$ actions, and diameter $D$, the regret is at least:
> $$\text{Regret}(T) = \Omega\!\left(\sqrt{DSAT}\right)$$

Modern algorithms like **UCRL2** and **PSRL** (Posterior Sampling for RL) achieve near-optimal regret bounds of $\tilde{O}(D\sqrt{SAT})$.

## Summary

| Method | Model | Data | Convergence guarantee |
|--------|-------|------|----------------------|
| Value Iteration | Known | — | Geometric in $\gamma$ |
| Policy Iteration | Known | — | Finite steps |
| Q-Learning | Unknown | Off-policy | Almost sure (tabular) |
| REINFORCE | Unknown | On-policy | Asymptotic (local) |
| Actor-Critic | Unknown | On-policy | Asymptotic |

>[!tip] Where to go next
> - **Deep RL**: DQN, PPO, SAC — combining neural networks with RL algorithms
> - **Multi-agent RL**: game theory meets RL; Nash equilibria as solution concepts
> - **Offline RL**: learning from fixed datasets without environment interaction
> - **RLHF**: reinforcement learning from human feedback, the backbone of modern LLMs
