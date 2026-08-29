# The Logical Robot — live

The web page is not a separate intelligence. It is the same **Logical Robot** manifested as a local web body: a live view, an event surface and human↔robot I/O around the existing QCDS / Syntract / Reality runtime.

```text
QCDS / Syntract / Reality intelligence
               │
         Logical Robot
          /          \
   public web       web page
   observation      manifestation + I/O
          \          /
            event stream
```

Removing the page does not remove or change the intelligence. The UI has no authority to promote rules, declare truth or bypass Reality governance.

## 1. Install

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e '.[test]'
```

## 2. Watch the Logical Robot

```bash
qcds-observe --store ./intelligence_store
```

This opens a local Observatory at `http://127.0.0.1:8765/` by default. It shows the persistent Reality counts and the live discovery timeline. Human input is written transparently to `logical_robot_inbox.jsonl`.

Useful I/O commands when a BUILD 25 growth runtime is running against the same store:

```text
/status
/run <mission_id>
/pause
/stop
```

Ordinary free text is preserved as human input with **zero automatic truth effect**. A later semantic-ingress layer may compile it into explicit Conditions/evidence, but the Observatory itself never does that.

## 3. Let the robot acquire public evidence

```bash
qcds-reality-web \
  examples/public_web_reality_capital_mvp.json \
  --store ./intelligence_store
```

BUILD 24 uses the existing read-only public-web body to satisfy the target-blind current/contrast evidence requests created by BUILD 22. The robot can search/read public pages, but the resulting text remains evidence rather than automatic truth.

Current reference public-web implementation uses key-free Wikipedia search plus bounded HTTP reads. Distinct page references satisfy the current document-level source-ID gate; this is **not** a claim of publisher/institutional independence.

The live event stream records:

```text
oracle gap
→ rival hypotheses
→ target-blind contrast context
→ public observations
→ generated selection/holdout challenge
→ falsification
→ Reality governance
→ promoted / quarantined / unresolved
→ knowledge change
```

Run `qcds-observe` in another terminal against the same `--store` to watch this happen.

## 4. Continuous Reality growth

```bash
qcds-reality-grow \
  examples/continuous_reality_growth_mvp.json \
  --store ./intelligence_store
```

BUILD 25 receives a **represented unresolved frontier**, re-scores it after every cycle, and selects the next oracle gap by epistemic pressure rather than JSON order. It then delegates the selected mission to BUILD 24 → BUILD 22 → BUILD 21 → BUILD 19.

The continuous runner is intentionally bounded:

- it cannot invent an unrepresented mission;
- `max_cycles` is mandatory policy;
- conflicts can stop the loop;
- quarantined rules remain inactive;
- public observations do not bypass challenge;
- human text does not directly write truth;
- the Reality space and governed rules remain the persistent intelligence substrate.

This is a bounded continuous intelligence loop, not a claim of unconstrained AGI/ASI autonomy.

## Build on it

The project is deliberately layered so contributors can add capabilities without rewriting QCDS Fabric:

```text
QCDS / Fabric core                     stable
        ↑
Reality / Logical Space / governance   stable interfaces
        ↑
BUILD 21–22 discovery loop             intelligence-growth overlays
        ↑
BUILD 24 observation bodies            add web/API/sensor sources here
        ↑
BUILD 25 growth policies               add bounded frontier policies here
        ↑
BUILD 23 manifestations                web/TUI/robot display/other I/O bodies
```

Good contribution targets include new read-only observation bodies, stronger evidence independence checks, new falsification benchmarks, physical sensor adapters, alternative manifestations, quantum/substrate compilers, and new Logical Universe templates.

Do **not** put use-case-specific intelligence into the QCDS core merely to make a demo work. Overlays should call public interfaces and remain removable.

## What the current live stack demonstrates

The live stack can now expose a complete bounded path:

```text
I don't know
→ identify competing logical possibilities
→ determine what observation would discriminate them
→ Logical Robot acquires evidence
→ reject conflict / insufficient evidence
→ challenge rival logic
→ govern blast radius
→ expand persistent Reality if the rule survives
→ select the next represented uncertainty
→ repeat
```

The Python/web implementation demonstrates the architecture and semantics. It does not by itself establish quantum advantage, AGI or ASI.
