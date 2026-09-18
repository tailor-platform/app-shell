import { describe, expect, it, vi } from "vitest";
import type { EnhancedAuthClient } from "../contexts/auth-context";
import { tailorMCP } from "./mcp";

function createAuthClient(
  handler: (request: {
    method: string;
    body: Record<string, unknown>;
    headers: Headers;
  }) => Response,
): EnhancedAuthClient {
  return {
    getAppUri: () => "https://app.example.com",
    fetch: vi.fn(async (_input, init) =>
      handler({
        method: init?.method ?? "GET",
        body: init?.body ? JSON.parse(String(init.body)) : {},
        headers: new Headers(init?.headers),
      }),
    ),
  } as unknown as EnhancedAuthClient;
}

describe("tailorMCP", () => {
  it("initializes a session and calls tools with authenticated fetch", async () => {
    const authClient = createAuthClient(({ method, body, headers }) => {
      if (method === "DELETE") {
        expect(headers.get("MCP-Session-Id")).toBe("session-1");
        return new Response(null, { status: 204 });
      }

      if (body.method === "initialize") {
        expect(headers.get("MCP-Protocol-Version")).toBeNull();
        return jsonResponse(
          { jsonrpc: "2.0", id: body.id, result: { protocolVersion: "2025-03-26" } },
          { "MCP-Session-Id": "session-1" },
        );
      }

      expect(headers.get("MCP-Protocol-Version")).toBe("2025-03-26");
      expect(headers.get("MCP-Session-Id")).toBe("session-1");

      if (body.method === "notifications/initialized") {
        return new Response(null, { status: 202 });
      }

      if (body.method === "tools/list") {
        return jsonResponse({
          jsonrpc: "2.0",
          id: body.id,
          result: {
            tools: [
              {
                name: "query",
                description: "Run a read-only query",
                inputSchema: { type: "object", properties: { query: { type: "string" } } },
              },
            ],
          },
        });
      }

      if (body.method === "tools/call") {
        expect(body.params).toEqual({ name: "query", arguments: { query: "query { me { id } }" } });
        return jsonResponse({
          jsonrpc: "2.0",
          id: body.id,
          result: { content: [{ type: "text", text: '{"id":"user-1"}' }] },
        });
      }

      throw new Error(`Unexpected MCP request: ${String(body.method)}`);
    });
    const connection = await tailorMCP({ authClient }).connect({
      signal: new AbortController().signal,
    });

    await expect(connection.listTools({ signal: new AbortController().signal })).resolves.toEqual([
      {
        name: "query",
        description: "Run a read-only query",
        inputSchema: { type: "object", properties: { query: { type: "string" } } },
      },
    ]);
    await expect(
      connection.callTool({
        name: "query",
        arguments: { query: "query { me { id } }" },
        signal: new AbortController().signal,
      }),
    ).resolves.toEqual({ content: [{ type: "text", text: '{"id":"user-1"}' }] });

    await connection.close();
    expect(authClient.fetch).toHaveBeenCalledTimes(5);
  });

  it("reads JSON-RPC results from streamable HTTP SSE responses", async () => {
    const authClient = createAuthClient(({ body }) => {
      if (body.method === "initialize") {
        return jsonResponse({ jsonrpc: "2.0", id: body.id, result: {} });
      }

      if (body.method === "notifications/initialized") {
        return new Response(null, { status: 202 });
      }

      return new Response(
        `event: message\ndata: {"jsonrpc":"2.0","id":${body.id},"result":{"tools":[]}}\n\n`,
        { status: 200, headers: { "Content-Type": "text/event-stream" } },
      );
    });
    const connection = await tailorMCP({ authClient }).connect({
      signal: new AbortController().signal,
    });

    await expect(connection.listTools({ signal: new AbortController().signal })).resolves.toEqual(
      [],
    );
  });
});

function jsonResponse(body: unknown, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json", ...headers },
  });
}
