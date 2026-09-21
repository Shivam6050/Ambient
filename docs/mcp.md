# Ambient MCP + Alexa+

Ambient v0.9 exposes Ambient's orchestration capabilities through a real MCP server using Streamable HTTP.

## Endpoint

Local development:

`http://127.0.0.1:5100/mcp`

The server exposes:

- `ambient_evaluate_event`
- `ambient_get_context`
- `ambient_set_context`
- `ambient_get_waiting_events`
- `ambient_get_decision_history`
- `ambient_get_action_capabilities`

The MCP layer does not replace Jev, policy, or the confidence gate. It exposes the existing orchestration engine as tools.

## Alexa+

Current Amazon documentation requires an Alexa+ MCP server to use Streamable HTTP and be reachable from a remote URL. The Alexa AI CLI can onboard an MCP server, deploy an add-on, and then test it in the Alexa+ web simulator. During local development, expose the MCP endpoint through a secure HTTPS tunnel.

Typical flow:

1. Start Ambient backend.
2. Start Ambient MCP server.
3. Expose port 5100 through a secure tunnel.
4. Run `alexa-ai configure`.
5. Use the Alexa AI CLI to create an MCP add-on from the public MCP URL.
6. Deploy to the development stage.
7. Test the add-on in the Alexa+ web simulator.
8. Put the returned add-on ID in `ALEXA_PLUS_ADDON_ID`.

Ambient keeps the existing simulator as a zero-credential fallback. It does not claim that a live Alexa+ add-on is active until the Amazon deployment has actually been completed.

## MCP inspection

Use the official MCP Inspector against the `/mcp` endpoint and verify `tools/list`, then call each tool with demo data.

## Security

Do not expose the local MCP endpoint publicly without authentication or a secure development tunnel. For production Alexa+ onboarding, add the authentication required by the Alexa+ integration before deployment.
