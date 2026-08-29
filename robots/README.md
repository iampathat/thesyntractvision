# Specialized Logical Robots

`robots/` contains substantial domain-specific manifestations of the Logical Robot architecture.

These are **not separate intelligence cores**. They are bounded bodies/capability packages around the same QCDS / Syntract architecture.

```text
QCDS / Syntract Intelligence
        ↓
Logical Robot architecture
        ↓
robots/
├── legal/
│   ├── sweden_housing/
│   └── future_us_.../
├── medicine/
├── science/
└── ...
```

A domain robot may contain its own:

- declared or observed Logical Universe material;
- source corpus;
- case fixtures;
- praxis / precedent / evidence layers;
- domain-specific ingestion and projection code;
- benchmarks and falsification cases;
- documentation.

It must **not** contain a second QCDS implementation or silently redefine canonical QCDS semantics.

The first substantial domain robot is [`legal/sweden_housing/`](legal/sweden_housing/).
