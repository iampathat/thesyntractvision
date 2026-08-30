# Start Here

You do **not** need to understand the whole QCDS architecture before you can use or extend this repository.

The shortest useful mental model is:

```text
question / material / uncertainty
        ↓
Logical Space + translated oracle logic
        ↓
QCDS Core / Fabric
        ↓
TruthDistribution
        ↓
Syntract
        ↓
gap / evidence / Logical Robot / swarm / re-entry when needed
        ↺
```

The browser, API, sensor, simulation or robot body is **not** the intelligence. It is a way to communicate with the same QCDS / Syntract system. Fundamental inference stays in the QCDS core.

For new Python integrations, the recommended composition boundary is now one object:

```python
from qcds_fabric import SyntractSystem

system = SyntractSystem()
```

`SyntractSystem` does not replace or reinterpret QCDS. It delegates to the existing problem-to-Syntract path, persistent runtime, Central QCDS Fabric, swarm re-entry and Logical Robot evidence loop. The historical BUILD modules remain implementation history and lower-level APIs; new integrations do not need to assemble them manually.

---

## Pick one door

### 1. I just want to try it

Open the public browser sandbox:

**https://iampathat.github.io/thesyntractvision/**

Create a small Logical Space, add a probe and run the QCDS core.

The public sandbox is intentionally temporary:

- no account;
- no database;
- no cookie;
- session-only browser state;
- Reality effect = 0;
- the QCDS Python core runs through WebAssembly/Pyodide rather than being rewritten in JavaScript.

Close the tab and the sandbox session disappears.

### 2. I want to run the real local Logical Robot

```bash
git clone https://github.com/iampathat/thesyntractvision.git
cd thesyntractvision
python -m pip install -e '.[test]'
qcds-live --store ./intelligence_store --frontier examples/continuous_reality_growth_mvp.json
```

Then open:

```text
http://127.0.0.1:8765/
```

Or use the **Open in GitHub Codespaces** button in the README and skip local setup.

### 3. I want to build with the architecture

Start from the unified boundary:

```python
from qcds_fabric import SyntractSystem

system = SyntractSystem()
```

The same object can then:

- run a structured problem or semantic adapter through QCDS to a Syntract;
- expose the resulting Oracle Space;
- mount and execute spaces centrally in parallel, sequential or hybrid topology;
- let QCDS uncertainty create bounded swarm frontier work;
- return swarm oracle manifestations through the same QCDS Fabric;
- create a persistent mission with `system.mission(store)`;
- run genesis/evidence planning and Logical Robot observation through that same mission boundary.

For the smallest lower-level executable example you can still run:

```bash
python examples/hello_logical_space.py
```

---

## What should I build first?

You normally **should not start by changing the QCDS core**.

Choose something around the unified system boundary:

| If you like... | Start here | First useful contribution |
|---|---|---|
| System integration | `src/qcds_fabric/syntract_system.py` | Connect another existing QCDS capability without duplicating inference |
| Front-end / visualization | `src/qcds_fabric/living_robot_session.py` | Make Logical Space changes easier to see |
| APIs / integrations | `src/qcds_fabric/logical_robot_control.py` | Add a bounded observation body |
| Science / research | `DOMAIN_LABS.md` | Create a falsifiable domain lab |
| Logic / verification | `tests/` + oracle modules | Add a falsifier or contradiction case |
| Distributed systems | `src/qcds_fabric/central_fabric.py` + `swarm_intelligence.py` | Extend execution capacity while preserving universe identity |
| Quantum / substrate work | `GROVER_DEPTH.md` + Fabric modules | Test substrate parity or execution semantics |
| Robotics / sensors | Logical Robot body boundary | Add a source-attributed sensor adapter |

A contribution is valuable when it makes something **observable, falsifiable or reusable**.

---

## The one boundary to remember

```text
question / material
      ↓
translator / semantic adapter
      ↓
Logical Space + oracle logic
      ↓
QCDS / Fabric Core
      ↓
TruthDistribution → Syntract
      ↓
Logical Robot / swarm / evidence / re-entry
      ↺
```

The outer components can change. The QCDS inference semantics do not move into them.

Do not duplicate QCDS inference in a UI layer just because the UI is easier to modify.

Do not treat retrieved text, user input or a sensor reading as truth merely because it entered the system.

Do not install a solution rule merely to make a demo succeed.

---

## A good first experiment

Pick a domain you understand and make this tiny loop:

```text
START
  3–10 observations
  1 unresolved question
  2–5 candidate answers
  0 supplied solution rules

RUN
  QCDS evaluates the represented problem

CHECK
  What remained uncertain?
  What changed?
  What evidence mattered?
  What would falsify the current result?
```

Small, inspectable experiments are still useful, but they now plug into the same `SyntractSystem` rather than defining another architecture.

---

## Where to go next

- **Unified system boundary:** `src/qcds_fabric/syntract_system.py`
- **Build something:** [`BUILD_WITH_THE_LOGICAL_ROBOT.md`](BUILD_WITH_THE_LOGICAL_ROBOT.md)
- **Contribute:** [`CONTRIBUTING.md`](CONTRIBUTING.md)
- **Logical Spaces:** [`LOGICAL_SPACE.md`](LOGICAL_SPACE.md)
- **Logical Universes:** [`LOGICAL_UNIVERSES.md`](LOGICAL_UNIVERSES.md)
- **Living Logical Robot:** [`LIVING_LOGICAL_ROBOT.md`](LIVING_LOGICAL_ROBOT.md)
- **Canonical QCDS specification:** [`QCDS_FABRIC_SPEC_v1.0_CANONICAL.md`](QCDS_FABRIC_SPEC_v1.0_CANONICAL.md)

The BUILD files remain useful for provenance and engineering history. They are no longer the mental model you need in order to use the system.
