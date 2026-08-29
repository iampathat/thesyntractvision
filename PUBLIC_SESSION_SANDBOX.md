# Public Session Sandbox — BUILD 35

BUILD 35 turns the public GitHub Pages manifestation into an **ephemeral Logical Space sandbox** without creating a second QCDS implementation.

## Architecture

```text
GitHub Pages / browser tab
        |
        |  temporary room + explicit probe
        v
Logical Robot UI
        |
        |  message boundary
        v
QCDS Core
  qcds_fabric.problem.problem_to_syntract
        |
        v
Truth distribution / Syntract result
        |
        v
Logical Robot UI
```

On the public GitHub Pages site, the existing Python `qcds_fabric` package is packaged unchanged and executed by Pyodide/WebAssembly inside a Web Worker. WebAssembly is only an execution substrate. The browser does **not** contain a JavaScript rewrite of Condition Formation, Conditional Evolution, Recursive Inference, Truth-Alignment, or the problem-to-Syntract path.

When `qcds-live` runs locally, the same Logical Robot UI sends the same session request to `/api/session/run`, which invokes the same Python core directly.

## Session only

The public sandbox deliberately uses `sessionStorage` only.

- no user database
- no account
- no cookie
- no `localStorage`
- no IndexedDB
- no persistent server state
- closing the browser tab ends the sandbox session

The browser owns the temporary room. A core run is a request/response operation and has `truth_effect_on_reality = 0`.

## Semantic boundary

A generic Logical Space binding is not silently converted into semantic evidence.

The builder can contain open bindings such as:

```text
cell-001 | temperature-high | capacity-low
cell-002 | temperature-low  | capacity-high
```

Those bindings remain generic Logical Space context.

To ask the QCDS core a bounded question, the user supplies an explicit probe:

```text
subject:    cell-001
predicate:  capacity
candidates: low | high
```

Optional explicit evidence uses:

```text
subject | predicate | value | confidence
cell-001 | capacity | low | 0.95
```

Only this explicit semantic evidence enters the existing `SemanticProblemFrame` / `problem_to_syntract` path. BUILD 35 does not infer a relation taxonomy from generic co-occurrence.

## Truth boundary

The existing BUILD 34 boundaries remain intact:

- zero supplied solution rules
- isolated custom Logical Space identity
- no automatic write into observed Reality
- no external truth claim from a sandbox result
- canonical QCDS Fabric specification unchanged

## Public deployment artifact

The Pages workflow exports:

```text
_site/index.html
_site/session_core_worker.js
_site/qcds_fabric.zip
```

`qcds_fabric.zip` is built directly from `src/qcds_fabric/*.py` on the same commit being deployed. This keeps the browser core and repository core on one source line rather than maintaining a second implementation.

## Local runtime

```bash
python -m pip install -e '.[test]'
qcds-live --store ./intelligence_store
```

Then open:

```text
http://127.0.0.1:8765/
```

The local session sandbox uses the Python core directly. Persistent Logical Robot features remain available separately; the BUILD 35 session probe itself does not persist its room or result.
