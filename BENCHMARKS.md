# QCDS Fabric BUILD 5 — falsification and benchmark harness

BUILD 5 exists to make the reference implementation easier to prove wrong.
It does **not** assume that the full Fabric must beat an ablation.

## What is measured

The matched ablation matrix currently compares:

- `no_diagnostics` — one ordinary local reference-kernel pass;
- `null_only` — rotational dimension nulling plus stabilization;
- `null_plus_position` — nulling plus positional rotation;
- `null_plus_oracle` — nulling plus oracle-exposure rotation;
- `full_diagnostics` — null, position, oracle exposure and crossed diagnostics.

For synthetic cases with an explicit external reference distribution, the
harness records L1 distance, target→observed KL divergence, entropy, oracle
agreement, peak probability, target-mode probability/hit and contradiction
markers.

Rotation banks also expose a pairwise L1 spread. This is important because an
implementation bias can change *which states* receive mass while leaving entropy
nearly unchanged.

## Fault injection

`InjectedBiasKernel` deliberately injects two non-canonical fault classes:

1. `SlotBias` — preference tied to an execution slot rather than a logical
   dimension. Positional rotation should make this orientation dependence
   observable.
2. `OracleExposureBias` — preference activated when a named oracle occupies a
   selected exposure position. Oracle-exposure rotation should make this
   ordering dependence observable.

These are test instruments only. They are not part of QCDS semantics.

## Contradiction and bad-oracle probes

`probe_contradictions()` runs the full dimension-null bank and reports which
logical omissions remove an explicit contradiction marker and how oracle
agreement changes.

`run_oracle_leave_one_out()` measures the result after removing each oracle one
at a time against the same external target. It reports the best omission but
**never retires an oracle automatically**. Real oracle governance requires
provenance, calibration and external validation.

## Interpretation rule

A benchmark result may show any of the following:

- full diagnostics outperform an ablation;
- an ablation performs better;
- rotations detect a bias without correcting it;
- no meaningful difference;
- contradiction remains unresolved.

All are valid outcomes. BUILD 5 is instrumentation for falsification, not a
mechanism for manufacturing a favorable result.

## Run

```bash
python -m pip install -e '.[test]'
pytest -q
```

The BUILD 5 regression tests include known synthetic slot bias, oracle-order
bias, a dimension-local contradiction and a deliberately bad oracle.
