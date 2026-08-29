# Start Here

You do **not** need to understand the whole QCDS architecture before you can use or extend this repository.

The shortest useful mental model is:

```text
something is uncertain
        ↓
Logical Robot represents the problem
        ↓
QCDS Core evaluates the represented logical space
        ↓
Syntract / result comes back
        ↓
you can inspect, challenge or extend it
```

The browser, API, sensor, simulation or robot body is **not** the intelligence. It is a way to communicate with the Logical Robot. Fundamental inference stays in the QCDS core.

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

### 3. I want to change something

Start with the smallest executable example:

```bash
python examples/hello_logical_space.py
```

Then open `examples/hello_logical_space.py` and change:

- the Logical Space observations;
- the unresolved question;
- the candidate values;
- the explicit evidence.

Run it again.

That is the fastest way to see the architecture from code rather than documentation.

---

## What should I build first?

You normally **should not start by changing the QCDS core**.

Choose something around it:

| If you like... | Start here | First useful contribution |
|---|---|---|
| Front-end / visualization | `src/qcds_fabric/living_robot_session.py` | Make Logical Space changes easier to see |
| APIs / integrations | `src/qcds_fabric/logical_robot_control.py` | Add a bounded observation body |
| Science / research | `DOMAIN_LABS.md` | Create a falsifiable domain lab |
| Logic / verification | `tests/` + oracle modules | Add a falsifier or contradiction case |
| Distributed systems | `LIVING_SWARM_LOGICAL_ROBOTS.md` | Experiment with bounded peer verification |
| Quantum / substrate work | `GROVER_DEPTH.md` + Fabric modules | Test substrate parity or execution semantics |
| Robotics / sensors | Logical Robot body boundary | Add a source-attributed sensor adapter |

A contribution is valuable when it makes something **observable, falsifiable or reusable**.

---

## The one boundary to remember

```text
QCDS / Fabric Core
        ↑
Logical Space / Universes / governed logic
        ↑
Logical Robot
        ↑
web / APIs / simulations / sensors / robot bodies
```

Build upward first.

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

Small, inspectable experiments are preferred to giant opaque demos.

---

## Where to go next

- **Build something:** [`BUILD_WITH_THE_LOGICAL_ROBOT.md`](BUILD_WITH_THE_LOGICAL_ROBOT.md)
- **Contribute:** [`CONTRIBUTING.md`](CONTRIBUTING.md)
- **Logical Spaces:** [`LOGICAL_SPACE.md`](LOGICAL_SPACE.md)
- **Logical Universes:** [`LOGICAL_UNIVERSES.md`](LOGICAL_UNIVERSES.md)
- **Living Logical Robot:** [`LIVING_LOGICAL_ROBOT.md`](LIVING_LOGICAL_ROBOT.md)
- **Canonical QCDS specification:** [`QCDS_FABRIC_SPEC_v1.0_CANONICAL.md`](QCDS_FABRIC_SPEC_v1.0_CANONICAL.md)

If you are unsure where you fit, build one tiny Logical Space first. The architecture becomes much easier once you have watched one concrete problem pass through it.
