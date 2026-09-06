# Connect Cally to ChatGPT during development

This is a technical development runbook for connecting the Cally MCP surface to ChatGPT. Product names and menus can change; verify current OpenAI developer documentation before use.

## Layer map

```text
ChatGPT
  -> Cally plugin / skill
  -> MCP transport
  -> Cally MCP: READ | WRITE | QUERY | PROJECT | RESOLVE
  -> RESOLVE only
  -> HostedQCDSRuntime
  -> SyntractSystem
  -> QCDS
  -> Syntract
```

The runtime boundary is host-neutral. Changing transport or execution environment must not change QCDS semantics or create another inference engine.

## A. Start the Cally MCP server

From the repository checkout:

```bash
python -m pip install -e '.[chatgpt]'
python -m qcds_fabric.robots.cally_chatgpt.mcp_server
```

The current development endpoint is:

```text
http://127.0.0.1:8000/mcp
```

It exposes exactly five public tools:

```text
read
write
query
project
resolve
```

`resolve` is routed to the shared `HostedQCDSRuntime`; the other four verbs do not cross the inference boundary.

Optional direct inspection:

```bash
npx @modelcontextprotocol/inspector@latest
```

Choose Streamable HTTP and connect to `http://127.0.0.1:8000/mcp`.

## B. Optional development tunnel

If the current OpenAI developer environment supports a secure MCP tunnel, it can be used to expose the local MCP endpoint for private testing without changing the Cally/QCDS architecture.

Keep tunnel credentials out of the repository. Treat tunnel IDs, API keys and connection IDs as environment-specific values, never source constants.

## C. Developer-mode connection

When supported by the target ChatGPT workspace, create an MCP connection to the running Cally endpoint or development tunnel and inspect the five discovered tools, including titles, descriptions, schemas and safety annotations.

Do not invent registered connection IDs or commit placeholders as though they were live values.

## D. Boundary test

Test these operations:

1. **READ** — read represented Calendar Space.
2. **WRITE** — add or change represented state.
3. **QUERY** — select represented state without ranking a best answer.
4. **PROJECT** — return a calendar projection without changing canonical state.
5. **RESOLVE** — resolve an explicit logical problem through QCDS/Syntract.

Verify that the first four operations do not claim to perform logical inference. Verify that `resolve` contains QCDS/Syntract provenance and does not fall back to a second decision engine.
