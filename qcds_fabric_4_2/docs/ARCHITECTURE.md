# QCDS Fabric 4.2 — implementation map

**Architecture and theory: Patrik Sundblom**

This document maps the canonical 4.2 build stages to the isolated executable implementation. The root QCDS Fabric v1.0 canon is not changed by this track.

## Non-negotiable invariants

1. **Semantic identity survives rotation.** Temporary logical/physical position never becomes semantic meaning.
2. **Null means absent.** An excluded dimension is removed from the local state space; it is not `0`, `1`, `?`, or an unconstrained present bit.
3. **Lanes are independent until binding.** No hidden cross-lane state is used to choose a winner.
4. **Distributions survive.** The binder receives full probability vectors and provenance, not top-1 votes.
5. **Grover is bounded, not arbitrarily truncated.** The reference ceiling is 40; the best iteration is a function of the declared state/marked-space geometry.
6. **Parent inference is executable.** Binding creates a fresh higher-order candidate space and parent amplitude-amplification pass.
7. **Recursion may change the oracle.** Oracle versions are explicit per cycle.
8. **Rotation is local, graph topology is global.** An eight-way rotational cell never caps system width at eight.
9. **Scheduling is not coherence.** A 512-wide emulated schedule is never presented as a single 512-register coherent quantum operation.
10. **Robustness is not truth.** Stable structure remains subject to independent truth-alignment evidence.

## Stage map

| Canonical stage | Implementation | Current executable boundary |
|---|---|---|
| 4.2A — Rotational ingress | `rotation.py` | N-dimensional balanced leave-one-out bank, inverse semantic maps, targeted multi-exclusion views |
| 4.2B — Parallel Grover bank | `engine.py`, `grover.py` | independent lane compilation/execution, exact ideal bounded emulator, full returns |
| 4.2C — Rotational Syntract | `bind.py` | canonical lift, log-pool consensus, stable core, sensitive shell, influence, necessity, contradictions |
| 4.2D — Sequential parent | `parent.py` | fresh parent candidate space + parent Grover from full child bind |
| 4.2E — Recursive rotation | `recursive.py` | re-entry across rotated banks, explicit oracle versions, parent result per cycle |
| 4.2F — Dynamic topology | `topology.py` | generic layer widths, concurrent dispatch inside layers, barriers between layers, 512×12 acceptance schedule |
| 4.2G — Stability | `stability.py` | TVD, entropy, top identity, Top-K Jaccard, influence and contradiction stability gates |
| 4.2H — NISQ rotation | `nisq.py` | semantic↔physical mapping banks and synthetic semantic-vs-substrate attribution |
| 4.2I — Adaptive rotation | `adaptive.py` | targeted first-/second-order exclusion requests driven by influence/contradiction |

## Grover peak semantics

For `N` states and `M` marked states, the ideal marked mass after `r` Grover iterations is

`P(r) = sin²((2r + 1) · asin(sqrt(M/N)))`.

The implementation evaluates the declared finite range and chooses the largest ideal marked mass without inspecting the identity of a hidden correct state. With `N=256`, `M=1`, and `r=0…40`, the first/best sampled peak in the range is at `r=12`, with marked mass approximately `0.999947`.

An explicit run at iteration 40 is also recorded. Its lower mass is expected because Grover amplification oscillates; “more iterations” is not monotonically “more truth.”

## Next falsification frontier

The code surface is broader than the proof claim. Before calling Fabric 4.2 complete rather than an alpha research build, the remaining required frontier is:

- held-out misleading-dimension benchmark,
- essential-dimension benchmark,
- positional-bias benchmark,
- NISQ/substrate-bias benchmark,
- higher-order pair-bias benchmark,
- matched resource accounting against appropriate classical/additional-sampling controls,
- cross-substrate comparison where real hardware access exists.

Failures must remain published as results rather than being tuned away after audit truth is exposed.
