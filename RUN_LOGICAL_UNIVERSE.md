# Run a Logical Universe MVP

`qcds-universe` is a deliberately thin executable layer above the existing QCDS/Syntract implementation.

It does **not** contain a second inference engine and does not modify the QCDS Fabric core, oracle core, rotation/nulling code or canonical specification. The runner composes the already implemented Logical Space, Logical Universe, global-rule governance and non-materialized resolver APIs.

## Run the included lawbook example

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e '.[test]'

qcds-universe examples/logical_universe_lawbook_mvp.json \
  --store ./intelligence_store
```

The JSON output reports:

- universe identity and mode;
- number of explicit base bindings;
- active governed rules;
- drift/blast-radius outcome for candidate rules;
- `syntractfilter_results`, the resolved non-materialized view selected by each query;
- the persistent universe directory;
- an explicit MVP boundary stating that the overlay does not modify the QCDS core or canonical specification.

## What the example proves

The included declared lawbook has three base bindings:

```text
alice = human
bob   = human
fido  = dog
```

It proposes the constitutive rule:

```text
human => legal_person
```

Because that rule changes most of the tiny universe it is visible to drift governance. The example explicitly authorizes the blast-radius override using the declared universe authority. The resolved view then returns Alice and Bob as `legal_person` without writing `legal_person` into either base binding.

Running the same spec again is idempotent: seed bindings are deduplicated and an identical already-active rule is reused.

## Spec shape

```json
{
  "universe": {
    "universe_id": "example",
    "mode": "declared",
    "authority": "example-authority"
  },
  "seed_bindings": [
    {
      "binding_id": "x-human",
      "terms": ["x", "human"],
      "source_id": "seed"
    }
  ],
  "rules": [
    {
      "candidate_id": "candidate-1",
      "rule_id": "rule-1",
      "match_terms": ["human"],
      "emit_terms": ["legal_person"],
      "source_id": "law:1",
      "promote": true,
      "approval_source": "example-authority",
      "override_blast": true
    }
  ],
  "queries": [
    {"query_id": "q1", "terms": ["legal_person"]}
  ]
}
```

For an `observed` universe such as `reality`, rule promotion remains subject to the existing challenge requirement. A candidate can also be supplied with `"promote": false` to measure its logical blast radius without activating it.

## Syntractfilter boundary in this MVP

The name `syntractfilter_results` describes the externally visible filtered/resolved view of this runner. BUILD 20 does not duplicate the QCDS four-phase core. It uses existing non-materialized rule resolution as a small executable surface above the deeper architecture.

Future MVP runners may expose progressively more of the existing QCDS Fabric — Conditions, oracle stacks, nulling, rotations, stabilization, recursive inference and Syntract Binding — through the same outer spec boundary. Those additions should remain adapters/orchestrators rather than alternate kernels.

## Template

Use [`LOGICAL_UNIVERSE_TEMPLATE.md`](LOGICAL_UNIVERSE_TEMPLATE.md) when designing a new universe. The Markdown template remains explanatory and empty; the runnable JSON spec is intentionally a smaller execution surface.
