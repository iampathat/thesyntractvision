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

1. Run the MCP endpoint remotely over HTTPS.
2. Replace the development workspace resolver with authenticated identity.
3. Package the calendar projection as the Apps SDK UI inside ChatGPT.
4. Add subscription/license state for organization workspaces while preserving
   free private/family use.
5. Connect real Google/Microsoft/CalDAV/ICS adapters to the machine-language
   state model.
6. Test through ChatGPT Developer Mode and prepare directory publication.
