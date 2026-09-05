# ChatGPT deployment path

The active development branch is `cally-chatgpt-work`.
The original `tribute` branch and `robots/cally_one` package remain untouched.

## Development bootstrap

Install the optional MCP runtime:

```bash
python -m pip install -e '.[chatgpt]'
```

Run the remote-style MCP endpoint:

```bash
CALLY_CHATGPT_WORKSPACE_ID=developer-preview \
CALLY_CHATGPT_STORE_ROOT=/tmp/cally-chatgpt \
qcds-cally-chatgpt
```

The MCP Python SDK's Streamable HTTP transport exposes the server endpoint for
an MCP client.  The current bootstrap is for development only.

## Production boundary

Before public use:

1. Deploy the MCP server behind HTTPS.
2. Derive workspace/customer identity from authenticated app context; remove
   the environment-only development resolver.
3. Persist each workspace in an isolated durable store.
4. Add authorization around every mutating tool.
5. Add subscription/license state at the workspace boundary, not inside QCDS.
6. Package the calendar projection as the ChatGPT Apps SDK UI.
7. Test the app in ChatGPT Developer Mode.
8. Prepare privacy policy, developer terms and app-directory submission.

## Architecture invariant

```text
ChatGPT / Apps SDK
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

ChatGPT is never an alternate resolver. `resolve_with_qcds` is the explicit
boundary into the existing QCDS path.
