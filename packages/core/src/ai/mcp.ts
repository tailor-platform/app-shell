import type { EnhancedAuthClient } from "../contexts/auth-context";

const MCP_PROTOCOL_VERSION = "2025-03-26";

/** A remote MCP server that can supply tools to an AI chat. */
export interface AIChatMCPServer {
  connect(options: { signal: AbortSignal }): Promise<AIChatMCPConnection>;
}

/** A single MCP session, owned by one `useAIChat()` request. */
export interface AIChatMCPConnection {
  listTools(options: { signal: AbortSignal }): Promise<AIChatMCPTool[]>;
  callTool(options: {
    name: string;
    arguments: Record<string, unknown>;
    signal: AbortSignal;
  }): Promise<AIChatMCPToolResult>;
  close(): Promise<void> | void;
}

/** The subset of an MCP tool definition needed by `useAIChat()`. */
export interface AIChatMCPTool {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
}

/** The subset of an MCP tool result fed back to the model. */
export interface AIChatMCPToolResult {
  content: unknown;
  structuredContent?: unknown;
  isError?: boolean;
}

/** Binds an MCP server to one chat and limits the tools exposed to its model. */
export interface AIChatMCPServerConfig {
  server: AIChatMCPServer;
  allowedTools: readonly string[];
}

/** Options for Tailor Platform's application-scoped remote MCP server. */
export interface TailorMCPOptions {
  /** AppShell auth client used for authenticated MCP requests. */
  authClient: EnhancedAuthClient;
}

/**
 * Creates an MCP server descriptor for the current Tailor Platform application.
 *
 * The session itself is opened only when `useAIChat()` sends a message. This
 * keeps the MCP session scoped to the chat request that owns it.
 */
export function tailorMCP(options: TailorMCPOptions): AIChatMCPServer {
  const url = new URL("/mcp", options.authClient.getAppUri()).toString();

  return {
    connect: async ({ signal }) => {
      const connection = new TailorMCPConnection(url, options.authClient.fetch);
      await connection.initialize(signal);
      return connection;
    },
  };
}

class TailorMCPConnection implements AIChatMCPConnection {
  private nextRequestId = 1;
  private sessionId: string | undefined;
  private protocolVersion = MCP_PROTOCOL_VERSION;
  private closed = false;

  constructor(
    private readonly url: string,
    private readonly fetch: typeof globalThis.fetch,
  ) {}

  async initialize(signal: AbortSignal): Promise<void> {
    const result = await this.request(
      "initialize",
      {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: {
          name: "tailor-app-shell",
          version: "1",
        },
      },
      signal,
      false,
    );

    if (isRecord(result) && typeof result.protocolVersion === "string") {
      this.protocolVersion = result.protocolVersion;
    }

    await this.notify("notifications/initialized", {}, signal);
  }

  async listTools({ signal }: { signal: AbortSignal }): Promise<AIChatMCPTool[]> {
    const result = await this.request("tools/list", {}, signal);
    const tools = isRecord(result) ? result.tools : undefined;

    if (!Array.isArray(tools)) {
      throw new Error("Tailor MCP returned an invalid tools/list response.");
    }

    return tools.map(toMCPTool);
  }

  async callTool({
    name,
    arguments: args,
    signal,
  }: {
    name: string;
    arguments: Record<string, unknown>;
    signal: AbortSignal;
  }): Promise<AIChatMCPToolResult> {
    const result = await this.request("tools/call", { name, arguments: args }, signal);

    if (!isRecord(result) || !("content" in result)) {
      throw new Error("Tailor MCP returned an invalid tools/call response.");
    }

    return {
      content: result.content,
      ...("structuredContent" in result ? { structuredContent: result.structuredContent } : {}),
      ...(result.isError === true ? { isError: true } : {}),
    };
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    if (!this.sessionId) return;

    try {
      await this.fetch(this.url, {
        method: "DELETE",
        headers: this.headers(),
      });
    } catch {
      // Closing is best effort; the MCP server may not support DELETE.
    }
  }

  private async request(
    method: string,
    params: Record<string, unknown>,
    signal: AbortSignal,
    includeProtocolVersion = true,
  ): Promise<unknown> {
    if (this.closed) {
      throw new Error("Tailor MCP connection is closed.");
    }

    const id = this.nextRequestId++;
    const response = await this.fetch(this.url, {
      method: "POST",
      signal,
      headers: this.headers(includeProtocolVersion),
      body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
    });

    const sessionId = response.headers.get("MCP-Session-Id");
    if (sessionId) {
      this.sessionId = sessionId;
    }

    const payload = await readMCPResponse(response, id);

    if (!response.ok) {
      throw new Error(
        `Tailor MCP request failed (${response.status}): ${getErrorMessage(payload)}`,
      );
    }

    if (!isRecord(payload)) {
      throw new Error("Tailor MCP returned an invalid JSON-RPC response.");
    }

    if ("error" in payload) {
      throw new Error(`Tailor MCP error: ${getErrorMessage(payload.error)}`);
    }

    if (!("result" in payload)) {
      throw new Error("Tailor MCP response did not include a result.");
    }

    return payload.result;
  }

  private async notify(
    method: string,
    params: Record<string, unknown>,
    signal: AbortSignal,
  ): Promise<void> {
    const response = await this.fetch(this.url, {
      method: "POST",
      signal,
      headers: this.headers(),
      body: JSON.stringify({ jsonrpc: "2.0", method, params }),
    });

    if (!response.ok) {
      throw new Error(`Tailor MCP notification failed (${response.status}).`);
    }
  }

  private headers(includeProtocolVersion = true): Headers {
    const headers = new Headers({
      Accept: "application/json, text/event-stream",
      "Content-Type": "application/json",
    });

    if (includeProtocolVersion) {
      headers.set("MCP-Protocol-Version", this.protocolVersion);
    }

    if (this.sessionId) {
      headers.set("MCP-Session-Id", this.sessionId);
    }

    return headers;
  }
}

async function readMCPResponse(response: Response, requestId: number): Promise<unknown> {
  const body = await response.text();
  const contentType = response.headers.get("Content-Type") ?? "";

  if (contentType.includes("application/json")) {
    return parseJSON(body);
  }

  if (contentType.includes("text/event-stream")) {
    return parseSSE(body, requestId);
  }

  return body;
}

function parseJSON(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error("Tailor MCP returned invalid JSON.");
  }
}

function parseSSE(value: string, requestId: number): unknown {
  // ponytail: consume only the terminal response; use an SDK-backed adapter for resumable streams.
  for (const event of value.split(/\r?\n\r?\n/)) {
    const data = event
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");

    if (!data) continue;

    const message = parseJSON(data);
    if (isRecord(message) && message.id === requestId) {
      return message;
    }
  }

  throw new Error("Tailor MCP SSE response did not include the JSON-RPC result.");
}

function toMCPTool(value: unknown): AIChatMCPTool {
  if (!isRecord(value) || typeof value.name !== "string" || !isRecord(value.inputSchema)) {
    throw new Error("Tailor MCP returned an invalid tool definition.");
  }

  return {
    name: value.name,
    ...(typeof value.description === "string" ? { description: value.description } : {}),
    inputSchema: value.inputSchema,
  };
}

function getErrorMessage(value: unknown): string {
  if (isRecord(value) && typeof value.message === "string") {
    return value.message;
  }

  return typeof value === "string" && value ? value : "Unknown error";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
