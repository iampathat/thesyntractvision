# ChatGPT deployment path

The active development branch is `cally-chatgpt-work`.
The original `tribute` branch and `robots/cally_one` package remain untouched.

## Development bootstrap

Install the optional MCP runtime:

```bash
python -m pip install -e '.[chatgpt]'
```

Run the MCP endpoint:

```bash
CALLY_CHATGPT_WORKSPACE_ID=developer-preview \
CALLY_CHATGPT_STORE_ROOT=/tmp/cally-chatgpt \
qcds-cally-chatgpt
```

The current bootstrap is for development only.

## Production technical boundary

Before any real multi-user deployment:

1. Run the MCP server behind an authenticated transport.
2. Derive workspace identity from authenticated application/session context; remove the environment-only development resolver.
3. Persist each workspace in an isolated durable store.
4. Add authorization around every mutating tool.
5. Keep credentials, provider tokens and connection IDs outside source control.
6. Test the five-port contract end-to-end in the target client.

## Architecture invariant

```text
ChatGPT / client
       │
       ▼
      MCP
       │
       ▼
chatgpt_bridge.py
       │
       ▼
 Calendar Space
       │
       ▼  only for explicit logical resolution
 QCDS / SyntractSystem
       │
       ▼
    Syntract
```

ChatGPT is never an alternate resolver. `resolve_with_qcds` is the explicit boundary into the existing QCDS path.
