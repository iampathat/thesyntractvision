# Cally.One · ChatGPT Logical Robot

This directory is a **full snapshot/fork of `robots/cally_one`** taken so the
ChatGPT service path can evolve without changing the existing Cally.One robot.
The public/product name may change later; `cally_chatgpt` is the working package
identity.

## What this actually is

The calendar is a projection/UI over canonical Calendar Space state.  ChatGPT is
another projection and interaction surface around the same logical robot.

```text
Human conversation
      │
      ▼
ChatGPT / Apps SDK UI
      │
      ▼
Remote MCP tools  ───────────────┐
      │                          │
      ▼                          │
ChatGPT adapter / translator     │ external calendar adapters
      │                          │ Google / Graph / CalDAV / ICS / EWS / ...
      └──────────────┬───────────┘
                     ▼
              CALENDAR SPACE
          canonical represented state
      people · events · relations · dimensions
      time · resources · organizations · things
                     │
       only when logical resolution is requested
                     ▼
             QCDS / SyntractSystem
                     │
                     ▼
                  Syntract
                     │
              projections outward
                     ▼
       calendar UI / ChatGPT / APIs / files
```

## Non-negotiable boundary

ChatGPT does **not** contain a second inference engine.

The bridge may:

- read and write represented state;
- translate human requests into tool calls;
- expose Calendar Space to ChatGPT;
- render the calendar projection;
- synchronize external machine languages/APIs;
- preserve source provenance and translation fidelity.

The bridge may **not** decide a logical resolution itself.  The MCP tool
`resolve_with_qcds` delegates to the copied robot's existing
`CallyOneService.infer_placement`, which crosses the canonical
`SyntractSystem` / QCDS boundary.

## Human languages and machine languages

Both are representations around one canonical state model.

```text
Swedish / English / ...  → semantic translation ┐
                                               │
Google / Graph / CalDAV  → adapter translation ├→ Calendar Space
ICS / EWS / legacy APIs  → adapter translation ┘
```

No external API owns Cally's domain semantics.  If an external representation
cannot carry all Calendar Space meaning, translation loss must be explicit.

## Workspace isolation

The ChatGPT service is multi-workspace by design.  Each authenticated customer
or ChatGPT workspace resolves to its own store root.  Workspace identity must be
derived from authenticated app/MCP context in production and must never be a
model-controlled tool argument.

The current MCP bootstrap uses `CALLY_CHATGPT_WORKSPACE_ID` only for local and
developer-mode testing.  That resolver is the first thing to replace when OAuth
/account identity is wired.

## Files added specifically for the ChatGPT fork

- `chatgpt_bridge.py` — transport-neutral ChatGPT tool boundary and workspace router.
- `mcp_server.py` — remote Streamable HTTP MCP server entry point.
- `CHATGPT_ARCHITECTURE.md` — this contract.

Everything else began as the known-good Cally.One implementation so we can
continue product/UI work here without destabilising `robots/cally_one`.

## Next live milestones

1. Run the MCP endpoint remotely over HTTPS.
2. Replace the development workspace resolver with authenticated identity.
3. Package the calendar projection as an Apps SDK UI inside ChatGPT.
4. Add subscription/license state for organization workspaces while preserving
   free private/family use.
5. Connect real Google/Microsoft/CalDAV/ICS adapters to the machine-language
   state model.
6. Test through ChatGPT Developer Mode and prepare app-directory submission.
