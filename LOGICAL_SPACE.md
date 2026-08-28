# Persistent Logical Space

The Logical Robot now has a shared, human-readable **Logical Space** above individual missions.

The purpose is not to introduce a catalogue of fixed relation types. The space is deliberately open-ended: observations contribute logical bindings, oracle genesis/evolution can challenge and connect represented logic, and later Syntracts can expose whichever dimensions matter for the current problem.

A binding is simply a set of terms that were observed together with source provenance. Examples:

```text
(paris, city)
(paris, capital, france)
(france, language, french)
(stone_8421, stone_8422, distance, 7.3 mm)
```

The implementation does not claim that these examples exhaust the meaning of the world or impose a permanent ontology. They are inspectable coordinates in a growing logical space.

## Shared persistence

The MVP stores this space at the root of the intelligence store:

```text
intelligence_store/
├── logical_space.csv
├── mission-a/
│   ├── mission.csv
│   ├── current_oracles.csv
│   └── ...
└── mission-b/
    └── ...
```

`logical_space.csv` is intentionally shared across missions. A source observation made while solving one mission can therefore remain available to later missions without being copied into a hidden model state.

Each row retains:

- a stable binding id;
- the logical terms;
- source id and URI;
- confidence and polarity;
- mission and observation provenance;
- an excerpt from the observation;
- explicit metadata showing that the binding is evidence, not automatic external truth.

The CSV representation is an MVP storage backend. It is not a statement that future QCDS logical state should be stored in flat files. The storage boundary remains replaceable.

## Observation rule

The earlier public-web MVP used page-level candidate mention counts. A live test exposed the weakness immediately: a page about Lyon naturally contains the word `Lyon` many more times than `Paris`, which could be mistaken for support for `France / capital / Lyon`.

The Logical Space extractor removes that voting rule.

For a currently represented logical question, the MVP now requires the represented terms to be bound inside the same sentence-sized observation unit. For example:

```text
Paris is the capital and largest city of France.
```

supports the represented binding:

```text
(france, capital, paris)
```

while:

```text
Lyon is a major city in France. Lyon Lyon Lyon Lyon.
```

does not support `(france, capital, lyon)` merely because `Lyon` occurs often.

If a source explicitly supports two competing bindings, both are returned. The extractor does not vote one away.

This is still a deliberately small MVP. It is not unrestricted semantic understanding. Its purpose is to make the observation boundary logical and falsifiable while the larger space is allowed to expand over time.

## Reuse

A `PersistentLogicalSpaceTool` can query already stored bindings before another external acquisition attempt. Reused observations retain their original external source id and URI. The logical-space file itself is not presented as a new independent source.

This prevents stored logic from multiplying its own evidential weight merely because it was persisted and read again.

## Relationship to oracles and Syntracts

Logical Space and the oracle population are not the same thing.

```text
OBSERVATION
    ↓
Logical Space expands
    ↓
QCDS inference / contradiction / uncertainty
    ↓
Oracle gap
    ↓
Oracle genesis + challenge
    ↓
Oracle population changes
    ↓
Syntract binding
```

The space supplies inspectable represented logic and evidence. Oracle genesis supplies candidate logical transforms and connections. Challenge/falsification decides which oracle hypotheses may survive. A Syntract is a bound result across the dimensions participating in the current inference.

The intended direction is that the represented logical space can become extremely large and fine-grained over time while the same QCDS machinery selects, nulls, rotates, challenges and binds the dimensions relevant to a particular Syntract.

## Claim boundary

BUILD 17 does not claim an infinite physically instantiated memory, complete world knowledge, unrestricted natural-language understanding, automatic truth, or AGI/ASI. It implements the lower-level MVP property needed to test the idea: **logical observations can accumulate across missions in an inspectable, open-ended space and can be reused without turning persistence into a truth authority.**

The locked QCDS Fabric v1.0 canonical artifacts are unchanged.
