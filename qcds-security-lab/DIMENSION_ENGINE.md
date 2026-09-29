# QCDS dimensional inference — v1.11

Author: **Patrik Sundblom**. Assistant contributor: ChatGPT (OpenAI).
Commercial license: [LICENSE.md](LICENSE.md).

Open **Run dimensional inference** in the loaded example, Route or Bypass step.
This is an executable part of the existing workspace and Project Glasswing.

## What runs

1. **Condition Formation.** The declared system facts form a `1 / 0 / ?` mask.
   Add system-specific dimensions and checkable control statements. Comparison
   changes stay separate from the declared system. Only unresolved coordinates
   branch: `k` unknowns describe `2^k` assignments, irrespective of known facts.
2. **Conditional Evolution.** Attack-vector requirements become Boolean
   predicates: all mandatory facts AND at least one enabling alternative,
   AND failure of each explicitly modeled protective layer. The selected
   vector's predicate marks a subspace for the amplification calculation.
3. **Recursive Inference.** Independent lanes remove one coordinate each.
   A sequential walk carries each comparison change into the next state.
   Hybrid mode does both. Adding another control introduces another checkable
   dimension and extends this route's oracle; a successful barrier (`1`)
   blocks this specific modeled path, while an unresolved barrier keeps both
   outcomes. It does not invent an observed control failure.
4. **Truth-Alignment / Syntract Binding.** User-reported observations bind to
   the exact original system fingerprint, final dimensions, control predicates
   and vector. A changed scope archives the old observations. Conflicting
   observations remain a conflict. Coordinate invariance or amplification
   does not certify the path or establish truth.

## Three different operations

| Operation | Coordinate | Its predicate |
|---|---|---|
| Set `0` | Present, fixed false | Evaluates false if it requires `1` |
| Set `?` | Present, unresolved | Preserves compatible alternatives |
| Set `ABSENT` / `∅` | Removed from this logical space | Every predicate referring to it becomes inactive |

Removing a dimension does **not** silently delete a conjunct and thereby
weaken an oracle to true. The whole dependent predicate is inactive in that
lane. Other predicates remain evaluable. An inactive candidate is not a
refuted attack. The older `1 → ?` views remain uncertainty comparisons and
are not presented as genuine coordinate exclusion in the new engine.

The full binary basis of `n` present coordinates is `2^n`; the mask fixes
known coordinates. Excluding a present coordinate changes that basis to
`2^(n-1)`. Excluding a *known* coordinate need not change the number of
unresolved masked assignments. Lane spaces are independent and their widths
or probabilities are never added to claim one larger coherent quantum state.

## Exact symbolic counts and finite Grover reference

`LogicalSpace` uses a reduced ordered binary decision diagram and `BigInt`
cardinalities. It does not allocate one entry per logical assignment. A
50-dimensional mask can therefore be counted symbolically when its predicate
has a compact diagram. Diagram size can still grow with logical complexity;
the browser enforces 60,000 nodes per local space, 128 dimensions, 100 recorded
walk changes and 32 user-defined protective layers. These are release budgets,
not limits of QCDS or a claim of fast execution for arbitrary hard problems.

For a uniform initial state and Boolean phase oracle, the ideal Grover
reference calculates `sin²((2t+1) asin(sqrt(M/N)))`, where `M` is the exact
marked count and `N` is the masked space size. It checks every integer
iteration from 0 through the selected finite budget (maximum 40) and retains
the earliest numerical maximum. It neither fixes the iteration count at 3
nor assumes monotonic improvement.

The JSON contains the **complete compressed distribution**: the Boolean
membership graph, exact cardinalities, fixed-coordinate mask, marked and
unmarked total masses, and per-state probabilities within each subspace.
Nothing is discarded to a top-k list. Probability arithmetic uses JavaScript
floating point; state counts are exact. The formula is an ideal classical
reference calculation. The separate [execution comparator](./QUANTUM_EXECUTION.md)
compiles the same predicate into a small ideal/noisy quantum circuit and
simulates it gate by gate on the CPU. There is no QPU/NISQ connection, quantum
speedup measurement or claim of a measured vulnerability. The symbolic
engine’s formula remains separate from that simulator.

Reference: [IBM Quantum — Grover analysis](https://quantum.cloud.ibm.com/learning/en/courses/fundamentals-of-quantum-algorithms/grover-algorithm/analysis).

## Rotation, evidence and export

Up to eight cyclic orientations reorder dimension keys and their predicates
together. Counts map back to canonical keys and must agree in this ideal
implementation. This validates coordinate invariance; it is distinct from
leaving out a named security perspective or demonstrating empirical bias
removal. Per-lane graphs and distributions remain in the export.

STRIDE, OWASP/AppSec and the other enabled perspectives project the same
new vector states. Rejected vectors stay available so a changed assumption
can revive them; inactive and rejected states are separate. The predicate's
compatible witness is an assignment, not an observed exploit.

All cache structures live within a run. Saved workspace inputs, comparisons
and observations are external investigation material; there are no learned
weights, gradients or persistent self-modifying inference parameters.

## Verification

```sh
node --test qcds-security-lab/tests/*.test.mjs
```

Checks include a 50-dimensional symbolic count, exhaustive small-space
cross-checks, orientation invariance, overlapping predicates, true absence,
hybrid/sequential propagation, a full dense 8-bit Grover cross-check over
41 iterations, recursive control constraints, evidence conflict/archiving,
project import and report export. Existing Security Lab and Glasswing
contracts remain part of the release gate.
