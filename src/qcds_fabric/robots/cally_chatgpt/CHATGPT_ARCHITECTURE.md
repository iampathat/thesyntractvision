# Cally.One · ChatGPT Logical Robot

This directory is a **full snapshot/fork of `robots/cally_one`** so the ChatGPT
service path can evolve without changing the existing Cally.One robot. The
public/product name may change later; `cally_chatgpt` is the working package
identity.

## What this actually is

The calendar is a projection/UI over canonical Calendar Space state. ChatGPT is
another interaction/projection surface around the same logical robot.

```text
Human conversation
      │
      ▼
ChatGPT / Apps SDK UI
      │
      ▼
READ · WRITE · QUERY · PROJECT · RESOLVE
      │
      ▼
CALENDAR SPACE  ◀──────── machine/API language adapters
canonical represented state   Google / Graph / CalDAV / ICS / EWS / ...
      │
      ├── PROJECT ────────────→ calendar UI / ChatGPT / APIs / files
      │
      └── RESOLVE only
             │
             ▼
       QCDS / SyntractSystem
             │
             ▼
          Syntract
```

## The five-port contract

The public Logical Robot Interface is intentionally small:

- **READ** — read represented canonical state.
- **WRITE** — represent an authorized state change.
- **QUERY** — deterministically select represented state.
- **PROJECT** — show the same state through a chosen projection.
- **RESOLVE** — the only port that may cross into QCDS/Syntract inference.

The first four ports are never allowed to become hidden decision engines.
`QUERY` may filter/select; it may not score a best answer. `PROJECT` may change
presentation; it may not change canonical truth. `WRITE` changes represented
state but does not decide a logical resolution.

The canonical implementation lives in `interface.py`. The same five verbs are
exposed by `mcp_server.py` to ChatGPT.

## Non-negotiable boundary

ChatGPT does **not** contain a second inference engine.

The bridge may translate requests, read/write/query state, project the state,
synchronize machine languages/APIs, and preserve provenance/fidelity. When a
logical resolution is requested, `RESOLVE` delegates to the copied robot's
existing `CallyOneService.infer_placement`, crossing the canonical
`SyntractSystem` / QCDS boundary.

```text
READ / WRITE / QUERY / PROJECT  = no inference
RESOLVE                         = QCDS -> Syntract
```

## Target operating model

The desired end state is **OpenAI-first and operations-minimal** for the author.

The target is not a conventional self-operated SaaS business where the author
must host and administer a large application stack or sell many small end-user
subscriptions. Instead, the preferred model is:

```text
OpenAI / ChatGPT
  hosts or operates the QCDS production runtime
  under a separate written license and attribution agreement
        │
        ▼
Logical Robot Interface
READ · WRITE · QUERY · PROJECT · RESOLVE
        │
        ▼
QCDS / SyntractSystem
QCDS by Patrik Sundblom / The Syntract Vision
        │
        ▼
Logical Robots
Cally · Legal · Robotics · Operations · future robots
```

The intended commercial relationship is a platform / technology-license model,
not primarily a per-end-user subscription model:

- Patrik Sundblom retains QCDS authorship and IP rights subject to already
  published licenses.
- OpenAI may host and use a defined QCDS production runtime only under a
  separate written agreement.
- QCDS attribution / credit remains explicit.
- Commercial compensation can be defined separately (for example licensing,
  revenue share, royalty, compute credit or another mutually agreed structure).
- Logical Robots may use the hosted QCDS runtime through the same small interface.
- The architecture must remain portable so the QCDS runtime can move between
  hosting environments without redesigning the robots.

This is a **target operating and commercial model**, not a claim that OpenAI has
accepted or currently offers such an agreement or hosting arrangement.

## Human languages and machine languages

Both are representations around one canonical state model.

```text
Swedish / English / ...  → semantic translation ┐
                                               │
Google / Graph / CalDAV  → adapter translation ├→ Calendar Space
ICS / EWS / legacy APIs  → adapter translation ┘
```

No external API owns Cally's domain semantics. If an external representation
cannot carry all Calendar Space meaning, translation loss must be explicit.

## Workspace isolation

The ChatGPT service is multi-workspace by design. Each authenticated customer
or ChatGPT workspace resolves to its own store root. Workspace identity must be
derived from authenticated app/MCP context in production and must never be a
model-controlled tool argument.

The current MCP bootstrap uses `CALLY_CHATGPT_WORKSPACE_ID` only for local and
developer-mode testing. That resolver is replaced when OAuth/account identity
is wired.

## Calendar projection preview

`chatgpt_projection.py` builds a separate public preview from this package. It
adds a visible interface inspector to the copied calendar GUI and exposes the
same five-port browser contract at `window.__callyChatGPT`.

The Pages publication path is separate from the old Cally surface:

```text
/cally/          -> existing Cally.One
/cally-chatgpt/  -> this ChatGPT logical robot projection
```

The ChatGPT preview's worker is explicitly patched at build time to import
`qcds_fabric.robots.cally_chatgpt.runtime_v3`, never the old `cally_one`
runtime.

## Files specific to the ChatGPT fork

- `chatgpt_bridge.py` — workspace-bound low-level adapter to the copied robot.
- `interface.py` — canonical five-port Logical Robot Interface.
- `mcp_server.py` — five-port Streamable HTTP MCP endpoint.
- `chatgpt_interface.js` / `.css` — visible calendar projection interface.
- `chatgpt_projection.py` — public/static ChatGPT calendar projection builder.
- `CHATGPT_ARCHITECTURE.md` — this contract.

Everything else began as the known-good Cally.One implementation so work can
continue here without destabilising `robots/cally_one`.

## Next live milestones

1. Keep the QCDS runtime host-neutral and deployable over HTTPS/MCP while OpenAI-hosted runtime is not available.
2. Replace the development workspace resolver with authenticated identity.
3. Package the calendar projection as the Apps SDK UI inside ChatGPT.
4. Prepare a concise hosted-QCDS technology-license / attribution proposal for OpenAI.
5. Connect real Google/Microsoft/CalDAV/ICS adapters to the machine-language state model.
6. Test through ChatGPT Developer Mode and prepare directory publication.
7. Keep Cally as the first Logical Robot while preserving the same interface for additional robots.
